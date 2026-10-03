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


class EndToEndUserFlowsAuditTestCase(APITestCase):
    def setUp(self):
        # Setup Initial Seed Master Data
        self.gold_tier = MembershipTier.objects.create(
            name="Gold Student Pass",
            description="All-access student club pass with perks",
            price=Decimal("50.00"),
            duration_days=365,
            ticket_discount_pct=Decimal("20.00"),
            merch_discount_pct=Decimal("15.00"),
            is_active=True,
        )

        self.officer_user = User.objects.create_user(
            username="treasurer_officer",
            email="treasurer@skyline.edu",
            password="OfficerPass123!",
            name="Sarah Treasurer",
            role=User.ROLE_ADMIN,
        )

    # =========================================================================
    # FLOW 1: New Student -> Register -> Login -> View Membership -> Active -> Benefits -> Expiry
    # =========================================================================
    def test_flow_1_student_registration_and_membership_lifecycle(self):
        # 1. New student registers with membership tier enrollment
        join_url = reverse('member-join')
        join_payload = {
            'name': 'David Copper',
            'email': 'david@skyline.edu',
            'phone': '+15551234567',
            'password': 'SecureStudentPassword123!',
            'password_confirm': 'SecureStudentPassword123!',
            'tier_id': self.gold_tier.id,
            'pay_now': True,
        }
        res_join = self.client.post(join_url, join_payload)
        self.assertEqual(res_join.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', res_join.data)
        access_token = res_join.data['access']

        # 2. Verify student exists in database with active membership
        david_user = User.objects.get(email='david@skyline.edu')
        self.assertEqual(david_user.role, User.ROLE_MEMBER)

        membership = Membership.objects.get(user=david_user)
        self.assertTrue(membership.dues_paid)
        self.assertEqual(membership.status, Membership.STATUS_ACTIVE)
        self.assertTrue(membership.is_active_member)
        self.assertGreater(membership.days_until_expiry, 300)

        # 3. Verify income transaction recorded in central ledger
        dues_tx = Transaction.objects.filter(type=Transaction.TYPE_INCOME, category=Transaction.CATEGORY_DUES).first()
        self.assertIsNotNone(dues_tx)
        self.assertEqual(dues_tx.amount, Decimal('50.00'))

        # 4. View authenticated profile and benefits contract
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        res_profile = self.client.get(reverse('my-membership-profile'))
        self.assertEqual(res_profile.status_code, status.HTTP_200_OK)
        self.assertEqual(res_profile.data['user']['email'], 'david@skyline.edu')
        self.assertTrue(res_profile.data['membership']['dues_paid'])

        # 5. Verify contract endpoint reflects 20% ticket discount & 15% merch discount
        res_discount = self.client.get(reverse('my-membership-discount'))
        self.assertEqual(res_discount.status_code, status.HTTP_200_OK)
        self.assertTrue(res_discount.data['is_active_member'])
        self.assertEqual(Decimal(str(res_discount.data['ticket_discount_pct'])), Decimal('20.00'))
        self.assertEqual(Decimal(str(res_discount.data['merch_discount_pct'])), Decimal('15.00'))

    # =========================================================================
    # FLOW 2: Member -> Browse Event -> Buy Ticket -> Receive Ticket -> In DB -> Check-in -> Attendance & Revenue Increase
    # =========================================================================
    def test_flow_2_member_event_ticketing_and_attendance_checkin(self):
        # Setup member and event
        member = User.objects.create_user(
            username='emma_member',
            email='emma@skyline.edu',
            password='MemberPass123!',
            name='Emma Watson',
            role=User.ROLE_MEMBER,
        )
        Membership.objects.create(
            user=member,
            tier=self.gold_tier,
            status=Membership.STATUS_ACTIVE,
            dues_paid=True,
            dues_amount_paid=self.gold_tier.price,
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=365),
        )

        event = Event.objects.create(
            title='Annual Leadership Summit 2026',
            datetime=timezone.now() + timezone.timedelta(days=7),
            venue='Skyline Auditorium',
            capacity=100,
            member_price=Decimal('20.00'),
            nonmember_price=Decimal('35.00'),
            status=Event.STATUS_PUBLISHED,
        )

        # 1. Member browses event
        res_browse = self.client.get('/api/events/')
        self.assertEqual(res_browse.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_browse.data['results'] if 'results' in res_browse.data else res_browse.data), 1)

        # 2. Member purchases ticket
        member_refresh = RefreshToken.for_user(member)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {member_refresh.access_token}')

        res_purchase = self.client.post(f'/api/events/{event.id}/tickets/', {
            'holder_name': 'Emma Watson',
            'holder_email': 'emma@skyline.edu',
        })
        self.assertEqual(res_purchase.status_code, status.HTTP_201_CREATED)
        ticket_data = res_purchase.data
        ticket_token = ticket_data['token']
        self.assertEqual(ticket_data['type'], 'member')
        self.assertEqual(Decimal(str(ticket_data['price_paid'])), Decimal('20.00'))

        # 3. Verify ticket exists in database and ledger revenue is updated
        db_ticket = Ticket.objects.get(token=ticket_token)
        self.assertEqual(db_ticket.status, Ticket.STATUS_VALID)

        ticket_tx = Transaction.objects.filter(type=Transaction.TYPE_INCOME, category=Transaction.CATEGORY_TICKET).first()
        self.assertIsNotNone(ticket_tx)
        self.assertEqual(ticket_tx.amount, Decimal('20.00'))

        # 4. Officer checks in the ticket at the door
        officer_refresh = RefreshToken.for_user(self.officer_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {officer_refresh.access_token}')

        res_checkin = self.client.post(f'/api/tickets/{ticket_token}/check-in/')
        self.assertEqual(res_checkin.status_code, status.HTTP_200_OK)
        self.assertEqual(res_checkin.data['status'], 'success')
        self.assertEqual(res_checkin.data['ticket']['status'], 'checked_in')

        # 5. Verify attendance and stats reflect checkin
        db_ticket.refresh_from_db()
        self.assertEqual(db_ticket.status, Ticket.STATUS_CHECKED_IN)
        self.assertIsNotNone(db_ticket.checked_in_at)

        res_stats = self.client.get(f'/api/events/{event.id}/stats/')
        self.assertEqual(res_stats.status_code, status.HTTP_200_OK)
        self.assertEqual(res_stats.data['tickets_sold'], 1)
        self.assertEqual(res_stats.data['checked_in_count'], 1)
        self.assertEqual(Decimal(str(res_stats.data['total_revenue'])), Decimal('20.00'))

    # =========================================================================
    # FLOW 3: Member -> Browse Merch -> Select Size -> Purchase -> Order -> Stock Decreases -> Revenue Recorded
    # =========================================================================
    def test_flow_3_merchandise_browse_purchase_and_inventory_decrement(self):
        member = User.objects.create_user(
            username='brian_member',
            email='brian@skyline.edu',
            password='MemberPass123!',
            name='Brian Griffin',
            role=User.ROLE_MEMBER,
        )

        product = Product.objects.create(
            name="Skyline Varsity Hoodie",
            type="hoodie",
            price=Decimal("40.00"),
            is_active=True,
        )
        variant_m = ProductVariant.objects.create(
            product=product,
            size="M",
            stock_qty=10,
        )

        # 1. Member browses merchandise catalog
        res_catalog = self.client.get('/api/products/')
        self.assertEqual(res_catalog.status_code, status.HTTP_200_OK)

        # 2. Member places order for 2 Medium hoodies
        member_refresh = RefreshToken.for_user(member)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {member_refresh.access_token}')

        order_payload = {
            'items': [{'variant_id': variant_m.id, 'qty': 2}],
            'buyer_name': 'Brian Griffin',
            'buyer_email': 'brian@skyline.edu',
        }
        res_order = self.client.post('/api/orders/', order_payload, format='json')
        self.assertEqual(res_order.status_code, status.HTTP_201_CREATED)
        order_id = res_order.data['id']
        self.assertEqual(Decimal(str(res_order.data['total'])), Decimal('80.00'))

        # 3. Pay for order
        res_pay = self.client.post(f'/api/orders/{order_id}/pay/', {
            'provider': 'mock',
            'payment_reference': 'MOCK_PAY_REF_998',
        })
        self.assertEqual(res_pay.status_code, status.HTTP_200_OK)
        self.assertEqual(res_pay.data['status'], 'success')
        self.assertEqual(res_pay.data['order']['status'], 'paid')

        # 4. Verify inventory stock was atomically reduced from 10 to 8
        variant_m.refresh_from_db()
        self.assertEqual(variant_m.stock_qty, 8)

        # 5. Verify merchandise revenue is posted to the central ledger
        merch_tx = Transaction.objects.filter(type=Transaction.TYPE_INCOME, category=Transaction.CATEGORY_MERCH).first()
        self.assertIsNotNone(merch_tx)
        self.assertEqual(merch_tx.amount, Decimal('80.00'))

    # =========================================================================
    # FLOW 4: Volunteer -> View Volunteer Board -> Assigned Task -> Update Status -> Completion
    # =========================================================================
    def test_flow_4_volunteer_task_lifecycle_and_kanban_progression(self):
        volunteer = User.objects.create_user(
            username='lisa_vol',
            email='lisa@skyline.edu',
            password='VolPass123!',
            name='Lisa Simpson',
            role=User.ROLE_VOLUNTEER,
        )

        project = Project.objects.create(
            name='Fall Charity Book Fair',
            goal_amount=Decimal('500.00'),
            status=Project.STATUS_ACTIVE,
        )
        task = Task.objects.create(
            title='Setup Book Fair Registration Desk',
            description='Arrange banners, register attendees, hand out lanyards',
            project=project,
            assignee=volunteer,
            status=Task.STATUS_TODO,
            priority=Task.PRIORITY_HIGH,
            due_date=timezone.now().date() + timezone.timedelta(days=2),
        )

        # 1. Volunteer views board
        vol_refresh = RefreshToken.for_user(volunteer)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {vol_refresh.access_token}')

        res_board = self.client.get('/api/tasks/')
        self.assertEqual(res_board.status_code, status.HTTP_200_OK)

        # 2. Volunteer transitions task from 'todo' -> 'doing'
        res_progress = self.client.post(f'/api/tasks/{task.id}/update_status/', {
            'status': Task.STATUS_DOING,
        })
        self.assertEqual(res_progress.status_code, status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertEqual(task.status, Task.STATUS_DOING)

        # 3. Volunteer completes task -> 'done'
        res_done = self.client.post(f'/api/tasks/{task.id}/update_status/', {
            'status': Task.STATUS_DONE,
        })
        self.assertEqual(res_done.status_code, status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertEqual(task.status, Task.STATUS_DONE)
        self.assertEqual(project.progress_percentage, 100)

    # =========================================================================
    # FLOW 5: Treasurer -> View Dashboard -> Dues + Tickets + Merch - Expenses = Final Balance
    # =========================================================================
    def test_flow_5_treasurer_financial_summary_and_balance_reconciliation(self):
        # 1. Income entries
        Transaction.objects.create(
            type=Transaction.TYPE_INCOME,
            category=Transaction.CATEGORY_DUES,
            amount=Decimal('150.00'),
            source='Membership Dues (3 members)',
        )
        Transaction.objects.create(
            type=Transaction.TYPE_INCOME,
            category=Transaction.CATEGORY_TICKET,
            amount=Decimal('75.00'),
            source='Event Tickets (Leadership Summit)',
        )
        Transaction.objects.create(
            type=Transaction.TYPE_INCOME,
            category=Transaction.CATEGORY_MERCH,
            amount=Decimal('120.00'),
            source='Merch Store Sales',
        )

        # 2. Expense / Reimbursement entries
        requester = User.objects.create_user(
            username='carl_member',
            email='carl@skyline.edu',
            password='Password123!',
            name='Carl Carlson',
            role=User.ROLE_MEMBER,
        )
        reimbursement = Reimbursement.objects.create(
            requester=requester,
            amount=Decimal('45.00'),
            description='Purchased name tags and markers for conference',
            status=Reimbursement.STATUS_PENDING,
        )

        # 3. Officer approves and marks reimbursement paid
        officer_refresh = RefreshToken.for_user(self.officer_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {officer_refresh.access_token}')

        self.client.post(f'/api/reimbursements/{reimbursement.id}/approve', {'notes': 'Approved budget'})
        self.client.post(f'/api/reimbursements/{reimbursement.id}/mark-paid', {'notes': 'Transferred via bank'})

        reimbursement.refresh_from_db()
        self.assertEqual(reimbursement.status, Reimbursement.STATUS_PAID)

        # 4. Treasurer opens Financial Summary Dashboard
        res_summary = self.client.get(reverse('finance-summary'))
        self.assertEqual(res_summary.status_code, status.HTTP_200_OK)
        data = res_summary.data

        # Total Income = 150 + 75 + 120 = 345.00
        # Total Expense = 45.00
        # Net Balance = 345.00 - 45.00 = 300.00
        self.assertEqual(Decimal(str(data['total_income'])), Decimal('345.00'))
        self.assertEqual(Decimal(str(data['total_expense'])), Decimal('45.00'))
        self.assertEqual(Decimal(str(data['current_balance'])), Decimal('300.00'))

        # Verify mathematical equation holds exactly in database
        self.assertEqual(
            Decimal(str(data['total_income'])) - Decimal(str(data['total_expense'])),
            Decimal(str(data['current_balance']))
        )
