from rest_framework import serializers
from api.models import Quiz, Question, Choice, QuizAttempt, QuestionResponse
import random

class BasicQuizSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = ['id', 'title', 'description', 'pass_mark', 'time_limit']

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
        questions_data = validated_data.pop('questions', [])
        quiz = Quiz.objects.create(**validated_data)
        
        for question_data in questions_data:
            choices_data = question_data.pop('choices', [])
            question = Question.objects.create(quiz=quiz, **question_data)
            
            for choice_data in choices_data:
                Choice.objects.create(question=question, **choice_data)
        
        print(f"QuizSerializer.create() - Created quiz with {quiz.questions.count()} questions")
        return quiz

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', [])
        
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
