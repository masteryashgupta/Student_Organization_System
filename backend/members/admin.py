from django.contrib import admin
from .models import MembershipTier, Membership, RenewalReminder


@admin.register(MembershipTier)
class MembershipTierAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'duration_days', 'ticket_discount_pct', 'merch_discount_pct', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'tier', 'status', 'dues_paid', 'days_until_expiry', 'start_date', 'end_date', 'verification_token')
    list_filter = ('status', 'dues_paid', 'tier')
    search_fields = ('user__name', 'user__email', 'verification_token')
    readonly_fields = ('verification_token', 'created_at', 'updated_at')


@admin.register(RenewalReminder)
class RenewalReminderAdmin(admin.ModelAdmin):
    list_display = ('email_to', 'days_before_expiry', 'sent_at', 'status')
    list_filter = ('days_before_expiry', 'status', 'sent_at')
    search_fields = ('email_to', 'message_body')
    readonly_fields = ('sent_at',)
