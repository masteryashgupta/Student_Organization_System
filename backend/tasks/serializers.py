from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Project, Task

User = get_user_model()


class UserSimpleSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'name', 'role', 'display_name']
        read_only_fields = ['id', 'username', 'email', 'name', 'role', 'display_name']

    def get_display_name(self, obj):
        return obj.name or obj.username or obj.email


class TaskSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)
    assignee_detail = UserSimpleSerializer(source='assignee', read_only=True)
    assignee_name = serializers.CharField(source='assignee_display_name', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Task
        fields = [
            'id',
            'project',
            'project_name',
            'title',
            'description',
            'assignee',
            'assignee_detail',
            'assignee_name',
            'status',
            'priority',
            'due_date',
            'is_overdue',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'project_name', 'assignee_detail', 'assignee_name', 'is_overdue']

    def validate_project(self, value):
        if not value:
            raise serializers.ValidationError("A valid project is required for every task.")
        return value

    def validate_assignee(self, value):
        if value is not None and not User.objects.filter(pk=value.pk).exists():
            raise serializers.ValidationError("Assigned user does not exist.")
        return value

    def validate_status(self, value):
        allowed_statuses = [Task.STATUS_TODO, Task.STATUS_DOING, Task.STATUS_DONE]
        if value not in allowed_statuses:
            raise serializers.ValidationError(
                f"Invalid status '{value}'. Allowed choices: {', '.join(allowed_statuses)}."
            )
        return value

    def validate(self, attrs):
        # Create a temporary instance to trigger model-level full_clean() validations
        instance = Task(**attrs)
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(serializers.as_serializer_error(exc))
        return attrs


class ProjectSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, read_only=True)
    total_tasks = serializers.IntegerField(read_only=True)
    completed_tasks = serializers.IntegerField(read_only=True)
    progress_percentage = serializers.IntegerField(read_only=True)
    raised_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    financial_progress_percentage = serializers.IntegerField(read_only=True)
    is_on_track = serializers.BooleanField(read_only=True)
    created_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Project
        fields = [
            'id',
            'name',
            'description',
            'goal_amount',
            'raised_amount',
            'financial_progress_percentage',
            'is_on_track',
            'status',
            'created_by',
            'created_by_name',
            'total_tasks',
            'completed_tasks',
            'progress_percentage',
            'tasks',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'total_tasks',
            'completed_tasks',
            'progress_percentage',
            'raised_amount',
            'financial_progress_percentage',
            'is_on_track',
            'created_by_name',
            'tasks',
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return "System / Lead"
        return obj.created_by.name or obj.created_by.username or obj.created_by.email

    def validate_goal_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Goal amount cannot be negative.")
        return value

    def validate(self, attrs):
        instance = Project(**attrs)
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(serializers.as_serializer_error(exc))
        return attrs
