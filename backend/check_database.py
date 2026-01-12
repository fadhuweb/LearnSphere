#!/usr/bin/env python
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

# Now we can import our models
from api.models import Quiz, Question, Choice

# Get basic counts
print("=== DATABASE SUMMARY ===")
print(f"Total quizzes: {Quiz.objects.count()}")
print(f"Total questions: {Question.objects.count()}")

# Examine each quiz
print("\n=== QUIZ DETAILS ===")
for quiz in Quiz.objects.all():
    print(f"\nQuiz ID: {quiz.id}")
    print(f"Title: {quiz.title}")
    print(f"Description: {quiz.description}")
    print(f"Questions count: {quiz.questions.count()}")
    
    # Show questions
    for i, question in enumerate(quiz.questions.all(), 1):
        print(f"\n  Question {i}: ID={question.id}")
        print(f"  Text: {question.question_text}")
        print(f"  Type: {question.question_type}")
        print(f"  Points: {question.points}")
        
        # Show choices
        print(f"  Choices count: {question.choices.count()}")
        for j, choice in enumerate(question.choices.all(), 1):
            print(f"    Choice {j}: {choice.choice_text} (Correct: {choice.is_correct})")

print("\n=== QUESTIONS NOT ASSOCIATED WITH QUIZZES ===")
orphan_questions = Question.objects.filter(quiz=None)
print(f"Count: {orphan_questions.count()}")
for q in orphan_questions:
    print(f"- ID: {q.id}, Text: {q.question_text}")
