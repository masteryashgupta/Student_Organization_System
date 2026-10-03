from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    ROLE_ADMIN = 'admin'
    ROLE_LEADER = 'leader'
    ROLE_MEMBER = 'member'
    ROLE_VOLUNTEER = 'volunteer'
    ROLE_PUBLIC = 'public'

    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Admin'),
        (ROLE_LEADER, 'Club Leader'),
        (ROLE_MEMBER, 'Member'),
        (ROLE_VOLUNTEER, 'Volunteer'),
        (ROLE_PUBLIC, 'Public'),
    ]

    name = models.CharField(_('Full Name'), max_length=255, blank=True)
    phone = models.CharField(_('Phone Number'), max_length=30, blank=True)
    role = models.CharField(
        _('User Role'),
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_PUBLIC
    )
    email = models.EmailField(_('Email Address'), unique=True)

    REQUIRED_FIELDS = ['email', 'name']

    @property
    def is_officer(self) -> bool:
        return self.role in [self.ROLE_ADMIN, self.ROLE_LEADER] or self.is_staff or self.is_superuser

    @property
    def is_club_member(self) -> bool:
        return self.role in [self.ROLE_ADMIN, self.ROLE_LEADER, self.ROLE_MEMBER]

    def __str__(self):
        return f"{self.name or self.username} ({self.get_role_display()})"
