from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from core.models import Transaction
from members.models import MembershipTier, Membership
from .models import Product, ProductVariant, Order, OrderItem
from .payments import get_payment_provider, MockPaymentProvider, StripeTestPaymentProvider
from .services import (
    decrement_variant_stock,
    decrement_order_stock,
    restock_variant,
    restore_variant_stock,
    create_order_from_cart,
    mark_order_as_paid,
    process_order_payment,
    fulfill_order,
    cancel_order,
)

User = get_user_model()


class ProductModelTests(TestCase):
    def test_create_valid_product_and_variant(self):
        product = Product.objects.create(
            name="Skyline Premium Hoodie",
            type="hoodie",
            price=Decimal("45.00"),
            description="Ultra soft fleece hoodie",
            image="https://example.com/hoodie.jpg"
        )
        variant_m = ProductVariant.objects.create(
            product=product,
            size="M",
            stock_qty=20
        )
        variant_l = ProductVariant.objects.create(
            product=product,
            size="L",
            stock_qty=0
        )

        self.assertEqual(product.total_stock, 20)
        self.assertTrue(product.is_in_stock)
        self.assertTrue(variant_m.is_in_stock)
        self.assertFalse(variant_l.is_in_stock)
        self.assertEqual(str(product), "Skyline Premium Hoodie ($45.00)")
        self.assertEqual(str(variant_m), "Skyline Premium Hoodie - Size M (20 in stock)")

    def test_product_price_must_be_positive(self):
        with self.assertRaises(ValidationError):
            Product.objects.create(
                name="Free Sticker",
                type="sticker",
                price=Decimal("0.00")
            )

        with self.assertRaises(ValidationError):
            Product.objects.create(
                name="Negative Product",
                type="sticker",
                price=Decimal("-5.00")
            )

    def test_variant_stock_cannot_be_negative(self):
        product = Product.objects.create(
            name="Skyline T-Shirt",
            type="tee",
            price=Decimal("20.00")
        )
        with self.assertRaises(ValidationError):
            ProductVariant.objects.create(
                product=product,
                size="S",
                stock_qty=-1
            )


class StockServiceTests(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            name="Skyline Crewneck",
            type="sweatshirt",
            price=Decimal("35.00")
        )
        self.variant_s = ProductVariant.objects.create(
            product=self.product,
            size="S",
            stock_qty=10
        )
        self.variant_m = ProductVariant.objects.create(
            product=self.product,
            size="M",
            stock_qty=5
        )

    def test_decrement_variant_stock_success(self):
        updated = decrement_variant_stock(self.variant_s.id, quantity=3)
        self.assertEqual(updated.stock_qty, 7)
        self.variant_s.refresh_from_db()
        self.assertEqual(self.variant_s.stock_qty, 7)

    def test_decrement_variant_stock_exact_amount(self):
        updated = decrement_variant_stock(self.variant_m.id, quantity=5)
        self.assertEqual(updated.stock_qty, 0)
        self.assertFalse(updated.is_in_stock)

    def test_reject_decrement_exceeding_stock(self):
        with self.assertRaises(ValidationError):
            decrement_variant_stock(self.variant_m.id, quantity=6)
        
        self.variant_m.refresh_from_db()
        self.assertEqual(self.variant_m.stock_qty, 5)

    def test_reject_zero_or_negative_decrement_qty(self):
        with self.assertRaises(ValidationError):
            decrement_variant_stock(self.variant_s.id, quantity=0)
        with self.assertRaises(ValidationError):
            decrement_variant_stock(self.variant_s.id, quantity=-2)

    def test_decrement_order_stock_all_or_nothing(self):
        items_payload = [
            {'variant_id': self.variant_s.id, 'quantity': 2},
            {'variant_id': self.variant_m.id, 'quantity': 10},
        ]

        with self.assertRaises(ValidationError):
            decrement_order_stock(items_payload)

        self.variant_s.refresh_from_db()
        self.variant_m.refresh_from_db()
        self.assertEqual(self.variant_s.stock_qty, 10)
        self.assertEqual(self.variant_m.stock_qty, 5)

    def test_decrement_order_stock_success(self):
        items_payload = [
            {'variant_id': self.variant_s.id, 'quantity': 4},
            {'variant_id': self.variant_m.id, 'quantity': 3},
        ]
        updated_list = decrement_order_stock(items_payload)
        self.assertEqual(len(updated_list), 2)
        self.variant_s.refresh_from_db()
        self.variant_m.refresh_from_db()
        self.assertEqual(self.variant_s.stock_qty, 6)
        self.assertEqual(self.variant_m.stock_qty, 2)

    def test_restock_and_restore_variant(self):
        updated = restock_variant(self.variant_s.id, quantity=15)
        self.assertEqual(updated.stock_qty, 25)

        restored = restore_variant_stock(self.variant_m.id, quantity=3)
        self.assertEqual(restored.stock_qty, 8)


class PaymentProviderTests(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            name="Skyline Water Bottle",
            type="accessory",
            price=Decimal("15.00")
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            size="One Size",
            stock_qty=20
        )

    def test_mock_payment_provider_offline(self):
        order = create_order_from_cart(
            items_data=[{'variant_id': self.variant.id, 'qty': 2}],
            buyer_name="Offline Customer"
        )
        provider = get_payment_provider('mock')
        self.assertIsInstance(provider, MockPaymentProvider)

        result = provider.process_payment(order, payment_data={'payment_reference': 'CASH_REC_001'})
        self.assertTrue(result.success)
        self.assertEqual(result.status, 'paid')
        self.assertEqual(result.transaction_id, 'CASH_REC_001')

    def test_stripe_test_payment_provider(self):
        order = create_order_from_cart(
            items_data=[{'variant_id': self.variant.id, 'qty': 1}],
            buyer_name="Card Customer"
        )
        provider = get_payment_provider('stripe')
        self.assertIsInstance(provider, StripeTestPaymentProvider)

        result = provider.process_payment(order)
        self.assertTrue(result.success)
        self.assertEqual(result.status, 'paid')
        self.assertTrue(result.transaction_id.startswith('pi_test_') or result.transaction_id.startswith('ch_'))


class OrderLifecycleTests(TestCase):
    def setUp(self):
        self.user_member = User.objects.create_user(
            username="gold_member",
            email="gold@skyline.edu",
            password="securepassword123",
            name="Gold Member"
        )
        self.tier = MembershipTier.objects.create(
            name="Gold Pass",
            price=Decimal("50.00"),
            merch_discount_pct=Decimal("15.00"),
            ticket_discount_pct=Decimal("20.00")
        )
        from django.utils import timezone
        from datetime import timedelta
        self.membership = Membership.objects.create(
            user=self.user_member,
            tier=self.tier,
            status=Membership.STATUS_ACTIVE,
            dues_paid=True,
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=365)
        )

        self.product = Product.objects.create(
            name="Skyline Navy Hoodie",
            type="hoodie",
            price=Decimal("60.00")
        )
        self.variant_m = ProductVariant.objects.create(
            product=self.product,
            size="M",
            stock_qty=10
        )
        self.variant_l = ProductVariant.objects.create(
            product=self.product,
            size="L",
            stock_qty=5
        )

    def test_create_order_with_member_discount(self):
        cart_items = [
            {'variant_id': self.variant_m.id, 'qty': 2}  # 2 x 60 = 120
        ]
        order = create_order_from_cart(
            items_data=cart_items,
            buyer=self.user_member,
            buyer_name="Gold Member",
            buyer_email="gold@skyline.edu"
        )

        self.assertEqual(order.status, Order.STATUS_PENDING)
        self.assertEqual(order.subtotal, Decimal("120.00"))
        self.assertEqual(order.discount_pct, Decimal("15.00"))
        self.assertEqual(order.discount_amount, Decimal("18.00"))
        self.assertEqual(order.total, Decimal("102.00"))
        self.assertEqual(order.items.count(), 1)
        self.variant_m.refresh_from_db()
        self.assertEqual(self.variant_m.stock_qty, 10)

    def test_order_payment_decrements_stock_and_records_ledger_income(self):
        cart_items = [{'variant_id': self.variant_m.id, 'qty': 2}]
        order = create_order_from_cart(cart_items, buyer=self.user_member)

        initial_tx_count = Transaction.objects.count()
        paid_order, result = process_order_payment(order, provider_name='mock')

        self.assertEqual(paid_order.status, Order.STATUS_PAID)
        self.assertIsNotNone(paid_order.paid_at)
        self.assertEqual(paid_order.payment_provider, 'mock')
        self.assertTrue(paid_order.payment_reference.startswith('MOCK-TXN-'))

        # Stock should now be decremented
        self.variant_m.refresh_from_db()
        self.assertEqual(self.variant_m.stock_qty, 8)

        # Transaction ledger entry must exist
        self.assertEqual(Transaction.objects.count(), initial_tx_count + 1)
        tx = Transaction.objects.latest('created_at')
        self.assertEqual(tx.type, 'income')
        self.assertEqual(tx.category, 'merch')
        self.assertEqual(tx.amount, paid_order.total)
        self.assertIn(f"Merch Order #{order.id}", tx.source)

    def test_order_fulfillment(self):
        cart_items = [{'variant_id': self.variant_m.id, 'qty': 1}]
        order = create_order_from_cart(cart_items, buyer=self.user_member)
        mark_order_as_paid(order)
        fulfilled_order = fulfill_order(order)

        self.assertEqual(fulfilled_order.status, Order.STATUS_FULFILLED)
        self.assertIsNotNone(fulfilled_order.fulfilled_at)

    def test_cancelled_paid_order_restores_inventory(self):
        cart_items = [{'variant_id': self.variant_l.id, 'qty': 2}]
        order = create_order_from_cart(cart_items, buyer=self.user_member)
        mark_order_as_paid(order)

        self.variant_l.refresh_from_db()
        self.assertEqual(self.variant_l.stock_qty, 3)

        cancel_order(order, reason="Customer requested refund")
        self.variant_l.refresh_from_db()
        self.assertEqual(self.variant_l.stock_qty, 5)
        self.assertEqual(order.status, Order.STATUS_CANCELLED)


class OrderAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="student_buyer",
            email="student@skyline.edu",
            password="securepassword123",
            name="Student Buyer"
        )
        self.product = Product.objects.create(
            name="Skyline T-Shirt",
            type="tee",
            price=Decimal("25.00")
        )
        self.variant_s = ProductVariant.objects.create(
            product=self.product,
            size="S",
            stock_qty=20
        )
        self.variant_m = ProductVariant.objects.create(
            product=self.product,
            size="M",
            stock_qty=15
        )

    def test_create_order_api_success(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "items": [
                {"variant_id": self.variant_s.id, "qty": 2},
                {"variant_id": self.variant_m.id, "qty": 1},
            ],
            "buyer_name": "Student Buyer",
            "notes": "Pick up after 3pm"
        }
        response = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(Decimal(response.data['subtotal']), Decimal("75.00"))
        self.assertEqual(len(response.data['items']), 2)

    def test_create_order_rejects_insufficient_stock(self):
        payload = {
            "items": [
                {"variant_id": self.variant_m.id, "qty": 50}
            ]
        }
        response = self.client.post('/api/orders/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pay_order_api_with_mock_provider(self):
        payload = {
            "items": [
                {"variant_id": self.variant_s.id, "qty": 3}
            ],
            "buyer_name": "Student Buyer",
            "buyer_email": "student@skyline.edu"
        }
        create_resp = self.client.post('/api/orders/', payload, format='json')
        order_id = create_resp.data['id']

        pay_payload = {
            "provider": "mock",
            "payment_reference": "POS_TERMINAL_TXN_99"
        }
        pay_resp = self.client.post(f'/api/orders/{order_id}/pay/', pay_payload, format='json')
        self.assertEqual(pay_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(pay_resp.data['order']['status'], 'paid')
        self.assertEqual(pay_resp.data['order']['payment_provider'], 'mock')
        self.assertEqual(pay_resp.data['order']['payment_reference'], 'POS_TERMINAL_TXN_99')

        self.variant_s.refresh_from_db()
        self.assertEqual(self.variant_s.stock_qty, 17)

    def test_pay_order_api_with_stripe_provider(self):
        payload = {
            "items": [{"variant_id": self.variant_m.id, "qty": 1}],
            "buyer_name": "Online Buyer"
        }
        create_resp = self.client.post('/api/orders/', payload, format='json')
        order_id = create_resp.data['id']

        pay_resp = self.client.post(f'/api/orders/{order_id}/pay/', {"provider": "stripe"}, format='json')
        self.assertEqual(pay_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(pay_resp.data['order']['status'], 'paid')
        self.assertEqual(pay_resp.data['order']['payment_provider'], 'stripe')

    def test_fulfill_and_cancel_order_api(self):
        payload = {
            "items": [{"variant_id": self.variant_s.id, "qty": 1}]
        }
        create_resp = self.client.post('/api/orders/', payload, format='json')
        order_id = create_resp.data['id']

        self.client.post(f'/api/orders/{order_id}/pay/')
        fulfill_resp = self.client.post(f'/api/orders/{order_id}/fulfill/')
        self.assertEqual(fulfill_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(fulfill_resp.data['order']['status'], 'fulfilled')

        cancel_resp = self.client.post(f'/api/orders/{order_id}/cancel/', {"reason": "Defective item"})
        self.assertEqual(cancel_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(cancel_resp.data['order']['status'], 'cancelled')
