from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

class CustomJWTAuthentication(JWTAuthentication):
    """Prevent suspended users from logging in"""

    def authenticate(self, request):
        user_auth_tuple = super().authenticate(request)
        if user_auth_tuple is not None:
            user, token = user_auth_tuple
            if user.is_suspended:
                raise AuthenticationFailed("Your account has been suspended. Contact admin.")
        return user_auth_tuple
