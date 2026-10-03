from django.contrib import admin
from .models import MembershipTier, Membership


@admin.register(MembershipTier)
class MembershipTierAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'duration_days', 'ticket_discount_pct', 'merch_discount_pct', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'tier', 'status', 'dues_paid', 'start_date', 'end_date', 'verification_token')
    list_filter = ('status', 'dues_paid', 'tier')
    search_fields = ('user__name', 'user__email', 'verification_token')
    readonly_fields = ('verification_token', 'created_at', 'updated_at')
