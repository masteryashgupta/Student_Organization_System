from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

router = DefaultRouter()
router.register("tiers", views.MembershipTierViewSet, basename="tier")
router.register("members", views.MemberViewSet, basename="member")

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("me/", views.me, name="me"),
    path("pay-dues/", views.pay_dues, name="pay-dues"),
    path("", include(router.urls)),
]
