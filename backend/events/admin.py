from django.contrib import admin
from .models import Event


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
