from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Announcement
from .serializers import AnnouncementSerializer


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
