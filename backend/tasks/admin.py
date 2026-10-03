from django.contrib import admin
from .models import Task, Fundraiser

class TaskInline(admin.TabularInline):
    model = Task
    extra = 1

@admin.register(Fundraiser)
class FundraiserAdmin(admin.ModelAdmin):
    list_display = ("name", "goal_amount", "raised_amount", "progress_percent", "is_active")
    inlines = [TaskInline]

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "assignee", "status", "due_date", "fundraiser")
    list_filter = ("status",)
