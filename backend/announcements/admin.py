from django.contrib import admin
from .models import Announcement, MailingListSubscriber


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'author', 'audience', 'is_sent', 'created_at', 'sent_at')
    list_filter = ('audience', 'is_sent', 'created_at')
    search_fields = ('title', 'body', 'author__email', 'author__first_name', 'author__last_name')
    readonly_fields = ('created_at', 'updated_at', 'sent_at')


@admin.register(MailingListSubscriber)
class MailingListSubscriberAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'user', 'is_active', 'subscribed_at', 'unsubscribed_at')
    list_filter = ('is_active', 'subscribed_at')
    search_fields = ('email', 'user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('subscribed_at',)
