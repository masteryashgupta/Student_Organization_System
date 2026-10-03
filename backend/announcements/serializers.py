from rest_framework import serializers
from .models import Announcement, MailingListSubscriber


class AnnouncementSerializer(serializers.ModelSerializer):
    author_email = serializers.ReadOnlyField(source='author.email', default=None)
    author_name = serializers.SerializerMethodField()
    audience_display = serializers.CharField(source='get_audience_display', read_only=True)

    class Meta:
        model = Announcement
        fields = [
            'id',
            'title',
            'body',
            'author',
            'author_email',
            'author_name',
            'audience',
            'audience_display',
            'is_sent',
            'sent_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'is_sent', 'sent_at', 'created_at', 'updated_at']

    def get_author_name(self, obj):
        if not obj.author:
            return "System / Club Officer"
        full_name = f"{obj.author.first_name} {obj.author.last_name}".strip()
        return full_name if full_name else obj.author.email

    def validate_title(self, value):
        val = value.strip() if value else ''
        if len(val) < 3:
            raise serializers.ValidationError("Announcement title must be at least 3 characters long.")
        return val

    def validate_body(self, value):
        val = value.strip() if value else ''
        if len(val) < 5:
            raise serializers.ValidationError("Announcement body must be at least 5 characters long.")
        return val

    def validate_audience(self, value):
        valid_audiences = dict(Announcement.AUDIENCE_CHOICES)
        if value not in valid_audiences:
            raise serializers.ValidationError(f"Invalid audience. Must be one of: {list(valid_audiences.keys())}")
        return value


class MailingListSubscriberSerializer(serializers.ModelSerializer):
    class Meta:
        model = MailingListSubscriber
        fields = [
            'id',
            'email',
            'user',
            'is_active',
            'subscribed_at',
            'unsubscribed_at',
        ]
        read_only_fields = ['id', 'user', 'subscribed_at', 'unsubscribed_at']

    def validate_email(self, value):
        val = value.strip().lower() if value else ''
        if not val or '@' not in val:
            raise serializers.ValidationError("Please provide a valid email address.")
        return val
