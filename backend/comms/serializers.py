from rest_framework import serializers
from .models import Announcement

class AnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = ["id", "title", "body", "author", "author_name",
                  "email_sent", "recipients_count", "created_at"]
        read_only_fields = ["author", "email_sent", "recipients_count"]

    def get_author_name(self, obj):
        if not obj.author:
            return "Club"
        return obj.author.get_full_name() or obj.author.username
