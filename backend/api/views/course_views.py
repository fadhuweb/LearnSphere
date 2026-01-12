import logging
import os
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import Count, F, Exists, OuterRef, Prefetch
from django.utils import timezone
from django.http import FileResponse, Http404
from django.conf import settings
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError

from api.models import (
    Course, Topic, Lesson, Quiz, Question, Choice,
    CourseEnrollment, LessonCompletion, QuizAttempt
)
from api.serializers import (
    CourseSerializer, TopicSerializer, LessonSerializer,
    CourseEnrollmentSerializer, CourseAssignmentSerializer,
    QuizSerializer
)
from api.permissions import (
    IsAdmin, IsTeacher, IsStudent, IsStudentOrTeacherOrAdmin,
    IsAssignedTeacher, IsTeacherForCourse, IsEnrolledStudent,
    IsAdminOrAssignedTeacherOrEnrolledStudent, IsTeacherorAdmin
)
from api.utils import log_action

logger = logging.getLogger(__name__)
User = get_user_model()

class CourseCreateView(generics.CreateAPIView):
    """Only admins can create courses"""
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAdmin]

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

class AvailableCoursesView(APIView):
    """View for fetching available courses for students."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Return list of available courses."""
        try:
            # Get the student's enrolled courses IDs
            enrolled_course_ids = CourseEnrollment.objects.filter(
                student=request.user
            ).values_list('course_id', flat=True)
            
            # Get available courses with optimizations
            # Use select_related for foreign keys (teacher)
            # Use annotate for counts to avoid N+1 count queries
            available_courses = Course.objects.exclude(
                id__in=enrolled_course_ids
            ).select_related('teacher').annotate(
                topics_count=Count('topics', distinct=True),
                quiz_count=Count('topics__quiz', distinct=True),
                enrolled_students_count=Count('enrollments', distinct=True)
            )
            
            # Serialize the courses using the annotated data
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
                    "topics_count": course.topics_count,
                    "quiz_count": course.quiz_count,
                    "enrolled_students": course.enrolled_students_count,
                })
            
            return Response(courses_data)
        except Exception as e:
            logger.error(f"Error fetching available courses: {str(e)}", exc_info=True)
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
            quiz_count=Count('topics__quiz', distinct=True),
            enrolled_students_count=Count('enrollments'),
            teacher_name=F('teacher__username')
        )

class TeacherCourseListView(generics.ListAPIView):
    """Teachers can view only their assigned courses."""
    serializer_class = CourseSerializer
    permission_classes = [IsTeacherForCourse]

    def get_queryset(self):
        return Course.objects.filter(teacher=self.request.user).annotate(
            topic_count=Count('topics'),
            quiz_count=Count('topics__quiz', distinct=True),
            enrolled_students_count=Count('enrollments')
        )

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


class UnenrollCourseView(APIView):
    """Allow students to unenroll from a course."""
    permission_classes = [IsStudent]

    def delete(self, request, course_id):
        enrollment = CourseEnrollment.objects.filter(student=request.user, course_id=course_id).first()
        if not enrollment:
            return Response({"error": "You are not enrolled in this course"}, status=status.HTTP_400_BAD_REQUEST)
        
        enrollment.delete()
        return Response({"message": "Successfully unenrolled from the course"}, status=status.HTTP_200_OK)

class CourseDetailView(generics.RetrieveAPIView):
    """Get details of a single course. Only Admins, Assigned Teachers, and Enrolled Students can access."""
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = [IsAdminOrAssignedTeacherOrEnrolledStudent]

    def get_queryset(self):
        logger.debug(f"CourseDetailView accessed by {self.request.user.username} ({self.request.user.role})")
        
        course_id = self.kwargs.get('pk')
        
        if self.request.user.role == 'student':
            is_enrolled = CourseEnrollment.objects.filter(
                student=self.request.user,
                course_id=course_id
            ).exists()
            logger.debug(f"Student is enrolled: {is_enrolled}")

        # Make sure we explicitly prefetch lessons
        queryset = Course.objects.annotate(
            teacher_name=F('teacher__username'),
            topic_count=Count('topics'),
            quiz_count=Count('topics__quiz', distinct=True),
            enrolled_students_count=Count('enrollments')
        ).prefetch_related(
            Prefetch('topics', queryset=Topic.objects.prefetch_related('lessons')),
            'topics__quiz'
        )
        
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

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
        
        # Get the course with aggressive prefetching for all nested data
        # fetching: Course -> Topics -> Lessons
        #                   -> Quiz -> Questions -> Choices
        course = get_object_or_404(
            Course.objects.prefetch_related(
                # Prefetch topics and order them (handled in python sorting usually, but good to have)
                Prefetch('topics', queryset=Topic.objects.order_by('order')),
                # Prefetch lessons for each topic
                'topics__lessons',
                # Prefetch quiz for each topic
                'topics__quiz',
                # Prefetch questions for each quiz
                'topics__quiz__questions',
                # Prefetch choices for each question
                'topics__quiz__questions__choices'
            ).filter(teacher=request.user), 
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
        logger.error(f"Error in get_teacher_course_detail: {str(e)}", exc_info=True)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Topic Views
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

# Lesson Views
class LessonCreateView(generics.CreateAPIView):
    """Allows teachers to add lessons to a topic inside their course."""
    serializer_class = LessonSerializer
    permission_classes = [IsTeacherForCourse]
    parser_classes = (MultiPartParser, FormParser)

    def create(self, request, *args, **kwargs):
        # Debug logging
        logger.debug("======= LESSON CREATE REQUEST =======")
        logger.debug(f"Request data keys: {request.data.keys()}")
        if hasattr(request, 'FILES'):
            logger.debug(f"Request FILES keys: {request.FILES.keys()}")
            for file_key, file_obj in request.FILES.items():
                logger.debug(f"File uploaded: {file_key} - {file_obj.name} ({file_obj.size} bytes)")
        
        logger.debug(f"URL kwargs: {kwargs}")
        logger.debug("=======================================")
        
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        course_id = self.kwargs["course_id"]
        topic_id = self.kwargs["topic_id"]

        logger.debug(f"Creating lesson for course_id={course_id}, topic_id={topic_id}")
        
        try:
            # Get course & topic
            course = get_object_or_404(Course, id=course_id)
            topic = get_object_or_404(Topic, id=topic_id, course=course)
            
            logger.debug(f"Found course: {course.title}, topic: {topic.title}")

            # Ensure teacher is assigned to the course
            if course.teacher != self.request.user:
                logger.warning(f"Permission denied: {self.request.user.username} is not the teacher for this course")
                raise serializers.ValidationError("You can only add lessons to your own course topics.")

            # Set the order
            last_order = Lesson.objects.filter(topic=topic).count()
            logger.debug(f"Setting order to {last_order + 1}")
            
            # Save lesson with the topic from URL
            logger.debug("Saving lesson with topic and order")
            instance = serializer.save(topic=topic, order=last_order + 1)
            logger.info(f"Lesson saved successfully with ID {instance.id}")
            
        except Exception as e:
            logger.error(f"Error in perform_create: {str(e)}", exc_info=True)
            raise

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

class LessonDetailView(generics.RetrieveAPIView):
    """Get a single lesson by ID. Only Admins, Assigned Teachers, and Enrolled Students can access."""
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [IsAdminOrAssignedTeacherOrEnrolledStudent]

    def get_object(self):
        obj = super().get_object()
        logger.debug(f"Lesson: {obj.title}, Topic: {obj.topic.title}, Course: {obj.course.title}")
        logger.debug(f"User role: {self.request.user.role}")

        if self.request.user.role == 'student':
            is_enrolled = CourseEnrollment.objects.filter(
                student=self.request.user,
                course=obj.course
            ).exists()
            logger.debug(f"Student is enrolled: {is_enrolled}")
        return obj

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

class LessonListView(generics.ListAPIView):
    """Get all lessons. Only Admins, Assigned Teachers, and Enrolled Students can access."""
    queryset = Lesson.objects.all()
    serializer_class = LessonSerializer
    permission_classes = [IsAdminOrAssignedTeacherOrEnrolledStudent]

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
