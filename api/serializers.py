from rest_framework import serializers
from .models import Topic, Lesson, Quiz

class BasicQuizSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'pass_mark', 'time_limit']

class TopicSerializer(serializers.ModelSerializer):
    course = serializers.ReadOnlyField(source="course.id")
    lessons = LessonSerializer(many=True, read_only=True)
    quiz = BasicQuizSerializer(read_only=True)

    class Meta:
        model = Topic
        fields = [
            'id', 
            'course', 
            'title', 
            'order', 
            'lessons',
            'quiz',
            'quiz_required_lessons',
            'quiz_pass_mark',
            'quiz_time_limit',
            'created_at',
            'updated_at'
        ]