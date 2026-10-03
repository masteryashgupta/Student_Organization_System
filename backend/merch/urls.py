from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("products", views.ProductViewSet, basename="product")
router.register("variants", views.VariantViewSet, basename="variant")
router.register("orders", views.OrderViewSet, basename="order")

urlpatterns = [path("", include(router.urls))]
