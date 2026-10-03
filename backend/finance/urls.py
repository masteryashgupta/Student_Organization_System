from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("transactions", views.TransactionViewSet, basename="transaction")
router.register("reimbursements", views.ReimbursementViewSet, basename="reimbursement")

urlpatterns = [
    path("summary/", views.summary, name="finance-summary"),
    path("", include(router.urls)),
]
