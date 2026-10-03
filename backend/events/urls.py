from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, TicketQRView

router = DefaultRouter()
router.register(r'events', EventViewSet, basename='event')

urlpatterns = [
    path('', include(router.urls)),
    path('tickets/<str:token>/qr/', TicketQRView.as_view(), name='ticket-qr'),
    path('tickets/<str:token>/qr', TicketQRView.as_view(), name='ticket-qr-noslash'),
]
