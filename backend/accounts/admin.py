from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Membership, MembershipTier


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "email", "role", "first_name", "last_name", "is_active")
    list_filter = ("role", "is_active", "is_staff")
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Club info", {"fields": ("role", "phone")}),
    )


@admin.register(MembershipTier)
class MembershipTierAdmin(admin.ModelAdmin):
    list_display = ("name", "price", "ticket_discount_percent", "merch_discount_percent")


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "tier", "status", "dues_paid", "expires_on")
    list_filter = ("status", "dues_paid", "tier")
    search_fields = ("user__username", "user__email")
    actions = ["activate_memberships"]

    @admin.action(description="Activate selected memberships (12 months)")
    def activate_memberships(self, request, queryset):
        for m in queryset:
            m.activate()
