from celery import shared_task
from django.db import connections
from api.models import Course, Lesson

@shared_task
def sync_data_to_postgresql():
    """
    Syncs unsynced SQLite data to PostgreSQL when online.
    """
    if not Course.objects.filter(synced=False).exists():
        return "No new data to sync."

    try:
        with connections['default'].cursor() as cursor:
            # Sync courses
            for course in Course.objects.filter(synced=False):
                cursor.execute(
                    "INSERT INTO api_course (title, description, synced) VALUES (%s, %s, %s) RETURNING id",
                    [course.title, course.description, True]
                )
                course.synced = True
                course.save()

            # Sync lessons
            for lesson in Lesson.objects.filter(synced=False):
                cursor.execute(
                    "INSERT INTO api_lesson (course_id, title, content, synced) VALUES (%s, %s, %s, %s)",
                    [lesson.course.id, lesson.title, lesson.content, True]
                )
                lesson.synced = True
                lesson.save()

        return "Data sync successful!"
    except Exception as e:
        return f"Sync failed: {str(e)}"
