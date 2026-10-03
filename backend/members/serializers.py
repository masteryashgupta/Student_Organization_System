from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import MembershipTier, Membership


class MembershipTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipTier
        fields = [
            'id',
            'name',
            'description',
            'price',
            'duration_days',
            'ticket_discount_pct',
            'merch_discount_pct',
            'is_active',
            'created_at',
        ]


class MembershipSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    tier_details = MembershipTierSerializer(source='tier', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    computed_status = serializers.CharField(source='update_computed_status', read_only=True)

    class Meta:
        model = Membership
        fields = [
            'id',
            'user',
            'user_details',
            'tier',
            'tier_details',
            'status',
            'status_display',
            'computed_status',
            'start_date',
            'end_date',
            'dues_paid',
            'dues_amount_paid',
            'verification_token',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'status_display', 'computed_status', 'created_at', 'updated_at']


class MemberDiscountContractSerializer(serializers.Serializer):
    """
    Contract endpoint response serializer for GET /api/members/me
    Used by Ticketing (P2) and Merch Store (P3) modules.
    """
    is_active_member = serializers.BooleanField()
    tier = serializers.CharField(allow_null=True)
    ticket_discount_pct = serializers.DecimalField(max_digits=5, decimal_places=2)
    merch_discount_pct = serializers.DecimalField(max_digits=5, decimal_places=2)
    expires_on = serializers.DateField(allow_null=True)
