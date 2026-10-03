from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone


class Project(models.Model):
    STATUS_PLANNING = 'planning'
    STATUS_ACTIVE = 'active'
    STATUS_COMPLETED = 'completed'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_PLANNING, 'Planning'),
        (STATUS_ACTIVE, 'Active'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    name = models.CharField(
        max_length=255,
        help_text="Fundraiser or project name (e.g. 'Annual Fall Bake Sale Fundraiser')"
    )
    description = models.TextField(
        blank=True,
        default='',
        help_text="Project scope, goals, location, and volunteer guidelines"
    )
    goal_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Fundraising target goal amount ($)"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
        help_text="Current execution status of the project/fundraiser"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_projects',
        help_text="Officer or leader who initiated the project"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Project / Fundraiser'
        verbose_name_plural = 'Projects & Fundraisers'
        constraints = [
            models.CheckConstraint(
                check=models.Q(goal_amount__gte=Decimal('0.00')),
                name='project_goal_amount_non_negative'
            )
        ]

    @property
    def total_tasks(self) -> int:
        return self.tasks.count()

    @property
    def completed_tasks(self) -> int:
        return self.tasks.filter(status=Task.STATUS_DONE).count()

    @property
    def progress_percentage(self) -> int:
        total = self.total_tasks
        if total == 0:
            return 0
        return int(round((self.completed_tasks / total) * 100))

    def clean(self):
        super().clean()
        if self.goal_amount is not None and self.goal_amount < Decimal('0.00'):
            raise ValidationError({'goal_amount': 'Goal amount cannot be negative.'})
        if not self.name or not self.name.strip():
            raise ValidationError({'name': 'Project name is required.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} [${self.goal_amount} - {self.get_status_display()}]"


class Task(models.Model):
    STATUS_TODO = 'todo'
    STATUS_DOING = 'doing'
    STATUS_DONE = 'done'

    STATUS_CHOICES = [
        (STATUS_TODO, 'To Do'),
        (STATUS_DOING, 'In Progress'),
        (STATUS_DONE, 'Done'),
    ]

    PRIORITY_LOW = 'low'
    PRIORITY_MEDIUM = 'medium'
    PRIORITY_HIGH = 'high'
    PRIORITY_URGENT = 'urgent'

    PRIORITY_CHOICES = [
        (PRIORITY_LOW, 'Low'),
        (PRIORITY_MEDIUM, 'Medium'),
        (PRIORITY_HIGH, 'High'),
        (PRIORITY_URGENT, 'Urgent'),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='tasks',
        help_text="Parent fundraiser or project this task belongs to"
    )
    title = models.CharField(
        max_length=255,
        help_text="Action item (e.g. 'Bake 3 dozen cookies', 'Buy supplies', 'Run checkout table 12-2pm')"
    )
    description = models.TextField(
        blank=True,
        default='',
        help_text="Detailed checklist, shift schedule, or supply specifications"
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks',
        help_text="Assigned volunteer or club member responsible for this action item"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_TODO,
        help_text="Workflow status: todo, doing, or done"
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default=PRIORITY_MEDIUM,
        help_text="Task urgency level"
    )
    due_date = models.DateField(
        null=True,
        blank=True,
        help_text="Target completion deadline date"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['due_date', 'status', '-created_at']
        verbose_name = 'Volunteer Task'
        verbose_name_plural = 'Volunteer Tasks'

    @property
    def is_overdue(self) -> bool:
        if self.due_date and self.status != self.STATUS_DONE:
            return self.due_date < timezone.now().date()
        return False

    @property
    def assignee_display_name(self) -> str:
        if not self.assignee:
            return "Unassigned"
        return self.assignee.name or self.assignee.username or self.assignee.email

    def clean(self):
        super().clean()
        if not hasattr(self, 'project') or self.project_id is None:
            raise ValidationError({'project': 'Every task must belong to a valid project.'})

        if not self.title or not self.title.strip():
            raise ValidationError({'title': 'Task title cannot be empty.'})

        if self.status not in dict(self.STATUS_CHOICES):
            raise ValidationError({'status': f"Invalid status '{self.status}'. Must be one of: todo, doing, done."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        assignee_str = self.assignee_display_name
        return f"[{self.get_status_display().upper()}] {self.title} ({self.project.name}) - {assignee_str}"
