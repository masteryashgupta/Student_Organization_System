from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class MailingListSubscriber(models.Model):
    """
    Subscribers for general club announcement broadcasts.
    Supports both registered members and external email subscribers.
    """
    email = models.EmailField(unique=True, help_text="Subscribed email address")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='mailing_subscriptions',
        help_text="Optional linked User account"
    )
    is_active = models.BooleanField(default=True, help_text="Active subscription status")
    subscribed_at = models.DateTimeField(auto_now_add=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-subscribed_at']
        verbose_name = 'Mailing List Subscriber'
        verbose_name_plural = 'Mailing List Subscribers'

    def clean(self):
        super().clean()
        if self.email:
            self.email = self.email.lower().strip()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        status_label = "Active" if self.is_active else "Unsubscribed"
        return f"{self.email} ({status_label})"


class Announcement(models.Model):
    AUDIENCE_ALL = 'all'
    AUDIENCE_MEMBERS = 'members'
    AUDIENCE_VOLUNTEERS = 'volunteers'

    AUDIENCE_CHOICES = [
        (AUDIENCE_ALL, 'All Club Members'),
        (AUDIENCE_MEMBERS, 'Active Members Only'),
        (AUDIENCE_VOLUNTEERS, 'Volunteers'),
    ]

    title = models.CharField(max_length=200, help_text="Headline or title of the announcement")
    body = models.TextField(help_text="Detailed content of the announcement")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='announcements',
        help_text="Author/Officer who created the announcement"
    )
    audience = models.CharField(
        max_length=20,
        choices=AUDIENCE_CHOICES,
        default=AUDIENCE_ALL,
        help_text="Target audience for dispatch and visibility"
    )
    created_at = models.DateTimeField(auto_now_add=True, help_text="Timestamp when recorded")
    updated_at = models.DateTimeField(auto_now=True, help_text="Timestamp when last updated")
    is_sent = models.BooleanField(default=False, help_text="Indicates whether email dispatch has occurred")
    sent_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when announcement was emailed")

    class Meta:
        ordering = ['-created_at', '-id']
        verbose_name = 'Announcement'
        verbose_name_plural = 'Announcements'

    def clean(self):
        super().clean()
        if self.title and len(self.title.strip()) < 3:
            raise ValidationError({'title': 'Announcement title must be at least 3 characters long.'})
        if self.body and len(self.body.strip()) < 5:
            raise ValidationError({'body': 'Announcement body must be at least 5 characters long.'})
        if self.audience not in dict(self.AUDIENCE_CHOICES):
            raise ValidationError({'audience': f'Invalid audience choice: {self.audience}'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} [{self.get_audience_display()}] ({self.created_at.strftime('%Y-%m-%d')})"
