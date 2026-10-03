from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta


class User(AbstractUser):
    """Custom user. Email is the main identifier for login."""

    class Role(models.TextChoices):
        MEMBER = "member", "Member"
        VOLUNTEER = "volunteer", "Volunteer"
        OFFICER = "officer", "Officer"
        TREASURER = "treasurer", "Treasurer"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    phone = models.CharField(max_length=20, blank=True)

    USERNAME_FIELD = "username"  # keep username login; email also unique
    REQUIRED_FIELDS = ["email"]

    @property
    def is_staff_role(self):
        return self.role in {self.Role.OFFICER, self.Role.TREASURER}

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"


class MembershipTier(models.Model):
    """e.g. Standard / Premium. Defines benefits like discounts."""
    name = models.CharField(max_length=50, unique=True)
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    ticket_discount_percent = models.PositiveIntegerField(default=0)
    merch_discount_percent = models.PositiveIntegerField(default=0)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.name} (₹{self.price})"


class Membership(models.Model):
    """A member profile tied to a user. Tracks dues + expiry."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending Payment"
        ACTIVE = "active", "Active"
        EXPIRED = "expired", "Expired"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="membership")
    tier = models.ForeignKey(MembershipTier, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    joined_on = models.DateField(default=timezone.localdate)
    expires_on = models.DateField(null=True, blank=True)
    dues_paid = models.BooleanField(default=False)

    def activate(self, months=12):
        """Mark dues paid and set expiry."""
        self.dues_paid = True
        self.status = self.Status.ACTIVE
        self.expires_on = (timezone.now() + timedelta(days=30 * months)).date()
        self.save()

    @property
    def is_valid(self):
        if self.status != self.Status.ACTIVE:
            return False
        if self.expires_on and self.expires_on < timezone.now().date():
            return False
        return True

    @property
    def days_until_expiry(self):
        if not self.expires_on:
            return None
        return (self.expires_on - timezone.now().date()).days

    def refresh_expiry_status(self):
        if self.expires_on and self.expires_on < timezone.now().date():
            if self.status == self.Status.ACTIVE:
                self.status = self.Status.EXPIRED
                self.save(update_fields=["status"])

    def __str__(self):
        return f"Membership<{self.user.username} · {self.status}>"
