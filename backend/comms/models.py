from django.db import models
from django.conf import settings
from django.utils import timezone


class Announcement(models.Model):
    """One post that reaches every member and is archived forever."""
    title = models.CharField(max_length=150)
    body = models.TextField()
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="announcements",
    )
    email_sent = models.BooleanField(default=False)
    recipients_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title
