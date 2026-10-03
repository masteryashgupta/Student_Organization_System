from django.contrib import admin
from .models import Reimbursement


@admin.register(Reimbursement)
class ReimbursementAdmin(admin.ModelAdmin):
    list_display = ('id', 'requester', 'amount', 'status', 'approver', 'transaction', 'created_at', 'approved_at', 'paid_at')
    list_filter = ('status', 'created_at', 'approved_at')
    search_fields = ('description', 'requester__email', 'requester__first_name', 'approver__email', 'notes')
    readonly_fields = ('transaction', 'created_at', 'updated_at', 'approved_at', 'paid_at')
