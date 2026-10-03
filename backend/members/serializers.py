from rest_framework import serializers
from accounts.serializers import UserSerializer
from .models import MembershipTier, Membership, RenewalReminder
from .services import generate_member_qr_data_url


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
    days_until_expiry = serializers.IntegerField(read_only=True)
    is_expiring_soon = serializers.BooleanField(read_only=True)
    qr_code = serializers.SerializerMethodField()

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
            'days_until_expiry',
            'is_expiring_soon',
            'start_date',
            'end_date',
            'dues_paid',
            'dues_amount_paid',
            'verification_token',
            'qr_code',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'status_display', 'computed_status', 'days_until_expiry', 'is_expiring_soon', 'qr_code', 'created_at', 'updated_at']

    def get_qr_code(self, obj):
        if obj.verification_token:
            return generate_member_qr_data_url(obj.verification_token)
        return ""


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
    days_until_expiry = serializers.IntegerField(allow_null=True)


class MemberVerifyResponseSerializer(serializers.Serializer):
    """
    Door verification response serializer for GET /api/members/verify?query=<email-or-id>
    Used by officers to rapidly verify club members at the door / events.
    """
    found = serializers.BooleanField(default=True)
    is_active_member = serializers.BooleanField()
    member_id = serializers.IntegerField(allow_null=True)
    user_id = serializers.IntegerField()
    name = serializers.CharField(allow_blank=True)
    email = serializers.EmailField()
    role = serializers.CharField()
    tier = serializers.CharField(allow_null=True)
    tier_details = MembershipTierSerializer(allow_null=True, required=False)
    status = serializers.CharField()
    status_display = serializers.CharField()
    start_date = serializers.DateField(allow_null=True)
    end_date = serializers.DateField(allow_null=True)
    expires_on = serializers.DateField(allow_null=True)
    days_until_expiry = serializers.IntegerField()
    dues_paid = serializers.BooleanField()
    token = serializers.CharField(allow_null=True, allow_blank=True)
    qr_code = serializers.CharField(allow_null=True, allow_blank=True)
    ticket_discount_pct = serializers.DecimalField(max_digits=5, decimal_places=2)
    merch_discount_pct = serializers.DecimalField(max_digits=5, decimal_places=2)
    message = serializers.CharField(allow_blank=True, required=False)


class PayDuesSerializer(serializers.Serializer):
    tier_id = serializers.IntegerField(required=False, help_text="Optional tier ID if selecting/changing tier at payment time")
    payment_method = serializers.CharField(required=False, default='offline_mock', help_text="Payment method identifier")


class RenewalReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = RenewalReminder
        fields = ['id', 'membership', 'sent_at', 'days_before_expiry', 'email_to', 'message_body', 'status']
        read_only_fields = ['id', 'sent_at']

