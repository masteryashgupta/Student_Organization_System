from decimal import Decimal
from django.utils import timezone
from rest_framework import serializers
from .models import Event


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            'id',
            'title',
            'description',
            'datetime',
            'venue',
            'capacity',
            'member_price',
            'nonmember_price',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_datetime(self, value):
        # Validate event datetime must be in the future on creation
        if not self.instance and value <= timezone.now():
            raise serializers.ValidationError("Event datetime must be in the future on creation.")
        return value

    def validate_capacity(self, value):
        if value is not None and value < 1:
            raise serializers.ValidationError("Capacity must be at least 1.")
        return value

    def validate_member_price(self, value):
        if value is not None and value < Decimal('0.00'):
            raise serializers.ValidationError("Member price must be non-negative (>= 0.00).")
        return value

    def validate_nonmember_price(self, value):
        if value is not None and value < Decimal('0.00'):
            raise serializers.ValidationError("Non-member price must be non-negative (>= 0.00).")
        return value
