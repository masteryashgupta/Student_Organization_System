from django.urls import path
from .views import AnnouncementListCreateView, AnnouncementDetailView

urlpatterns = [
    path('announcements', AnnouncementListCreateView.as_view(), name='announcement-list-create'),
    path('announcements/', AnnouncementListCreateView.as_view(), name='announcement-list-create-slash'),
    path('announcements/<int:pk>', AnnouncementDetailView.as_view(), name='announcement-detail'),
    path('announcements/<int:pk>/', AnnouncementDetailView.as_view(), name='announcement-detail-slash'),
]
