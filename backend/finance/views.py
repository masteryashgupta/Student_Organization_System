from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Transaction, Reimbursement
from .serializers import TransactionSerializer, ReimbursementSerializer
from .services import ledger_summary, record_transaction
from accounts.permissions import IsOfficerOrTreasurer, IsTreasurer


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [IsOfficerOrTreasurer]

    def get_queryset(self):
        qs = super().get_queryset()
        direction = self.request.query_params.get("direction")
        category = self.request.query_params.get("category")
        if direction:
            qs = qs.filter(direction=direction)
        if category:
            qs = qs.filter(category=category)
        return qs


class ReimbursementViewSet(viewsets.ModelViewSet):
    serializer_class = ReimbursementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Volunteers see their own; officers/treasurers see all
        if user.is_staff_role or user.is_superuser:
            return Reimbursement.objects.all()
        return Reimbursement.objects.filter(volunteer=user)

    def perform_create(self, serializer):
        serializer.save(volunteer=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsTreasurer])
    def approve_and_pay(self, request, pk=None):
        """Treasurer approves + pays, posting the expense to the ledger."""
        r = self.get_object()
        if r.status == Reimbursement.Status.PAID:
            return Response({"detail": "Already paid"}, status=400)
        txn = record_transaction(
            amount=r.amount,
            direction="out",
            category="reimbursement",
            description=f"Reimbursement · {r.volunteer.username} · {r.reason}",
            member=r.volunteer,
            source_ref=f"reimbursement:{r.id}",
        )
        r.status = Reimbursement.Status.PAID
        r.transaction = txn
        r.save()
        return Response(ReimbursementSerializer(r).data)


@api_view(["GET"])
@permission_classes([IsOfficerOrTreasurer])
def summary(request):
    """Treasurer dashboard: income, expense, balance, by-category breakdown."""
    return Response(ledger_summary())
