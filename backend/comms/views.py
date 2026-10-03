from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.mail import send_mass_mail
from django.conf import settings
from django.contrib.auth import get_user_model

from .models import Announcement
from .serializers import AnnouncementSerializer
from accounts.permissions import IsOfficerOrTreasurer

User = get_user_model()


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsOfficerOrTreasurer()]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsOfficerOrTreasurer])
    def send_email(self, request, pk=None):
        """Mail this announcement to every member with an email on file."""
        ann = self.get_object()
        emails = list(
            User.objects.exclude(email="").values_list("email", flat=True)
        )
        if emails:
            messages = [
                (f"[Skyline] {ann.title}", ann.body, settings.DEFAULT_FROM_EMAIL, [e])
                for e in emails
            ]
            send_mass_mail(messages, fail_silently=True)
        ann.email_sent = True
        ann.recipients_count = len(emails)
        ann.save(update_fields=["email_sent", "recipients_count"])
        return Response({"sent_to": len(emails)})
