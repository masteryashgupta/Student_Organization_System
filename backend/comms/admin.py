from django.contrib import admin
from .models import Announcement

@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "email_sent", "recipients_count", "created_at")
    search_fields = ("title", "body")
