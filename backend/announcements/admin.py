from django.contrib import admin
from .models import Announcement


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'author', 'audience', 'is_sent', 'created_at', 'sent_at')
    list_filter = ('audience', 'is_sent', 'created_at')
    search_fields = ('title', 'body', 'author__email', 'author__first_name', 'author__last_name')
    readonly_fields = ('created_at', 'updated_at', 'sent_at')
