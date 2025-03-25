from django.shortcuts import render, get_object_or_404
from django.db.models import Count, F, Q, Avg, Exists, OuterRef, Prefetch, Max, Min, Sum
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.http import FileResponse, Http404
from django.conf import settings
from django.db import transaction
from datetime import timedelta
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    Course, Topic, Lesson, Quiz, Question, Choice,
    CourseEnrollment, LessonCompletion, QuizAttempt,
    AuditLog, ProgressTracker, QuestionResponse
)
from .serializers import (
    CourseSerializer, TopicSerializer, LessonSerializer,
    QuizSerializer, QuestionSerializer, ChoiceSerializer,
    CourseEnrollmentSerializer, ProgressTrackerSerializer,
    UserProfileSerializer, AuditLogSerializer,
    RegisterSerializer, LoginSerializer, QuizAttemptSerializer,
    QuizResultSerializer, QuizTakingSerializer
)
from .permissions import (
    IsAdmin, IsTeacher, IsStudent, IsStudentOrTeacherOrAdmin,
    IsAssignedTeacher, IsTeacherForQuiz, IsTeacherForStudent,
    IsTeacherorAdmin, IsAdminOrAssignedTeacherOrEnrolledStudent,
    IsEnrolledStudent, IsTeacherForCourse
)
from .utils import log_action

User = get_user_model()

class RegisterView(APIView):
    """Register a new user."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            log_action(None, f"New user registered: {user.username}")
            return Response(
                {"message": "Registration successful. Please wait for admin approval."},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(TokenObtainPairView):
    """Login view that uses JWT tokens."""
    serializer_class = LoginSerializer

class UserProfileView(generics.RetrieveAPIView):
    """Get the current user's profile."""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class CourseCreateView(generics.CreateAPIView):
    """Only admins can create courses"""
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAdmin]

class LessonCreateView(generics.CreateAPIView):
    """Allows teachers to add lessons to a topic inside their course."""
    serializer_class = LessonSerializer
    permission_classes = [IsTeacherForCourse]
    parser_classes = (MultiPartParser, FormParser)

    def create(self, request, *args, **kwargs):
        # Debug logging
        print("\n======= LESSON CREATE REQUEST =======")
        print("Request data keys:", request.data.keys())
        print("Request FILES keys:", request.FILES.keys() if hasattr(request, 'FILES') else 'No FILES')
        
        # Print each file in request.FILES
        if hasattr(request, 'FILES'):
            for file_key, file_obj in request.FILES.items():
                print(f"File uploaded: {file_key} - {file_obj.name} ({file_obj.size} bytes)")
        
        print("URL kwargs:", kwargs)
        print("=======================================\n")
        
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        course_id = self.kwargs["course_id"]
        topic_id = self.kwargs["topic_id"]

        # Debug logging
        print(f"Creating lesson for course_id={course_id}, topic_id={topic_id}")
        
        try:
            # Get course & topic
            course = get_object_or_404(Course, id=course_id)
            topic = get_object_or_404(Topic, id=topic_id, course=course)
            
            print(f"Found course: {course.title}, topic: {topic.title}")

            # Ensure teacher is assigned to the course
            if course.teacher != self.request.user:
                print(f"Permission denied: {self.request.user.username} is not the teacher for this course")
                raise serializers.ValidationError("You can only add lessons to your own course topics.")

            # Set the order
            last_order = Lesson.objects.filter(topic=topic).count()
            print(f"Setting order to {last_order + 1}")
            
            # Save lesson with the topic from URL
            print("Saving lesson with topic and order")
            instance = serializer.save(topic=topic, order=last_order + 1)
            print(f"Lesson saved successfully with ID {instance.id}")
            
            # Verify saved file data
            if instance.pdf:
                print(f"PDF saved: {instance.pdf.name}")
            if instance.video:
                print(f"Video saved: {instance.video.name}")
            if instance.external_links:
                print(f"Links saved: {instance.external_links}")
            if instance.contextual_help:
                print(f"Text content saved: {len(instance.contextual_help)} characters")
                
        except Exception as e:
            print(f"Error in perform_create: {str(e)}")
            raise

class QuizCreateView(generics.CreateAPIView):
    """View for creating a new quiz.
    Only teachers can create quizzes for their topics.
    """
    serializer_class = QuizSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        if self.request.user.role != 'teacher':
            raise PermissionDenied("Only teachers can create quizzes")
            
        course_id = self.kwargs.get('course_id')
        topic_id = self.kwargs.get('topic_id')
        
        topic = get_object_or_404(Topic, id=topic_id, course_id=course_id)
        
        if topic.course.teacher != self.request.user:
            raise PermissionDenied("You can only create quizzes for your own courses")
            
        serializer.save(topic=topic)

class QuizUpdateView(generics.UpdateAPIView):
    """View for updating an existing quiz.
    Only teachers can update quizzes for their topics.
    """
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        topic_id = self.kwargs.get('topic_id')
        course_id = self.kwargs.get('course_id')
        topic = get_object_or_404(Topic, id=topic_id, course_id=course_id)
        quiz = get_object_or_404(Quiz, topic=topic)
        
        # Check permissions
        if self.request.user.role != 'teacher' or topic.course.teacher != self.request.user:
            raise PermissionDenied("You can only update quizzes in your own courses")
            
        return quiz
    
    def perform_update(self, serializer):
        # Debug input data
        print(f"Quiz update data: {self.request.data}")
        
        # Check if questions data is included
        questions_data = self.request.data.get('questions', [])
        print(f"Questions included: {len(questions_data)}")
        
        if not questions_data:
            print("WARNING: No questions data included in update request!")
            
        quiz = self.get_object()
        serializer.save()
        
        # Log after saving
        updated_quiz = Quiz.objects.get(pk=quiz.pk)
        question_count = updated_quiz.questions.count()
        print(f"Updated quiz {updated_quiz.id} now has {question_count} questions")
        
        # If the update didn't include questions but there should be questions,
        # we need to make sure they weren't deleted by accident
        if question_count == 0 and len(questions_data) > 0:
            print("ERROR: Questions were not saved correctly. Attempting to restore them...")
            
            try:
                # Try to recreate the questions from the request data
                for question_data in questions_data:
                    choices_data = question_data.get('choices', [])
                    question = Question.objects.create(
                        quiz=updated_quiz,
                        question_text=question_data.get('question_text', ''),
                        question_type=question_data.get('question_type', 'single'),
                        points=question_data.get('points', 1),
                        order=question_data.get('order', 0)
                    )
                    
                    # Create choices for this question
                    for choice_data in choices_data:
                        Choice.objects.create(
                            question=question,
                            choice_text=choice_data.get('choice_text', ''),
                            is_correct=choice_data.get('is_correct', False)
                        )
                
                print(f"Questions restored. Quiz now has {updated_quiz.questions.count()} questions")
            except Exception as e:
                print(f"Error restoring questions: {str(e)}")

class QuizDeleteView(generics.DestroyAPIView):
    """View for deleting an existing quiz.
    Only teachers can delete quizzes for their topics.
    """
    serializer_class = QuizSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        course_id = self.kwargs.get('course_id')
        topic_id = self.kwargs.get('topic_id')
        
        topic = get_object_or_404(Topic, id=topic_id, course_id=course_id)
        quiz = get_object_or_404(Quiz, topic=topic)
        
        if self.request.user.role != 'teacher' or topic.course.teacher != self.request.user:
            raise PermissionDenied("You can only delete quizzes in your own courses")
            
        return quiz

class QuizDetailView(viewsets.ModelViewSet):
    """ViewSet for Quiz CRUD operations and statistics.
    Teachers can create/edit/delete quizzes for their topics.
    Students can only view quizzes in their enrolled courses.
    """
    serializer_class = QuizSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Quiz.objects.all()

    def get_object(self):
        course_id = self.kwargs.get('course_id')
        topic_id = self.kwargs.get('topic_id')
        
        topic = get_object_or_404(Topic, id=topic_id, course_id=course_id)
        quiz = get_object_or_404(Quiz, topic=topic)
        
        if self.request.user.role != 'teacher' or topic.course.teacher != self.request.user:
            raise PermissionDenied("You can only access quizzes in your own courses")
            
        return quiz

    def create(self, request, *args, **kwargs):
        """Create a new quiz"""
        if self.request.user.role != 'teacher':
            raise PermissionDenied("Only teachers can create quizzes")
            
        course_id = self.kwargs.get('course_id')
        topic_id = self.kwargs.get('topic_id')
        
        topic = get_object_or_404(Topic, id=topic_id, course_id=course_id)
        
        if topic.course.teacher != self.request.user:
            raise PermissionDenied("You can only create quizzes for your own courses")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(topic=topic)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Update an existing quiz"""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def perform_update(self, serializer):
        """Only teachers can update their own quizzes"""
        instance = self.get_object()
        if self.request.user.role != 'teacher' or instance.topic.course.teacher != self.request.user:
            raise PermissionDenied("You can only update quizzes in your own courses")
        serializer.save()

    def perform_destroy(self, instance):
        """Only teachers can delete their own quizzes"""
        if self.request.user.role != 'teacher' or instance.topic.course.teacher != self.request.user:
            raise PermissionDenied("You can only delete quizzes from your own courses")
            
        if instance.attempts.exists():
            raise ValidationError("Cannot delete quiz with existing attempts")
            
        instance.delete()

    @action(detail=True, methods=['get'])
    def statistics(self, request, course_id=None, topic_id=None):
        """Get quiz statistics. Only available to teachers."""
        quiz = self.get_object()
        
        if request.user.role != 'teacher':
            raise PermissionDenied("Only teachers can view quiz statistics")
            
        if quiz.topic.course.teacher != request.user:
            raise PermissionDenied("You can only view statistics for your own quizzes")
        
        attempts = quiz.attempts.all()
        if not attempts.exists():
            return Response({
                'message': 'No attempts yet for this quiz'
            })

        total_attempts = attempts.count()
        passing_attempts = attempts.filter(passed=True).count()
        
        return Response({
            'total_attempts': total_attempts,
            'passing_attempts': passing_attempts,
            'passing_rate': (passing_attempts / total_attempts) * 100 if total_attempts > 0 else 0,
            'average_score': attempts.aggregate(Avg('score'))['score__avg'] or 0,
            'average_time': attempts.exclude(time_taken=None).aggregate(
                Avg('time_taken')
            )['time_taken__avg']
        })

class CourseEnrollmentView(generics.CreateAPIView):
    """Only students can enroll in courses."""
    queryset = CourseEnrollment.objects.all()
    serializer_class = CourseEnrollmentSerializer
    permission_classes = [IsStudent]

    def post(self, request, course_id):
        course = get_object_or_404(Course, id=course_id)
        
        # Check if student is already enrolled
        if CourseEnrollment.objects.filter(student=request.user, course=course).exists():
            return Response(
                {"error": "You are already enrolled in this course"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create enrollment
        enrollment = CourseEnrollment.objects.create(
            student=request.user,
            course=course
        )
        
        serializer = self.get_serializer(enrollment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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
        # Get the basic queryset
        queryset = self.get_queryset()
        
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
        
        # Format course data for response
        course_data = [{
            'id': course.id,
            'title': course.title,
            'description': course.description,
            'enrolled_students': CourseEnrollment.objects.filter(course=course).count()
        } for course in teacher_courses]
        
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
        
        # Get topic progress data
        for student_id, data in student_data.items():
            # Get completed topics
            completed_topics = ProgressTracker.objects.filter(
                student_id=student_id,
                course__in=teacher_courses,
                completion_status=True
            ).count()
            
            # Get total topics
            total_topics = Topic.objects.filter(course__in=teacher_courses).count()
            
            data['total_topics'] = total_topics
            if total_topics > 0:
                data['total_progress'] = round((completed_topics / total_topics) * 100, 1)
            
            # Get quiz attempts
            quiz_attempts = QuizAttempt.objects.filter(
                student_id=student_id,
                quiz__topic__course__in=teacher_courses,
                completed_at__isnull=False
            )
            
            data['total_quizzes_taken'] = quiz_attempts.count()
            data['total_quizzes_passed'] = quiz_attempts.filter(passed=True).count()
            
            # Calculate average quiz score
            if data['total_quizzes_taken'] > 0:
                avg_score = quiz_attempts.aggregate(Avg('score'))['score__avg']
                data['avg_quiz_score'] = round(avg_score, 1) if avg_score else 0
            
            # Get last activity
            latest_attempt = quiz_attempts.order_by('-completed_at').first()
            latest_topic_progress = ProgressTracker.objects.filter(
                student_id=student_id,
                course__in=teacher_courses
            ).order_by('-id').first()
            
            if latest_attempt and latest_topic_progress:
                if latest_attempt.completed_at > latest_topic_progress.topic.created_at:
                    data['last_active'] = latest_attempt.completed_at
                else:
                    data['last_active'] = latest_topic_progress.topic.created_at
            elif latest_attempt:
                data['last_active'] = latest_attempt.completed_at
            elif latest_topic_progress:
                data['last_active'] = latest_topic_progress.topic.created_at
        
        # Return response with course and student data
        result = {
            'courses': course_data,
            'students': list(student_data.values())
        }
        return Response(result)
    
User = get_user_model()

class UserListView(generics.ListAPIView):
    """List all users. Only accessible by admin."""
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        role = self.request.query_params.get('role', None)
        status = self.request.query_params.get('status', None)
        search = self.request.query_params.get('search', None)

        queryset = User.objects.all()

        if role:
            queryset = queryset.filter(role=role)
        if status == 'suspended':
            queryset = queryset.filter(is_suspended=True)
        elif status == 'active':
            queryset = queryset.filter(is_suspended=False)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search)
            )

        return queryset.order_by('-date_joined')


class ApproveUserView(APIView):
    """Admin can activate user accounts"""
    permission_classes = [IsAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            user.is_active = True
            user.save()
            return Response({"message": "User activated successfully"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
class RemoveUserView(APIView):
    """Admin can remove users"""
    permission_classes = [IsAdmin]

    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            user.delete()
            return Response({"message": "User removed successfully"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
class CourseCreateView(generics.CreateAPIView):
    """Only admins can create courses without assigning a teacher immediately"""
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAdmin]

from rest_framework import generics
from .models import Course
from .serializers import CourseSerializer
from .permissions import IsAdmin, IsAssignedTeacher  # Ensure correct permissions are imported

class CourseUpdateView(generics.UpdateAPIView):
    """Only Admins or Assigned Teachers can update a course."""
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAdmin | IsAssignedTeacher]  # Ensure both Admins and Assigned Teachers can update

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Course.objects.all()  # Admins can update any course
        elif user.role == 'teacher':
            return Course.objects.filter(teacher=user)  # Teachers can only update their assigned courses
        return Course.objects.none()  # Other users cannot access
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs, partial=True)

class CourseDeleteView(generics.DestroyAPIView):
    """Only admins can delete courses"""
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAdmin]


class AssignTeacherView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, course_id):
        """Assign a teacher to a course"""
        course = get_object_or_404(Course, id=course_id)
        teacher_id = request.data.get("teacher_id")

        if not teacher_id:
            return Response({"error": "Teacher ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        teacher = get_object_or_404(User, id=teacher_id, role="teacher")
        course.teacher = teacher
        course.save()

        return Response({
            "message": "Teacher assigned successfully",
            "course": CourseSerializer(course).data
        }, status=status.HTTP_200_OK)



    
class CourseListView(generics.ListAPIView):
    """Students can only see enrolled courses, teachers see assigned courses, and admins see all courses."""
    serializer_class = CourseSerializer
    permission_classes = [IsStudentOrTeacherOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Course.objects.all()  # Admins can see all courses
        elif user.role == 'teacher':
            return Course.objects.filter(teacher=user)  # Teachers can only see assigned courses
        elif user.role == 'student':
            enrolled_courses = CourseEnrollment.objects.filter(student=user).values_list('course', flat=True)
            return Course.objects.filter(id__in=enrolled_courses)  # Students see only enrolled courses
        return Course.objects.none()  # Other users get no courses


class SuspendUserView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)

            # Prevent suspending an admin
            if user.role == "admin":
                return Response({"error": "Cannot suspend an admin"}, status=status.HTTP_403_FORBIDDEN)

            user.is_suspended = True
            user.save(update_fields=["is_suspended"])  # Ensure it saves properly

            # Log the action
            log_action(request.user, f"Suspended user {user.username}")

            return Response(
                {"message": "User suspended successfully", "is_suspended": user.is_suspended},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

class ReactivateUserView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)

            user.is_suspended = False
            user.save(update_fields=["is_suspended"])  # Ensure it saves properly

            # Log the action
            log_action(request.user, f"Reactivated user {user.username}")

            return Response(
                {"message": "User reactivated successfully", "is_suspended": user.is_suspended},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

class AuditLogListView(generics.ListAPIView):
    """Admins can view system logs"""
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]

  # Only quizzes for assigned courses

class UnenrollCourseView(APIView):
    """Allow students to unenroll from a course."""
    permission_classes = [IsStudent]

    def delete(self, request, course_id):
        enrollment = CourseEnrollment.objects.filter(student=request.user, course_id=course_id).first()
        if not enrollment:
            return Response({"error": "You are not enrolled in this course"}, status=status.HTTP_400_BAD_REQUEST)
        
        enrollment.delete()
        return Response({"message": "Successfully unenrolled from the course"}, status=status.HTTP_200_OK)
    


class LessonAccessView(APIView):
    """Ensure students complete previous lessons before accessing the next."""
    permission_classes = [IsStudent]

    def get(self, request, lesson_id):
        lesson = Lesson.objects.get(id=lesson_id)
        student = request.user

        # Get previous lesson
        previous_lesson = Lesson.objects.filter(course=lesson.course, id__lt=lesson.id).order_by('-id').first()

        if previous_lesson:
            if not LessonCompletion.objects.filter(student=student, lesson=previous_lesson, completed=True).exists():
                return Response({"error": "Complete previous lesson before accessing this one"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": "Access granted", "lesson": {"title": lesson.title, "content": lesson.content}}, status=status.HTTP_200_OK)

class CourseDetailView(generics.RetrieveAPIView):
    """Get details of a single course. Only Admins, Assigned Teachers, and Enrolled Students can access."""
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAdminOrAssignedTeacherOrEnrolledStudent]

    def get_queryset(self):
        print("User role:", self.request.user.role)
        print("User ID:", self.request.user.id)
        
        course_id = self.kwargs.get('pk')
        print("Course ID:", course_id)
        
        if self.request.user.role == 'student':
            is_enrolled = CourseEnrollment.objects.filter(
                student=self.request.user,
                course_id=course_id
            ).exists()
            print("Student is enrolled:", is_enrolled)

        # Make sure we explicitly prefetch lessons
        queryset = Course.objects.annotate(
            teacher_name=F('teacher__username'),
            topic_count=Count('topics'),
            enrolled_students_count=Count('enrollments')
        ).prefetch_related(
            Prefetch('topics', queryset=Topic.objects.prefetch_related('lessons')),
            'topics__quiz'
        )
        
        course = queryset.filter(id=course_id).first()
        if course:
            print("Found course:", course.title)
            print("Topics count:", course.topics.count())
            for topic in course.topics.all():
                print(f"Topic: {topic.title}")
                print(f"  Lessons: {topic.lessons.count()}")
                if topic.lessons.count() > 0:
                    print(f"  First lesson: {topic.lessons.first().title}")
                print(f"  Has Quiz: {hasattr(topic, 'quiz')}")
        
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

class LessonListView(generics.ListAPIView):
    """Get all lessons. Only Admins, Assigned Teachers, and Enrolled Students can access."""
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [IsAdminOrAssignedTeacherOrEnrolledStudent]

class LessonDetailView(generics.RetrieveAPIView):
    """Get a single lesson by ID. Only Admins, Assigned Teachers, and Enrolled Students can access."""
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [IsAdminOrAssignedTeacherOrEnrolledStudent]

    def get_object(self):
        obj = super().get_object()
        print("Lesson:", obj.title)
        print("Topic:", obj.topic.title)
        print("Course:", obj.course.title)
        print("User role:", self.request.user.role)
        if self.request.user.role == 'student':
            is_enrolled = CourseEnrollment.objects.filter(
                student=self.request.user,
                course=obj.course
            ).exists()
            print("Student is enrolled:", is_enrolled)
        return obj

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

class TopicListView(generics.ListAPIView):
    """Get all topics for a course. Only Admins, Assigned Teachers, and Enrolled Students can access."""
    serializer_class = TopicSerializer
    permission_classes = [IsAdminOrAssignedTeacherOrEnrolledStudent]

    def get_queryset(self):
        course_id = self.kwargs.get('course_id')
        return Topic.objects.filter(course_id=course_id).prefetch_related(
            'lessons'
        ).annotate(
            lesson_count=Count('lessons'),
            has_quiz=Exists(Quiz.objects.filter(topic=OuterRef('pk')))
        )

class LessonDeleteView(generics.DestroyAPIView):
    """Teachers can delete lessons from their courses."""
    serializer_class = LessonSerializer
    permission_classes = [IsTeacherForCourse]

    def get_queryset(self):
        # Instead of relying on URL parameters, just return all lessons
        # Permission checks will ensure only appropriate lessons can be deleted
        return Lesson.objects.all()

    def perform_destroy(self, instance):
        if instance.topic.course.teacher != self.request.user:
            raise PermissionDenied("You can only delete lessons from your own courses.")
        
        # Delete any associated files
        if instance.pdf:
            instance.pdf.delete(save=False)
        if instance.video:
            instance.video.delete(save=False)
            
        instance.delete()

    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return Response(
                {"message": "Lesson deleted successfully"},
                status=status.HTTP_204_NO_CONTENT
            )
        except Lesson.DoesNotExist:
            return Response(
                {"error": "Lesson not found"},
                status=status.HTTP_404_NOT_FOUND
            )

class LessonUpdateView(generics.UpdateAPIView):
    """Allows teachers to update lessons in their courses."""
    serializer_class = LessonSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    
    def get_object(self):
        lesson_id = self.kwargs.get('pk')
        lesson = get_object_or_404(Lesson, id=lesson_id)
        
        # Check if the requesting user is the teacher for this course
        if lesson.topic.course.teacher != self.request.user and not self.request.user.is_superuser:
            raise PermissionDenied("You can only update lessons in your own courses.")
            
        return lesson
    
    def perform_update(self, serializer):
        # Save the updated lesson
        serializer.save()
        log_action(self.request.user, f"Updated lesson: {serializer.instance.title}")

class LessonDownloadView(APIView):
    """Allow only enrolled students to download lessons."""
    permission_classes = [IsEnrolledStudent]  # Only enrolled students can download lessons

    def get(self, request, lesson_id):
        try:
            lesson = Lesson.objects.get(id=lesson_id)
            file_path = os.path.join(settings.MEDIA_ROOT, lesson.file.name)

            if not os.path.exists(file_path):
                raise Http404("File not found")

            return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=lesson.file.name)
        except Lesson.DoesNotExist:
            raise Http404("Lesson not found")

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


class LessonListCreateView(generics.ListCreateAPIView):
    serializer_class = LessonSerializer
    permission_classes = [IsTeacher | IsAdmin]  # Only Teachers & Admins can add lessons

    def get_queryset(self):
        """Filter lessons by topic"""
        topic_id = self.kwargs['topic_id']
        return Lesson.objects.filter(topic_id=topic_id)

    def perform_create(self, serializer):
        """Attach lesson to topic"""
        course_id = self.kwargs['course_id']
        topic_id = self.kwargs['topic_id']
        
        # Get the topic
        topic = get_object_or_404(Topic, id=topic_id, course_id=course_id)
        
        # Ensure teacher is assigned to the course
        if topic.course.teacher != self.request.user and not self.request.user.role == 'admin':
            raise serializers.ValidationError("You can only add lessons to your own course topics.")
        
        # Set the order
        last_order = Lesson.objects.filter(topic=topic).count()
        
        # Save with topic and order
        serializer.save(topic=topic, order=last_order + 1)


class TeacherCourseListView(generics.ListAPIView):
    """Teachers can view only their assigned courses."""
    serializer_class = CourseSerializer
    permission_classes = [IsTeacherForCourse]

    def get_queryset(self):
        return Course.objects.filter(teacher=self.request.user)
class TopicCreateView(generics.CreateAPIView):
    """Teachers can create topics only for their assigned courses."""
    serializer_class = TopicSerializer
    permission_classes = [IsTeacherForCourse]

    def perform_create(self, serializer):
        course_id = self.kwargs.get("course_id")  # Extract from URL
        if not course_id:
            raise serializers.ValidationError({"course": "Course ID is required in the URL."})

        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            raise serializers.ValidationError({"course": "Invalid course ID."})

        if course.teacher != self.request.user:
            raise serializers.ValidationError({"error": "You can only add topics to your assigned courses."})

        serializer.save(course=course)  # Ensure the course is properly set



class TopicUpdateView(generics.UpdateAPIView):
    """Allows assigned teachers to update a topic (rename, modify details)."""
    serializer_class = TopicSerializer
    permission_classes = [IsTeacherForCourse]

    def get_object(self):
        course_id = self.kwargs["course_id"]
        topic_id = self.kwargs["topic_id"]
        return get_object_or_404(Topic, id=topic_id, course_id=course_id)

    def perform_update(self, serializer):
        course = self.get_object().course
        if course.teacher != self.request.user:
            raise serializers.ValidationError("You can only edit topics in your assigned courses.")
        serializer.save()

class TopicDeleteView(generics.DestroyAPIView):
    """Allows assigned teachers to delete a topic."""
    permission_classes = [IsTeacherForCourse]

    def get_object(self):
        course_id = self.kwargs["course_id"]
        topic_id = self.kwargs["topic_id"]
        return get_object_or_404(Topic, id=topic_id, course_id=course_id)

    def perform_destroy(self, instance):
        course = instance.course
        if course.teacher != self.request.user:
            raise serializers.ValidationError("You can only delete topics in your assigned courses.")
        instance.delete()

class QuizViewSet(viewsets.ModelViewSet):
    """ViewSet for Quiz CRUD operations.
    Teachers can create/edit/delete quizzes for their courses.
    Students can view and attempt quizzes in their enrolled courses."""
    serializer_class = QuizSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'teacher':
            return Quiz.objects.filter(topic__course__teacher=self.request.user)
        elif self.request.user.role == 'student':
            return Quiz.objects.filter(topic__course__enrollments__student=self.request.user)
        return Quiz.objects.all()

    def check_object_permissions(self, request, obj):
        """Check permissions based on user role and action"""
        super().check_object_permissions(request, obj)
        
        if request.method in ['PUT', 'PATCH', 'DELETE']:
            if request.user.role != 'teacher' or obj.topic.course.teacher != request.user:
                raise PermissionDenied("Only the course teacher can modify quizzes.")

    def perform_create(self, serializer):
        """Only teachers can create quizzes for their courses"""
        if self.request.user.role != 'teacher':
            raise PermissionDenied("Only teachers can create quizzes.")
            
        topic_id = self.request.data.get('topic')
        topic = get_object_or_404(Topic, id=topic_id)
        
        if topic.course.teacher != self.request.user:
            raise PermissionDenied("You can only create quizzes for your own courses.")
        
        serializer.save(topic=topic)

    @action(detail=True, methods=['post'])
    def start_attempt(self, request, pk=None):
        """Start a new quiz attempt"""
        quiz = self.get_object()
        
        if request.user.role != 'student':
            raise PermissionDenied("Only students can start quiz attempts.")
            
        # Check if student is enrolled in the course
        if not quiz.topic.course.enrollments.filter(student=request.user).exists():
            raise PermissionDenied("You must be enrolled in this course to take the quiz.")
        
        # Check if student has any ongoing attempts
        ongoing_attempt = QuizAttempt.objects.filter(
            quiz=quiz,
            student=request.user,
            completed_at__isnull=True
        ).first()

        if ongoing_attempt:
            return Response({
                'attempt_id': ongoing_attempt.id,
                'time_remaining': ongoing_attempt.check_time_remaining(),
                'message': 'You have an ongoing attempt'
            })

        # Create new attempt
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            student=request.user
        )
        
        # Set expiration time if quiz has time limit
        if quiz.time_limit:
            attempt.expires_at = timezone.now() + timedelta(minutes=quiz.time_limit)
            attempt.save()

        return Response({
            'attempt_id': attempt.id,
            'time_remaining': attempt.check_time_remaining(),
            'message': 'Quiz attempt started'
        })

    @action(detail=True, methods=['get'])
    def attempts(self, request, pk=None):
        """View all attempts for a specific quiz"""
        quiz = self.get_object()
        
        if request.user.role == 'student':
            attempts = quiz.attempts.filter(student=request.user)
        elif request.user.role == 'teacher':
            if quiz.topic.course.teacher != request.user:
                raise PermissionDenied("You can only view attempts for your own quizzes.")
            attempts = quiz.attempts.all()
        else:
            attempts = quiz.attempts.all()
            
        serializer = QuizAttemptSerializer(attempts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get quiz statistics"""
        quiz = self.get_object()
        
        if request.user.role == 'student':
            raise PermissionDenied("Only teachers can view quiz statistics.")
            
        if request.user.role == 'teacher' and quiz.topic.course.teacher != request.user:
            raise PermissionDenied("You can only view statistics for your own quizzes.")
        
        attempts = quiz.attempts.all()
        if not attempts.exists():
            return Response({
                'message': 'No attempts yet for this quiz'
            })

        total_attempts = attempts.count()
        passing_attempts = attempts.filter(passed=True).count()
        
        return Response({
            'total_attempts': total_attempts,
            'passing_attempts': passing_attempts,
            'passing_rate': (passing_attempts / total_attempts) * 100 if total_attempts > 0 else 0,
            'average_score': attempts.aggregate(Avg('score'))['score__avg'] or 0,
            'average_time': attempts.exclude(time_taken=None).aggregate(
                Avg('time_taken')
            )['time_taken__avg']
        })    

    def perform_destroy(self, instance):
        """Handle quiz deletion"""
        if instance.attempts.exists():
            raise ValidationError("Cannot delete quiz with existing attempts.")
        instance.delete()

    def destroy(self, request, *args, **kwargs):
        """Custom destroy method to handle deletion response"""
        try:
            instance = self.get_object()
            
            # Check if the user is the course teacher
            if request.user.role != 'teacher' or instance.topic.course.teacher != request.user:
                return Response(
                    {"error": "You can only delete quizzes from your own courses"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            self.perform_destroy(instance)
            return Response(
                {"message": "Quiz deleted successfully"},
                status=status.HTTP_204_NO_CONTENT
            )
        except Quiz.DoesNotExist:
            return Response(
                {"error": "Quiz not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValidationError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class QuizAttemptViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing quiz attempts
    """
    serializer_class = QuizAttemptSerializer
    
    def get_queryset(self):
        if self.request.user.role == 'teacher':
            return QuizAttempt.objects.filter(
                quiz__topic__course__teacher=self.request.user
            )
        return QuizAttempt.objects.filter(student=self.request.user)

    @action(detail=True, methods=['get'])
    def time_remaining(self, request, pk=None):
        """Get remaining time for a quiz attempt"""
        attempt = self.get_object()
        remaining = attempt.check_time_remaining()
        
        return Response({
            'time_remaining': remaining,
            'is_expired': attempt.is_expired
        })

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit the quiz attempt"""
        attempt = self.get_object()
        
        print(f"Submit attempt called for quiz attempt ID: {attempt.id}")
        
        if attempt.student != request.user:
            raise PermissionDenied("You can only submit your own quiz attempts.")
            
        # If the quiz is already completed, return the results instead of an error
        if attempt.completed_at:
            print(f"Quiz already submitted at {attempt.completed_at}, returning results")
            return Response({
                "score": attempt.score,
                "passed": attempt.passed,
                "time_taken": attempt.time_taken,
                "message": "Quiz was already submitted"
            })
        
        # Check if any questions were answered
        response_count = attempt.responses.count()
        print(f"Response count: {response_count}")
        
        if response_count == 0:
            # No responses found - could happen if student skipped all questions
            # Set score to 0 and mark as complete
            attempt.score = 0
            attempt.passed = False
            attempt.completed_at = timezone.now()
            attempt.save()
            
            return Response({
                "score": attempt.score,
                "passed": attempt.passed,
                "time_taken": attempt.time_taken
            })
        
        attempt.calculate_final_score()
        
        return Response({
            "score": attempt.score,
            "passed": attempt.passed,
            "time_taken": attempt.time_taken
        })

    def auto_submit(self, attempt):
        """Handle automatic submission when time expires"""
        # Save whatever answers were completed
        responses = attempt.responses.all()
        score = self.calculate_score(responses)
        
        attempt.completed_at = timezone.now()
        attempt.score = score
        attempt.passed = score >= attempt.quiz.pass_mark
        attempt.save()

        return Response({
            'message': 'Quiz auto-submitted due to time expiration',
            'score': score,
            'passed': attempt.passed
        })

    def process_submission(self, attempt, data):
        """Process a manual quiz submission"""
        if attempt.is_expired:
            return Response(
                {'error': 'Quiz time has expired'}
            , status=status.HTTP_400_BAD_REQUEST)

        # Calculate score from submitted answers
        score = self.calculate_score(data.get('responses', []))
        
        attempt.completed_at = timezone.now()
        attempt.score = score
        attempt.passed = score >= attempt.quiz.pass_mark
        attempt.save()

        return Response({
            'message': 'Quiz submitted successfully',
            'score': score,
            'passed': attempt.passed
        })

    def calculate_score(self, responses):
        """Calculate quiz score from responses"""
        total_points = 0
        earned_points = 0

        for response in responses:
            question = response.question
            total_points += question.points
            earned_points += response.calculate_points()

        return (earned_points / total_points * 100) if total_points > 0 else 0
    @action(detail=True, methods=['post'])
    def answer_question(self, request, pk=None):
        """Submit answer for current question"""
        attempt = self.get_object()
        
        print(f"answer_question called for attempt ID: {attempt.id}")
        print(f"Request data: {request.data}")
        
        if attempt.student != request.user:
            raise PermissionDenied("You can only answer your own quiz attempts.")
            
        if attempt.completed_at:
            print(f"Quiz already completed at {attempt.completed_at}")
            return Response(
                {"error": "Quiz attempt already completed"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if attempt.is_expired:
            print(f"Quiz is expired")
            return Response(
                {"error": "Quiz attempt has expired"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        current_question = attempt.get_current_question()
        print(f"Current question: {current_question}")
        if not current_question:
            print(f"No current question found for attempt {attempt.id}")
            return Response(
                {"error": "No current question"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Get selected choice IDs
        # Handle both formats: {selected_choices: [1,2]} or {'selected_choices[]': [1,2]}
        selected_choice_ids = []
        
        if 'selected_choices' in request.data:
            choices = request.data.get('selected_choices', [])
            # Convert to list if it's a single value
            if not isinstance(choices, list):
                selected_choice_ids = [int(choices)]
            else:
                selected_choice_ids = [int(choice) for choice in choices]
        elif 'selected_choices[]' in request.data:
            # Handle array format from form data
            choices = request.data.getlist('selected_choices[]', [])
            selected_choice_ids = [int(choice) for choice in choices]
        else:
            # Try to get from any field that might contain choices
            for key, value in request.data.items():
                if 'choice' in key.lower() or 'select' in key.lower():
                    if isinstance(value, list):
                        selected_choice_ids = [int(v) for v in value]
                    else:
                        selected_choice_ids = [int(value)]
                    break
        
        print(f"Selected choice IDs: {selected_choice_ids}")
        if not selected_choice_ids:
            print(f"No choices selected")
            return Response(
                {"error": "No choices selected"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Validate choices belong to current question
        valid_choices = current_question.choices.filter(id__in=selected_choice_ids)
        print(f"Valid choices found: {valid_choices.count()} out of {len(selected_choice_ids)} submitted")
        if valid_choices.count() != len(selected_choice_ids):
            print(f"Invalid choice selections: {selected_choice_ids}")
            print(f"Valid choices for this question: {list(current_question.choices.values_list('id', flat=True))}")
            return Response(
                {"error": "Invalid choice selections"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Create response for current question
        response = QuestionResponse.objects.create(
            attempt=attempt,
            question=current_question
        )
        response.selected_choices.set(valid_choices)
        
        # Calculate points
        correct_choices = current_question.choices.filter(is_correct=True)
        selected_correct = valid_choices.filter(is_correct=True).count()
        total_correct = correct_choices.count()
        
        if selected_correct == total_correct and len(selected_choice_ids) == total_correct:
            response.points_earned = current_question.points
        else:
            response.points_earned = 0
        response.save()
        
        # Move to next question
        is_last_question = not attempt.advance_question()
        
        # If this was the last question, calculate final score
        if is_last_question:
            attempt.calculate_final_score()
            return Response({
                "message": "Quiz completed",
                "score": attempt.score,
                "passed": attempt.passed
            })
            
        # Get next question
        return self.current_question(request, pk)

    def handle_expired_attempt(self, attempt):
        """Handle expired quiz attempt"""
        if not attempt.completed_at:
            attempt.calculate_final_score()
        
        return Response({
            'message': 'Quiz time has expired',
            'score': attempt.score,
            'passed': attempt.passed
        })

    def complete_quiz(self, attempt):
        """Complete the quiz and return results"""
        score = attempt.calculate_final_score()
        
        return Response({
            'message': 'Quiz completed',
            'score': score,
            'passed': attempt.passed,
            'required_score': attempt.quiz.pass_mark,
            'can_retry': True
        })
    
    @action(detail=True, methods=['get'])
    def current_question(self, request, pk=None):
        """Get the current question for this attempt"""
        attempt = self.get_object()
        
        if attempt.student != request.user:
            raise PermissionDenied("You can only view your own quiz attempts.")
            
        if attempt.completed_at:
            return Response({"message": "Quiz attempt already completed"})
            
        question = attempt.get_current_question()
        if not question:
            return Response({"message": "No more questions"})
            
        return Response({
            "question": {
                "id": question.id,
                "text": question.question_text,
                "points": question.points,
                "choices": [
                    {"id": choice.id, "text": choice.choice_text}
                    for choice in question.choices.all()
                ]
            },
            "time_remaining": attempt.check_time_remaining(),
            "current_question_index": attempt.current_question_index + 1,
            "total_questions": len(attempt.question_order)
        })

    @action(detail=True, methods=['post'])
    def answer_question(self, request, pk=None):
        """Submit answer for current question"""
        attempt = self.get_object()
        
        if attempt.student != request.user:
            raise PermissionDenied("You can only answer your own quiz attempts.")
            
        if attempt.completed_at:
            return Response(
                {"error": "Quiz attempt already completed"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if attempt.is_expired:
            return Response(
                {"error": "Quiz attempt has expired"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        current_question = attempt.get_current_question()
        if not current_question:
            return Response(
                {"error": "No current question"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Get selected choice IDs
        selected_choice_ids = request.data.get('selected_choices', [])
        print(f"Selected choice IDs: {selected_choice_ids}")
        if not selected_choice_ids:
            return Response(
                {"error": "No choices selected"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Validate choices belong to current question
        valid_choices = current_question.choices.filter(id__in=selected_choice_ids)
        print(f"Valid choices found: {valid_choices.count()} out of {len(selected_choice_ids)} submitted")
        if len(valid_choices) != len(selected_choice_ids):
            print(f"Invalid choice selections: {selected_choice_ids}")
            print(f"Valid choices for this question: {list(current_question.choices.values_list('id', flat=True))}")
            return Response(
                {"error": "Invalid choice selections"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Create response
        response = QuestionResponse.objects.create(
            attempt=attempt,
            question=current_question
        )
        response.selected_choices.set(valid_choices)
        
        # Calculate points
        correct_choices = current_question.choices.filter(is_correct=True)
        selected_correct = valid_choices.filter(is_correct=True).count()
        total_correct = correct_choices.count()
        
        if selected_correct == total_correct and len(selected_choice_ids) == total_correct:
            response.points_earned = current_question.points
        else:
            response.points_earned = 0
        response.save()
        
        # Move to next question
        is_last_question = not attempt.advance_question()
        
        # If this was the last question, calculate final score
        if is_last_question:
            attempt.calculate_final_score()
            return Response({
                "message": "Quiz completed",
                "score": attempt.score,
                "passed": attempt.passed
            })
            
        # Get next question
        return self.current_question(request, pk)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit the quiz attempt"""
        attempt = self.get_object()
        
        if attempt.student != request.user:
            raise PermissionDenied("You can only submit your own quiz attempts.")
            
        if attempt.completed_at:
            return Response({"error": "Quiz already submitted"}, status=400)
            
        attempt.calculate_final_score()
        
        return Response({
            "score": attempt.score,
            "passed": attempt.passed,
            "time_taken": attempt.time_taken
        })

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """Get the results of a completed quiz attempt"""
        attempt = self.get_object()
        
        print(f"Results requested for quiz attempt ID: {attempt.id}")
        
        if attempt.student != request.user:
            raise PermissionDenied("You can only view your own quiz results.")
            
        if not attempt.completed_at:
            return Response({"error": "Quiz not yet completed"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the total number of questions in the quiz
        total_questions = attempt.quiz.questions.count()
        
        # Get the number of correct answers
        responses = attempt.responses.all()
        correct_answers = sum(1 for response in responses if response.points_earned > 0)
        
        return Response({
            "score": attempt.score,
            "passed": attempt.passed,
            "time_taken": attempt.time_taken,
            "total_questions": total_questions,
            "correct_answers": correct_answers,
            "completed_at": attempt.completed_at,
        })

class QuestionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing individual questions within a quiz.
    """
    serializer_class = QuestionSerializer
    permission_classes = [IsTeacherForCourse]

    def get_queryset(self):
        return Question.objects.filter(
            quiz__topic__course__teacher=self.request.user
        ).prefetch_related('choices')

    def perform_create(self, serializer):
        quiz_id = self.request.data.get('quiz')
        quiz = get_object_or_404(Quiz, id=quiz_id)
        
        if quiz.topic.course.teacher != self.request.user:
            raise PermissionDenied("You can only add questions to your own quizzes.")
        
        # Set the order to be last if not specified
        if not serializer.validated_data.get('order'):
            last_order = quiz.questions.aggregate(Max('order'))['order__max'] or 0
            serializer.validated_data['order'] = last_order + 1
        
        serializer.save(quiz=quiz)

    @action(detail=True, methods=['post'])
    def reorder(self, request, pk=None):
        """Reorder questions within a quiz"""
        question = self.get_object()
        new_order = request.data.get('order')
        
        if new_order is None:
            return Response(
                {'error': 'New order not specified'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update orders of affected questions
        with transaction.atomic():
            if new_order > question.order:
                # Moving down: decrease order of questions in between
                Question.objects.filter(
                    quiz=question.quiz,
                    order__gt=question.order,
                    order__lte=new_order
                ).update(order=F('order') - 1)
            else:
                # Moving up: increase order of questions in between
                Question.objects.filter(
                    quiz=question.quiz,
                    order__gte=new_order,
                    order__lt=question.order
                ).update(order=F('order') + 1)
            
            question.order = new_order
            question.save()

        return Response({'message': 'Question reordered successfully'})

class QuizAttemptListView(generics.ListAPIView):
    """
    View for teachers to see all attempts for their quizzes.
    Can filter by student, quiz, or date range.
    """
    serializer_class = QuizAttemptSerializer
    permission_classes = [IsTeacherForCourse]

    def get_queryset(self):
        queryset = QuizAttempt.objects.filter(
            quiz__topic__course__teacher=self.request.user
        ).select_related('student', 'quiz')

        # Apply filters
        student_id = self.request.query_params.get('student')
        quiz_id = self.request.query_params.get('quiz')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if quiz_id:
            queryset = queryset.filter(quiz_id=quiz_id)
        if start_date:
            queryset = queryset.filter(started_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(started_at__lte=end_date)

        return queryset

    def get(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        data = self.get_serializer(queryset, many=True).data
        
        # Add summary statistics
        summary = {
            'total_attempts': queryset.count(),
            'passing_attempts': queryset.filter(passed=True).count(),
            'average_score': queryset.aggregate(Avg('score'))['score__avg'] or 0,
        }
        
        return Response({
            'summary': summary,
            'attempts': data
        })
class QuizAvailabilityView(APIView):
    """
    Check if a quiz is available for a student in a specific topic
    """
    def get(self, request, topic_id):
        topic = get_object_or_404(Topic, id=topic_id)
        
        # Check if student can access this topic
        if not topic.is_accessible(request.user):
            return Response({
                'available': False,
                'reason': 'Previous topic quiz not passed',
                'required_lessons': topic.quiz_required_lessons,
                'completed_lessons': 0
            })

        # Get student's progress
        progress = topic.get_student_progress(request.user)
        
        return Response({
            'available': progress['quiz_available'],
            'required_lessons': topic.quiz_required_lessons,
            'completed_lessons': progress['completed_lessons'],
            'quiz_status': progress['quiz_status']
        })

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
        
        return {
            "enrolledCourses": enrollments.count(),
            "completedCourses": completed_courses,
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
            print(f"Error fetching dashboard stats: {str(e)}")
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
                recent_enrollments = CourseEnrollment.objects.filter(
                    course__teacher=user,
                    enrolled_at__gte=now - timedelta(days=7)
                ).order_by('-enrolled_at')[:5]

                recent_quiz_attempts = QuizAttempt.objects.filter(
                    quiz__topic__course__teacher=user,
                    completed_at__isnull=False
                ).order_by('-completed_at')[:5]

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
                ).order_by('-completed_at')[:5]

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
            print(f"Error fetching notifications: {str(e)}")
            return Response(
                {"error": "Failed to fetch notifications"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AvailableCoursesView(APIView):
    """View for fetching available courses for students."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Return list of available courses."""
        try:
            # Get the student's enrolled courses
            enrolled_courses = CourseEnrollment.objects.filter(
                student=request.user
            ).values_list('course_id', flat=True)
            
            # Get all active courses that the student is not enrolled in
            available_courses = Course.objects.exclude(
                id__in=enrolled_courses
            ).select_related('teacher')
            
            # Serialize the courses
            courses_data = []
            for course in available_courses:
                courses_data.append({
                    "id": course.id,
                    "title": course.title,
                    "description": course.description,
                    "teacher": {
                        "id": course.teacher.id,
                        "name": course.teacher.get_full_name() or course.teacher.username
                    } if course.teacher else None,
                    "topics_count": course.topics.count(),
                    "enrolled_students": CourseEnrollment.objects.filter(course=course).count(),
                })
            
            return Response(courses_data)
        except Exception as e:
            print(f"Error fetching available courses: {str(e)}")
            return Response(
                {"error": "Failed to fetch available courses"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class StudentCoursesView(generics.ListAPIView):
    """View for students to see their enrolled courses."""
    serializer_class = CourseSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        return Course.objects.filter(
            enrollments__student=self.request.user
        ).annotate(
            topic_count=Count('topics'),
            enrolled_students_count=Count('enrollments'),
            teacher_name=F('teacher__username')
        )

from rest_framework.decorators import api_view, permission_classes
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_quiz(request, course_id, topic_id):
    """Get a quiz for a specific topic."""
    try:
        print(f"get_quiz called for course_id={course_id}, topic_id={topic_id}")
        
        topic = get_object_or_404(Topic, id=topic_id, course_id=course_id)
        quiz = get_object_or_404(Quiz, topic=topic)
        
        print(f"Quiz found: {quiz.id}, title: {quiz.title}")
        print(f"Questions count in DB: {quiz.questions.count()}")
        
        # Debug: Check questions directly from the database
        all_questions = list(quiz.questions.all())
        print(f"Direct question query found {len(all_questions)} questions")
        for i, q in enumerate(all_questions):
            print(f"Question {i+1}: {q.question_text} (ID: {q.id})")
            print(f"  Choices: {q.choices.count()}")
        
        # Prefetch questions and choices for better performance and to ensure they're included
        quiz = Quiz.objects.prefetch_related(
            'questions', 
            'questions__choices'
        ).get(id=quiz.id)
        
        # Manual serialization to ensure questions and choices are included
        questions = []
        for question in quiz.questions.all():
            choices = []
            for choice in question.choices.all():
                choices.append({
                    'id': choice.id,
                    'choice_text': choice.choice_text,
                    'is_correct': choice.is_correct
                })
            
            questions.append({
                'id': question.id,
                'question_text': question.question_text,
                'question_type': question.question_type,
                'points': question.points,
                'order': question.order,
                'choices': choices
            })
        
        # Build the quiz data with questions
        quiz_data = {
            'id': quiz.id,
            'title': quiz.title,
            'description': quiz.description,
            'pass_mark': quiz.pass_mark,
            'time_limit': quiz.time_limit,
            'created_at': quiz.created_at,
            'updated_at': quiz.updated_at,
            'total_points': sum(question.points for question in quiz.questions.all()),
            'question_count': quiz.questions.count(),
            'questions': questions
        }
        
        print(f"Returning quiz with {len(questions)} questions")
        print(f"Final quiz data structure: {quiz_data.keys()}")
        print(f"Questions in response: {len(quiz_data['questions'])}")
        
        return Response(quiz_data)
    except Exception as e:
        print(f"Error in get_quiz: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_teacher_course_detail(request, course_id):
    """Get a detailed course view for teachers including all quiz data."""
    try:
        if request.user.role != 'teacher':
            return Response(
                {"error": "Only teachers can access this endpoint"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the course with prefetched data
        course = get_object_or_404(
            Course.objects.filter(teacher=request.user), 
            id=course_id
        )
        
        # Manually build the response to include complete quiz data
        topics_data = []
        
        for topic in course.topics.all().order_by('order'):
            # Get topic data
            topic_data = {
                'id': topic.id,
                'title': topic.title,
                'description': topic.description,
                'order': topic.order,
                'lessons': [],
                'quiz': None
            }
            
            # Add lessons
            for lesson in topic.lessons.all().order_by('order'):
                lesson_data = {
                    'id': lesson.id,
                    'title': lesson.title,
                    'description': lesson.description,
                    'order': lesson.order,
                    'pdf': lesson.pdf.url if lesson.pdf else None,
                    'video': lesson.video.url if lesson.video else None,
                    'external_links': lesson.external_links,
                    'contextual_help': lesson.contextual_help
                }
                topic_data['lessons'].append(lesson_data)
            
            # Add quiz with questions if it exists
            try:
                quiz = topic.quiz
                
                # If quiz exists, build complete quiz data with questions
                if quiz:
                    questions = []
                    
                    # Get all questions with choices
                    for question in quiz.questions.all():
                        choices = []
                        for choice in question.choices.all():
                            choices.append({
                                'id': choice.id,
                                'choice_text': choice.choice_text,
                                'is_correct': choice.is_correct
                            })
                        
                        questions.append({
                            'id': question.id,
                            'question_text': question.question_text,
                            'question_type': question.question_type,
                            'points': question.points,
                            'order': question.order,
                            'choices': choices
                        })
                    
                    # Build the quiz data
                    topic_data['quiz'] = {
                        'id': quiz.id,
                        'title': quiz.title,
                        'description': quiz.description,
                        'pass_mark': quiz.pass_mark,
                        'time_limit': quiz.time_limit,
                        'created_at': quiz.created_at,
                        'updated_at': quiz.updated_at,
                        'total_points': sum(question.points for question in quiz.questions.all()),
                        'question_count': quiz.questions.count(),
                        'questions': questions
                    }
            except Topic.quiz.RelatedObjectDoesNotExist:
                # No quiz for this topic
                pass
            
            topics_data.append(topic_data)
        
        # Build the course data
        course_data = {
            'id': course.id,
            'title': course.title,
            'description': course.description,
            'topics': topics_data
        }
        
        return Response(course_data)
    except Exception as e:
        print(f"Error in get_teacher_course_detail: {str(e)}")
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)