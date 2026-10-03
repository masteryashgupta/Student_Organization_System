from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from accounts.permissions import IsOfficer
from .models import MembershipTier, Membership
from .serializers import (
    MembershipTierSerializer,
    MembershipSerializer,
    MemberDiscountContractSerializer,
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
    Returns:
    {
        "is_active_member": true|false,
        "tier": "Annual Pass"|null,
        "ticket_discount_pct": 20.00,
        "merch_discount_pct": 10.00,
        "expires_on": "2027-10-03"|null
    }
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
            }
        except Membership.DoesNotExist:
            data = {
                "is_active_member": False,
                "tier": None,
                "ticket_discount_pct": 0.00,
                "merch_discount_pct": 0.00,
                "expires_on": None,
            }

        serializer = MemberDiscountContractSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
