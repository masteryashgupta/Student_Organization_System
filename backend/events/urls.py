from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("events", views.EventViewSet, basename="event")
router.register("tickets", views.TicketViewSet, basename="ticket")

urlpatterns = [path("", include(router.urls))]
