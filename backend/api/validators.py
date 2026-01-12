import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _

class ComplexityValidator:
    def validate(self, password, user=None):
        if not re.findall('[A-Z]', password):
            raise ValidationError(
                _("The password must contain at least one uppercase letter, A-Z."),
                code='password_no_upper',
            )
        if not re.findall('[0-9]', password):
            raise ValidationError(
                _("The password must contain at least one number, 0-9."),
                code='password_no_number',
            )
        if not re.findall('[!@#$%^&*(),.?":{}|<>]', password):
            raise ValidationError(
                _("The password must contain at least one special character: !@#$%^&*(),.?\":{}|<>"),
                code='password_no_symbol',
            )

    def get_help_text(self):
        return _(
            "Your password must contain at least one uppercase letter, one number, and one special character."
        )
