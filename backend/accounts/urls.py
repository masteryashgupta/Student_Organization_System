from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    CurrentUserView,
)

urlpatterns = [
    path('auth/register', RegisterView.as_view(), name='auth-register'),
    path('auth/login', CustomTokenObtainPairView.as_view(), name='auth-login'),
    path('auth/refresh', TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/me', CurrentUserView.as_view(), name='auth-me'),
]
