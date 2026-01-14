# api/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.core.validators import MinValueValidator, MaxValueValidator
from datetime import datetime, timedelta
import random
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Sum,Avg,F

# User Roles
USER_ROLES = [
    ('student', 'Student'),
    ('teacher', 'Teacher'),
    ('admin', 'Admin'),
]

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=10, choices=USER_ROLES, default='student')
    is_suspended = models.BooleanField(default=False)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    security_question = models.CharField(max_length=255, null=True, blank=True)
    security_answer = models.CharField(max_length=255, null=True, blank=True)

    groups = models.ManyToManyField(Group, related_name="customuser_groups", blank=True)
    user_permissions = models.ManyToManyField(Permission, related_name="customuser_permissions", blank=True)

    def save(self, *args, **kwargs):
        self.is_active = not self.is_suspended
        super().save(*args, **kwargs)

    def __str__(self):
        status = "Suspended" if self.is_suspended else self.role
        return f"{self.username} ({status})"

class Course(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, blank=True, 
        limit_choices_to={'role': 'teacher'}
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def get_student_progress(self, student):
        """Calculate course progress based on passed quizzes."""
        topics_with_quizzes = self.topics.filter(quiz__isnull=False)
        total_quizzes = topics_with_quizzes.count()
        
        if total_quizzes == 0:
            return 0

        passed_quizzes = student.quiz_attempts.filter(
            quiz__topic__in=topics_with_quizzes,
            passed=True
        ).values('quiz').distinct().count()
        
        return int((passed_quizzes / total_quizzes) * 100)

    def __str__(self):
        return self.title

class Topic(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="topics")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    order = models.IntegerField(default=0)
    quiz_required_lessons = models.IntegerField(default=0)
    quiz_pass_mark = models.IntegerField(default=70)
    quiz_time_limit = models.PositiveIntegerField(
        default=30,
        help_text="Time limit for quiz in minutes"
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']
        unique_together = [['course', 'order']]

    def __str__(self):
        return self.title

    def is_quiz_available(self, student):
        """Check if quiz is available based on completed lessons."""
        if not hasattr(self, 'quiz'):
            return False
            
        if not self.quiz_required_lessons:
            return True
        
        completed_lessons = self.lessons.filter(
            lesson_completions__student=student,
            lesson_completions__completed=True
        ).count()
        
        return completed_lessons >= self.quiz_required_lessons

    def get_student_progress(self, student):
        """Get student's progress in this topic."""
        total_lessons = self.lessons.count()
        if total_lessons == 0:
            return 100  # If no lessons, consider it complete
        
        completed_lessons = LessonCompletion.objects.filter(
            student=student,
            lesson__topic=self,
            completed=True
        ).count()
        
        return int((completed_lessons / total_lessons) * 100)

    def is_accessible(self, student):
        """Check if topic is accessible based on previous topic's quiz completion."""
        if self.order == 1:
            return True
            
        previous_topic = self.course.topics.filter(order=self.order-1).first()
        if not previous_topic:
            return True
            
        if hasattr(previous_topic, 'quiz'):
            return QuizAttempt.objects.filter(
                quiz=previous_topic.quiz,
                student=student,
                passed=True
            ).exists()
            
        return True

    def get_next_topic(self):
        """Get the next topic in the course."""
        return self.course.topics.filter(order=self.order + 1).first()

    def can_attempt_quiz(self, student):
        """Check if student can attempt the quiz."""
        if not hasattr(self, 'quiz'):
            return False
            
        if not self.is_quiz_available(student):
            return False
            
        # Check if there's an incomplete attempt
        incomplete_attempt = self.quiz.attempts.filter(
            student=student,
            completed=False,
            expired=False
        ).exists()
        
        return not incomplete_attempt

    def get_quiz_statistics(self):
        """Get statistics for the quiz if it exists."""
        if not hasattr(self, 'quiz'):
            return None
            
        attempts = self.quiz.attempts.filter(completed=True)
        total_attempts = attempts.count()
        
        if total_attempts == 0:
            return {
                'total_attempts': 0,
                'pass_rate': 0,
                'average_score': 0,
                'highest_score': 0,
                'lowest_score': 0
            }
            
        passed_attempts = attempts.filter(passed=True).count()
        
        stats = attempts.aggregate(
            average_score=models.Avg('score'),
            highest_score=models.Max('score'),
            lowest_score=models.Min('score')
        )
        
        return {
            'total_attempts': total_attempts,
            'pass_rate': (passed_attempts / total_attempts * 100),
            'average_score': round(stats['average_score'] or 0, 2),
            'highest_score': stats['highest_score'] or 0,
            'lowest_score': stats['lowest_score'] or 0
        }

class Lesson(models.Model):
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    order = models.IntegerField(default=0)
    pdf = models.FileField(upload_to='lessons/pdfs/', null=True, blank=True)
    video = models.FileField(upload_to='lessons/videos/', null=True, blank=True)
    external_links = models.JSONField(default=list, blank=True, null=True)
    contextual_help = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title

    @property
    def course(self):
        return self.topic.course
        
    @property
    def pdf_url(self):
        if self.pdf:
            return self.pdf.url
        return None
        
    @property
    def video_url(self):
        if self.video:
            return self.video.url
        return None

class Quiz(models.Model):
    topic = models.OneToOneField(Topic, on_delete=models.CASCADE, related_name='quiz')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    pass_mark = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Minimum percentage required to pass",
        default=70
    )
    time_limit = models.PositiveIntegerField(
        default=30,
        help_text="Time limit in minutes",
        validators=[MinValueValidator(1)]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_points(self):
        return sum(q.points for q in self.questions.all())

    @property
    def question_count(self):
        return self.questions.count()

    def __str__(self):
        return f"{self.title} - {self.topic.title}"

class Question(models.Model):
    QUESTION_TYPES = (
        ('single', 'Single Answer'),
        ('multiple', 'Multiple Answers'),
    )

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    question_text = models.TextField()
    question_type = models.CharField(max_length=10, choices=QUESTION_TYPES)
    points = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Question {self.order}: {self.question_text[:50]}"

class Choice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='choices')
    choice_text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.choice_text} ({'✓' if self.is_correct else '✗'})"

class QuizAttempt(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_attempts')
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    score = models.FloatField(null=True, blank=True)
    passed = models.BooleanField(default=False)
    current_question_index = models.PositiveIntegerField(default=0)
    question_order = models.JSONField(default=list)  # Stores randomized question IDs
    expires_at = models.DateTimeField(null=True, blank=True)
    is_expired = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-started_at']

    @property
    def time_taken(self):
        """Return time taken in minutes, or None if quiz is not completed"""
        if self.completed_at and self.started_at:
            time_diff = self.completed_at - self.started_at
            return round(time_diff.total_seconds() / 60, 2)
        return None

    def save(self, *args, **kwargs):
        # Generate random question order on creation
        if not self.id and not self.question_order:
            questions = list(self.quiz.questions.values_list('id', flat=True))
            random.shuffle(questions)
            self.question_order = questions
            
        super().save(*args, **kwargs)

    def get_current_question(self):
        """Get the current question for this attempt"""
        if self.completed_at or self.current_question_index >= len(self.question_order):
            return None
            
        question_id = self.question_order[self.current_question_index]
        return self.quiz.questions.get(id=question_id)

    def advance_question(self):
        """Move to the next question"""
        if self.current_question_index < len(self.question_order) - 1:
            self.current_question_index += 1
            self.save()
            return True
        return False

    def check_time_remaining(self):
        """Check remaining time for the attempt"""
        if not self.expires_at:
            return None
        
        if self.completed_at:
            return 0
            
        remaining = self.expires_at - timezone.now()
        if remaining.total_seconds() <= 0:
            self.is_expired = True
            self.save()
            return 0
        return int(remaining.total_seconds())

    def calculate_final_score(self):
        """Calculate final score and determine if passed"""
        responses = self.responses.all()
        total_points = self.quiz.questions.aggregate(
            total=Sum('points')
        )['total'] or 0
        
        # If there are no responses or no total points, set score to 0
        if not responses.exists() or total_points == 0:
            self.score = 0
            self.passed = False
            self.completed_at = timezone.now()
            self.save()
            return self.score
        
        earned_points = sum(
            response.points_earned for response in responses
        )
        
        self.score = (earned_points / total_points * 100) if total_points > 0 else 0
        self.passed = self.score >= self.quiz.pass_mark
        self.completed_at = timezone.now()
        self.save()
        
        return self.score

    def __str__(self):
        return f"{self.student.username}'s attempt at {self.quiz.title}"

class QuestionResponse(models.Model):
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name='responses')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_choices = models.ManyToManyField(Choice)
    points_earned = models.FloatField(default=0)

    def calculate_points(self):
        if self.question.question_type == 'single':
            correct_choice = self.question.choices.filter(is_correct=True).first()
            if correct_choice in self.selected_choices.all():
                return self.question.points
            return 0
        else:
            total_correct = self.question.choices.filter(is_correct=True).count()
            correct_selected = self.selected_choices.filter(is_correct=True).count()
            incorrect_selected = self.selected_choices.filter(is_correct=False).count()
            
            if incorrect_selected > 0:
                return max(0, (correct_selected / total_correct - incorrect_selected / total_correct) * self.question.points)
            
            return (correct_selected / total_correct) * self.question.points

class CourseEnrollment(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'course')

    def __str__(self):
        return f"{self.student.username} enrolled in {self.course.title}"

class ProgressTracker(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE)
    completion_status = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.student.username} - {self.topic.title} - {'Completed' if self.completion_status else 'Incomplete'}"

class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username if self.user else 'System'} - {self.action} ({self.timestamp})"

class LessonCompletion(models.Model):
    student = models.ForeignKey('CustomUser', on_delete=models.CASCADE)
    lesson = models.ForeignKey('Lesson', on_delete=models.CASCADE, related_name='completions')
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'lesson')

    def __str__(self):
        return f"{self.student.username} - {self.lesson.title}"