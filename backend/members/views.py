from datetime import timedelta
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.permissions import IsOfficer
from core.services import record_transaction
from .models import MembershipTier, Membership
from .serializers import (
    MembershipTierSerializer,
    MembershipSerializer,
    MemberDiscountContractSerializer,
    PayDuesSerializer,
)


class MembershipTierListCreateView(generics.ListCreateAPIView):
    """
    GET /api/membership-tiers -> Public list of active tiers
    POST /api/membership-tiers -> Officer only tier creation
    """
    queryset = MembershipTier.objects.filter(is_active=True)
    serializer_class = MembershipTierSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsOfficer()]
        return [permissions.AllowAny()]


class MembershipTierDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PUT/DELETE /api/membership-tiers/{id}
    """
    queryset = MembershipTier.objects.all()
    serializer_class = MembershipTierSerializer
    permission_classes = [IsOfficer]


class MembershipListCreateView(generics.ListCreateAPIView):
    """
    GET /api/members -> Officer list of all memberships
    POST /api/members -> Create/assign a membership record
    """
    queryset = Membership.objects.all()
    serializer_class = MembershipSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsOfficer()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status__iexact=status_param)
        return queryset


class MembershipDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PUT/DELETE /api/members/{id}
    """
    queryset = Membership.objects.all()
    serializer_class = MembershipSerializer
    permission_classes = [IsOfficer]


class MyMembershipDiscountView(APIView):
    """
    CONTRACT ENDPOINT: GET /api/members/me
    Shared discount contract endpoint used by Ticketing (P2) and Merch Store (P3).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        try:
            membership = Membership.objects.select_related('tier').get(user=user)
            is_active = membership.is_active_member
            tier_name = membership.tier.name if membership.tier else None
            ticket_discount = membership.tier.ticket_discount_pct if (is_active and membership.tier) else 0.00
            merch_discount = membership.tier.merch_discount_pct if (is_active and membership.tier) else 0.00
            expires_on = membership.end_date if is_active else None

            data = {
                "is_active_member": is_active,
                "tier": tier_name,
                "ticket_discount_pct": float(ticket_discount),
                "merch_discount_pct": float(merch_discount),
                "expires_on": expires_on,
                "days_until_expiry": membership.days_until_expiry if is_active else 0,
            }
        except Membership.DoesNotExist:
            data = {
                "is_active_member": False,
                "tier": None,
                "ticket_discount_pct": 0.00,
                "merch_discount_pct": 0.00,
                "expires_on": None,
                "days_until_expiry": 0,
            }

        serializer = MemberDiscountContractSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ExpiringMembershipsView(generics.ListAPIView):
    """
    GET /api/members/expiring?days=30
    Officer-only endpoint returning memberships expiring within N days (default 30).
    """
    serializer_class = MembershipSerializer
    permission_classes = [IsOfficer]

    def get_queryset(self):
        days_param = self.request.query_params.get('days', 30)
        try:
            days = int(days_param)
        except ValueError:
            days = 30

        today = timezone.now().date()
        target_expiry = today + timedelta(days=days)

        return Membership.objects.filter(
            status=Membership.STATUS_ACTIVE,
            dues_paid=True,
            end_date__gte=today,
            end_date__lte=target_expiry
        ).select_related('user', 'tier')


class PayDuesView(APIView):
    """
    POST /api/members/{id}/pay-dues or POST /api/members/pay-dues
    Records a member's dues payment:
      - Marks dues_paid = True
      - Activates membership (status = 'active')
      - Computes start_date and end_date based on tier duration
      - Calls core.record_transaction(income, dues, ...) to record in central ledger
      - IDEMPOTENT: If already paid and currently active, does not double-charge or duplicate ledger transactions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk=None):
        serializer = PayDuesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tier_id = serializer.validated_data.get('tier_id')

        # Find target membership (by pk if provided, or logged-in user's membership)
        if pk:
            try:
                membership = Membership.objects.select_related('tier', 'user').get(pk=pk)
            except Membership.DoesNotExist:
                return Response({"detail": "Membership not found."}, status=status.HTTP_404_NOT_FOUND)
            # Gate officer or self
            if not request.user.is_officer and membership.user != request.user:
                return Response({"detail": "You do not have permission to process dues for another user."}, status=status.HTTP_403_FORBIDDEN)
        else:
            try:
                membership = Membership.objects.select_related('tier', 'user').get(user=request.user)
            except Membership.DoesNotExist:
                if not tier_id:
                    return Response({"detail": "No existing membership record. Please specify tier_id to select a tier."}, status=status.HTTP_400_BAD_REQUEST)
                try:
                    tier = MembershipTier.objects.get(pk=tier_id, is_active=True)
                except MembershipTier.DoesNotExist:
                    return Response({"detail": "Specified tier not found or inactive."}, status=status.HTTP_404_NOT_FOUND)
                membership = Membership(user=request.user, tier=tier)

        # Allow updating tier if tier_id supplied
        if tier_id:
            try:
                tier = MembershipTier.objects.get(pk=tier_id, is_active=True)
                membership.tier = tier
            except MembershipTier.DoesNotExist:
                return Response({"detail": "Specified tier not found or inactive."}, status=status.HTTP_404_NOT_FOUND)

        today = timezone.now().date()

        # IDEMPOTENCY CHECK:
        # If dues are already marked as paid and the membership end_date is still valid in the future,
        # return the active membership without creating duplicate transaction records.
        if membership.dues_paid and membership.end_date and membership.end_date >= today:
            return Response(
                {
                    "status": "already_paid",
                    "message": "Membership dues are already paid and active.",
                    "is_idempotent": True,
                    "membership": MembershipSerializer(membership).data,
                },
                status=status.HTTP_200_OK
            )

        # Process Dues Activation
        membership.start_date = today
        membership.end_date = today + timedelta(days=membership.tier.duration_days)
        membership.dues_paid = True
        membership.dues_amount_paid = membership.tier.price
        membership.status = Membership.STATUS_ACTIVE
        membership.save()

        # Automatically record financial transaction in the central ledger
        tx = record_transaction(
            type='income',
            category='dues',
            amount=membership.tier.price,
            source=f"Member #{membership.user.id} ({membership.user.name or membership.user.email})",
            description=f"Membership dues payment for tier: {membership.tier.name} ({membership.tier.duration_days} days)",
            date=timezone.now()
        )

        # Promote user role to 'member' if currently public
        user = membership.user
        if user.role == 'public':
            user.role = 'member'
            user.save()

        return Response(
            {
                "status": "success",
                "message": f"Successfully processed dues payment of ${membership.tier.price} for {membership.tier.name}.",
                "transaction_id": tx.id,
                "membership": MembershipSerializer(membership).data,
            },
            status=status.HTTP_200_OK
        )
