from rest_framework import serializers
from api.models import Course, Lesson, LessonCompletion, Topic, CourseEnrollment, Quiz
from django.contrib.auth import get_user_model
from .quiz_serializers import BasicQuizSerializer

User = get_user_model()

class LessonSerializer(serializers.ModelSerializer):
    topic = serializers.PrimaryKeyRelatedField(read_only=True)
    is_completed = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Lesson
        fields = [
            "id",
            "topic",
            "title",
            "description",
            "order",
            "pdf",
            "video",
            "pdf_url",
            "video_url",
            "external_links",
            "contextual_help",
            "created_at",
            "updated_at",
            "is_completed"
        ]
        read_only_fields = ["id", "topic", "order", "created_at", "updated_at"]

    def validate(self, data):
        """Additional validation to ensure no undefined values"""
        if data.get('title') == 'undefined':
            raise serializers.ValidationError({'title': 'Title cannot be "undefined"'})
        if data.get('description') == 'undefined':
            raise serializers.ValidationError({'description': 'Description cannot be "undefined"'})
        return data

    def get_is_completed(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated or request.user.role != 'student':
            return None
        return LessonCompletion.objects.filter(
            student=request.user,
            lesson=obj,
            completed=True
        ).exists()

    def get_pdf_url(self, obj):
        if obj.pdf and hasattr(obj.pdf, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.pdf.url)
            return obj.pdf.url
        return None
        
    def get_video_url(self, obj):
        if obj.video and hasattr(obj.video, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video.url)
            return obj.video.url
        return None

class TopicSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    quiz = BasicQuizSerializer(read_only=True)
    quiz_available = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    has_quiz = serializers.SerializerMethodField()
    lesson_count = serializers.SerializerMethodField()
    is_locked = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = [
            'id', 'title', 'order', 'lessons', 'quiz',
            'quiz_available', 'quiz_required_lessons', 'quiz_pass_mark', 'progress',
            'has_quiz', 'lesson_count', 'is_locked'
        ]

    def get_quiz_available(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role == 'student':
            return obj.is_quiz_available(request.user)
        return None

    def get_progress(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role == 'student':
            return obj.get_student_progress(request.user)
        return None

    def get_has_quiz(self, obj):
        return Quiz.objects.filter(topic=obj).exists()
    
    def get_lesson_count(self, obj):
        return obj.lessons.count()

    def get_is_locked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role == 'student':
            return not obj.is_accessible(request.user)
        return False

class CourseSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(read_only=True)
    topic_count = serializers.IntegerField(read_only=True)
    quiz_count = serializers.IntegerField(read_only=True, default=0)
    enrolled_students_count = serializers.IntegerField(read_only=True)
    is_enrolled = serializers.SerializerMethodField()
    topics = TopicSerializer(many=True, read_only=True)
    progress = serializers.SerializerMethodField()
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'teacher_name',
            'topic_count', 'quiz_count', 'enrolled_students_count', 'is_enrolled',
            'topics', 'progress', 'is_completed'
        ]

    def get_is_enrolled(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role == 'student':
            return CourseEnrollment.objects.filter(
                student=request.user,
                course=obj
            ).exists()
        return None

    def get_progress(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role == 'student':
            return obj.get_student_progress(request.user)
        return 0

    def get_is_completed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role == 'student':
            return obj.get_student_progress(request.user) == 100
        return False

class CourseEnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseEnrollment
        fields = ['id', 'student', 'course', 'enrolled_at']
        read_only_fields = ['student']

class CourseAssignmentSerializer(serializers.ModelSerializer):
    teacher_id = serializers.IntegerField(write_only=True, required=True)
    teacher_name = serializers.CharField(source="teacher.username", read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'teacher_id', 'teacher_name']

    def update(self, instance, validated_data):
        try:
            teacher = User.objects.get(id=validated_data['teacher_id'], role='teacher')
            instance.teacher = teacher
            instance.save()
            return instance
        except User.DoesNotExist:
            raise serializers.ValidationError({"teacher_id": "Teacher not found or invalid role"})
