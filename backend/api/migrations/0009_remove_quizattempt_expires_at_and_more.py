# Generated by Django 5.1.6 on 2025-03-18 22:02

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_alter_quiz_pass_mark_alter_quiz_time_limit'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='quizattempt',
            name='expires_at',
        ),
        migrations.RemoveField(
            model_name='quizattempt',
            name='is_expired',
        ),
        migrations.RemoveField(
            model_name='quizattempt',
            name='time_limit',
        ),
    ]
