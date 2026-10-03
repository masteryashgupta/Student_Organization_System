from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("fundraisers", views.FundraiserViewSet, basename="fundraiser")
router.register("tasks", views.TaskViewSet, basename="task")
urlpatterns = [path("", include(router.urls))]
