import logging
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Count, F, Max, Avg
from django.utils import timezone
from datetime import timedelta
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError

from api.models import (
    Topic, Quiz, Question, Choice, QuizAttempt, QuestionResponse
)
from api.serializers import (
    QuizSerializer, QuestionSerializer, QuizAttemptSerializer,
    QuizResultSerializer, QuizTakingSerializer
)
from api.permissions import (
    IsTeacher, IsTeacherForCourse
)
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)
User = get_user_model()

class QuizCreateView(generics.CreateAPIView):
    """View for creating a new quiz.
    Only teachers can create quizzes for their topics.
    """
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def perform_create(self, serializer):
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
    permission_classes = [IsAuthenticated, IsTeacherForCourse]
    
    def get_object(self):
        topic_id = self.kwargs.get('topic_id')
        course_id = self.kwargs.get('course_id')
        topic = get_object_or_404(Topic, id=topic_id, course_id=course_id)
        quiz = get_object_or_404(Quiz, topic=topic)
        self.check_object_permissions(self.request, quiz.topic)
        return quiz
    
    def perform_update(self, serializer):
        serializer.save()


class QuizDeleteView(generics.DestroyAPIView):
    """View for deleting an existing quiz.
    Only teachers can delete quizzes for their topics.
    """
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated, IsTeacherForCourse]
    
    def get_object(self):
        course_id = self.kwargs.get('course_id')
        topic_id = self.kwargs.get('topic_id')
        
        topic = get_object_or_404(Topic, id=topic_id, course_id=course_id)
        quiz = get_object_or_404(Quiz, topic=topic)
        self.check_object_permissions(self.request, quiz.topic)
        return quiz

class QuizDetailView(viewsets.ModelViewSet):
    """ViewSet for Quiz CRUD operations and statistics.
    Teachers can create/edit/delete quizzes for their topics.
    Students can only view quizzes in their enrolled courses.
    """
    serializer_class = QuizSerializer
    permission_classes = [IsAuthenticated, IsTeacherForCourse]

    def get_queryset(self):
        return Quiz.objects.all()

    def get_object(self):
        course_id = self.kwargs.get('course_id')
        topic_id = self.kwargs.get('topic_id')
        
        topic = get_object_or_404(Topic, id=topic_id, course_id=course_id)
        quiz = get_object_or_404(Quiz, topic=topic)
        self.check_object_permissions(self.request, quiz.topic)
        return quiz

    def create(self, request, *args, **kwargs):
        """Create a new quiz"""
        # Manual check for create since we don't have an object yet
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
        # Permission check handled by get_object -> check_object_permissions
        serializer.save()

    def perform_destroy(self, instance):
        """Only teachers can delete their own quizzes"""
        # Permission check handled by get_object -> check_object_permissions
            
        if instance.attempts.exists():
            raise ValidationError("Cannot delete quiz with existing attempts")
            
        instance.delete()

    @action(detail=True, methods=['get'])
    def statistics(self, request, course_id=None, topic_id=None):
        """Get quiz statistics. Only available to teachers."""
        quiz = self.get_object()
        # Permission check handled by get_object -> check_object_permissions
        
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

class QuizViewSet(viewsets.ModelViewSet):
    """ViewSet for Quiz CRUD operations."""
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
        
        logger.info(f"Submit attempt called for quiz attempt ID: {attempt.id}")
        
        if attempt.student != request.user:
            raise PermissionDenied("You can only submit your own quiz attempts.")
            
        # If the quiz is already completed, return the results instead of an error
        if attempt.completed_at:
            logger.info(f"Quiz already submitted at {attempt.completed_at}, returning results")
            return Response({
                "score": attempt.score,
                "passed": attempt.passed,
                "time_taken": attempt.time_taken,
                "message": "Quiz was already submitted"
            })
        
        # Check if any questions were answered
        response_count = attempt.responses.count()
        logger.info(f"Response count: {response_count}")
        
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

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        """Get the results of a completed quiz attempt"""
        attempt = self.get_object()
        
        logger.info(f"Results requested for quiz attempt ID: {attempt.id}")
        
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
    
    @action(detail=True, methods=['post'])
    def answer_question(self, request, pk=None):
        """Submit answer for current question"""
        attempt = self.get_object()
        
        logger.debug(f"answer_question called for attempt ID: {attempt.id}")
        
        if attempt.student != request.user:
            raise PermissionDenied("You can only answer your own quiz attempts.")
            
        if attempt.completed_at:
            return Response({
                "error": "Quiz attempt already completed"
            }, status=status.HTTP_400_BAD_REQUEST)
            
        if attempt.is_expired:
            return Response({
                "error": "Quiz attempt has expired"
            }, status=status.HTTP_400_BAD_REQUEST)
            
        current_question = attempt.get_current_question()
        if not current_question:
            return Response({
                "error": "No current question"
            }, status=status.HTTP_400_BAD_REQUEST)
            
        selected_choice_ids = []
        if 'selected_choices' in request.data:
            choices = request.data.get('selected_choices', [])
            if not isinstance(choices, list):
                selected_choice_ids = [int(choices)]
            else:
                selected_choice_ids = [int(choice) for choice in choices]
        elif 'selected_choices[]' in request.data:
            choices = request.data.getlist('selected_choices[]', [])
            selected_choice_ids = [int(choice) for choice in choices]
        else:
            for key, value in request.data.items():
                if 'choice' in key.lower() or 'select' in key.lower():
                    if isinstance(value, list):
                        selected_choice_ids = [int(v) for v in value]
                    else:
                        selected_choice_ids = [int(value)]
                    break
        
        if not selected_choice_ids:
            return Response({
                "error": "No choices selected"
            }, status=status.HTTP_400_BAD_REQUEST)
            
        valid_choices = current_question.choices.filter(id__in=selected_choice_ids)
        if valid_choices.count() != len(selected_choice_ids):
            return Response({
                "error": "Invalid choice selections"
            }, status=status.HTTP_400_BAD_REQUEST)
            
        response = QuestionResponse.objects.create(
            attempt=attempt,
            question=current_question
        )
        response.selected_choices.set(valid_choices)
        
        correct_choices = current_question.choices.filter(is_correct=True)
        selected_correct = valid_choices.filter(is_correct=True).count()
        total_correct = correct_choices.count()
        
        if selected_correct == total_correct and len(selected_choice_ids) == total_correct:
            response.points_earned = current_question.points
        else:
            response.points_earned = 0
        response.save()
        
        is_last_question = not attempt.advance_question()
        
        if is_last_question:
            attempt.calculate_final_score()
            return Response({
                "message": "Quiz completed",
                "score": attempt.score,
                "passed": attempt.passed
            })
            
        return self.current_question(request, pk)

    @action(detail=True, methods=['get'])
    def current_question(self, request, pk=None):
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
                "type": question.question_type,
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

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_quiz(request, course_id, topic_id):
    """Get a quiz for a specific topic."""
    try:
        logger.debug(f"get_quiz called for course_id={course_id}, topic_id={topic_id}")
        
        topic = get_object_or_404(Topic, id=topic_id, course_id=course_id)
        quiz = get_object_or_404(Quiz, topic=topic)
        
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
        
        return Response(quiz_data)
    except Exception as e:
        logger.error(f"Error in get_quiz: {str(e)}", exc_info=True)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
