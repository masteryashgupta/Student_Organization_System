from django.contrib import admin
from .models import Event, Ticket

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "starts_at", "capacity", "tickets_sold", "seats_left", "is_published")
    list_filter = ("is_published",)
    search_fields = ("title",)

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ("event", "holder_name", "price_paid", "is_member_price", "checked_in")
    list_filter = ("checked_in", "is_member_price", "event")
    search_fields = ("holder_name", "holder_email", "code")
