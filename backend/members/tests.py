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


class MemberVerifyTestCase(TestCase):
    def setUp(self):
        # Create officer user
        self.officer = User.objects.create_user(
            username='officer_alex',
            email='officer@skyline.edu',
            password='Password123!',
            name='Officer Alex',
            role='leader'
        )

        # Create normal active member
        self.active_user = User.objects.create_user(
            username='active_member',
            email='active@skyline.edu',
            password='Password123!',
            name='Jordan Lee',
            role='member'
        )

        # Create non-member student
        self.public_user = User.objects.create_user(
            username='public_student',
            email='student@skyline.edu',
            password='Password123!',
            name='Morgan Smith',
            role='public'
        )

        # Create tier
        self.tier = MembershipTier.objects.create(
            name='Gold VIP Tier',
            price=Decimal('75.00'),
            duration_days=365,
            ticket_discount_pct=Decimal('20.00'),
            merch_discount_pct=Decimal('15.00')
        )

        # Create active membership
        today = timezone.now().date()
        self.membership = Membership.objects.create(
            user=self.active_user,
            tier=self.tier,
            dues_paid=True,
            status=Membership.STATUS_ACTIVE,
            start_date=today - timedelta(days=50),
            end_date=today + timedelta(days=315),
            dues_amount_paid=Decimal('75.00')
        )

    def test_officer_verify_by_email(self):
        self.client.force_login(self.officer)
        response = self.client.get('/api/members/verify?query=active@skyline.edu')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['found'])
        self.assertTrue(response.data['is_active_member'])
        self.assertEqual(response.data['name'], 'Jordan Lee')
        self.assertEqual(response.data['tier'], 'Gold VIP Tier')
        self.assertEqual(response.data['status'], 'active')
        self.assertTrue(response.data['token'])
        self.assertTrue(response.data['qr_code'].startswith('data:image/png;base64,'))
        self.assertEqual(float(response.data['ticket_discount_pct']), 20.0)

    def test_officer_verify_by_qr_token(self):
        self.client.force_login(self.officer)
        token = self.membership.verification_token
        response = self.client.get(f'/api/members/verify?query={token}')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['is_active_member'])
        self.assertEqual(response.data['email'], 'active@skyline.edu')

    def test_officer_verify_by_member_id(self):
        self.client.force_login(self.officer)
        response = self.client.get(f'/api/members/verify?query={self.membership.id}')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['is_active_member'])
        self.assertEqual(response.data['member_id'], self.membership.id)

    def test_officer_verify_user_with_no_membership(self):
        self.client.force_login(self.officer)
        response = self.client.get('/api/members/verify?query=student@skyline.edu')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['found'])
        self.assertFalse(response.data['is_active_member'])
        self.assertEqual(response.data['status'], 'no_membership')
        self.assertEqual(response.data['name'], 'Morgan Smith')

    def test_officer_verify_not_found_returns_404(self):
        self.client.force_login(self.officer)
        response = self.client.get('/api/members/verify?query=nonexistent@domain.com')

        self.assertEqual(response.status_code, 404)
        self.assertIn('detail', response.data)

    def test_officer_verify_missing_query_returns_400(self):
        self.client.force_login(self.officer)
        response = self.client.get('/api/members/verify')

        self.assertEqual(response.status_code, 400)

    def test_public_user_cannot_access_verify_endpoint(self):
        self.client.force_login(self.public_user)
        response = self.client.get('/api/members/verify?query=active@skyline.edu')

        self.assertEqual(response.status_code, 403)


class JoinClubAndProfileTestCase(TestCase):
    def setUp(self):
        self.tier = MembershipTier.objects.create(
            name='Silver Pass',
            price=Decimal('45.00'),
            duration_days=365,
            ticket_discount_pct=Decimal('15.00'),
            merch_discount_pct=Decimal('10.00'),
            is_active=True
        )

    def test_public_signup_and_join_with_immediate_dues_payment(self):
        payload = {
            'name': 'Taylor Swift',
            'email': 'taylor@skyline.edu',
            'phone': '555-9999',
            'password': 'Password123!',
            'password_confirm': 'Password123!',
            'tier_id': self.tier.id,
            'pay_now': True,
        }

        response = self.client.post('/api/members/join', payload, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertIn('access', response.data)
        self.assertIn('membership', response.data)

        # Check DB
        user = User.objects.get(email='taylor@skyline.edu')
        self.assertEqual(user.role, 'member')

        mem = Membership.objects.get(user=user)
        self.assertTrue(mem.dues_paid)
        self.assertEqual(mem.status, Membership.STATUS_ACTIVE)
        self.assertEqual(mem.dues_amount_paid, Decimal('45.00'))

        # Check ledger recorded
        tx = Transaction.objects.filter(category='dues', amount=Decimal('45.00')).first()
        self.assertIsNotNone(tx)

    def test_public_signup_validation_passwords_mismatch(self):
        payload = {
            'name': 'Taylor Swift',
            'email': 'taylor2@skyline.edu',
            'password': 'Password123!',
            'password_confirm': 'DifferentPassword!',
            'tier_id': self.tier.id,
        }
        response = self.client.post('/api/members/join', payload, format='json')
        self.assertEqual(response.status_code, 400)
        details = response.data.get('details', response.data)
        self.assertIn('password_confirm', details)


    def test_my_membership_profile_endpoint(self):
        user = User.objects.create_user(
            username='profile_user',
            email='profile@skyline.edu',
            password='Password123!',
            name='Profile User',
            role='member'
        )
        Membership.objects.create(
            user=user,
            tier=self.tier,
            dues_paid=True,
            status=Membership.STATUS_ACTIVE,
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timedelta(days=365)
        )

        self.client.force_login(user)
        response = self.client.get('/api/members/profile/me')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['email'], 'profile@skyline.edu')
        self.assertIsNotNone(response.data['membership'])
        self.assertTrue(len(response.data['available_tiers']) >= 1)


