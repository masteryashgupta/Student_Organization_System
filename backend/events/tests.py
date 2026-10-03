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
from .services import get_event_availability, check_event_availability

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
