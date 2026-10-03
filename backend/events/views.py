from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Event, Ticket
from .serializers import EventSerializer, TicketSerializer
from accounts.permissions import IsOfficerOrTreasurer
from finance.services import record_transaction


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer

    def get_permissions(self):
        # Anyone logged in can view; only officers create/edit/delete
        if self.action in ["list", "retrieve", "report"]:
            return [IsAuthenticated()]
        return [IsOfficerOrTreasurer()]

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def buy(self, request, pk=None):
        """Buy a ticket for this event. Applies member pricing, posts to ledger."""
        event = self.get_object()
        if event.seats_left <= 0:
            return Response({"detail": "Sold out"}, status=400)

        membership = getattr(request.user, "membership", None)
        is_member = bool(membership and membership.is_valid)
        price = event.price_member if is_member else event.price_non_member

        ticket = Ticket.objects.create(
            event=event,
            holder=request.user,
            holder_name=request.user.get_full_name() or request.user.username,
            holder_email=request.user.email,
            price_paid=price,
            is_member_price=is_member,
        )
        record_transaction(
            amount=price, direction="in", category="ticket",
            description=f"Ticket · {event.title} · {request.user.username}",
            member=request.user, source_ref=f"event:{event.id}",
        )
        return Response(TicketSerializer(ticket).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], permission_classes=[IsOfficerOrTreasurer])
    def report(self, request, pk=None):
        """Post-event report: attendance + revenue."""
        event = self.get_object()
        return Response({
            "event": event.title,
            "capacity": event.capacity,
            "tickets_sold": event.tickets_sold,
            "attendance": event.attendance,
            "no_shows": event.tickets_sold - event.attendance,
            "revenue": float(event.revenue),
        })


class TicketViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Ticket.objects.select_related("event", "holder")
        if user.is_staff_role or user.is_superuser:
            event = self.request.query_params.get("event")
            return qs.filter(event=event) if event else qs
        return qs.filter(holder=user)

    @action(detail=False, methods=["post"], permission_classes=[IsOfficerOrTreasurer])
    def check_in(self, request):
        """Scan endpoint: post a ticket code, check it in instantly."""
        code = request.data.get("code")
        if not code:
            return Response({"detail": "code required"}, status=400)
        try:
            ticket = Ticket.objects.select_related("event", "holder").get(code=code)
        except (Ticket.DoesNotExist, ValueError):
            return Response({"valid": False, "detail": "Ticket not found"}, status=404)

        already = ticket.checked_in
        ticket.check_in()
        return Response({
            "valid": True,
            "already_checked_in": already,
            "holder": ticket.holder_name,
            "event": ticket.event.title,
            "checked_in_at": ticket.checked_in_at,
        })
