from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Event
from .serializers import (
    EventSerializer,
    EventAvailabilitySerializer,
    TicketSerializer,
    TicketPurchaseSerializer,
)
from .services import get_event_availability, purchase_ticket


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
    - POST /api/events/{id}/tickets : Purchase a ticket with concurrency protection & ledger record
    - GET /api/events/{id}/tickets : List tickets for this event
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

    @action(detail=True, methods=['get', 'post'], permission_classes=[permissions.AllowAny], url_path='tickets')
    def tickets(self, request, pk=None):
        """
        GET /api/events/{id}/tickets : View tickets for event
        POST /api/events/{id}/tickets : Purchase a ticket
        """
        event = self.get_object()

        if request.method == 'GET':
            tickets = event.tickets.all()
            return Response(TicketSerializer(tickets, many=True).data)

        # POST: Ticket purchase
        serializer = TicketPurchaseSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        ticket = purchase_ticket(
            event_id=event.id,
            buyer_user=request.user if request.user.is_authenticated else None,
            holder_name=serializer.validated_data.get('holder_name', ''),
            holder_email=serializer.validated_data.get('holder_email', ''),
            request=request,
        )

        return Response(TicketSerializer(ticket).data, status=status.HTTP_201_CREATED)
