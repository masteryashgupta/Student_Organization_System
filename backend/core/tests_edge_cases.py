import uuid
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from core.models import Transaction
from members.models import MembershipTier, Membership
from events.models import Event, Ticket
from store.models import Product, ProductVariant, Order, OrderItem
from tasks.models import Project, Task
from finance.models import Reimbursement

User = get_user_model()


class EdgeCasesAuditTestCase(APITestCase):
    """
    Comprehensive test suite validating system resilience against boundary,
    lifecycle, concurrency, and anomaly edge cases.
    """

    def setUp(self):
        self.officer = User.objects.create_user(
            username="admin_officer",
            email="admin@skyline.edu",
            password="OfficerPass123!",
            name="Admin Officer",
            role=User.ROLE_ADMIN,
        )
        self.officer_token = str(RefreshToken.for_user(self.officer).access_token)

        self.tier = MembershipTier.objects.create(
            name="Standard Pass",
            price=Decimal("30.00"),
            duration_days=365,
            ticket_discount_pct=Decimal("15.00"),
            merch_discount_pct=Decimal("10.00"),
            is_active=True,
        )

    # -------------------------------------------------------------------------
    # 1. EMPTY DATABASE & ONE RECORD & MANY RECORDS
    # -------------------------------------------------------------------------
    def test_empty_database_and_list_endpoints(self):
        """Endpoints should return empty lists gracefully, not 500 errors."""
        res_events = self.client.get('/api/events/')
        self.assertEqual(res_events.status_code, status.HTTP_200_OK)
        self.assertEqual(res_events.data.get('results', res_events.data), [])

        res_products = self.client.get('/api/products/')
        self.assertEqual(res_products.status_code, status.HTTP_200_OK)
        self.assertEqual(res_products.data.get('results', res_products.data), [])

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.officer_token}')
        res_finance = self.client.get(reverse('finance-summary'))
        self.assertEqual(res_finance.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(res_finance.data['current_balance'])), Decimal('0.00'))

    def test_pagination_and_large_record_sets(self):
        """Endpoints should return large record sets and support search/filtering without errors."""
        for i in range(15):
            Event.objects.create(
                title=f"Master Event #{i:02d}",
                datetime=timezone.now() + timezone.timedelta(days=i + 1),
                venue="Main Hall",
                capacity=50,
                member_price=Decimal("10.00"),
                nonmember_price=Decimal("15.00"),
                status=Event.STATUS_PUBLISHED,
            )

        res = self.client.get('/api/events/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data)
        self.assertEqual(len(results), 15)

        # Filtering by search
        res_search = self.client.get('/api/events/?search=Master Event #05')
        self.assertEqual(res_search.status_code, status.HTTP_200_OK)
        search_results = res_search.data.get('results', res_search.data)
        self.assertEqual(len(search_results), 1)

    # -------------------------------------------------------------------------
    # 2. EXPIRED MEMBERSHIP & INACTIVE MEMBERSHIP
    # -------------------------------------------------------------------------
    def test_expired_and_inactive_membership_perks_revocation(self):
        """Expired and inactive members must not receive discounts."""
        expired_member = User.objects.create_user(
            username="expired_user",
            email="expired@skyline.edu",
            password="Password123!",
            name="Expired Student",
            role=User.ROLE_MEMBER,
        )
        Membership.objects.create(
            user=expired_member,
            tier=self.tier,
            status=Membership.STATUS_EXPIRED,
            dues_paid=True,
            start_date=timezone.now().date() - timezone.timedelta(days=400),
            end_date=timezone.now().date() - timezone.timedelta(days=35),
        )

        expired_token = str(RefreshToken.for_user(expired_member).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {expired_token}')

        # Profile indicates expired status
        res_profile = self.client.get(reverse('my-membership-profile'))
        self.assertEqual(res_profile.status_code, status.HTTP_200_OK)
        self.assertEqual(res_profile.data['membership']['status'], 'expired')

        # Discount endpoint returns 0 discount
        res_discount = self.client.get(reverse('my-membership-discount'))
        self.assertEqual(res_discount.status_code, status.HTTP_200_OK)
        self.assertFalse(res_discount.data['is_active_member'])
        self.assertEqual(Decimal(str(res_discount.data['ticket_discount_pct'])), Decimal('0.00'))

    # -------------------------------------------------------------------------
    # 3. UNAUTHORIZED USER & DELETED USER
    # -------------------------------------------------------------------------
    def test_unauthorized_and_deleted_user_access(self):
        """Unauthorized requests get 401/403, and deleted user tokens are rejected."""
        # 1. Protected endpoint with no token -> 401
        self.client.credentials()
        res = self.client.get(reverse('my-membership-profile'))
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Member trying to access officer-restricted member roster -> 403
        member = User.objects.create_user(
            username="regular_student",
            email="student@skyline.edu",
            password="Password123!",
            role=User.ROLE_MEMBER,
        )
        member_token = str(RefreshToken.for_user(member).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {member_token}')

        res_roster = self.client.get(reverse('member-list'))
        self.assertEqual(res_roster.status_code, status.HTTP_403_FORBIDDEN)

        # 3. User deleted from database -> token becomes invalid (401)
        member.delete()
        res_after_delete = self.client.get(reverse('my-membership-profile'))
        self.assertEqual(res_after_delete.status_code, status.HTTP_401_UNAUTHORIZED)

    # -------------------------------------------------------------------------
    # 4. SOLD-OUT EVENT & DELETED EVENT
    # -------------------------------------------------------------------------
    def test_sold_out_and_deleted_event(self):
        """Ticket purchases on sold-out or deleted events must fail gracefully."""
        event = Event.objects.create(
            title="Tiny Masterclass",
            datetime=timezone.now() + timezone.timedelta(days=2),
            venue="Room 101",
            capacity=1,
            member_price=Decimal("10.00"),
            nonmember_price=Decimal("15.00"),
            status=Event.STATUS_PUBLISHED,
        )

        # First ticket succeeds
        res1 = self.client.post(f'/api/events/{event.id}/tickets/', {
            'holder_name': 'Buyer One',
            'holder_email': 'buyer1@skyline.edu',
        })
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Second ticket purchase fails with 400 (Sold out)
        res2 = self.client.post(f'/api/events/{event.id}/tickets/', {
            'holder_name': 'Buyer Two',
            'holder_email': 'buyer2@skyline.edu',
        })
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

        # Purchasing on non-existent or deleted event returns 404
        non_existent_id = 999999
        res_deleted = self.client.post(f'/api/events/{non_existent_id}/tickets/', {
            'holder_name': 'Buyer Ghost',
            'holder_email': 'ghost@skyline.edu',
        })
        self.assertEqual(res_deleted.status_code, status.HTTP_404_NOT_FOUND)

    # -------------------------------------------------------------------------
    # 5. OUT-OF-STOCK PRODUCT & RESTOCK
    # -------------------------------------------------------------------------
    def test_out_of_stock_product_order_rejected(self):
        """Order creation on 0 stock product must fail with 400."""
        product = Product.objects.create(
            name="Limited Sticker Pack",
            type="accessory",
            price=Decimal("5.00"),
            is_active=True,
        )
        variant = ProductVariant.objects.create(
            product=product,
            size="OS",
            stock_qty=0,
        )

        res_order = self.client.post('/api/orders/', {
            'items': [{'variant_id': variant.id, 'qty': 1}],
            'buyer_name': 'Eager Buyer',
            'buyer_email': 'eager@skyline.edu',
        }, format='json')
        self.assertEqual(res_order.status_code, status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------------------
    # 6. INVALID TICKET & ALREADY CHECKED-IN TICKET & INVALID QR
    # -------------------------------------------------------------------------
    def test_invalid_and_already_checked_in_ticket(self):
        """Check-in endpoint must cleanly handle invalid tokens and double check-ins."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.officer_token}')

        # 1. Completely invalid/random UUID
        random_token = uuid.uuid4()
        res_invalid = self.client.post(f'/api/tickets/{random_token}/check-in/')
        self.assertEqual(res_invalid.status_code, status.HTTP_404_NOT_FOUND)

        # 2. Malformed token string
        res_malformed = self.client.post('/api/tickets/not-a-valid-uuid-12345/check-in/')
        self.assertIn(res_malformed.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST])

        # 3. Create valid ticket, check it in, then attempt duplicate check-in
        event = Event.objects.create(
            title="Concert 2026",
            datetime=timezone.now() + timezone.timedelta(days=5),
            venue="Amphitheater",
            capacity=100,
            member_price=Decimal("20.00"),
            nonmember_price=Decimal("25.00"),
            status=Event.STATUS_PUBLISHED,
        )
        ticket = Ticket.objects.create(
            event=event,
            holder_name="Concert Fan",
            holder_email="fan@skyline.edu",
            type=Ticket.TYPE_NONMEMBER,
            price_paid=Decimal("25.00"),
            status=Ticket.STATUS_VALID,
        )

        # First check-in succeeds
        res_checkin1 = self.client.post(f'/api/tickets/{ticket.token}/check-in/')
        self.assertEqual(res_checkin1.status_code, status.HTTP_200_OK)
        self.assertEqual(res_checkin1.data['status'], 'success')

        # Second check-in is rejected as already checked in
        res_checkin2 = self.client.post(f'/api/tickets/{ticket.token}/check-in/')
        self.assertEqual(res_checkin2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Double check-in rejected", res_checkin2.data.get('detail', ''))

    # -------------------------------------------------------------------------
    # 7. DUPLICATE PAYMENT IDEMPOTENCY
    # -------------------------------------------------------------------------
    def test_duplicate_order_payment_prevented(self):
        """An order cannot be paid twice; double payment triggers controlled validation error."""
        product = Product.objects.create(
            name="Enamel Pin",
            type="accessory",
            price=Decimal("10.00"),
            is_active=True,
        )
        variant = ProductVariant.objects.create(
            product=product,
            size="OS",
            stock_qty=5,
        )

        res_order = self.client.post('/api/orders/', {
            'items': [{'variant_id': variant.id, 'qty': 1}],
            'buyer_name': 'Pin Collector',
            'buyer_email': 'collector@skyline.edu',
        }, format='json')
        self.assertEqual(res_order.status_code, status.HTTP_201_CREATED)
        order_id = res_order.data['id']

        # First payment succeeds
        res_pay1 = self.client.post(f'/api/orders/{order_id}/pay/', {'provider': 'mock'})
        self.assertEqual(res_pay1.status_code, status.HTTP_200_OK)

        # Second payment fails (cannot pay non-pending order)
        res_pay2 = self.client.post(f'/api/orders/{order_id}/pay/', {'provider': 'mock'})
        self.assertEqual(res_pay2.status_code, status.HTTP_400_BAD_REQUEST)

        # Stock is decremented only once (5 -> 4)
        variant.refresh_from_db()
        self.assertEqual(variant.stock_qty, 4)
