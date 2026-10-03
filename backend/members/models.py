from decimal import Decimal
import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone


class MembershipTier(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    duration_days = models.PositiveIntegerField(
        default=365,
        help_text="Membership duration in days (e.g. 365 for annual)"
    )
    ticket_discount_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="Percentage discount applied to event tickets (0 to 100)"
    )
    merch_discount_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        help_text="Percentage discount applied to merch store products (0 to 100)"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['price', 'name']

    def clean(self):
        super().clean()
        if self.ticket_discount_pct < 0 or self.ticket_discount_pct > 100:
            raise ValidationError({'ticket_discount_pct': 'Ticket discount percentage must be between 0 and 100.'})
        if self.merch_discount_pct < 0 or self.merch_discount_pct > 100:
            raise ValidationError({'merch_discount_pct': 'Merch discount percentage must be between 0 and 100.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} (${self.price})"


class Membership(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_EXPIRED = 'expired'
    STATUS_PENDING = 'pending'

    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Active'),
        (STATUS_EXPIRED, 'Expired'),
        (STATUS_PENDING, 'Pending Payment'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='membership'
    )
    tier = models.ForeignKey(
        MembershipTier,
        on_delete=models.PROTECT,
        related_name='memberships'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    dues_paid = models.BooleanField(default=False)
    dues_amount_paid = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00')
    )
    verification_token = models.CharField(
        max_length=64,
        unique=True,
        blank=True,
        null=True,
        help_text="Token for instant door verification & QR scanning"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def update_computed_status(self):
        """Computes and updates status dynamically based on dues_paid and end_date."""
        today = timezone.now().date()
        if not self.dues_paid or not self.end_date:
            self.status = self.STATUS_PENDING
        elif today > self.end_date:
            self.status = self.STATUS_EXPIRED
        else:
            self.status = self.STATUS_ACTIVE
        return self.status

    @property
    def is_active_member(self) -> bool:
        return self.update_computed_status() == self.STATUS_ACTIVE

    def clean(self):
        super().clean()
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValidationError({'end_date': 'End date cannot be earlier than start date.'})

    def save(self, *args, **kwargs):
        if not self.verification_token:
            self.verification_token = uuid.uuid4().hex
        self.update_computed_status()
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.name or self.user.email} - {self.tier.name} ({self.get_status_display()})"
