from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.core.management import call_command
from django.core import mail
from django.contrib.auth import get_user_model
from core.models import Transaction
from members.models import MembershipTier, Membership, RenewalReminder

User = get_user_model()


class DuesPaymentTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='teststudent',
            email='student@skyline.edu',
            password='Password123!',
            name='Test Student',
            role='public'
        )
        self.tier = MembershipTier.objects.create(
            name='Standard Annual Tier',
            price=Decimal('50.00'),
            duration_days=365,
            ticket_discount_pct=Decimal('15.00'),
            merch_discount_pct=Decimal('10.00')
        )
        self.membership = Membership.objects.create(
            user=self.user,
            tier=self.tier
        )

    def test_dues_payment_activates_membership_and_records_ledger_transaction(self):
        self.assertEqual(self.membership.status, Membership.STATUS_PENDING)
        self.assertFalse(self.membership.dues_paid)

        # Process payment
        url = f'/api/members/{self.membership.id}/pay-dues'
        self.client.force_login(self.user)
        response = self.client.post(url, {})

        self.assertEqual(response.status_code, 200)
        self.membership.refresh_from_db()

        # Check membership activation
        self.assertTrue(self.membership.dues_paid)
        self.assertEqual(self.membership.status, Membership.STATUS_ACTIVE)
        self.assertEqual(self.membership.dues_amount_paid, Decimal('50.00'))
        self.assertIsNotNone(self.membership.start_date)
        self.assertIsNotNone(self.membership.end_date)
        self.assertEqual(self.membership.end_date, self.membership.start_date + timedelta(days=365))

        # User role should be promoted from public to member
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, 'member')

        # Check central ledger transaction creation
        tx_count = Transaction.objects.filter(category='dues', type='income').count()
        self.assertEqual(tx_count, 1)

        tx = Transaction.objects.filter(category='dues', type='income').first()
        self.assertEqual(tx.amount, Decimal('50.00'))

    def test_idempotency_paying_twice_does_not_duplicate_ledger(self):
        self.client.force_login(self.user)
        url = f'/api/members/{self.membership.id}/pay-dues'

        # First payment
        res1 = self.client.post(url, {})
        self.assertEqual(res1.status_code, 200)
        self.assertEqual(Transaction.objects.filter(category='dues').count(), 1)

        # Second payment attempt (Idempotency test)
        res2 = self.client.post(url, {})
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.data.get('status'), 'already_paid')

        # Ensure transaction count remains 1
        self.assertEqual(Transaction.objects.filter(category='dues').count(), 1)


class ExpiryManagementCommandTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='expiring_user',
            email='expiring@skyline.edu',
            password='Password123!',
            name='Expiring Member'
        )
        self.tier = MembershipTier.objects.create(
            name='Annual Pass',
            price=Decimal('60.00'),
            duration_days=365
        )
        today = timezone.now().date()
        self.membership = Membership.objects.create(
            user=self.user,
            tier=self.tier,
            dues_paid=True,
            status=Membership.STATUS_ACTIVE,
            start_date=today - timedelta(days=350),
            end_date=today + timedelta(days=15) # Expiring in 15 days
        )

    def test_days_until_expiry_property(self):
        self.assertEqual(self.membership.days_until_expiry, 15)
        self.assertTrue(self.membership.is_expiring_soon)

    def test_flag_expiring_memberships_command(self):
        # Clear outbox
        mail.outbox = []

        # Run command for memberships expiring within 30 days
        call_command('flag_expiring_memberships', days=30)

        # Check that email was sent to console backend
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Expiring Member', mail.outbox[0].body)
        self.assertIn('15 days', mail.outbox[0].body)

        # Check RenewalReminder log creation
        self.assertEqual(RenewalReminder.objects.count(), 1)
        reminder = RenewalReminder.objects.first()
        self.assertEqual(reminder.email_to, 'expiring@skyline.edu')
        self.assertEqual(reminder.days_before_expiry, 15)
