from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from accounts.permissions import IsOfficer
from .models import Event, Ticket
from .serializers import (
    EventSerializer,
    EventAvailabilitySerializer,
    TicketSerializer,
    TicketPurchaseSerializer,
    CheckInFeedSerializer,
    EventStatsSerializer,
)
from .services import (
    get_event_availability,
    purchase_ticket,
    check_in_ticket,
    get_event_checkin_feed,
    get_event_stats,
    generate_ticket_qr_bytes,
    generate_ticket_qr_data_url,
)


from rest_framework import filters

class EventViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for managing Events.
    - GET /api/events/ : List all events (supports ?status= query filter and search)
    - POST /api/events/ : Create a new event
    - GET /api/events/{id}/ : Retrieve event details
    - PUT /api/events/{id}/ : Update event
    - PATCH /api/events/{id}/ : Partial update event
    - DELETE /api/events/{id}/ : Remove event
    - GET /api/events/{id}/availability : Real-time availability { capacity, sold, remaining }
    - POST /api/events/{id}/tickets : Purchase a ticket with concurrency protection & ledger record
    - GET /api/events/{id}/tickets : List tickets for this event
    - GET /api/events/{id}/checkin-feed : Live checked-in count and recent check-ins feed (Officers only)
    """
    queryset = Event.objects.all().order_by('datetime')
    serializer_class = EventSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'venue', 'description']
    ordering_fields = ['datetime', 'capacity', 'created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'checkin_feed', 'stats']:
            return [IsOfficer()]
        return [permissions.AllowAny()]

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

    @action(detail=True, methods=['get'], permission_classes=[IsOfficer], url_path='checkin-feed')
    def checkin_feed(self, request, pk=None):
        """
        GET /api/events/{id}/checkin-feed
        Returns live attendance metrics (checked-in count, total sold, attendance %)
        and recent check-in events feed.
        Restricted to Officers (Club Leaders & Admins).
        """
        event = self.get_object()
        data = get_event_checkin_feed(event)
        serializer = CheckInFeedSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], permission_classes=[IsOfficer], url_path='stats')
    def stats(self, request, pk=None):
        """
        GET /api/events/{id}/stats
        Returns post-event/live stats: tickets sold, attendance (checked-in count),
        attendance rate, and revenue (sum of price_paid, split by member/non-member).
        Restricted to Officers.
        """
        event = self.get_object()
        data = get_event_stats(event)
        serializer = EventStatsSerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)


from django.core.exceptions import ValidationError as DjangoValidationError

class TicketQRView(APIView):
    """
    GET /api/tickets/{token}/qr
    Returns a PNG image of the ticket QR code (or JSON data URL if requested).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            ticket = Ticket.objects.get(token=token)
        except (Ticket.DoesNotExist, ValueError, DjangoValidationError):
            return Response(
                {"detail": "Ticket with specified token not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        output_param = request.query_params.get('output', '').lower()
        if output_param in ('json', 'data_url'):
            data_url = generate_ticket_qr_data_url(str(ticket.token))
            return Response({"token": str(ticket.token), "qr_code": data_url}, status=status.HTTP_200_OK)

        # Default: return raw PNG image
        image_bytes = generate_ticket_qr_bytes(str(ticket.token))
        return HttpResponse(image_bytes, content_type="image/png")


class TicketCheckInView(APIView):
    """
    POST /api/tickets/{token}/check-in
    Validates token and marks ticket as checked in.
    Rejects double check-ins and invalid/cancelled tokens with clear error messages.
    Restricted to Officers (Club Leaders and Admins).
    """
    permission_classes = [IsOfficer]

    def post(self, request, token):
        try:
            ticket = check_in_ticket(token)
        except ValidationError as exc:
            detail = exc.detail.get('detail') if isinstance(exc.detail, dict) else str(exc.detail)
            if "Ticket not found" in str(detail):
                return Response({"detail": detail}, status=status.HTTP_404_NOT_FOUND)
            return Response({"detail": detail}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "status": "success",
                "message": f"Check-in successful. Welcome, {ticket.holder_name or 'attendee'}!",
                "ticket": TicketSerializer(ticket).data,
            },
            status=status.HTTP_200_OK,
        )
