from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, TicketQRView, TicketCheckInView

router = DefaultRouter()
router.register(r'events', EventViewSet, basename='event')

urlpatterns = [
    path('', include(router.urls)),
    path('tickets/<str:token>/qr/', TicketQRView.as_view(), name='ticket-qr'),
    path('tickets/<str:token>/qr', TicketQRView.as_view(), name='ticket-qr-noslash'),
    path('tickets/<str:token>/check-in/', TicketCheckInView.as_view(), name='ticket-check-in'),
    path('tickets/<str:token>/check-in', TicketCheckInView.as_view(), name='ticket-check-in-noslash'),
]
