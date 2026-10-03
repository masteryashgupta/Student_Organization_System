from decimal import Decimal
from django.db import models
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

    def __str__(self):
        return f"{self.title} ({self.datetime.strftime('%Y-%m-%d %H:%M')})"
