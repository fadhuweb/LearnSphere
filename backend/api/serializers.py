from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from .models import (
    Course, Lesson, Quiz, Question, Choice, 
    CourseEnrollment, ProgressTracker, QuizAttempt, Topic, 
    Quiz, Question, Choice, QuizAttempt, QuestionResponse, LessonCompletion
)
from django.contrib.auth.password_validation import validate_password
import random



User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, min_length=6, style={"input_type": "password"}
    )
    role = serializers.ChoiceField(
        choices=[("student", "Student"), ("teacher", "Teacher"), ("admin", "Admin")],
        default="student"
    )

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "role"]

    def validate_password(self, value):
        """Ensure password meets Django's security requirements"""
        validate_password(value)
        return value

    def create(self, validated_data):
        """Create a user with hashed password and assign role properly."""
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            role=validated_data.get("role", "student")  # Ensure role assignment
        )
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        from django.contrib.auth import authenticate

        # Fetch user manually first
        try:
            user = User.objects.get(username=data['username'])
        except User.DoesNotExist:
            raise serializers.ValidationError({"non_field_errors": ["Invalid username or password"]})

        # Check if the user is suspended BEFORE authenticating
        if user.is_suspended:
            raise serializers.ValidationError({"non_field_errors": ["Your account is suspended. Please contact the admin."]})

        # Authenticate only if the user is NOT suspended
        user = authenticate(username=data['username'], password=data['password'])

        if not user:
            raise serializers.ValidationError({"non_field_errors": ["Invalid username or password"]})

        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'role': user.role
        }




class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role','is_suspended']


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

class BasicQuizSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'pass_mark', 'time_limit']
class TopicSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)
    quiz = BasicQuizSerializer(read_only=True)
    quiz_available = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    has_quiz = serializers.SerializerMethodField()
    lesson_count = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = [
            'id', 'title', 'order', 'lessons', 'quiz',
            'quiz_available', 'quiz_required_lessons', 'quiz_pass_mark', 'progress',
            'has_quiz', 'lesson_count'
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

class CourseSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(read_only=True)
    topic_count = serializers.IntegerField(read_only=True)
    enrolled_students_count = serializers.IntegerField(read_only=True)
    is_enrolled = serializers.SerializerMethodField()
    topics = TopicSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'teacher_name',
            'topic_count', 'enrolled_students_count', 'is_enrolled',
            'topics'
        ]

    def get_is_enrolled(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role == 'student':
            return CourseEnrollment.objects.filter(
                student=request.user,
                course=obj
            ).exists()
        return None

class CourseEnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseEnrollment
        fields = ['id', 'student', 'course', 'enrolled_at']
        read_only_fields = ['student']

class ProgressTrackerSerializer(serializers.ModelSerializer):
    student = serializers.ReadOnlyField(source='student.username')
    course = serializers.ReadOnlyField(source='course.title')
    lesson = serializers.ReadOnlyField(source='lesson.title')

    class Meta:
        model = ProgressTracker
        fields = ['id', 'student', 'course', 'lesson', 'completed']


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
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'action', 'timestamp']


class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'choice_text', 'is_correct']
        extra_kwargs = {
            'is_correct': {'write_only': True}  # Hide correct answers in GET requests
        }

class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True)

    class Meta:
        model = Question
        fields = ['id', 'question_text', 'question_type', 'points', 'order', 'choices']

    def create(self, validated_data):
        choices_data = validated_data.pop('choices')
        question = Question.objects.create(**validated_data)
        
        for choice_data in choices_data:
            Choice.objects.create(question=question, **choice_data)
        
        return question

    def update(self, instance, validated_data):
        choices_data = validated_data.pop('choices', None)
        
        # Update question fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if choices_data is not None:
            # Delete existing choices and create new ones
            instance.choices.all().delete()
            for choice_data in choices_data:
                Choice.objects.create(question=instance, **choice_data)

        return instance

class QuizSerializer(serializers.ModelSerializer):
    """Serializer for the Quiz model."""
    questions = QuestionSerializer(many=True, required=False)
    topic_title = serializers.CharField(source='topic.title', read_only=True)
    course_title = serializers.CharField(source='topic.course.title', read_only=True)

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'pass_mark', 'time_limit',
                  'created_at', 'updated_at', 'total_points', 'question_count',
                  'questions', 'topic_title', 'course_title']
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_points', 'question_count']

    def create(self, validated_data):
        print(f"QuizSerializer.create() - Validated data: {validated_data}")
        questions_data = validated_data.pop('questions', [])
        print(f"QuizSerializer.create() - Questions data: {questions_data}")
        
        quiz = Quiz.objects.create(**validated_data)
        
        for question_data in questions_data:
            choices_data = question_data.pop('choices', [])
            question = Question.objects.create(quiz=quiz, **question_data)
            
            for choice_data in choices_data:
                Choice.objects.create(question=question, **choice_data)
        
        print(f"QuizSerializer.create() - Created quiz with {quiz.questions.count()} questions")
        return quiz

    def update(self, instance, validated_data):
        print(f"QuizSerializer.update() - Starting update for quiz {instance.id}")
        print(f"QuizSerializer.update() - Validated data: {validated_data}")
        
        questions_data = validated_data.pop('questions', [])
        print(f"QuizSerializer.update() - Questions data: {len(questions_data)} questions")
        
        # Update quiz fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Delete existing questions and create new ones
        instance.questions.all().delete()
        print(f"QuizSerializer.update() - Deleted existing questions")
        
        # Add new questions from the request
        for question_data in questions_data:
            choices_data = question_data.pop('choices', [])
            question = Question.objects.create(quiz=instance, **question_data)
            
            for choice_data in choices_data:
                Choice.objects.create(question=question, **choice_data)
        
        print(f"QuizSerializer.update() - Quiz now has {instance.questions.count()} questions")
        return instance

class QuizAttemptSerializer(serializers.ModelSerializer):
    time_taken = serializers.SerializerMethodField()

    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'quiz', 'student', 'score', 'passed',
            'started_at', 'completed_at', 'time_taken'
        ]
        read_only_fields = ['score', 'passed', 'completed_at', 'time_taken']

    def get_time_taken(self, obj):
        return obj.time_taken

class QuestionResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionResponse
        fields = ['id', 'attempt', 'question', 'selected_choices', 'points_earned']
        read_only_fields = ['points_earned']

# Serializers for student quiz taking
class QuizTakingSerializer(serializers.ModelSerializer):
    """Serializer for students taking the quiz - hides correct answers"""
    questions = serializers.SerializerMethodField()
    current_question = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    time_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'time_limit',
            'questions', 'created_at','current_question', 'progress',
            'time_remaining', 'is_expired'
        ]

    def get_questions(self, obj):
        # Randomize questions order
        questions = list(obj.questions.all())
        random.shuffle(questions)
        
        return [{
            'id': q.id,
            'question_text': q.question_text,
            'question_type': q.question_type,
            'choices': [{
                'id': c.id,
                'choice_text': c.choice_text
            } for c in q.choices.all()]
        } for q in questions]
    def get_current_question(self, obj):
        question = obj.get_current_question()
        if not question:
            return None

        return {
            'id': question.id,
            'text': question.question_text,
            'type': question.question_type,
            'choices': [
                {
                    'id': choice.id,
                    'text': choice.choice_text
                }
                for choice in question.choices.all()
            ]
        }

    def get_progress(self, obj):
        total_questions = len(obj.question_order)
        return {
            'current': obj.current_question_index + 1,
            'total': total_questions,
            'percentage': (obj.current_question_index + 1) / total_questions * 100
        }

    def get_time_remaining(self, obj):
        return obj.check_time_remaining()


class QuizResultSerializer(serializers.ModelSerializer):
    """Serializer for quiz results after completion"""
    questions = serializers.SerializerMethodField()
    
    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'score', 'passed', 'started_at',
            'completed_at', 'time_taken', 'questions'
        ]

    def get_questions(self, obj):
        responses = obj.responses.all()
        return [{
            'question_text': response.question.question_text,
            'points_possible': response.question.points,
            'points_earned': response.points_earned,
            'correct_choices': [
                choice.choice_text 
                for choice in response.question.choices.filter(is_correct=True)
            ],
            'selected_choices': [
                choice.choice_text 
                for choice in response.selected_choices.all()
            ]
        } for response in responses]

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'choice_text']  

class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'question_text', 'question_type', 'choices']

class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'time_limit', 'questions']