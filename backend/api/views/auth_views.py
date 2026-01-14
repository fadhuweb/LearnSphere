import logging
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.template.loader import render_to_string
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from api.serializers import (
    RegisterSerializer, LoginSerializer, UserProfileSerializer, AuditLogSerializer
)
from api.models import AuditLog
from api.utils import log_action
from api.permissions import IsAdmin
from rest_framework.permissions import IsAuthenticated, AllowAny

logger = logging.getLogger(__name__)
User = get_user_model()

class RegisterView(APIView):
    """Register a new user."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            log_action(None, f"New user registered: {user.username}")
            return Response(
                {"message": "Registration successful. Please wait for admin approval."},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(TokenObtainPairView):
    """Login view that uses JWT tokens."""
    serializer_class = LoginSerializer

from rest_framework.parsers import MultiPartParser, FormParser

class UserProfileView(generics.RetrieveUpdateAPIView):
    """Get or update the current user's profile."""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_object(self):
        return self.request.user
    
    def perform_update(self, serializer):
        # Hash the security answer if it's being updated
        if 'security_answer' in self.request.data:
            from django.contrib.auth.hashers import make_password
            serializer.validated_data['security_answer'] = make_password(self.request.data['security_answer'].lower().strip())
        serializer.save()


class UserListView(generics.ListAPIView):
    """List all users. Only accessible by admin."""
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        role = self.request.query_params.get('role', None)
        status = self.request.query_params.get('status', None)
        search = self.request.query_params.get('search', None)

        queryset = User.objects.all()

        if role:
            queryset = queryset.filter(role=role)
        if status == 'suspended':
            queryset = queryset.filter(is_suspended=True)
        elif status == 'active':
            queryset = queryset.filter(is_suspended=False)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search)
            )

        return queryset.order_by('-date_joined')


class ApproveUserView(APIView):
    """Admin can activate user accounts"""
    permission_classes = [IsAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            user.is_active = True
            user.save()
            return Response({"message": "User activated successfully"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        
class RemoveUserView(APIView):
    """Admin can remove users"""
    permission_classes = [IsAdmin]

    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
            user.delete()
            return Response({"message": "User removed successfully"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

class SuspendUserView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)

            # Prevent suspending an admin
            if user.role == "admin":
                return Response({"error": "Cannot suspend an admin"}, status=status.HTTP_403_FORBIDDEN)

            user.is_suspended = True
            user.save(update_fields=["is_suspended"])  # Ensure it saves properly

            # Log the action
            log_action(request.user, f"Suspended user {user.username}")

            return Response(
                {"message": "User suspended successfully", "is_suspended": user.is_suspended},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

class ReactivateUserView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)

            user.is_suspended = False
            user.save(update_fields=["is_suspended"])  # Ensure it saves properly

            # Log the action
            log_action(request.user, f"Reactivated user {user.username}")

            return Response(
                {"message": "User reactivated successfully", "is_suspended": user.is_suspended},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

class AuditLogListView(generics.ListAPIView):
    """Admins can view system logs"""
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]


class PasswordResetView(APIView):
    """View to request a password reset link via email."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email__iexact=email)
            
            # Generate token and uid
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Build reset URL
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"
            
            # Prepare email context
            context = {
                'user': user,
                'reset_url': reset_url,
                'year': timezone.now().year
            }
            
            # Render templates
            email_html = render_to_string('api/password_reset_email.html', context)
            email_text = f"Hello, please reset your password by clicking here: {reset_url}"
            
            # Send email
            send_mail(
                subject="Reset Your LearnSphere Password",
                message=email_text,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=email_html,
                fail_silently=False,
            )
            
            log_action(None, f"Password reset link sent to {user.username} ({user.email})")
            
            return Response({
                "message": "A password reset link has been sent to your email. Please check your inbox.",
                "success": True
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({"error": "No user found with this email address."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Password reset error for email {email}: {str(e)}", exc_info=True)
            return Response({"error": f"Failed to send reset email: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GetSecurityQuestionView(APIView):
    """View to get a user's security question by email."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response({"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email__iexact=email)
            if not user.security_question:
                return Response({"error": "No security question set for this account. Please contact an administrator."}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({"question": user.security_question}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "No user found with this email address."}, status=status.HTTP_404_NOT_FOUND)

class VerifySecurityAnswerView(APIView):
    """View to verify the security answer and return a reset token."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        answer = request.data.get('answer')
        
        if not email or not answer:
            return Response({"error": "Email and answer are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(email__iexact=email)
            if not user.security_answer:
                return Response({"error": "Security information missing for this account."}, status=status.HTTP_400_BAD_REQUEST)
            
            from django.contrib.auth.hashers import check_password
            if check_password(answer.lower().strip(), user.security_answer):
                # Correct answer! Generate a token
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                return Response({
                    "uid": uid,
                    "token": token,
                    "message": "Answer verified! You can now reset your password."
                }, status=status.HTTP_200_OK)
            else:
                return Response({"error": "Incorrect security answer."}, status=status.HTTP_400_BAD_REQUEST)
                
        except User.DoesNotExist:
            return Response({"error": "Invalid request."}, status=status.HTTP_404_NOT_FOUND)

class PasswordResetConfirmView(APIView):
    """View to confirm password reset with a token."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uidb64 = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('password')

        if not all([uidb64, token, new_password]):
            return Response({"error": "All fields are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Decode user ID
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)

            # Validate token
            if default_token_generator.check_token(user, token):
                # Validate password complexity
                try:
                    validate_password(new_password, user)
                except Exception as e:
                    return Response({"error": list(e.messages) if hasattr(e, 'messages') else str(e)}, status=status.HTTP_400_BAD_REQUEST)

                # Set new password
                user.set_password(new_password)
                user.save()
                
                log_action(user, "Password successfully reset via token")
                
                return Response({
                    "message": "Your password has been reset successfully. You can now log in with your new password.",
                    "success": True
                }, status=status.HTTP_200_OK)
            else:
                return Response({"error": "This reset link is invalid or has expired."}, status=status.HTTP_400_BAD_REQUEST)

        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"error": "Invalid reset link."}, status=status.HTTP_400_BAD_REQUEST)
