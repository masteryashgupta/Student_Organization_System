from rest_framework import serializers


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
