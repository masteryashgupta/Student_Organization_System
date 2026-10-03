from decimal import Decimal
from django.db.models import Sum, Q, Count, Value, DecimalField
from django.db.models.functions import Coalesce
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Transaction
from .serializers import (
    FinanceSummaryFilterSerializer,
    FinanceSummaryResponseSerializer,
)


class FinanceSummaryView(APIView):
    """
    GET /api/finance/summary

    Reads the central shared core.Transaction ledger and returns:
      - total_income
      - total_expense
      - current_balance
      - breakdown by category (dues, ticket, merch, fundraiser, reimbursement, other)
      - optional date-range filter: ?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD

    Design decision:
      Finance is a reporting and treasury management layer. Rather than duplicating
      or syncing income records across disparate apps, Finance aggregates directly
      from the single source of truth: core.Transaction.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        filter_serializer = FinanceSummaryFilterSerializer(data=request.query_params)
        if not filter_serializer.is_valid():
            return Response(
                {"detail": "Invalid query parameters.", "errors": filter_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        validated_params = filter_serializer.validated_data
        start_date = validated_params.get('start_date')
        end_date = validated_params.get('end_date')

        queryset = Transaction.objects.all()

        if start_date:
            queryset = queryset.filter(date__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__date__lte=end_date)

        # 1. Aggregate total income and total expense in a single query
        totals = queryset.aggregate(
            total_income=Coalesce(
                Sum('amount', filter=Q(type=Transaction.TYPE_INCOME)),
                Value(Decimal('0.00')),
                output_field=DecimalField(max_digits=12, decimal_places=2)
            ),
            total_expense=Coalesce(
                Sum('amount', filter=Q(type=Transaction.TYPE_EXPENSE)),
                Value(Decimal('0.00')),
                output_field=DecimalField(max_digits=12, decimal_places=2)
            )
        )

        total_income = totals['total_income']
        total_expense = totals['total_expense']
        current_balance = total_income - total_expense

        # 2. Build complete category map initialized with standard choices
        category_map = {}
        for cat_code, cat_label in Transaction.CATEGORY_CHOICES:
            category_map[cat_code] = {
                'category': cat_code,
                'label': str(cat_label),
                'income': Decimal('0.00'),
                'expense': Decimal('0.00'),
                'net': Decimal('0.00'),
                'count': 0
            }

        # 3. Aggregate by category and transaction type
        cat_aggregates = (
            queryset.values('category', 'type')
            .annotate(
                total_amount=Coalesce(
                    Sum('amount'),
                    Value(Decimal('0.00')),
                    output_field=DecimalField(max_digits=12, decimal_places=2)
                ),
                tx_count=Count('id')
            )
        )

        for row in cat_aggregates:
            cat_code = row['category']
            tx_type = row['type']
            amount = row['total_amount']
            count = row['tx_count']

            if cat_code not in category_map:
                category_map[cat_code] = {
                    'category': cat_code,
                    'label': cat_code.replace('_', ' ').title(),
                    'income': Decimal('0.00'),
                    'expense': Decimal('0.00'),
                    'net': Decimal('0.00'),
                    'count': 0
                }

            category_map[cat_code]['count'] += count
            if tx_type == Transaction.TYPE_INCOME:
                category_map[cat_code]['income'] += amount
            elif tx_type == Transaction.TYPE_EXPENSE:
                category_map[cat_code]['expense'] += amount

        # 4. Calculate net per category
        for cat_item in category_map.values():
            cat_item['net'] = cat_item['income'] - cat_item['expense']

        breakdown_list = list(category_map.values())
        by_category_dict = {
            cat_code: {
                'label': item['label'],
                'income': item['income'],
                'expense': item['expense'],
                'net': item['net'],
                'count': item['count']
            }
            for cat_code, item in category_map.items()
        }

        payload = {
            'total_income': total_income,
            'total_expense': total_expense,
            'current_balance': current_balance,
            'start_date': start_date,
            'end_date': end_date,
            'breakdown': breakdown_list,
            'by_category': by_category_dict,
        }

        response_serializer = FinanceSummaryResponseSerializer(payload)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
