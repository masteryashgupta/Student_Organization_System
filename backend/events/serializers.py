from decimal import Decimal
from django.utils import timezone
from rest_framework import serializers
from .models import Event, Ticket


class EventAvailabilitySerializer(serializers.Serializer):
    capacity = serializers.IntegerField(read_only=True)
    sold = serializers.IntegerField(read_only=True)
    remaining = serializers.IntegerField(read_only=True)


class EventSerializer(serializers.ModelSerializer):
    availability = serializers.SerializerMethodField(read_only=True)

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
            'availability',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'availability', 'created_at', 'updated_at']

    def get_availability(self, obj):
        return obj.get_availability()

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


class TicketSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source='event.title', read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id',
            'event',
            'event_title',
            'holder',
            'holder_name',
            'holder_email',
            'type',
            'price_paid',
            'token',
            'status',
            'checked_in_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'token', 'created_at', 'updated_at']


class TicketPurchaseSerializer(serializers.Serializer):
    holder_name = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        help_text="Name of attendee holding the ticket (defaults to user name if logged in)"
    )
    holder_email = serializers.EmailField(
        required=False,
        allow_blank=True,
        help_text="Email of attendee (defaults to user email if logged in)"
    )

    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user if request else None

        name = (attrs.get('holder_name') or '').strip()
        email = (attrs.get('holder_email') or '').strip()

        if not user or not user.is_authenticated:
            errors = {}
            if not name:
                errors['holder_name'] = "Name is required for ticket purchase."
            if not email:
                errors['holder_email'] = "Email is required for ticket purchase."
            if errors:
                raise serializers.ValidationError(errors)
        else:
            if not name:
                attrs['holder_name'] = getattr(user, 'name', '') or user.username
            if not email:
                attrs['holder_email'] = user.email

        return attrs
