from rest_framework import serializers
from .models import Event, Ticket
from .utils import ticket_qr_data_uri


class EventSerializer(serializers.ModelSerializer):
    tickets_sold = serializers.IntegerField(read_only=True)
    seats_left = serializers.IntegerField(read_only=True)
    attendance = serializers.IntegerField(read_only=True)
    revenue = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Event
        fields = [
            "id", "title", "description", "location", "starts_at",
            "capacity", "price_member", "price_non_member", "is_published",
            "tickets_sold", "seats_left", "attendance", "revenue", "created_at",
        ]


class TicketSerializer(serializers.ModelSerializer):
    qr = serializers.SerializerMethodField()
    event_title = serializers.CharField(source="event.title", read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id", "event", "event_title", "holder", "holder_name", "holder_email",
            "code", "price_paid", "is_member_price", "checked_in",
            "checked_in_at", "qr", "created_at",
        ]
        read_only_fields = ["code", "price_paid", "is_member_price",
                            "checked_in", "checked_in_at", "holder"]

    def get_qr(self, obj):
        return ticket_qr_data_uri(obj.code)
