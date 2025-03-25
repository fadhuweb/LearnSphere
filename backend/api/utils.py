from .models import AuditLog

def log_action(user, action):
    """Creates an audit log entry"""
    AuditLog.objects.create(user=user, action=action)
