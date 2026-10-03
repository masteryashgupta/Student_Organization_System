from django.contrib import admin
from .models import Project, Task


class TaskInline(admin.TabularInline):
    model = Task
    extra = 1
    fields = ('title', 'assignee', 'status', 'priority', 'due_date')
    show_change_link = True


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'goal_amount', 'status', 'get_total_tasks', 'get_progress', 'created_by', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('name', 'description')
    ordering = ('-created_at',)
    inlines = [TaskInline]

    def get_total_tasks(self, obj):
        return obj.total_tasks
    get_total_tasks.short_description = 'Total Tasks'

    def get_progress(self, obj):
        return f"{obj.progress_percentage}% ({obj.completed_tasks}/{obj.total_tasks})"
    get_progress.short_description = 'Completion'


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'assignee', 'status', 'priority', 'due_date', 'is_overdue', 'created_at')
    list_filter = ('status', 'priority', 'project', 'due_date')
    search_fields = ('title', 'description', 'project__name', 'assignee__username', 'assignee__name')
    ordering = ('due_date', 'status', '-created_at')
    date_hierarchy = 'due_date'
