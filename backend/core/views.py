from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Transaction
from .serializers import TransactionSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Basic API health check endpoint.
    """
    return Response({
        "status": "success",
        "message": "Skyline Club API is running",
        "version": "1.0.0"
    })


class TransactionListView(generics.ListAPIView):
    """
    Read-only list endpoint for central ledger transactions.
    Supports filtering via query parameters:
      - ?type=income|expense
      - ?category=dues|ticket|merch|fundraiser|reimbursement|other
      - ?date=YYYY-MM-DD
      - ?start_date=YYYY-MM-DD
      - ?end_date=YYYY-MM-DD
    """
    serializer_class = TransactionSerializer
    permission_classes = [permissions.AllowAny]  # Open for ledger access; can be gated by permissions later

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

        return queryset
