from .auth_views import (
    RegisterView, LoginView, UserProfileView, UserListView,
    ApproveUserView, RemoveUserView, SuspendUserView, ReactivateUserView,
    AuditLogListView, PasswordResetView, PasswordResetConfirmView,
    GetSecurityQuestionView, VerifySecurityAnswerView
)
from .analytics_views import (
    StudentProgressView, TeacherProgressView, SyncProgressView,
    DashboardStatsView, NotificationsView
)
from .quiz_views import (
    QuizCreateView, QuizUpdateView, QuizDeleteView, QuizDetailView, QuizViewSet,
    QuizAttemptViewSet, QuestionViewSet, QuizAttemptListView, QuizAvailabilityView,
    get_quiz
)
from .course_views import (
    CourseCreateView, CourseUpdateView, CourseDeleteView, CourseListView,
    TeacherCourseListView, StudentCoursesView, AvailableCoursesView,
    CourseEnrollmentView, UnenrollCourseView, CourseDetailView,
    AssignTeacherView, get_teacher_course_detail,
    TopicCreateView, TopicUpdateView, TopicDeleteView, TopicListView,
    LessonCreateView, LessonUpdateView, LessonDeleteView, LessonListView,
    LessonDetailView, LessonListCreateView, LessonAccessView, LessonDownloadView
)
