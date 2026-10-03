from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from . import services


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_order(request):
    """Start a payment. Body: {amount, receipt?}.
    In mock mode the frontend can immediately call the module's buy endpoint;
    this exists so the Razorpay flow is a drop-in swap later.
    """
    amount = request.data.get("amount")
    if amount is None:
        return Response({"detail": "amount required"}, status=400)
    order = services.create_order(amount, receipt=request.data.get("receipt", ""))
    return Response(order)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def verify(request):
    ok = services.verify_payment(request.data)
    return Response({"verified": ok})


@api_view(["POST"])
@permission_classes([AllowAny])
def webhook(request):
    """Razorpay webhook endpoint (no-op in mock mode).
    In production, Razorpay POSTs here on payment.captured; verify signature
    then post the Transaction. Wired as a stub so the URL exists for setup.
    """
    # TODO (production): verify X-Razorpay-Signature against RAZORPAY_WEBHOOK_SECRET
    # then look up the pending order and call finance.services.record_transaction.
    return Response({"status": "received"})
