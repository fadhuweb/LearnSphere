import logging
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, F, Max, Q
from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import (
    Course, Topic, Lesson, Quiz, Question, Choice,
    CourseEnrollment, LessonCompletion, QuizAttempt,
    AuditLog, ProgressTracker
)
from api.serializers import ProgressTrackerSerializer
from api.permissions import IsTeacher, IsStudent
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)
User = get_user_model()

class StudentProgressView(generics.ListAPIView):
    """Students can view only their own progress."""
    serializer_class = ProgressTrackerSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        return ProgressTracker.objects.filter(student=self.request.user)
    
class TeacherProgressView(generics.ListAPIView):
    """Allows teachers to view progress of students in their courses."""
    serializer_class = ProgressTrackerSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        """Return progress data only for students in the teacher's courses."""
        return ProgressTracker.objects.filter(course__teacher=self.request.user)
    
    def list(self, request, *args, **kwargs):
        # Get all courses taught by this teacher
        teacher_courses = Course.objects.filter(teacher=self.request.user)
        
        # Return empty list if no courses found
        if not teacher_courses.exists():
            return Response({
                'courses': [],
                'students': [],
                'message': 'No courses assigned to this teacher yet.'
            })
        
        # Get all students enrolled in teacher's courses
        enrolled_students = CourseEnrollment.objects.filter(
            course__in=teacher_courses
        ).select_related('student', 'course')
        
        # Format course data for response with optimized count
        # Prefetch counts for courses to avoid N+1
        teacher_courses_with_counts = teacher_courses.annotate(
            student_count=Count('enrollments')
        )
        
        course_data = [{
            'id': course.id,
            'title': course.title,
            'description': course.description,
            'enrolled_students': course.student_count
        } for course in teacher_courses_with_counts]
        
        # Group enrollments by student
        student_data = {}
        for enrollment in enrolled_students:
            student_id = enrollment.student.id
            if student_id not in student_data:
                student_data[student_id] = {
                    'id': student_id,
                    'username': enrollment.student.username,
                    'name': f"{enrollment.student.first_name} {enrollment.student.last_name}".strip(),
                    'email': enrollment.student.email,
                    'courses': [],
                    'total_progress': 0,
                    'total_topics': 0,
                    'total_quizzes_taken': 0,
                    'total_quizzes_passed': 0,
                    'avg_quiz_score': 0,
                    'last_active': None,
                }
            
            # Add course to student's courses
            student_data[student_id]['courses'].append({
                'id': enrollment.course.id,
                'title': enrollment.course.title,
            })

        if not student_data:
             return Response({
                'courses': course_data,
                'students': []
            })
            
        # Bulk Fetching Strategy for Student Progress Data
        # Instead of looping per student, we fetch all relevant data for ALL students in one go
        
        # 1. Fetch Topic Counts per Course (Dictionary Map)
        # { course_id: topic_count }
        course_topic_counts = {
            c['id']: Topic.objects.filter(course_id=c['id']).count() 
            for c in course_data
        }

        # 2. Fetch Total Topics with Quizzes per Course (Dictionary Map)
        # { course_id: quiz_count }
        course_quiz_counts = {
            c['id']: Topic.objects.filter(course_id=c['id'], quiz__isnull=False).count()
            for c in course_data
        }

        # 3. Fetch All Passed Quizzes for these students in these courses
        # Group by student id
        all_passed_attempts = QuizAttempt.objects.filter(
            student_id__in=student_data.keys(),
            quiz__topic__course__in=teacher_courses,
            passed=True
        ).values('student_id', 'quiz__topic__course_id').distinct()
        
        # Map: student_id -> set of (quiz_id) or count
        # Actually we need count of unique quizzes passed per student per course context? 
        # The original logic was: passed_quizzes / total_quizzes_in_student_courses
        
        # Let's count passed unique quizzes per student across ALL teacher's courses
        passed_quizzes_map = {} # student_id -> count
        for attempt in all_passed_attempts:
            s_id = attempt['student_id']
            passed_quizzes_map[s_id] = passed_quizzes_map.get(s_id, 0) + 1

        # 4. Fetch All Quiz Attempts for stats
        all_attempts_stats = QuizAttempt.objects.filter(
            student_id__in=student_data.keys(),
            quiz__topic__course__in=teacher_courses,
            completed_at__isnull=False
        ).values('student_id').annotate(
            count=Count('id'),
            passed_count=Count('id', filter=Q(passed=True)), # Using Q for filter is standard
            avg_score=Avg('score'),
            last_active=Max('completed_at')
        )
        
        attempts_stats_map = { stat['student_id']: stat for stat in all_attempts_stats }

        # 5. Fetch Last Topic Access (ProgressTracker)
        latest_progress = ProgressTracker.objects.filter(
             student_id__in=student_data.keys(),
             course__in=teacher_courses
        ).values('student_id').annotate(
            last_active=Max('topic__created_at') # Approximation if updated_at not available
        )
        progress_last_active_map = { p['student_id']: p['last_active'] for p in latest_progress }

        # Aggregate Data into student_data
        for student_id, data in student_data.items():
            # Calculate Totals based on enrolled courses
            student_total_potential_quizzes = 0
            student_total_topics = 0
            
            for course_info in data['courses']:
                c_id = course_info['id']
                student_total_potential_quizzes += course_quiz_counts.get(c_id, 0)
                student_total_topics += course_topic_counts.get(c_id, 0)
            
            data['total_topics'] = student_total_topics
            
            # Progress Calc
            passed_count = passed_quizzes_map.get(student_id, 0)
            if student_total_potential_quizzes > 0:
                data['total_progress'] = int((passed_count / student_total_potential_quizzes) * 100)
            else:
                data['total_progress'] = 0
            
            # Stats from Attempts
            stats = attempts_stats_map.get(student_id)
            if stats:
                data['total_quizzes_taken'] = stats['count']
                data['total_quizzes_passed'] = stats['passed_count']
                data['avg_quiz_score'] = round(stats['avg_score'], 1) if stats['avg_score'] else 0
                attempt_last_active = stats['last_active']
            else:
                attempt_last_active = None
            
            # Last Active Logic
            tracker_last_active = progress_last_active_map.get(student_id)
            
            # Compare dates
            if attempt_last_active and tracker_last_active:
                data['last_active'] = max(attempt_last_active, tracker_last_active)
            elif attempt_last_active:
                data['last_active'] = attempt_last_active
            elif tracker_last_active:
                data['last_active'] = tracker_last_active
        
        # Return response with course and student data
        result = {
            'courses': course_data,
            'students': list(student_data.values())
        }
        return Response(result)

class SyncProgressView(APIView):
    """Allow only students to sync their offline progress."""
    permission_classes = [IsStudent]  # Only students can sync progress

    def post(self, request):
        """Sync student progress from offline mode."""
        student = request.user
        progress_data = request.data.get("progress", [])  # Expecting a list of progress items

        for item in progress_data:
            course_id = item.get("course_id")
            completion_status = item.get("completion_status")  # Check the correct field name!

            # Use the correct field name from your model
            progress, created = ProgressTracker.objects.update_or_create(
                student=student, course_id=course_id,
                defaults={"completion_status": completion_status}  # Ensure this matches your model
            )

        return Response({"message": "Progress synced successfully"}, status=status.HTTP_200_OK)

class DashboardStatsView(APIView):
    """View for fetching dashboard statistics based on user role."""
    permission_classes = [permissions.IsAuthenticated]

    def get_admin_stats(self):
        """Get statistics for admin dashboard."""
        now = timezone.now()
        month_ago = now - timedelta(days=30)
        
        return {
            "totalUsers": User.objects.count(),
            "pendingApprovals": User.objects.filter(is_active=False).count(),
            "activeCourses": Course.objects.count(),
            "recentActivity": AuditLog.objects.filter(timestamp__gte=now - timedelta(hours=24)).count(),
            "activeUsers": User.objects.filter(last_login__gte=month_ago).count(),
            "lastLogin": self.request.user.last_login,
        }

    def get_teacher_stats(self):
        """Get statistics for teacher dashboard."""
        teacher = self.request.user
        now = timezone.now()
        
        teaching_courses = Course.objects.filter(teacher=teacher)
        enrolled_students = CourseEnrollment.objects.filter(course__in=teaching_courses)
        
        # Get quiz attempts that have a completed_at timestamp
        quiz_attempts = QuizAttempt.objects.filter(
            quiz__topic__course__in=teaching_courses,
            completed_at__isnull=False
        )
        
        # Calculate average score
        avg_score = quiz_attempts.aggregate(Avg('score'))['score__avg'] or 0
        
        return {
            "teachingCourses": teaching_courses.count(),
            "totalStudents": enrolled_students.values('student').distinct().count(),
            "averageScore": round(avg_score, 1),
            "upcomingDeadlines": 0,  # Temporarily set to 0 since Quiz model doesn't have due_date
            "lastLogin": self.request.user.last_login,
        }

    def get_student_stats(self):
        """Get statistics for student dashboard."""
        student = self.request.user
        
        enrollments = CourseEnrollment.objects.filter(student=student)
        
        # Get completed lessons count
        completed_lessons = LessonCompletion.objects.filter(
            student=student,
            completed=True
        ).count()
        
        # Get total lessons count from enrolled courses
        total_lessons = Lesson.objects.filter(
            topic__course__in=enrollments.values('course')
        ).count()
        
        # Calculate progress percentage
        progress = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0
        
        # Get completed courses (where all lessons are completed)
        completed_courses = 0
        for enrollment in enrollments:
            course_lessons = Lesson.objects.filter(topic__course=enrollment.course)
            completed_course_lessons = LessonCompletion.objects.filter(
                student=student,
                lesson__in=course_lessons,
                completed=True
            )
            if course_lessons.count() > 0 and course_lessons.count() == completed_course_lessons.count():
                completed_courses += 1
        
        # Get quiz statistics
        total_quizzes = QuizAttempt.objects.filter(student=student).count()
        quizzes_passed = QuizAttempt.objects.filter(student=student, passed=True).count()
        
        return {
            "enrolledCourses": enrollments.count(),
            "completedCourses": completed_courses,
            "totalQuizzes": total_quizzes,
            "quizzesPassed": quizzes_passed,
            "averageProgress": round(progress, 1),
            "nextDeadline": "No upcoming deadlines",  # Temporarily hardcoded since we don't have deadlines
            "lastLogin": self.request.user.last_login,
        }

    def get(self, request):
        """Return dashboard statistics based on user role."""
        try:
            if request.user.role == 'admin':
                stats = self.get_admin_stats()
            elif request.user.role == 'teacher':
                stats = self.get_teacher_stats()
            elif request.user.role == 'student':
                stats = self.get_student_stats()
            else:
                return Response(
                    {"error": "Invalid user role"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response(stats)
        except Exception as e:
            logger.error(f"Error fetching dashboard stats: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to fetch dashboard statistics"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class NotificationsView(APIView):
    """View for fetching user notifications."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            user = request.user
            now = timezone.now()
            notifications = []

            if user.role == 'admin':
                # Admin notifications
                recent_users = User.objects.filter(
                    date_joined__gte=now - timedelta(days=7)
                ).order_by('-date_joined')[:5]

                pending_approvals = User.objects.filter(
                    is_active=False
                ).order_by('-date_joined')[:5]

                # Add new user notifications
                for new_user in recent_users:
                    notifications.append({
                        "id": f"new_user_{new_user.id}",
                        "type": "info",
                        "message": f"New user registered: {new_user.username}",
                        "time": new_user.date_joined.strftime("%Y-%m-%d %H:%M:%S")
                    })

                # Add pending approval notifications
                for pending_user in pending_approvals:
                    notifications.append({
                        "id": f"pending_{pending_user.id}",
                        "type": "warning",
                        "message": f"Pending approval: {pending_user.username}",
                        "time": pending_user.date_joined.strftime("%Y-%m-%d %H:%M:%S")
                    })

            elif user.role == 'teacher':
                # Teacher notifications
                # Optimize: select_related for student and course
                recent_enrollments = CourseEnrollment.objects.filter(
                    course__teacher=user,
                    enrolled_at__gte=now - timedelta(days=7)
                ).select_related('student', 'course').order_by('-enrolled_at')[:5]

                # Optimize: select_related for student and quiz/topic
                recent_quiz_attempts = QuizAttempt.objects.filter(
                    quiz__topic__course__teacher=user,
                    completed_at__isnull=False
                ).select_related('student', 'quiz', 'quiz__topic').order_by('-completed_at')[:5]

                # Add new enrollment notifications
                for enrollment in recent_enrollments:
                    notifications.append({
                        "id": f"enroll_{enrollment.id}",
                        "type": "info",
                        "message": f"New student enrolled: {enrollment.student.username} in {enrollment.course.title}",
                        "time": enrollment.enrolled_at.strftime("%Y-%m-%d %H:%M:%S")
                    })

                # Add quiz attempt notifications
                for attempt in recent_quiz_attempts:
                    notifications.append({
                        "id": f"quiz_{attempt.id}",
                        "type": "info",
                        "message": f"Quiz completed by {attempt.student.username} with score {attempt.score}%",
                        "time": attempt.completed_at.strftime("%Y-%m-%d %H:%M:%S")
                    })

            elif user.role == 'student':
                # Student notifications
                # For student notifications, we'll only show quiz results for now
                recent_quiz_results = QuizAttempt.objects.filter(
                    student=user,
                    completed_at__isnull=False
                ).select_related('quiz', 'quiz__topic').order_by('-completed_at')[:5]

                # Add quiz result notifications
                for attempt in recent_quiz_results:
                    status = "passed" if attempt.passed else "failed"
                    notifications.append({
                        "id": f"quiz_{attempt.id}",
                        "type": "success" if attempt.passed else "warning",
                        "message": f"Quiz {status}: {attempt.quiz.topic.title} - Score: {attempt.score}%",
                        "time": attempt.completed_at.strftime("%Y-%m-%d %H:%M:%S")
                    })

            return Response(notifications)
        except Exception as e:
            logger.error(f"Error fetching notifications: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to fetch notifications"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
