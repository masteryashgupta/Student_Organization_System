from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Announcement, MailingListSubscriber
from .serializers import AnnouncementSerializer, MailingListSubscriberSerializer
from .services import dispatch_announcement_email


class AnnouncementListCreateView(generics.ListCreateAPIView):
    """
    GET /api/announcements
      List all historical club announcements (archive view).
      Supports optional query filter: ?audience=all|members|volunteers

    POST /api/announcements
      Create a new announcement record.
    """
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = Announcement.objects.all()
        audience_param = self.request.query_params.get('audience')
        if audience_param:
            queryset = queryset.filter(audience__iexact=audience_param)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user if self.request.user and self.request.user.is_authenticated else None
        serializer.save(author=user)


class AnnouncementDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/announcements/<id>
    PUT/PATCH /api/announcements/<id>
    DELETE /api/announcements/<id>
    """
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.AllowAny]


class AnnouncementSendView(APIView):
    """
    POST /api/announcements/<id>/send

    Dispatches announcement email to the designated target audience.
    Pulls member emails from accounts/members data (read-only).
    Records sent status and timestamp upon dispatch.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk, *args, **kwargs):
        announcement = get_object_or_404(Announcement, pk=pk)

        # Check officer permission if user is authenticated
        if request.user and request.user.is_authenticated:
            is_officer = getattr(request.user, 'is_officer', False) or request.user.is_staff or request.user.is_superuser
            if not is_officer:
                return Response(
                    {"detail": "Only club officers can dispatch email announcements."},
                    status=status.HTTP_403_FORBIDDEN
                )

        dispatch_result = dispatch_announcement_email(announcement)
        return Response(dispatch_result, status=status.HTTP_200_OK)


class MailingListSubscriberListCreateView(generics.ListCreateAPIView):
    """
    GET /api/announcements/subscribers
      Lists active mailing list subscribers.

    POST /api/announcements/subscribers
      Subscribes an email to the club mailing list.
    """
    serializer_class = MailingListSubscriberSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return MailingListSubscriber.objects.filter(is_active=True)

    def perform_create(self, serializer):
        user = self.request.user if self.request.user and self.request.user.is_authenticated else None
        serializer.save(user=user)


class MailingListSubscriberDetailView(generics.RetrieveDestroyAPIView):
    """
    GET /api/announcements/subscribers/<id>
    DELETE /api/announcements/subscribers/<id> (Unsubscribe)
    """
    queryset = MailingListSubscriber.objects.all()
    serializer_class = MailingListSubscriberSerializer
    permission_classes = [permissions.AllowAny]

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.unsubscribed_at = instance.unsubscribed_at or instance.updated_at
        instance.save()
