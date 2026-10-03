from django.urls import path
from .views import (
    FinanceSummaryView,
    FinanceTransactionListCreateView,
    ReimbursementListCreateView,
    ReimbursementDetailView,
    ReimbursementApproveView,
    ReimbursementRejectView,
    ReimbursementMarkPaidView,
)

urlpatterns = [
    path('finance/summary', FinanceSummaryView.as_view(), name='finance-summary'),
    path('finance/summary/', FinanceSummaryView.as_view(), name='finance-summary-slash'),

    path('finance/transactions', FinanceTransactionListCreateView.as_view(), name='finance-transaction-list-create'),
    path('finance/transactions/', FinanceTransactionListCreateView.as_view(), name='finance-transaction-list-create-slash'),

    path('reimbursements', ReimbursementListCreateView.as_view(), name='reimbursement-list-create'),
    path('reimbursements/', ReimbursementListCreateView.as_view(), name='reimbursement-list-create-slash'),
    path('reimbursements/<int:pk>', ReimbursementDetailView.as_view(), name='reimbursement-detail'),
    path('reimbursements/<int:pk>/', ReimbursementDetailView.as_view(), name='reimbursement-detail-slash'),
    path('reimbursements/<int:pk>/approve', ReimbursementApproveView.as_view(), name='reimbursement-approve'),
    path('reimbursements/<int:pk>/approve/', ReimbursementApproveView.as_view(), name='reimbursement-approve-slash'),
    path('reimbursements/<int:pk>/reject', ReimbursementRejectView.as_view(), name='reimbursement-reject'),
    path('reimbursements/<int:pk>/reject/', ReimbursementRejectView.as_view(), name='reimbursement-reject-slash'),
    path('reimbursements/<int:pk>/mark-paid', ReimbursementMarkPaidView.as_view(), name='reimbursement-mark-paid'),
    path('reimbursements/<int:pk>/mark-paid/', ReimbursementMarkPaidView.as_view(), name='reimbursement-mark-paid-slash'),
]
