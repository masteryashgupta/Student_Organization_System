from rest_framework import viewsets, permissions
from .models import Event
from .serializers import EventSerializer


class EventViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for managing Events.
    - GET /api/events/ : List all events (supports ?status= query filter)
    - POST /api/events/ : Create a new event
    - GET /api/events/{id}/ : Retrieve event details
    - PUT /api/events/{id}/ : Update event
    - PATCH /api/events/{id}/ : Partial update event
    - DELETE /api/events/{id}/ : Remove event
    """
    queryset = Event.objects.all().order_by('datetime')
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset
