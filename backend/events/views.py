from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Event
from .serializers import EventSerializer, EventAvailabilitySerializer
from .services import get_event_availability


class EventViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for managing Events.
    - GET /api/events/ : List all events (supports ?status= query filter)
    - POST /api/events/ : Create a new event
    - GET /api/events/{id}/ : Retrieve event details
    - PUT /api/events/{id}/ : Update event
    - PATCH /api/events/{id}/ : Partial update event
    - DELETE /api/events/{id}/ : Remove event
    - GET /api/events/{id}/availability : Real-time availability { capacity, sold, remaining }
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

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny], url_path='availability')
    def availability(self, request, pk=None):
        """
        GET /api/events/{id}/availability
        Computes real-time capacity, sold, and remaining seats directly from ticket counts.
        """
        event = self.get_object()
        data = get_event_availability(event)
        serializer = EventAvailabilitySerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)
