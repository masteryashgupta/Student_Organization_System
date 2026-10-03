from rest_framework import serializers
from .models import Task, Fundraiser

class TaskSerializer(serializers.ModelSerializer):
    assignee_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = ["id", "fundraiser", "title", "assignee", "assignee_name",
                  "status", "due_date", "created_at"]

    def get_assignee_name(self, obj):
        if not obj.assignee:
            return "Unassigned"
        return obj.assignee.get_full_name() or obj.assignee.username

class FundraiserSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, read_only=True)
    progress_percent = serializers.IntegerField(read_only=True)
    tasks_total = serializers.IntegerField(read_only=True)
    tasks_done = serializers.IntegerField(read_only=True)

    class Meta:
        model = Fundraiser
        fields = ["id", "name", "description", "goal_amount", "raised_amount",
                  "event_date", "is_active", "progress_percent",
                  "tasks_total", "tasks_done", "tasks", "created_at"]
