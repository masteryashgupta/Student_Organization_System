from decimal import Decimal
from rest_framework import serializers
from .models import Reimbursement, validate_receipt_file


class FinanceSummaryFilterSerializer(serializers.Serializer):
    """
    Validates optional date range filters for finance summary reporting.
    """
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)

    def validate(self, attrs):
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({
                'end_date': 'end_date must be greater than or equal to start_date.'
            })
        return attrs


class CategorySummarySerializer(serializers.Serializer):
    """
    Category-level financial metrics.
    """
    category = serializers.CharField()
    label = serializers.CharField()
    income = serializers.DecimalField(max_digits=12, decimal_places=2)
    expense = serializers.DecimalField(max_digits=12, decimal_places=2)
    net = serializers.DecimalField(max_digits=12, decimal_places=2)
    count = serializers.IntegerField()


class FinanceSummaryResponseSerializer(serializers.Serializer):
    """
    Structured summary payload response for GET /api/finance/summary.
    """
    total_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_expense = serializers.DecimalField(max_digits=12, decimal_places=2)
    current_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)
    breakdown = CategorySummarySerializer(many=True)
    by_category = serializers.DictField(child=serializers.DictField())


class ReimbursementSerializer(serializers.ModelSerializer):
    requester_email = serializers.ReadOnlyField(source='requester.email', default=None)
    requester_name = serializers.SerializerMethodField()
    approver_email = serializers.ReadOnlyField(source='approver.email', default=None)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    receipt_url = serializers.SerializerMethodField()
    transaction_id = serializers.ReadOnlyField(source='transaction.id', default=None)

    class Meta:
        model = Reimbursement
        fields = [
            'id',
            'requester',
            'requester_email',
            'requester_name',
            'amount',
            'description',
            'receipt',
            'receipt_url',
            'status',
            'status_display',
            'approver',
            'approver_email',
            'transaction_id',
            'notes',
            'created_at',
            'updated_at',
            'approved_at',
            'paid_at',
        ]
        read_only_fields = [
            'id',
            'requester',
            'status',
            'approver',
            'transaction_id',
            'created_at',
            'updated_at',
            'approved_at',
            'paid_at',
        ]

    def get_requester_name(self, obj):
        if not obj.requester:
            return "Unknown Requester"
        full_name = f"{obj.requester.first_name} {obj.requester.last_name}".strip()
        return full_name if full_name else obj.requester.email

    def get_receipt_url(self, obj):
        if obj.receipt:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt.url)
            return obj.receipt.url
        return None

    def validate_amount(self, value):
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Reimbursement amount must be strictly positive (> $0.00).")
        return value

    def validate_receipt(self, file_obj):
        if file_obj:
            validate_receipt_file(file_obj)
        return file_obj


class ReimbursementActionSerializer(serializers.Serializer):
    """
    Serializer for officer approval, rejection, or mark-paid actions.
    """
    notes = serializers.CharField(required=False, allow_blank=True, default='')
