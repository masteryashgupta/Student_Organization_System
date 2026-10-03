from django.contrib import admin
from .models import Event, Ticket


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'datetime',
        'venue',
        'capacity',
        'member_price',
        'nonmember_price',
        'status',
        'created_at',
    )
    list_filter = ('status', 'datetime')
    search_fields = ('title', 'description', 'venue')
    ordering = ('datetime',)


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = (
        'token',
        'event',
        'holder',
        'holder_name',
        'type',
        'price_paid',
        'status',
        'checked_in_at',
        'created_at',
    )
    list_filter = ('status', 'type', 'created_at')
    search_fields = ('token', 'holder_name', 'holder_email', 'event__title')
    ordering = ('-created_at',)
