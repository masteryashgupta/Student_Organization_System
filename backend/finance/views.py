from decimal import Decimal
from django.db.models import Sum, Q, Count, Value, DecimalField
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from core.models import Transaction
from core.services import record_transaction
from accounts.permissions import IsOfficer
from .models import Reimbursement
from .serializers import (
    FinanceSummaryFilterSerializer,
    FinanceSummaryResponseSerializer,
    FinanceTransactionSerializer,
    ManualTransactionCreateSerializer,
    ReimbursementSerializer,
    ReimbursementActionSerializer,
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


class FinanceTransactionListCreateView(generics.ListCreateAPIView):
    """
    GET /api/finance/transactions
      Returns a paginated list of central ledger transactions.
      Filters: ?type=income|expense, ?category=dues|ticket|..., ?date=YYYY-MM-DD,
               ?start_date=YYYY-MM-DD, ?end_date=YYYY-MM-DD, ?search=query

    POST /api/finance/transactions
      Officer-only manual entry for miscellaneous income/expenses (e.g. cash donations, off-platform sponsorships).
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = FinanceTransactionSerializer

    def get_queryset(self):
        queryset = Transaction.objects.all()

        type_param = self.request.query_params.get('type')
        if type_param:
            queryset = queryset.filter(type__iexact=type_param)

        category_param = self.request.query_params.get('category')
        if category_param:
            queryset = queryset.filter(category__iexact=category_param)

        date_param = self.request.query_params.get('date')
        if date_param:
            queryset = queryset.filter(date__date=date_param)

        start_date = self.request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(date__date__gte=start_date)

        end_date = self.request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(date__date__lte=end_date)

        search_query = self.request.query_params.get('search')
        if search_query:
            queryset = queryset.filter(
                Q(source__icontains=search_query) | Q(description__icontains=search_query)
            )

        return queryset

    def create(self, request, *args, **kwargs):
        # Officer permission check for manual creation
        if request.user and request.user.is_authenticated:
            is_officer = getattr(request.user, 'is_officer', False) or request.user.is_staff or request.user.is_superuser
            if not is_officer:
                return Response(
                    {"detail": "Only club officers can record manual ledger transactions."},
                    status=status.HTTP_403_FORBIDDEN
                )

        serializer = ManualTransactionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        tx = record_transaction(
            type=data['type'],
            category=data['category'],
            amount=data['amount'],
            source=data['source'],
            description=data.get('description', ''),
            date=data.get('date')
        )

        response_serializer = FinanceTransactionSerializer(tx)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class ReimbursementListCreateView(generics.ListCreateAPIView):
    """
    GET /api/reimbursements
      Lists reimbursement requests.
      Supports status filtering: ?status=pending|approved|rejected|paid

    POST /api/reimbursements
      Submits a new reimbursement request with optional receipt file upload.
    """
    serializer_class = ReimbursementSerializer
    permission_classes = [permissions.AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset = Reimbursement.objects.all()

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status__iexact=status_param)

        user = self.request.user
        if user and user.is_authenticated:
            if not getattr(user, 'is_officer', False) and not user.is_staff and not user.is_superuser:
                queryset = queryset.filter(requester=user)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user if self.request.user and self.request.user.is_authenticated else None
        serializer.save(requester=user)


class ReimbursementDetailView(generics.RetrieveDestroyAPIView):
    """
    GET /api/reimbursements/<id>
    DELETE /api/reimbursements/<id>
    """
    queryset = Reimbursement.objects.all()
    serializer_class = ReimbursementSerializer
    permission_classes = [permissions.AllowAny]


class BaseOfficerActionView(APIView):
    permission_classes = [permissions.AllowAny]

    def check_officer_permission(self, request):
        if request.user and request.user.is_authenticated:
            is_officer = getattr(request.user, 'is_officer', False) or request.user.is_staff or request.user.is_superuser
            if not is_officer:
                return False
        return True


class ReimbursementApproveView(BaseOfficerActionView):
    def post(self, request, pk, *args, **kwargs):
        if not self.check_officer_permission(request):
            return Response({"detail": "Only club officers can approve reimbursements."}, status=status.HTTP_403_FORBIDDEN)

        reimbursement = get_object_or_404(Reimbursement, pk=pk)
        action_serializer = ReimbursementActionSerializer(data=request.data)
        action_serializer.is_valid(raise_exception=True)
        notes = action_serializer.validated_data.get('notes', '')

        officer = request.user if request.user and request.user.is_authenticated else None
        updated_obj = reimbursement.approve(officer=officer, notes=notes)

        serializer = ReimbursementSerializer(updated_obj, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ReimbursementRejectView(BaseOfficerActionView):
    def post(self, request, pk, *args, **kwargs):
        if not self.check_officer_permission(request):
            return Response({"detail": "Only club officers can reject reimbursements."}, status=status.HTTP_403_FORBIDDEN)

        reimbursement = get_object_or_404(Reimbursement, pk=pk)
        action_serializer = ReimbursementActionSerializer(data=request.data)
        action_serializer.is_valid(raise_exception=True)
        notes = action_serializer.validated_data.get('notes', '')

        officer = request.user if request.user and request.user.is_authenticated else None
        try:
            updated_obj = reimbursement.reject(officer=officer, notes=notes)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ReimbursementSerializer(updated_obj, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ReimbursementMarkPaidView(BaseOfficerActionView):
    def post(self, request, pk, *args, **kwargs):
        if not self.check_officer_permission(request):
            return Response({"detail": "Only club officers can mark reimbursements as paid."}, status=status.HTTP_403_FORBIDDEN)

        reimbursement = get_object_or_404(Reimbursement, pk=pk)
        action_serializer = ReimbursementActionSerializer(data=request.data)
        action_serializer.is_valid(raise_exception=True)
        notes = action_serializer.validated_data.get('notes', '')

        officer = request.user if request.user and request.user.is_authenticated else None
        try:
            updated_obj = reimbursement.mark_paid(officer=officer, notes=notes)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ReimbursementSerializer(updated_obj, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
