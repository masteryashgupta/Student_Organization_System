from django.urls import path
from .views import (
    AnnouncementListCreateView,
    AnnouncementDetailView,
    AnnouncementSendView,
    MailingListSubscriberListCreateView,
    MailingListSubscriberDetailView,
)

urlpatterns = [
    path('announcements', AnnouncementListCreateView.as_view(), name='announcement-list-create'),
    path('announcements/', AnnouncementListCreateView.as_view(), name='announcement-list-create-slash'),
    path('announcements/subscribers', MailingListSubscriberListCreateView.as_view(), name='subscriber-list-create'),
    path('announcements/subscribers/', MailingListSubscriberListCreateView.as_view(), name='subscriber-list-create-slash'),
    path('announcements/subscribers/<int:pk>', MailingListSubscriberDetailView.as_view(), name='subscriber-detail'),
    path('announcements/subscribers/<int:pk>/', MailingListSubscriberDetailView.as_view(), name='subscriber-detail-slash'),
    path('announcements/<int:pk>', AnnouncementDetailView.as_view(), name='announcement-detail'),
    path('announcements/<int:pk>/', AnnouncementDetailView.as_view(), name='announcement-detail-slash'),
    path('announcements/<int:pk>/send', AnnouncementSendView.as_view(), name='announcement-send'),
    path('announcements/<int:pk>/send/', AnnouncementSendView.as_view(), name='announcement-send-slash'),
]
