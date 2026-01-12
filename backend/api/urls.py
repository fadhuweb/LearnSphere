from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.routers import DefaultRouter

from .views import (
    DashboardStatsView, NotificationsView, QuizViewSet, QuizAvailabilityView,
    QuestionViewSet, CourseEnrollmentView, QuizAttemptListView, QuizAttemptViewSet,
    RegisterView, TeacherCourseListView, LessonDeleteView, TopicCreateView,
    TopicUpdateView, TopicDeleteView, CourseDetailView, LessonListView,
    SyncProgressView, LessonDownloadView, LessonDetailView, LoginView,
    LessonAccessView, UserProfileView, CourseCreateView, UnenrollCourseView,
    LessonCreateView, StudentProgressView, TeacherProgressView, UserListView,
    RemoveUserView, ApproveUserView, CourseUpdateView, CourseDeleteView,
    AssignTeacherView, CourseListView, SuspendUserView, ReactivateUserView,
    LessonListCreateView, AvailableCoursesView, StudentCoursesView,
    AuditLogListView, TopicListView, QuizDetailView, QuizCreateView, QuizUpdateView, QuizDeleteView, LessonUpdateView,
    PasswordResetView, PasswordResetConfirmView, get_quiz, get_teacher_course_detail
)

router = DefaultRouter()
# Remove router paths for Quiz views as they're causing conflicts
# router.register(r'teacher/courses/(?P<course_id>\d+)/topics/(?P<topic_id>\d+)/quiz', QuizDetailView, basename='teacher-quiz')
# router.register(r'courses/(?P<course_id>\d+)/topics/(?P<topic_id>\d+)/quiz', QuizDetailView, basename='student-quiz')
router.register(r'quizzes', QuizViewSet, basename='quiz')
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'quiz-attempts', QuizAttemptViewSet, basename='quiz-attempt')

urlpatterns = [
    # Include router URLs first to ensure ViewSet actions are properly registered
    path('', include(router.urls)),
    
    # Dashboard endpoints
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('dashboard/notifications/', NotificationsView.as_view(), name='notifications'),
    
    
    # Auth endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/profile/', UserProfileView.as_view(), name='profile'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/password-reset/', PasswordResetView.as_view(), name='password-reset'),
    path('auth/password-reset-confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    
    # Admin endpoints
    path('admin/users/', UserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:user_id>/approve/', ApproveUserView.as_view(), name='admin-approve-user'),
    path('admin/users/<int:user_id>/remove/', RemoveUserView.as_view(), name='admin-remove-user'),
    path('admin/users/<int:user_id>/suspend/', SuspendUserView.as_view(), name='suspend-user'),
    path('admin/users/<int:user_id>/reactivate/', ReactivateUserView.as_view(), name='reactivate-user'),
    path('admin/logs/', AuditLogListView.as_view(), name='audit-logs'),
    path('admin/courses/', CourseCreateView.as_view(), name='admin-create-course'),
    path('admin/courses/<int:pk>/', CourseUpdateView.as_view(), name='admin-update-course'),
    path('admin/courses/<int:pk>/delete/', CourseDeleteView.as_view(), name='admin-delete-course'),
    path('admin/courses/<int:course_id>/assign-teacher/', AssignTeacherView.as_view(), name='assign-teacher'),
    
    # Course endpoints
    path('courses/', CourseListView.as_view(), name='course-list'),
    path('courses/available/', AvailableCoursesView.as_view(), name='available-courses'),
    path('courses/create/', CourseCreateView.as_view(), name='course-create'),
    path('courses/<int:pk>/', CourseDetailView.as_view(), name='course-detail'),
    path('courses/<int:pk>/update/', CourseUpdateView.as_view(), name='course-update'),
    path('courses/<int:pk>/delete/', CourseDeleteView.as_view(), name='course-delete'),
    path('courses/<int:course_id>/assign-teacher/', AssignTeacherView.as_view(), name='assign-teacher'),
    path('courses/<int:course_id>/enroll/', CourseEnrollmentView.as_view(), name='course-enroll'),
    path('courses/<int:course_id>/unenroll/', UnenrollCourseView.as_view(), name='unenroll-course'),
    path('courses/<int:pk>/topics/', TopicListView.as_view(), name='course-topics'),
    
    # Teacher endpoints
    path('teacher/courses/', TeacherCourseListView.as_view(), name="teacher-courses"),
    path('teacher/courses/<int:course_id>/topics/create/', TopicCreateView.as_view(), name='create-topic'),
    path('teacher/courses/<int:course_id>/topics/<int:topic_id>/update/', TopicUpdateView.as_view(), name="update_topic"),
    path('teacher/courses/<int:course_id>/topics/<int:topic_id>/delete/', TopicDeleteView.as_view(), name="delete_topic"),
    path('teacher/courses/<int:course_id>/topics/<int:topic_id>/lessons/create/', LessonCreateView.as_view(), name="create_lesson"),
    
    # Teacher Quiz Management
    path('teacher/quiz-attempts/', QuizAttemptListView.as_view(), name='quiz-attempts'),
    path('teacher/progress/', TeacherProgressView.as_view(), name='teacher-progress'),
    
    # Student Quiz Management
    path('student/courses/', StudentCoursesView.as_view(), name='student-courses'),
    path('student/progress/', StudentProgressView.as_view(), name='student-progress'),
    
    # Lesson operations
    path('lessons/', LessonListView.as_view(), name='lesson-list'),
    path('lessons/<int:pk>/', LessonDetailView.as_view(), name='lesson-detail'),
    path('lessons/<int:lesson_id>/access/', LessonAccessView.as_view(), name='lesson-access'),
    path('lessons/<int:lesson_id>/download/', LessonDownloadView.as_view(), name='lesson-download'),
    path('lessons/create/', LessonCreateView.as_view(), name='lesson-create'),
    path('teacher/lessons/<int:pk>/update/', LessonUpdateView.as_view(), name='lesson-update'),
    path('teacher/lessons/<int:pk>/delete/', LessonDeleteView.as_view(), name='lesson-delete'),
    
    # Quiz endpoints
    path('topics/<int:topic_id>/quiz-availability/', QuizAvailabilityView.as_view(), name='quiz-availability'),
    
    # Quiz Attempts
    path('quiz-attempts/', QuizAttemptViewSet.as_view({'post': 'create', 'get': 'list'}), name='quiz-attempts'),
    path('quiz-attempts/<int:pk>/', QuizAttemptViewSet.as_view({'get': 'retrieve', 'put': 'update'}), name='quiz-attempt-detail'),
    path('quiz-attempts/<int:pk>/submit/', QuizAttemptViewSet.as_view({'post': 'submit'}), name='quiz-attempt-submit'),
    path('quiz-attempts/<int:pk>/answer/', QuizAttemptViewSet.as_view({'post': 'answer_question'}), name='quiz-attempt-answer'),
    path('quiz-attempts/<int:pk>/current_question/', QuizAttemptViewSet.as_view({'get': 'current_question'}), name='quiz-attempt-current-question'),
    path('quiz-attempts/<int:pk>/results/', QuizAttemptViewSet.as_view({'get': 'results'}), name='quiz-attempt-results'),
    
    # Add explicit routes for quiz management
    path('teacher/courses/<int:course_id>/topics/<int:topic_id>/quiz/', QuizCreateView.as_view(), name='quiz-create'),
    path('teacher/courses/<int:course_id>/topics/<int:topic_id>/quiz/update/', QuizUpdateView.as_view(), name='quiz-update'),
    path('teacher/courses/<int:course_id>/topics/<int:topic_id>/quiz/delete/', QuizDeleteView.as_view(), name='quiz-delete'),
    path('teacher/courses/<int:course_id>/topics/<int:topic_id>/quiz/get/', get_quiz, name='get-quiz'),
    path('teacher/courses/<int:course_id>/detail/', get_teacher_course_detail, name='teacher-course-detail'),
    path('courses/<int:course_id>/topics/<int:topic_id>/quiz/get/', get_quiz, name='student-get-quiz'),
    
    # Sync endpoint
    path('sync/', SyncProgressView.as_view(), name='sync-progress'),
]
