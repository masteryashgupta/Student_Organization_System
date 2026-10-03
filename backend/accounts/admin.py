from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'name', 'phone', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('username', 'email', 'name', 'phone')
    ordering = ('username',)

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Custom Profile & Role', {'fields': ('name', 'phone', 'role')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Custom Profile & Role', {'fields': ('name', 'phone', 'role')}),
    )
