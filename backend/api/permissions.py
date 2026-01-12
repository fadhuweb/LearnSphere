from rest_framework import permissions
from .models import Course, CourseEnrollment, Lesson, Topic, Quiz

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'

class IsTeacher(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'teacher'

class IsStudent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'student'

class IsStudentOrTeacherOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['student', 'teacher', 'admin']

class IsTeacherorAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['teacher', 'admin']

class IsAdminOrAssignedTeacherOrEnrolledStudent(permissions.BasePermission):
    """Allow access to admin, assigned teacher, or enrolled student."""
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False

        if request.user.role == 'admin':
            return True

        if request.user.role == 'teacher':
            if isinstance(obj, Course):
                return obj.teacher == request.user
            elif isinstance(obj, (Topic, Lesson)):
                return obj.course.teacher == request.user
            return obj.course.teacher == request.user

        if request.user.role == 'student':
            if isinstance(obj, Course):
                return CourseEnrollment.objects.filter(student=request.user, course=obj).exists()
            elif isinstance(obj, (Topic, Lesson)):
                return CourseEnrollment.objects.filter(student=request.user, course=obj.course).exists()
            return CourseEnrollment.objects.filter(student=request.user, course=obj.course).exists()

        return False

class IsTeacherForCourse(permissions.BasePermission):
    """Allow access only to teachers assigned to the course."""
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated or request.user.role != 'teacher':
            return False
        
        if isinstance(obj, Course):
            return obj.teacher == request.user
        elif isinstance(obj, (Topic, Lesson)):
            return obj.course.teacher == request.user
        elif isinstance(obj, Quiz):
            return obj.topic.course.teacher == request.user
        return obj.course.teacher == request.user

class IsEnrolledStudent(permissions.BasePermission):
    """Allow access only to students enrolled in the course."""
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated or request.user.role != 'student':
            return False
        
        if isinstance(obj, Course):
            return CourseEnrollment.objects.filter(student=request.user, course=obj).exists()
        elif isinstance(obj, (Topic, Lesson)):
            return CourseEnrollment.objects.filter(student=request.user, course=obj.course).exists()
        return CourseEnrollment.objects.filter(student=request.user, course=obj.course).exists()

class IsTeacherForQuiz(permissions.BasePermission):
    """Allow access only to teachers who created the quiz."""
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated or request.user.role != 'teacher':
            return False
        return obj.topic.course.teacher == request.user

class IsTeacherForStudent(permissions.BasePermission):
    """Allow access only to teachers who teach the student."""
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated or request.user.role != 'teacher':
            return False
        return obj.courses.filter(teacher=request.user).exists()

class IsAssignedTeacher(permissions.BasePermission):
    """Allow access only to teachers assigned to the course."""
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated or request.user.role != 'teacher':
            return False
        if isinstance(obj, Course):
            return obj.teacher == request.user
        elif isinstance(obj, (Topic, Lesson)):
            return obj.course.teacher == request.user
        return obj.teacher == request.user