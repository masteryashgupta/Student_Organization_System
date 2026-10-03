from django.contrib import admin
from .models import Transaction, Reimbursement

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("created_at", "direction", "category", "amount", "member", "description")
    list_filter = ("direction", "category")
    search_fields = ("description", "member__username")
    date_hierarchy = "created_at"

@admin.register(Reimbursement)
class ReimbursementAdmin(admin.ModelAdmin):
    list_display = ("volunteer", "amount", "reason", "status", "created_at")
    list_filter = ("status",)
