from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.serializers import ValidationError
from django.shortcuts import get_object_or_404
from api.models import Quiz, Topic
from api.serializers import QuizSerializer
from api.permissions import IsTeacherForCourse

class QuizViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Quiz CRUD operations.
    Only teachers can create/edit/delete quizzes for their courses.
    """
    serializer_class = QuizSerializer
    permission_classes = [IsTeacherForCourse]

    def get_queryset(self):
        if self.request.user.role == 'teacher':
            return Quiz.objects.filter(
                topic__course__teacher=self.request.user
            ).prefetch_related('questions', 'questions__choices')
        return Quiz.objects.none()

    def perform_create(self, serializer):
        topic_id = self.request.data.get('topic')
        topic = get_object_or_404(Topic, id=topic_id)
        
        # Ensure teacher owns the course
        if topic.course.teacher != self.request.user:
            raise PermissionDenied("You can only create quizzes for your own courses.")
        
        serializer.save(topic=topic)

    def perform_destroy(self, instance):
        """Handle quiz deletion"""
        # Check if the user has permission to delete this quiz
        if instance.topic.course.teacher != self.request.user:
            raise PermissionDenied("You can only delete quizzes from your own courses.")
        
        try:
            # Delete the quiz and all related objects (questions and choices)
            instance.delete()
        except Exception as e:
            raise ValidationError(f"Failed to delete quiz: {str(e)}")

    def destroy(self, request, *args, **kwargs):
        """Custom destroy method to handle deletion response"""
        try:
            instance = self.get_object()
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
        except PermissionDenied as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            ) 