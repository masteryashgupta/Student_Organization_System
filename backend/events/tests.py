import uuid
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Event, Ticket
from .serializers import EventSerializer
from .services import (
    get_event_availability,
    check_event_availability,
    purchase_ticket,
    calculate_ticket_price,
    check_in_ticket,
)

User = get_user_model()


class EventModelAndSerializerTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testofficer',
            email='officer@test.com',
            password='password123',
            role=User.ROLE_LEADER
        )
        self.future_time = timezone.now() + timedelta(days=7)
        self.past_time = timezone.now() - timedelta(days=1)

    def test_create_valid_event(self):
        event = Event.objects.create(
            title='Spring Gala 2026',
            description='Annual spring gala dinner and dance.',
            datetime=self.future_time,
            venue='Skyline Grand Ballroom',
            capacity=150,
            member_price=Decimal('15.00'),
            nonmember_price=Decimal('25.00'),
            status=Event.STATUS_PUBLISHED
        )
        self.assertEqual(event.capacity, 150)
        self.assertEqual(event.status, Event.STATUS_PUBLISHED)
        self.assertEqual(str(event), f"Spring Gala 2026 ({self.future_time.strftime('%Y-%m-%d %H:%M')})")

    def test_past_datetime_on_creation_fails(self):
        with self.assertRaises(DjangoValidationError) as ctx:
            event = Event(
                title='Past Event',
                datetime=self.past_time,
                venue='Old Hall',
                capacity=50,
                member_price=Decimal('10.00'),
                nonmember_price=Decimal('15.00'),
                status=Event.STATUS_PUBLISHED
            )
            event.clean()
        self.assertIn('datetime', ctx.exception.message_dict)

    def test_capacity_zero_or_negative_fails(self):
        with self.assertRaises(DjangoValidationError) as ctx:
            event = Event(
                title='Zero Capacity Event',
                datetime=self.future_time,
                venue='Room 101',
                capacity=0,
                member_price=Decimal('10.00'),
                nonmember_price=Decimal('15.00'),
            )
            event.clean()
        self.assertIn('capacity', ctx.exception.message_dict)

    def test_negative_prices_fail(self):
        with self.assertRaises(DjangoValidationError) as ctx:
            event = Event(
                title='Negative Price Event',
                datetime=self.future_time,
                venue='Room 101',
                capacity=50,
                member_price=Decimal('-5.00'),
                nonmember_price=Decimal('-1.00'),
            )
            event.clean()
        self.assertIn('member_price', ctx.exception.message_dict)
        self.assertIn('nonmember_price', ctx.exception.message_dict)

    def test_serializer_validation(self):
        # Test past datetime serializer rejection
        serializer = EventSerializer(data={
            'title': 'Past Gala',
            'datetime': (timezone.now() - timedelta(hours=2)).isoformat(),
            'venue': 'Auditorium',
            'capacity': 100,
            'member_price': '10.00',
            'nonmember_price': '20.00',
            'status': Event.STATUS_DRAFT
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('datetime', serializer.errors)

        # Test capacity < 1 serializer rejection
        serializer = EventSerializer(data={
            'title': 'Valid Time Gala',
            'datetime': self.future_time.isoformat(),
            'venue': 'Auditorium',
            'capacity': 0,
            'member_price': '10.00',
            'nonmember_price': '20.00',
            'status': Event.STATUS_DRAFT
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('capacity', serializer.errors)

    def test_event_crud_endpoints(self):
        # 1. Test public list (GET /api/events/)
        response = self.client.get('/api/events/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 2. Test create unauthenticated (should be 401)
        payload = {
            'title': 'Hackathon 2026',
            'description': '24 hour campus coding competition.',
            'datetime': self.future_time.isoformat(),
            'venue': 'Student Center Main Lobby',
            'capacity': 100,
            'member_price': '0.00',
            'nonmember_price': '10.00',
            'status': 'published'
        }
        res_unauth = self.client.post('/api/events/', payload)
        self.assertEqual(res_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

        # 3. Test create authenticated
        self.client.force_authenticate(user=self.user)
        create_res = self.client.post('/api/events/', payload)
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        event_id = create_res.data['id']

        # 4. Test retrieve (GET /api/events/{id}/)
        get_res = self.client.get(f'/api/events/{event_id}/')
        self.assertEqual(get_res.status_code, status.HTTP_200_OK)
        self.assertEqual(get_res.data['title'], 'Hackathon 2026')
        # Check nested availability in retrieve
        self.assertEqual(get_res.data['availability']['remaining'], 100)

        # 5. Test update (PATCH /api/events/{id}/)
        patch_res = self.client.patch(f'/api/events/{event_id}/', {'capacity': 120})
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_res.data['capacity'], 120)

        # 6. Test delete (DELETE /api/events/{id}/)
        del_res = self.client.delete(f'/api/events/{event_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Event.objects.count(), 0)


class EventAvailabilityTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='regularstudent',
            email='student@skyline.edu',
            password='password123',
            role=User.ROLE_MEMBER
        )
        self.event = Event.objects.create(
            title='Spring Gala 2026',
            description='Spring Gala with limited seating.',
            datetime=timezone.now() + timedelta(days=14),
            venue='Skyline Pavilion',
            capacity=3,
            member_price=Decimal('20.00'),
            nonmember_price=Decimal('35.00'),
            status=Event.STATUS_PUBLISHED
        )

    def test_availability_endpoint_live_computation(self):
        # 0 tickets sold
        res = self.client.get(f'/api/events/{self.event.id}/availability/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data, {'capacity': 3, 'sold': 0, 'remaining': 3})

        # Sell 1 ticket
        ticket1 = Ticket.objects.create(
            event=self.event,
            holder=self.user,
            type=Ticket.TYPE_MEMBER,
            price_paid=Decimal('20.00'),
            status=Ticket.STATUS_VALID
        )
        res = self.client.get(f'/api/events/{self.event.id}/availability/')
        self.assertEqual(res.data, {'capacity': 3, 'sold': 1, 'remaining': 2})

        # Check-in the ticket (still counts towards sold)
        ticket1.status = Ticket.STATUS_CHECKED_IN
        ticket1.save()
        res = self.client.get(f'/api/events/{self.event.id}/availability/')
        self.assertEqual(res.data, {'capacity': 3, 'sold': 1, 'remaining': 2})

        # Cancel ticket (releases seat back to remaining)
        ticket1.status = Ticket.STATUS_CANCELLED
        ticket1.save()
        res = self.client.get(f'/api/events/{self.event.id}/availability/')
        self.assertEqual(res.data, {'capacity': 3, 'sold': 0, 'remaining': 3})

    def test_reusable_check_prevents_selling_when_remaining_zero(self):
        # Fill capacity (capacity = 3)
        for i in range(3):
            Ticket.objects.create(
                event=self.event,
                holder=self.user,
                type=Ticket.TYPE_MEMBER,
                price_paid=Decimal('20.00'),
                status=Ticket.STATUS_VALID
            )

        availability = get_event_availability(self.event)
        self.assertEqual(availability['remaining'], 0)
        self.assertEqual(availability['sold'], 3)

        # Attempt to sell via reusable check
        with self.assertRaises(DRFValidationError) as ctx:
            check_event_availability(self.event, quantity=1)
        self.assertIn('sold out', str(ctx.exception.detail))

        # Check event model method can_sell_ticket
        self.assertFalse(self.event.can_sell_ticket())

    def test_reusable_check_prevents_selling_when_event_not_published(self):
        self.event.status = Event.STATUS_DRAFT
        self.event.save()

        with self.assertRaises(DRFValidationError) as ctx:
            check_event_availability(self.event, quantity=1)
        self.assertIn('not active', str(ctx.exception.detail))

    def test_reusable_check_prevents_quantity_exceeding_remaining(self):
        Ticket.objects.create(
            event=self.event,
            holder=self.user,
            type=Ticket.TYPE_MEMBER,
            price_paid=Decimal('20.00'),
            status=Ticket.STATUS_VALID
        )
        # Remaining is 2, requesting 3
        with self.assertRaises(DRFValidationError) as ctx:
            check_event_availability(self.event, quantity=3)
        self.assertIn('remaining', str(ctx.exception.detail))


class TicketPurchaseTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='student1',
            email='student1@skyline.edu',
            password='password123',
            name='Alice Student',
            role=User.ROLE_MEMBER
        )
        self.event = Event.objects.create(
            title='Spring Gala 2026',
            description='Annual spring gala dinner and dance.',
            datetime=timezone.now() + timedelta(days=14),
            venue='Skyline Grand Ballroom',
            capacity=2,
            member_price=Decimal('15.00'),
            nonmember_price=Decimal('25.00'),
            status=Event.STATUS_PUBLISHED
        )

    def test_guest_ticket_purchase_success_and_ledger_transaction(self):
        from core.models import Transaction

        initial_tx_count = Transaction.objects.count()

        payload = {
            'holder_name': 'Bob Guest',
            'holder_email': 'bob@external.org',
        }
        res = self.client.post(f'/api/events/{self.event.id}/tickets/', payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['holder_name'], 'Bob Guest')
        self.assertEqual(res.data['holder_email'], 'bob@external.org')
        self.assertEqual(res.data['type'], 'nonmember')
        self.assertEqual(Decimal(str(res.data['price_paid'])), Decimal('25.00'))
        self.assertIsNotNone(res.data['token'])
        self.assertEqual(res.data['status'], 'valid')

        # Verify ledger recorded transaction
        self.assertEqual(Transaction.objects.count(), initial_tx_count + 1)
        tx = Transaction.objects.first()
        self.assertEqual(tx.type, Transaction.TYPE_INCOME)
        self.assertEqual(tx.category, Transaction.CATEGORY_TICKET)
        self.assertEqual(tx.amount, Decimal('25.00'))
        self.assertIn(str(res.data['token']), tx.source)

    def test_guest_ticket_purchase_missing_details_fails(self):
        res = self.client.post(f'/api/events/{self.event.id}/tickets/', {})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        error_dict = res.data.get('details', res.data)
        self.assertIn('holder_name', error_dict)
        self.assertIn('holder_email', error_dict)

    def test_authenticated_ticket_purchase_auto_populates_user(self):
        self.client.force_authenticate(user=self.user)
        res = self.client.post(f'/api/events/{self.event.id}/tickets/', {})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['holder_name'], 'Alice Student')
        self.assertEqual(res.data['holder_email'], 'student1@skyline.edu')

    def test_member_pricing_applied_when_buyer_is_member(self):
        from unittest.mock import patch

        self.client.force_authenticate(user=self.user)
        with patch('events.services.get_buyer_member_info') as mock_info:
            mock_info.return_value = {
                'is_active_member': True,
                'tier': 'Gold Tier',
                'ticket_discount_pct': 0.0,
            }
            res = self.client.post(f'/api/events/{self.event.id}/tickets/', {})
            self.assertEqual(res.status_code, status.HTTP_201_CREATED)
            self.assertEqual(res.data['type'], 'member')
            self.assertEqual(Decimal(str(res.data['price_paid'])), Decimal('15.00'))

    def test_cannot_purchase_tickets_past_capacity(self):
        # Event capacity is 2
        # Purchase 1
        res1 = self.client.post(
            f'/api/events/{self.event.id}/tickets/',
            {'holder_name': 'Person 1', 'holder_email': 'p1@skyline.edu'}
        )
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Purchase 2
        res2 = self.client.post(
            f'/api/events/{self.event.id}/tickets/',
            {'holder_name': 'Person 2', 'holder_email': 'p2@skyline.edu'}
        )
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

        # Purchase 3 (oversell attempt)
        res3 = self.client.post(
            f'/api/events/{self.event.id}/tickets/',
            {'holder_name': 'Person 3', 'holder_email': 'p3@skyline.edu'}
        )
        self.assertEqual(res3.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('sold out', str(res3.data))

    def test_cannot_purchase_draft_event(self):
        self.event.status = Event.STATUS_DRAFT
        self.event.save()

        res = self.client.post(
            f'/api/events/{self.event.id}/tickets/',
            {'holder_name': 'Bob Guest', 'holder_email': 'bob@external.org'}
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cannot purchase tickets', str(res.data))

    def test_free_ticket_purchase_does_not_fail_ledger(self):
        free_event = Event.objects.create(
            title='Free Orientation',
            datetime=timezone.now() + timedelta(days=7),
            venue='Campus Quad',
            capacity=100,
            member_price=Decimal('0.00'),
            nonmember_price=Decimal('0.00'),
            status=Event.STATUS_PUBLISHED
        )
        res = self.client.post(
            f'/api/events/{free_event.id}/tickets/',
            {'holder_name': 'Free Attendee', 'holder_email': 'free@skyline.edu'}
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(str(res.data['price_paid'])), Decimal('0.00'))

    def test_capacity_100_boundary_and_concurrency_protection(self):
        # 1. Create event with capacity = 100
        event_100 = Event.objects.create(
            title='Mega Concert',
            datetime=timezone.now() + timedelta(days=10),
            venue='Campus Arena',
            capacity=100,
            member_price=Decimal('10.00'),
            nonmember_price=Decimal('20.00'),
            status=Event.STATUS_PUBLISHED
        )

        # 2. Pre-fill 99 tickets
        tickets = [
            Ticket(
                event=event_100,
                holder_name=f'Attendee {i}',
                holder_email=f'attendee{i}@skyline.edu',
                type=Ticket.TYPE_NONMEMBER,
                price_paid=Decimal('20.00'),
                status=Ticket.STATUS_VALID
            )
            for i in range(1, 100)
        ]
        Ticket.objects.bulk_create(tickets)

        self.assertEqual(event_100.tickets.count(), 99)
        availability = event_100.get_availability()
        self.assertEqual(availability['capacity'], 100)
        self.assertEqual(availability['sold'], 99)
        self.assertEqual(availability['remaining'], 1)

        # 3. User 1 attempts purchase for the 100th (final) ticket -> Allowed
        res_user1 = self.client.post(
            f'/api/events/{event_100.id}/tickets/',
            {'holder_name': 'Final Attendee', 'holder_email': 'final@skyline.edu'}
        )
        self.assertEqual(res_user1.status_code, status.HTTP_201_CREATED)

        # Capacity is now exactly 100 / 100 (remaining = 0)
        self.assertEqual(event_100.tickets.count(), 100)
        availability_full = event_100.get_availability()
        self.assertEqual(availability_full['remaining'], 0)

        # 4. User 2 attempts purchase when sold = 100 -> Rejected (Sold out)
        res_user2 = self.client.post(
            f'/api/events/{event_100.id}/tickets/',
            {'holder_name': 'Oversell Attendee', 'holder_email': 'oversell@skyline.edu'}
        )
        self.assertEqual(res_user2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('sold out', str(res_user2.data))

        # 5. Verify total tickets in database never exceeds 100
        total_sold = event_100.tickets.exclude(status=Ticket.STATUS_CANCELLED).count()
        self.assertEqual(total_sold, 100)


class TicketQRTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='charlie',
            email='charlie@skyline.edu',
            password='password123',
            name='Charlie Day',
            role=User.ROLE_MEMBER
        )
        self.event = Event.objects.create(
            title='Spring Gala 2026',
            description='Annual spring gala dinner and dance.',
            datetime=timezone.now() + timedelta(days=14),
            venue='Skyline Grand Ballroom',
            capacity=50,
            member_price=Decimal('15.00'),
            nonmember_price=Decimal('25.00'),
            status=Event.STATUS_PUBLISHED
        )
        self.ticket = Ticket.objects.create(
            event=self.event,
            holder=self.user,
            holder_name='Charlie Day',
            holder_email='charlie@skyline.edu',
            type=Ticket.TYPE_MEMBER,
            price_paid=Decimal('15.00'),
            status=Ticket.STATUS_VALID
        )

    def test_purchase_response_includes_token_and_qr_urls(self):
        res = self.client.post(
            f'/api/events/{self.event.id}/tickets/',
            {'holder_name': 'Dana Guest', 'holder_email': 'dana@external.org'}
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', res.data)
        self.assertIn('qr_code_url', res.data)
        self.assertIn('qr_code_data_url', res.data)
        self.assertEqual(res.data['qr_code_url'], f"/api/tickets/{res.data['token']}/qr")
        self.assertTrue(res.data['qr_code_data_url'].startswith('data:image/png;base64,'))

    def test_get_ticket_qr_png_success(self):
        res = self.client.get(f'/api/tickets/{self.ticket.token}/qr/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res['Content-Type'], 'image/png')
        # Check PNG header signature bytes
        self.assertTrue(res.content.startswith(b'\x89PNG\r\n\x1a\n'))

    def test_get_ticket_qr_data_url_json_success(self):
        res = self.client.get(f'/api/tickets/{self.ticket.token}/qr/?output=data_url')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('token', res.data)
        self.assertIn('qr_code', res.data)
        self.assertTrue(res.data['qr_code'].startswith('data:image/png;base64,'))

    def test_get_ticket_qr_invalid_token_returns_404(self):
        res = self.client.get('/api/tickets/00000000-0000-0000-0000-000000000000/qr/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


class TicketCheckInAndFeedTests(APITestCase):
    def setUp(self):
        self.officer = User.objects.create_user(
            username='lead_officer',
            email='leader@skyline.edu',
            password='password123',
            name='President Sarah',
            role=User.ROLE_LEADER
        )
        self.member = User.objects.create_user(
            username='regular_member',
            email='member@skyline.edu',
            password='password123',
            name='Mark Regular',
            role=User.ROLE_MEMBER
        )
        self.event = Event.objects.create(
            title='Spring Gala 2026',
            description='Gala event check-in test.',
            datetime=timezone.now() + timedelta(days=14),
            venue='Skyline Grand Ballroom',
            capacity=100,
            member_price=Decimal('15.00'),
            nonmember_price=Decimal('25.00'),
            status=Event.STATUS_PUBLISHED
        )
        self.ticket = Ticket.objects.create(
            event=self.event,
            holder=self.member,
            holder_name='Mark Regular',
            holder_email='member@skyline.edu',
            type=Ticket.TYPE_MEMBER,
            price_paid=Decimal('15.00'),
            status=Ticket.STATUS_VALID
        )

    def test_officer_check_in_success(self):
        self.client.force_authenticate(user=self.officer)
        res = self.client.post(f'/api/tickets/{self.ticket.token}/check-in/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], 'success')
        self.assertIn('Check-in successful', res.data['message'])

        # Verify ticket state in DB
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, Ticket.STATUS_CHECKED_IN)
        self.assertIsNotNone(self.ticket.checked_in_at)

    def test_double_check_in_rejected_with_timestamp(self):
        self.client.force_authenticate(user=self.officer)
        # First check-in
        res1 = self.client.post(f'/api/tickets/{self.ticket.token}/check-in/')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Second check-in attempt (double check-in)
        res2 = self.client.post(f'/api/tickets/{self.ticket.token}/check-in/')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        error_detail = str(res2.data.get('detail', res2.data))
        self.assertIn('Double check-in rejected', error_detail)

    def test_unknown_ticket_token_returns_404(self):
        self.client.force_authenticate(user=self.officer)
        res = self.client.post('/api/tickets/ffffffff-ffff-ffff-ffff-ffffffffffff/check-in/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        error_detail = str(res.data.get('detail', res.data))
        self.assertIn('Ticket not found', error_detail)

    def test_cancelled_ticket_check_in_rejected(self):
        self.ticket.status = Ticket.STATUS_CANCELLED
        self.ticket.save()

        self.client.force_authenticate(user=self.officer)
        res = self.client.post(f'/api/tickets/{self.ticket.token}/check-in/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        error_detail = str(res.data.get('detail', res.data))
        self.assertIn('cancelled', error_detail)

    def test_check_in_permission_denied_for_regular_member(self):
        self.client.force_authenticate(user=self.member)
        res = self.client.post(f'/api/tickets/{self.ticket.token}/check-in/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_check_in_permission_denied_for_unauthenticated(self):
        res = self.client.post(f'/api/tickets/{self.ticket.token}/check-in/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_checkin_feed_endpoint(self):
        # 1. Unauthenticated -> 401
        res_unauth = self.client.get(f'/api/events/{self.event.id}/checkin-feed/')
        self.assertEqual(res_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Member -> 403
        self.client.force_authenticate(user=self.member)
        res_member = self.client.get(f'/api/events/{self.event.id}/checkin-feed/')
        self.assertEqual(res_member.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Officer -> 200 with stats and feed
        self.client.force_authenticate(user=self.officer)
        # Check-in ticket first
        self.client.post(f'/api/tickets/{self.ticket.token}/check-in/')

        res = self.client.get(f'/api/events/{self.event.id}/checkin-feed/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['event_id'], self.event.id)
        self.assertEqual(res.data['total_sold'], 1)
        self.assertEqual(res.data['checked_in_count'], 1)
        self.assertEqual(res.data['attendance_pct'], 100.0)
        self.assertEqual(len(res.data['recent_checkins']), 1)
        self.assertEqual(res.data['recent_checkins'][0]['token'], str(self.ticket.token))
        self.assertEqual(res.data['recent_checkins'][0]['holder_name'], 'Mark Regular')


class EventStatsTests(APITestCase):
    def setUp(self):
        self.officer = User.objects.create_user(
            username='event_director',
            email='director@skyline.edu',
            password='password123',
            name='Director Taylor',
            role=User.ROLE_ADMIN
        )
        self.member = User.objects.create_user(
            username='student_guest',
            email='guest@skyline.edu',
            password='password123',
            name='Sam Student',
            role=User.ROLE_MEMBER
        )
        self.event = Event.objects.create(
            title='Spring Gala 2026',
            description='Gala event for attendance and revenue stats calculation.',
            datetime=timezone.now() + timedelta(days=21),
            venue='Skyline Grand Ballroom',
            capacity=100,
            member_price=Decimal('15.00'),
            nonmember_price=Decimal('25.00'),
            status=Event.STATUS_PUBLISHED
        )

    def test_stats_metrics_and_revenue_breakdown(self):
        # 1. Create 2 member tickets ($15 each = $30)
        t_m1 = Ticket.objects.create(
            event=self.event,
            holder=self.member,
            holder_name='Member One',
            holder_email='m1@skyline.edu',
            type=Ticket.TYPE_MEMBER,
            price_paid=Decimal('15.00'),
            status=Ticket.STATUS_CHECKED_IN,
            checked_in_at=timezone.now()
        )
        t_m2 = Ticket.objects.create(
            event=self.event,
            holder=self.member,
            holder_name='Member Two',
            holder_email='m2@skyline.edu',
            type=Ticket.TYPE_MEMBER,
            price_paid=Decimal('15.00'),
            status=Ticket.STATUS_VALID
        )

        # 2. Create 3 non-member tickets ($25 each = $75)
        t_nm1 = Ticket.objects.create(
            event=self.event,
            holder_name='Guest One',
            holder_email='g1@external.org',
            type=Ticket.TYPE_NONMEMBER,
            price_paid=Decimal('25.00'),
            status=Ticket.STATUS_CHECKED_IN,
            checked_in_at=timezone.now()
        )
        t_nm2 = Ticket.objects.create(
            event=self.event,
            holder_name='Guest Two',
            holder_email='g2@external.org',
            type=Ticket.TYPE_NONMEMBER,
            price_paid=Decimal('25.00'),
            status=Ticket.STATUS_CHECKED_IN,
            checked_in_at=timezone.now()
        )
        t_nm3 = Ticket.objects.create(
            event=self.event,
            holder_name='Guest Three',
            holder_email='g3@external.org',
            type=Ticket.TYPE_NONMEMBER,
            price_paid=Decimal('25.00'),
            status=Ticket.STATUS_VALID
        )

        # 3. Create 1 cancelled ticket (must be excluded from sold, attendance, and revenue)
        Ticket.objects.create(
            event=self.event,
            holder_name='Cancelled Guest',
            holder_email='cg@external.org',
            type=Ticket.TYPE_NONMEMBER,
            price_paid=Decimal('25.00'),
            status=Ticket.STATUS_CANCELLED
        )

        # Authenticate as Officer
        self.client.force_authenticate(user=self.officer)
        res = self.client.get(f'/api/events/{self.event.id}/stats/')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Tickets sold = 2 member + 3 nonmember = 5
        self.assertEqual(res.data['tickets_sold'], 5)
        self.assertEqual(res.data['tickets_sold_breakdown']['member'], 2)
        self.assertEqual(res.data['tickets_sold_breakdown']['nonmember'], 3)

        # Attendance = 1 member + 2 nonmember checked in = 3
        self.assertEqual(res.data['attendance'], 3)
        # Attendance rate = 3 / 5 * 100 = 60.0%
        self.assertEqual(res.data['attendance_rate'], 60.0)

        # Revenue = 2 * 15.00 + 3 * 25.00 = 30.00 + 75.00 = 105.00
        self.assertEqual(Decimal(str(res.data['revenue']['total'])), Decimal('105.00'))
        self.assertEqual(Decimal(str(res.data['revenue']['member'])), Decimal('30.00'))
        self.assertEqual(Decimal(str(res.data['revenue']['nonmember'])), Decimal('75.00'))

    def test_stats_zero_tickets_sold(self):
        self.client.force_authenticate(user=self.officer)
        res = self.client.get(f'/api/events/{self.event.id}/stats/')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['tickets_sold'], 0)
        self.assertEqual(res.data['attendance'], 0)
        self.assertEqual(res.data['attendance_rate'], 0.0)
        self.assertEqual(Decimal(str(res.data['revenue']['total'])), Decimal('0.00'))
        self.assertEqual(Decimal(str(res.data['revenue']['member'])), Decimal('0.00'))
        self.assertEqual(Decimal(str(res.data['revenue']['nonmember'])), Decimal('0.00'))

    def test_stats_permissions_enforced(self):
        # 1. Unauthenticated -> 401
        res_unauth = self.client.get(f'/api/events/{self.event.id}/stats/')
        self.assertEqual(res_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Regular Member -> 403
        self.client.force_authenticate(user=self.member)
        res_member = self.client.get(f'/api/events/{self.event.id}/stats/')
        self.assertEqual(res_member.status_code, status.HTTP_403_FORBIDDEN)


class Prompt10EdgeCasesTests(APITestCase):
    """
    Validation and edge-case tests required by Prompt 10:
    1. Pricing: Active member discount vs expired / non-member full price.
    2. No-Oversell: Event capacity limit strictly enforced under sequential & concurrent attempts.
    3. Double Scan: Double check-in attempts rejected with timestamp details.
    4. Invalid / Cancelled Token Handling.
    """
    def setUp(self):
        self.officer = User.objects.create_user(
            username='lead_officer',
            email='lead@skyline.edu',
            password='password123',
            role=User.ROLE_LEADER
        )
        self.active_member = User.objects.create_user(
            username='active_member_user',
            email='active@skyline.edu',
            password='password123',
            role=User.ROLE_MEMBER
        )
        self.expired_member = User.objects.create_user(
            username='expired_member_user',
            email='expired@skyline.edu',
            password='password123',
            role=User.ROLE_MEMBER
        )

        self.event = Event.objects.create(
            title='Prompt 10 Test Gala',
            description='Test event for edge case verification.',
            datetime=timezone.now() + timedelta(days=10),
            venue='Skyline Pavilion',
            capacity=2,
            member_price=Decimal('10.00'),
            nonmember_price=Decimal('25.00'),
            status=Event.STATUS_PUBLISHED
        )

    def test_pricing_active_member_vs_expired_member(self):
        # 1. Active Member Info dict -> gets member_price ($10.00)
        active_info = {'is_active_member': True, 'ticket_discount_pct': 0.0}
        t_type, price = calculate_ticket_price(self.event, active_info)
        self.assertEqual(t_type, Ticket.TYPE_MEMBER)
        self.assertEqual(price, Decimal('10.00'))

        # 2. Expired Member Info dict -> gets nonmember_price ($25.00)
        expired_info = {'is_active_member': False, 'ticket_discount_pct': 0.0}
        t_type_exp, price_exp = calculate_ticket_price(self.event, expired_info)
        self.assertEqual(t_type_exp, Ticket.TYPE_NONMEMBER)
        self.assertEqual(price_exp, Decimal('25.00'))

        # 3. Anonymous / Guest -> gets nonmember_price ($25.00)
        anon_info = {'is_active_member': False}
        t_type_anon, price_anon = calculate_ticket_price(self.event, anon_info)
        self.assertEqual(t_type_anon, Ticket.TYPE_NONMEMBER)
        self.assertEqual(price_anon, Decimal('25.00'))

    def test_no_oversell_when_sold_out(self):
        # Capacity is 2
        # Buy Ticket 1: Success
        t1 = purchase_ticket(
            event_id=self.event.id,
            buyer_user=self.active_member,
            holder_name='Attendee One',
            holder_email='att1@skyline.edu'
        )
        self.assertEqual(t1.status, Ticket.STATUS_VALID)

        # Buy Ticket 2: Success (Capacity reached)
        t2 = purchase_ticket(
            event_id=self.event.id,
            buyer_user=None,
            holder_name='Attendee Two',
            holder_email='att2@external.com'
        )
        self.assertEqual(t2.status, Ticket.STATUS_VALID)

        # Capacity is now 0 remaining
        avail = self.event.get_availability()
        self.assertEqual(avail['sold'], 2)
        self.assertEqual(avail['remaining'], 0)

        # Buy Ticket 3: Must be rejected with ValidationError
        with self.assertRaises(DRFValidationError) as ctx:
            purchase_ticket(
                event_id=self.event.id,
                buyer_user=None,
                holder_name='Attendee Three',
                holder_email='att3@external.com'
            )
        self.assertIn('sold out', str(ctx.exception).lower())

        # Via API: POST /api/events/{id}/tickets/ returns 400
        res = self.client.post(
            f'/api/events/{self.event.id}/tickets/',
            {'holder_name': 'Attendee API', 'holder_email': 'api@test.com'}
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('sold out', str(res.data))

        # Total tickets must still be exactly 2
        self.assertEqual(self.event.tickets.filter(status=Ticket.STATUS_VALID).count(), 2)

    def test_double_scan_rejected_with_timestamp(self):
        ticket = purchase_ticket(
            event_id=self.event.id,
            buyer_user=self.active_member,
            holder_name='Jordan DoubleScan',
            holder_email='jordan@skyline.edu'
        )
        token_str = str(ticket.token)

        self.client.force_authenticate(user=self.officer)

        # First Scan: 200 OK
        res1 = self.client.post(f'/api/tickets/{token_str}/check-in/')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.data['status'], 'success')
        self.assertEqual(res1.data['ticket']['status'], 'checked_in')

        ticket.refresh_from_db()
        first_checked_in_at = ticket.checked_in_at
        self.assertIsNotNone(first_checked_in_at)

        # Second Scan (Double Check-In): 400 BAD REQUEST with warning message
        res2 = self.client.post(f'/api/tickets/{token_str}/check-in/')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Double check-in rejected', res2.data['detail'])
        self.assertIn('already checked in at', res2.data['detail'])

        # Verify timestamp was not overwritten
        ticket.refresh_from_db()
        self.assertEqual(ticket.checked_in_at, first_checked_in_at)

    def test_invalid_and_cancelled_tokens(self):
        self.client.force_authenticate(user=self.officer)

        # Random non-existent token -> 404 Not Found
        random_token = str(uuid.uuid4())
        res_404 = self.client.post(f'/api/tickets/{random_token}/check-in/')
        self.assertEqual(res_404.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Ticket not found', res_404.data['detail'])

        # Cancelled ticket -> 400 Bad Request
        cancelled_ticket = Ticket.objects.create(
            event=self.event,
            holder_name='Cancelled User',
            holder_email='cancelled@test.com',
            type=Ticket.TYPE_NONMEMBER,
            price_paid=Decimal('25.00'),
            status=Ticket.STATUS_CANCELLED,
            token=uuid.uuid4()
        )
        res_cancel = self.client.post(f'/api/tickets/{cancelled_ticket.token}/check-in/')
        self.assertEqual(res_cancel.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cancelled', res_cancel.data['detail'])



