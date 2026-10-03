from datetime import timedelta
from decimal import Decimal
from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.permissions import IsOfficer
from core.services import record_transaction
from .models import MembershipTier, Membership
from .services import generate_member_qr_data_url
from .serializers import (
    MembershipTierSerializer,
    MembershipSerializer,
    MemberDiscountContractSerializer,
    MemberVerifyResponseSerializer,
    PayDuesSerializer,
    JoinClubSerializer,
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
    GET /api/members -> Officer list of all memberships (supports ?search= and ?status=)
    POST /api/members -> Create/assign a membership record
    """
    queryset = Membership.objects.all()
    serializer_class = MembershipSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsOfficer()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset().select_related('user', 'tier')
        status_param = self.request.query_params.get('status')
        if status_param and status_param.lower() != 'all':
            queryset = queryset.filter(status__iexact=status_param)
        search = self.request.query_params.get('search')
        if search:
            search = search.strip()
            queryset = queryset.filter(
                models.Q(user__name__icontains=search) |
                models.Q(user__email__icontains=search) |
                models.Q(user__username__icontains=search) |
                models.Q(tier__name__icontains=search)
            )
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


class MemberVerifyView(APIView):
    """
    GET /api/members/verify?query=<email-or-id>
    Officer-only verification endpoint for verifying members at the door.
    Accepts:
      - Email address (exact or substring)
      - Member ID or User ID (numeric)
      - Username
      - QR verification token
    Returns membership status, tier, discounts, remaining days, and QR code.
    Validates and handles 'not found' gracefully.
    """
    permission_classes = [IsOfficer]

    def get(self, request):
        query = request.query_params.get('query', '').strip()
        if not query:
            return Response(
                {"detail": "Query parameter 'query' is required (email, ID, or QR token)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        User = get_user_model()
        membership = None

        # 1. Match by QR verification token
        membership = Membership.objects.select_related('user', 'tier').filter(verification_token__iexact=query).first()

        # 2. Match by integer ID (Membership ID or User ID)
        if not membership and query.isdigit():
            query_int = int(query)
            membership = (
                Membership.objects.select_related('user', 'tier').filter(id=query_int).first() or
                Membership.objects.select_related('user', 'tier').filter(user__id=query_int).first()
            )

        # 3. Match by exact email
        if not membership:
            membership = Membership.objects.select_related('user', 'tier').filter(user__email__iexact=query).first()

        # 4. Match by exact username
        if not membership:
            membership = Membership.objects.select_related('user', 'tier').filter(user__username__iexact=query).first()

        # 5. Fallback: match by substring in email or name
        if not membership:
            membership = (
                Membership.objects.select_related('user', 'tier').filter(user__email__icontains=query).first() or
                Membership.objects.select_related('user', 'tier').filter(user__name__icontains=query).first()
            )

        if membership:
            is_active = membership.is_active_member
            user = membership.user
            tier = membership.tier
            qr_data_url = generate_member_qr_data_url(membership.verification_token)

            data = {
                "found": True,
                "is_active_member": is_active,
                "member_id": membership.id,
                "user_id": user.id,
                "name": getattr(user, 'name', '') or user.username,
                "email": user.email,
                "role": user.role,
                "tier": tier.name if tier else None,
                "tier_details": MembershipTierSerializer(tier).data if tier else None,
                "status": membership.status,
                "status_display": membership.get_status_display(),
                "start_date": membership.start_date,
                "end_date": membership.end_date,
                "expires_on": membership.end_date if is_active else None,
                "days_until_expiry": membership.days_until_expiry if is_active else 0,
                "dues_paid": membership.dues_paid,
                "token": membership.verification_token,
                "qr_code": qr_data_url,
                "ticket_discount_pct": tier.ticket_discount_pct if (tier and is_active) else 0.00,
                "merch_discount_pct": tier.merch_discount_pct if (tier and is_active) else 0.00,
                "message": "Active member verified." if is_active else f"Membership is currently {membership.get_status_display().lower()}."
            }
            serializer = MemberVerifyResponseSerializer(data)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # If no membership was found, check if a registered user exists without membership
        user_candidate = None
        if query.isdigit():
            user_candidate = User.objects.filter(id=int(query)).first()
        if not user_candidate:
            user_candidate = (
                User.objects.filter(email__iexact=query).first() or
                User.objects.filter(username__iexact=query).first() or
                User.objects.filter(email__icontains=query).first() or
                User.objects.filter(name__icontains=query).first()
            )

        if user_candidate:
            data = {
                "found": True,
                "is_active_member": False,
                "member_id": None,
                "user_id": user_candidate.id,
                "name": getattr(user_candidate, 'name', '') or user_candidate.username,
                "email": user_candidate.email,
                "role": user_candidate.role,
                "tier": None,
                "tier_details": None,
                "status": "no_membership",
                "status_display": "No Membership",
                "start_date": None,
                "end_date": None,
                "expires_on": None,
                "days_until_expiry": 0,
                "dues_paid": False,
                "token": None,
                "qr_code": None,
                "ticket_discount_pct": 0.00,
                "merch_discount_pct": 0.00,
                "message": "User exists in system but has no membership recorded."
            }
            serializer = MemberVerifyResponseSerializer(data)
            return Response(serializer.data, status=status.HTTP_200_OK)


        # Neither membership nor user found
        return Response(
            {"detail": f"No member or user found matching '{query}'."},
            status=status.HTTP_404_NOT_FOUND
        )


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


class MyMembershipProfileView(APIView):
    """
    GET /api/members/profile/me
    Returns the authenticated user's profile and membership details (with QR code and available renewal tiers).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        membership_data = None
        try:
            membership = Membership.objects.select_related('tier', 'user').get(user=user)
            membership_data = MembershipSerializer(membership).data
        except Membership.DoesNotExist:
            membership_data = None

        active_tiers = MembershipTier.objects.filter(is_active=True)
        tiers_data = MembershipTierSerializer(active_tiers, many=True).data

        return Response({
            "user": {
                "id": user.id,
                "name": user.name or user.username,
                "email": user.email,
                "phone": user.phone,
                "role": user.role,
                "role_display": user.get_role_display(),
            },
            "membership": membership_data,
            "available_tiers": tiers_data,
        }, status=status.HTTP_200_OK)


class JoinClubView(APIView):
    """
    POST /api/members/join
    Public signup and membership enrollment endpoint.
    Atomically registers a new user, creates membership with the chosen tier,
    and returns JWT tokens for instant auto-login.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = JoinClubSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        name = data['name']
        email = data['email']
        phone = data.get('phone', '')
        password = data['password']
        tier_id = data['tier_id']
        pay_now = data.get('pay_now', False)

        User = get_user_model()
        tier = MembershipTier.objects.get(id=tier_id, is_active=True)

        user = User.objects.create_user(
            username=email,
            email=email,
            name=name,
            phone=phone,
            password=password,
            role=User.ROLE_MEMBER if pay_now else User.ROLE_PUBLIC,
        )

        today = timezone.now().date()
        membership = Membership.objects.create(
            user=user,
            tier=tier,
            status=Membership.STATUS_ACTIVE if pay_now else Membership.STATUS_PENDING,
            dues_paid=pay_now,
            dues_amount_paid=tier.price if pay_now else Decimal('0.00'),
            start_date=today if pay_now else None,
            end_date=(today + timedelta(days=tier.duration_days)) if pay_now else None,
        )

        if pay_now:
            record_transaction(
                type='income',
                category='dues',
                amount=tier.price,
                source=f"Member #{user.id} ({name})",
                description=f"Membership dues payment upon joining ({tier.name})",
                date=timezone.now()
            )

        # Generate JWT auth tokens for immediate auto-login
        refresh = RefreshToken.for_user(user)

        return Response({
            "message": f"Welcome to Skyline Club, {name}! Your membership registration was successful.",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "name": user.name,
                "phone": user.phone,
                "role": user.role,
                "is_officer": user.is_officer,
            },
            "membership": MembershipSerializer(membership).data,
        }, status=status.HTTP_201_CREATED)


