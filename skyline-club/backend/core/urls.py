from django.urls import path
from .views import health_check, TransactionListView

urlpatterns = [
    path('health/', health_check, name='health-check'),
    path('finance/transactions', TransactionListView.as_view(), name='transaction-list'),
]
