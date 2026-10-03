from django.urls import path
from . import views

urlpatterns = [
    path("create-order/", views.create_order, name="create-order"),
    path("verify/", views.verify, name="verify"),
    path("webhook/", views.webhook, name="webhook"),
]
