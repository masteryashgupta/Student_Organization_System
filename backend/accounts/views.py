from rest_framework import generics, viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model

from .models import Membership, MembershipTier
from .serializers import (
    RegisterSerializer, UserSerializer,
    MembershipSerializer, MembershipTierSerializer,
)
from .permissions import IsOfficerOrTreasurer
from finance.services import record_transaction

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(user).data, status=status.HTTP_201_CREATED
        )


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    """Return / update the current user's own profile."""
    if request.method == "PATCH":
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    return Response(UserSerializer(request.user).data)


class MembershipTierViewSet(viewsets.ModelViewSet):
    queryset = MembershipTier.objects.all()
    serializer_class = MembershipTierSerializer

    def get_permissions(self):
        # Anyone (even not logged in) can see tiers to pick one at sign-up;
        # only officers/treasurers can create or edit them.
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsOfficerOrTreasurer()]


class MemberViewSet(viewsets.ReadOnlyModelViewSet):
    """Officers browse/verify the membership roster."""
    serializer_class = UserSerializer
    permission_classes = [IsOfficerOrTreasurer]

    def get_queryset(self):
        qs = User.objects.all().select_related("membership", "membership__tier")
        status_f = self.request.query_params.get("status")
        if status_f:
            qs = qs.filter(membership__status=status_f)
        return qs.order_by("-date_joined")

    @action(detail=True, methods=["get"])
    def verify(self, request, pk=None):
        """Door verification: is this person a valid member right now?"""
        user = self.get_object()
        m = getattr(user, "membership", None)
        if not m:
            return Response({"valid": False, "reason": "No membership record"})
        m.refresh_expiry_status()
        return Response({
            "valid": m.is_valid,
            "name": user.get_full_name() or user.username,
            "tier": m.tier.name if m.tier else None,
            "status": m.status,
            "expires_on": m.expires_on,
        })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def pay_dues(request):
    """
    Confirm dues payment for the current user and activate membership.
    In mock mode this is called directly; with Razorpay it's called after
    the payment webhook confirms. Posts income to the finance ledger.
    """
    membership = getattr(request.user, "membership", None)
    if membership is None:
        membership = Membership.objects.create(user=request.user)

    amount = membership.tier.price if membership.tier else 0
    membership.activate(months=12)

    record_transaction(
        amount=amount,
        direction="in",
        category="dues",
        description=f"Membership dues · {request.user.username}",
        member=request.user,
    )
    return Response(MembershipSerializer(membership).data)
