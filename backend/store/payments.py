import os
import uuid
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional, Dict, Any


@dataclass
class PaymentResult:
    success: bool
    status: str  # 'paid', 'pending', 'failed'
    transaction_id: str
    message: str
    client_secret: Optional[str] = None
    raw_data: Dict[str, Any] = field(default_factory=dict)


class BasePaymentProvider:
    """
    Abstract interface for payment gateway providers.
    Allows seamlessly swapping between offline mock payments and real/test gateways (e.g. Stripe).
    """
    provider_id: str = "base"
    name: str = "Base Provider"

    def process_payment(self, order, payment_data: Optional[Dict[str, Any]] = None) -> PaymentResult:
        raise NotImplementedError("Payment providers must implement process_payment().")


class MockPaymentProvider(BasePaymentProvider):
    """
    Offline/manual payment provider.
    Instantly marks orders as paid without external internet requests or gateway keys.
    Ideal for campus demos, cash-at-door, club ledger mock transactions, and local development.
    """
    provider_id = "mock"
    name = "Offline Mock / Manual Payment"

    def process_payment(self, order, payment_data: Optional[Dict[str, Any]] = None) -> PaymentResult:
        payment_data = payment_data or {}
        custom_ref = payment_data.get('reference') or payment_data.get('payment_reference')
        
        # Generate clean transaction reference
        txn_id = custom_ref or f"MOCK-TXN-{uuid.uuid4().hex[:10].upper()}"
        method = payment_data.get('method', 'mock_card')
        
        return PaymentResult(
            success=True,
            status="paid",
            transaction_id=txn_id,
            message=f"Payment of ${order.total} verified offline via {self.name} ({method}).",
            raw_data={
                "provider": self.provider_id,
                "method": method,
                "amount": str(order.total),
                "is_offline": True,
            }
        )


class StripeTestPaymentProvider(BasePaymentProvider):
    """
    Stripe test-mode provider.
    Enabled via env flag STRIPE_ENABLED=true and STRIPE_SECRET_KEY.
    If stripe is not configured or in offline demo mode, returns a simulated Stripe test transaction.
    """
    provider_id = "stripe"
    name = "Stripe (Test Mode)"

    @property
    def is_configured(self) -> bool:
        stripe_enabled = os.getenv('STRIPE_ENABLED', 'False').lower() in ('true', '1', 't')
        secret_key = os.getenv('STRIPE_SECRET_KEY')
        return stripe_enabled and bool(secret_key)

    def process_payment(self, order, payment_data: Optional[Dict[str, Any]] = None) -> PaymentResult:
        payment_data = payment_data or {}
        token = payment_data.get('stripe_token') or payment_data.get('token')
        
        # If live Stripe test mode is configured and stripe package is available
        if self.is_configured:
            try:
                import stripe
                stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

                # Convert total amount to cents
                amount_cents = int((order.total * Decimal('100.00')).to_integral_value())

                if token:
                    # Create charge via test token (e.g. tok_visa)
                    charge = stripe.Charge.create(
                        amount=amount_cents,
                        currency='usd',
                        source=token,
                        description=f"Merch Order #{order.id} for {order.buyer_name or 'Club Member'}",
                        metadata={"order_id": order.id, "environment": "test"},
                    )
                    return PaymentResult(
                        success=charge.status == 'succeeded',
                        status="paid" if charge.status == 'succeeded' else "failed",
                        transaction_id=charge.id,
                        message=f"Stripe test charge {charge.id} succeeded.",
                        raw_data={"charge_id": charge.id, "status": charge.status}
                    )
                else:
                    # Create PaymentIntent for Stripe Elements
                    intent = stripe.PaymentIntent.create(
                        amount=amount_cents,
                        currency='usd',
                        description=f"Merch Order #{order.id}",
                        metadata={"order_id": order.id},
                    )
                    return PaymentResult(
                        success=True,
                        status="pending" if intent.status != 'succeeded' else "paid",
                        transaction_id=intent.id,
                        client_secret=intent.client_secret,
                        message="Stripe PaymentIntent created.",
                        raw_data={"intent_id": intent.id, "status": intent.status}
                    )
            except Exception as exc:
                # If network fails or stripe API errors out, return error details
                return PaymentResult(
                    success=False,
                    status="failed",
                    transaction_id=f"STRIPE-ERR-{uuid.uuid4().hex[:6].upper()}",
                    message=f"Stripe test transaction failed: {str(exc)}",
                    raw_data={"error": str(exc)}
                )

        # Fallback simulated Stripe test response (when offline or STRIPE_SECRET_KEY not set)
        simulated_pi = f"pi_test_{uuid.uuid4().hex[:16]}"
        return PaymentResult(
            success=True,
            status="paid",
            transaction_id=simulated_pi,
            client_secret=f"{simulated_pi}_secret_{uuid.uuid4().hex[:10]}",
            message=f"Simulated Stripe test payment approved (${order.total}).",
            raw_data={
                "provider": "stripe_simulated_test",
                "intent_id": simulated_pi,
                "amount": str(order.total),
                "is_simulated": True,
            }
        )


PROVIDERS = {
    'mock': MockPaymentProvider,
    'manual': MockPaymentProvider,
    'cash': MockPaymentProvider,
    'stripe': StripeTestPaymentProvider,
    'stripe_test': StripeTestPaymentProvider,
}


def get_payment_provider(provider_name: Optional[str] = None) -> BasePaymentProvider:
    """
    Factory function to retrieve the configured payment provider.
    Defaults to 'mock' for 100% offline reliability.
    """
    selected_name = (provider_name or os.getenv('DEFAULT_PAYMENT_PROVIDER', 'mock')).lower().strip()
    provider_class = PROVIDERS.get(selected_name, MockPaymentProvider)
    return provider_class()
