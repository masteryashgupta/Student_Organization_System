"""
Payment provider abstraction.

Default provider is "mock": it instantly returns a fake but well-formed order
so the whole app runs with zero external accounts. Switch PAYMENT_PROVIDER to
"razorpay" in .env to use real Razorpay (India/UPI).

Every successful payment ultimately posts a Transaction via finance.services,
so the ledger stays the single source of truth regardless of provider.
"""
import uuid
from django.conf import settings


def get_provider():
    return settings.PAYMENT_PROVIDER


def create_order(amount, receipt=""):
    """Create a payment order. Returns dict the frontend uses to start checkout."""
    amount = float(amount)
    if get_provider() == "razorpay" and settings.RAZORPAY_KEY_ID:
        import razorpay
        client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )
        order = client.order.create({
            "amount": int(amount * 100),  # paise
            "currency": "INR",
            "receipt": receipt or str(uuid.uuid4()),
            "payment_capture": 1,
        })
        return {
            "provider": "razorpay",
            "order_id": order["id"],
            "amount": amount,
            "currency": "INR",
            "key_id": settings.RAZORPAY_KEY_ID,
        }

    # ---- mock provider ----
    return {
        "provider": "mock",
        "order_id": f"mock_order_{uuid.uuid4().hex[:12]}",
        "amount": amount,
        "currency": "INR",
        "key_id": "mock",
    }


def verify_payment(payload):
    """
    Verify a payment callback.
    Mock: always valid. Razorpay: verifies signature.
    """
    if get_provider() == "razorpay" and settings.RAZORPAY_KEY_ID:
        import razorpay
        client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )
        try:
            client.utility.verify_payment_signature({
                "razorpay_order_id": payload.get("razorpay_order_id"),
                "razorpay_payment_id": payload.get("razorpay_payment_id"),
                "razorpay_signature": payload.get("razorpay_signature"),
            })
            return True
        except Exception:
            return False
    return True  # mock always succeeds
