from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.password_validation import validate_password
from api.models import AuditLog

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, min_length=8, style={"input_type": "password"}
    )
    role = serializers.ChoiceField(
        choices=[("student", "Student"), ("teacher", "Teacher"), ("admin", "Admin")],
        default="student"
    )

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "role"]

    def validate_password(self, value):
        """Ensure password meets Django's security requirements"""
        validate_password(value)
        return value

    def create(self, validated_data):
        """Create a user with hashed password and assign role properly."""
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            role=validated_data.get("role", "student")  # Ensure role assignment
        )
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        from django.contrib.auth import authenticate

        # Fetch user manually first
        try:
            user = User.objects.get(username=data['username'])
        except User.DoesNotExist:
            raise serializers.ValidationError({"non_field_errors": ["Invalid username or password"]})

        # Check if the user is suspended BEFORE authenticating
        if user.is_suspended:
            raise serializers.ValidationError({"non_field_errors": ["Your account is suspended. Please contact the admin."]})

        # Authenticate only if the user is NOT suspended
        user = authenticate(username=data['username'], password=data['password'])

        if not user:
            raise serializers.ValidationError({"non_field_errors": ["Invalid username or password"]})

        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'role': user.role
        }


class UserProfileSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'is_suspended', 'avatar', 'security_question', 'security_answer']
        extra_kwargs = {
            'security_answer': {'write_only': True}
        }
    
    def get_avatar(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'action', 'timestamp']
