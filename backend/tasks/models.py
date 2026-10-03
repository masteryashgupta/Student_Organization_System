from django.db import models
from django.conf import settings
from django.utils import timezone


class Fundraiser(models.Model):
    """e.g. a bake sale. Tracks a goal and progress."""
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    goal_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    raised_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    event_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    @property
    def progress_percent(self):
        if not self.goal_amount:
            return 0
        return min(round(float(self.raised_amount) / float(self.goal_amount) * 100), 100)

    @property
    def tasks_total(self):
        return self.tasks.count()

    @property
    def tasks_done(self):
        return self.tasks.filter(status=Task.Status.DONE).count()

    def __str__(self):
        return self.name


class Task(models.Model):
    class Status(models.TextChoices):
        TODO = "todo", "To Do"
        IN_PROGRESS = "in_progress", "In Progress"
        DONE = "done", "Done"

    fundraiser = models.ForeignKey(
        Fundraiser, on_delete=models.CASCADE, related_name="tasks",
        null=True, blank=True,
    )
    title = models.CharField(max_length=200)
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="assigned_tasks",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TODO)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["status", "due_date"]

    def __str__(self):
        return self.title
