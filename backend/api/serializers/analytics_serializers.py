from rest_framework import serializers
from api.models import ProgressTracker

class ProgressTrackerSerializer(serializers.ModelSerializer):
    student = serializers.ReadOnlyField(source='student.username')
    course = serializers.ReadOnlyField(source='course.title')
    lesson = serializers.ReadOnlyField(source='lesson.title')

    class Meta:
        model = ProgressTracker
        fields = ['id', 'student', 'course', 'lesson', 'completed']
