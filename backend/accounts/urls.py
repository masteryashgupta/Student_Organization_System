from django.urls import path, re_path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    CurrentUserView,
)

urlpatterns = [
    re_path(r'^auth/register/?$', RegisterView.as_view(), name='auth-register'),
    re_path(r'^auth/login/?$', CustomTokenObtainPairView.as_view(), name='auth-login'),
    re_path(r'^auth/refresh/?$', TokenRefreshView.as_view(), name='auth-refresh'),
    re_path(r'^auth/token/refresh/?$', TokenRefreshView.as_view(), name='auth-token-refresh'),
    re_path(r'^auth/me/?$', CurrentUserView.as_view(), name='auth-me'),
]
