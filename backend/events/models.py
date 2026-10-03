import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone


class Event(models.Model):
    STATUS_DRAFT = 'draft'
    STATUS_PUBLISHED = 'published'
    STATUS_CLOSED = 'closed'

    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_PUBLISHED, 'Published'),
        (STATUS_CLOSED, 'Closed'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    datetime = models.DateTimeField(help_text='Event start date and time')
    venue = models.CharField(max_length=255)
    capacity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text='Maximum attendee capacity (must be at least 1)'
    )
    member_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='Ticket price for active members (>= 0.00)'
    )
    nonmember_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='Ticket price for non-members (>= 0.00)'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        help_text='Event status: draft, published, or closed'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['datetime']
        verbose_name = 'Event'
        verbose_name_plural = 'Events'
        constraints = [
            models.CheckConstraint(
                check=models.Q(capacity__gte=1),
                name='event_capacity_gte_1'
            ),
            models.CheckConstraint(
                check=models.Q(member_price__gte=Decimal('0.00')),
                name='event_member_price_gte_0'
            ),
            models.CheckConstraint(
                check=models.Q(nonmember_price__gte=Decimal('0.00')),
                name='event_nonmember_price_gte_0'
            ),
        ]

    def clean(self):
        super().clean()
        errors = {}

        # Datetime must be in the future on creation
        if not self.pk and self.datetime and self.datetime <= timezone.now():
            errors['datetime'] = 'Event datetime must be in the future on creation.'

        # Capacity >= 1
        if self.capacity is not None and self.capacity < 1:
            errors['capacity'] = 'Capacity must be at least 1.'

        # Prices >= 0
        if self.member_price is not None and self.member_price < Decimal('0.00'):
            errors['member_price'] = 'Member price must be non-negative.'

        if self.nonmember_price is not None and self.nonmember_price < Decimal('0.00'):
            errors['nonmember_price'] = 'Non-member price must be non-negative.'

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def get_availability(self) -> dict:
        """
        Computes live availability in real-time directly from ticket counts in Postgres.
        Returns:
            dict: {
                "capacity": int,
                "sold": int,
                "remaining": int
            }
        """
        sold_count = self.tickets.exclude(status=Ticket.STATUS_CANCELLED).count()
        remaining = max(0, self.capacity - sold_count)
        return {
            'capacity': self.capacity,
            'sold': sold_count,
            'remaining': remaining,
        }

    def can_sell_ticket(self, quantity: int = 1) -> bool:
        """
        Checks whether the event has sufficient remaining capacity to sell `quantity` tickets.
        """
        availability = self.get_availability()
        return availability['remaining'] >= quantity and self.status == self.STATUS_PUBLISHED

    def __str__(self):
        return f"{self.title} ({self.datetime.strftime('%Y-%m-%d %H:%M')})"


class Ticket(models.Model):
    TYPE_MEMBER = 'member'
    TYPE_NONMEMBER = 'nonmember'
    TYPE_CHOICES = [
        (TYPE_MEMBER, 'Member'),
        (TYPE_NONMEMBER, 'Non-Member'),
    ]

    STATUS_VALID = 'valid'
    STATUS_CHECKED_IN = 'checked_in'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_VALID, 'Valid'),
        (STATUS_CHECKED_IN, 'Checked In'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name='tickets',
        help_text='Event for which this ticket was issued'
    )
    holder = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tickets',
        null=True,
        blank=True,
        help_text='User account holding the ticket (optional for guests)'
    )
    holder_name = models.CharField(max_length=255, blank=True, default='')
    holder_email = models.EmailField(blank=True, default='')
    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default=TYPE_NONMEMBER,
        help_text='Ticket pricing tier: member or nonmember'
    )
    price_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text='Actual monetary price paid for the ticket'
    )
    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        db_index=True,
        help_text='Unique UUID token for QR code and check-in'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_VALID,
        help_text='Ticket status: valid, checked_in, or cancelled'
    )
    checked_in_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Ticket'
        verbose_name_plural = 'Tickets'
        indexes = [
            models.Index(fields=['event', 'status'], name='ticket_event_status_idx'),
            models.Index(fields=['token'], name='ticket_token_idx'),
        ]

    def __str__(self):
        return f"Ticket {self.token} - {self.event.title} ({self.get_status_display()})"
