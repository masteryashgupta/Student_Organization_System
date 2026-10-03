import uuid
from decimal import Decimal
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from events.models import Event, Ticket

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds initial sample events and tiered tickets with check-in records idempotently."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("--- Seeding Events & Tickets (Idempotent) ---"))

        # 1. Fetch or create reference users
        admin_user = User.objects.filter(role=User.ROLE_ADMIN).first()
        if not admin_user:
            admin_user = User.objects.create_user(
                username="event_admin",
                email="admin@skyline.edu",
                password="password123",
                name="Gala Administrator",
                role=User.ROLE_ADMIN
            )

        member_user = User.objects.filter(role=User.ROLE_MEMBER).first()
        if not member_user:
            member_user = User.objects.create_user(
                username="student_member",
                email="student@skyline.edu",
                password="password123",
                name="Jordan Member",
                role=User.ROLE_MEMBER
            )

        now = timezone.now()

        # 2. Seed Events
        events_data = [
            {
                "title": "Annual Skyline Leadership Gala 2026",
                "description": "The flagship annual evening celebration honoring student leaders, faculty advisors, and society alumni. Features formal dinner banquet, live music, keynote awards, and networking.",
                "datetime": now + timedelta(days=14, hours=3),
                "venue": "Skyline Grand Ballroom & Terrace",
                "capacity": 150,
                "member_price": Decimal("15.00"),
                "nonmember_price": Decimal("30.00"),
                "status": Event.STATUS_PUBLISHED,
            },
            {
                "title": "Spring Tech & AI Hackathon Showcase",
                "description": "36-hour weekend innovation sprint building open-source AI solutions for campus sustainability. Includes workshops, sponsor mentor sessions, catering, and demo day pitching.",
                "datetime": now + timedelta(days=28, hours=1),
                "venue": "Engineering Innovation Hub & Lab 4",
                "capacity": 80,
                "member_price": Decimal("0.00"),
                "nonmember_price": Decimal("15.00"),
                "status": Event.STATUS_PUBLISHED,
            },
            {
                "title": "Alumni Networking Mixer & Banquet",
                "description": "Exclusive networking evening connecting graduating seniors with industry mentors, startup founders, and engineering alumni.",
                "datetime": now + timedelta(days=3),
                "venue": "Skyline Faculty Club Lounge",
                "capacity": 50,
                "member_price": Decimal("10.00"),
                "nonmember_price": Decimal("20.00"),
                "status": Event.STATUS_CLOSED,
            },
            {
                "title": "Winter Semester Orientation & Welcome Fair",
                "description": "Informational club orientation for incoming exchange and transfer students. Meet committee heads, learn about project teams, and enjoy free refreshments.",
                "datetime": now + timedelta(days=45),
                "venue": "Student Union Multi-Purpose Hall",
                "capacity": 200,
                "member_price": Decimal("0.00"),
                "nonmember_price": Decimal("5.00"),
                "status": Event.STATUS_PUBLISHED,
            },
        ]

        created_events = {}
        for ed in events_data:
            event, created = Event.objects.get_or_create(
                title=ed["title"],
                defaults={
                    "description": ed["description"],
                    "datetime": ed["datetime"],
                    "venue": ed["venue"],
                    "capacity": ed["capacity"],
                    "member_price": ed["member_price"],
                    "nonmember_price": ed["nonmember_price"],
                    "status": ed["status"],
                }
            )
            created_events[event.title] = event
            status_text = "Created" if created else "Existing"
            self.stdout.write(f"  [{status_text}] Event: {event.title} (Cap: {event.capacity})")

        # 3. Seed Tickets for Gala
        gala = created_events.get("Annual Skyline Leadership Gala 2026")
        if gala:
            sample_tickets = [
                # Checked-in Member Tickets
                {
                    "holder_name": "Jordan Member",
                    "holder_email": "student@skyline.edu",
                    "holder": member_user,
                    "type": Ticket.TYPE_MEMBER,
                    "price_paid": Decimal("15.00"),
                    "status": Ticket.STATUS_CHECKED_IN,
                    "checked_in_at": now - timedelta(hours=1, minutes=20),
                },
                {
                    "holder_name": "Maya Lin",
                    "holder_email": "maya.lin@skyline.edu",
                    "holder": None,
                    "type": Ticket.TYPE_MEMBER,
                    "price_paid": Decimal("15.00"),
                    "status": Ticket.STATUS_CHECKED_IN,
                    "checked_in_at": now - timedelta(minutes=45),
                },
                {
                    "holder_name": "Alex Chen",
                    "holder_email": "alex.chen@skyline.edu",
                    "holder": None,
                    "type": Ticket.TYPE_MEMBER,
                    "price_paid": Decimal("15.00"),
                    "status": Ticket.STATUS_CHECKED_IN,
                    "checked_in_at": now - timedelta(minutes=15),
                },
                # Valid (Pending) Member Tickets
                {
                    "holder_name": "Taylor Swift",
                    "holder_email": "taylor.s@skyline.edu",
                    "holder": None,
                    "type": Ticket.TYPE_MEMBER,
                    "price_paid": Decimal("15.00"),
                    "status": Ticket.STATUS_VALID,
                    "checked_in_at": None,
                },
                {
                    "holder_name": "Liam Vance",
                    "holder_email": "liam.v@skyline.edu",
                    "holder": None,
                    "type": Ticket.TYPE_MEMBER,
                    "price_paid": Decimal("15.00"),
                    "status": Ticket.STATUS_VALID,
                    "checked_in_at": None,
                },
                # Checked-in Non-Member Guests
                {
                    "holder_name": "Dr. Robert Frost",
                    "holder_email": "rfrost@partner-corp.com",
                    "holder": None,
                    "type": Ticket.TYPE_NONMEMBER,
                    "price_paid": Decimal("30.00"),
                    "status": Ticket.STATUS_CHECKED_IN,
                    "checked_in_at": now - timedelta(minutes=50),
                },
                {
                    "holder_name": "Elena Rostova",
                    "holder_email": "elena.r@tech-foundation.org",
                    "holder": None,
                    "type": Ticket.TYPE_NONMEMBER,
                    "price_paid": Decimal("30.00"),
                    "status": Ticket.STATUS_CHECKED_IN,
                    "checked_in_at": now - timedelta(minutes=30),
                },
                # Valid Non-Member Tickets
                {
                    "holder_name": "Marcus Aurelius",
                    "holder_email": "marcus@philosophy.org",
                    "holder": None,
                    "type": Ticket.TYPE_NONMEMBER,
                    "price_paid": Decimal("30.00"),
                    "status": Ticket.STATUS_VALID,
                    "checked_in_at": None,
                },
                {
                    "holder_name": "Sophia Patel",
                    "holder_email": "spatel@metro-news.com",
                    "holder": None,
                    "type": Ticket.TYPE_NONMEMBER,
                    "price_paid": Decimal("30.00"),
                    "status": Ticket.STATUS_VALID,
                    "checked_in_at": None,
                },
                # Cancelled Ticket
                {
                    "holder_name": "Ghost Attendee",
                    "holder_email": "ghost@cancelled.com",
                    "holder": None,
                    "type": Ticket.TYPE_NONMEMBER,
                    "price_paid": Decimal("30.00"),
                    "status": Ticket.STATUS_CANCELLED,
                    "checked_in_at": None,
                },
            ]

            for t_data in sample_tickets:
                ticket, t_created = Ticket.objects.get_or_create(
                    event=gala,
                    holder_email=t_data["holder_email"],
                    defaults={
                        "holder": t_data["holder"],
                        "holder_name": t_data["holder_name"],
                        "type": t_data["type"],
                        "price_paid": t_data["price_paid"],
                        "status": t_data["status"],
                        "checked_in_at": t_data["checked_in_at"],
                        "token": uuid.uuid4(),
                    }
                )
                t_status = "Created" if t_created else "Existing"
                self.stdout.write(f"    [{t_status}] Ticket: {ticket.holder_name} ({ticket.type}, {ticket.status})")

        # 4. Seed Tickets for Completed Mixer (All Checked In)
        mixer = created_events.get("Alumni Networking Mixer & Banquet")
        if mixer:
            mixer_tickets = [
                ("Arthur Dent", "adent@galaxy.net", Ticket.TYPE_NONMEMBER, Decimal("20.00")),
                ("Ford Prefect", "ford@galaxy.net", Ticket.TYPE_MEMBER, Decimal("10.00")),
                ("Trillian Astra", "trillian@galaxy.net", Ticket.TYPE_MEMBER, Decimal("10.00")),
            ]
            for name, email, t_type, price in mixer_tickets:
                Ticket.objects.get_or_create(
                    event=mixer,
                    holder_email=email,
                    defaults={
                        "holder_name": name,
                        "type": t_type,
                        "price_paid": price,
                        "status": Ticket.STATUS_CHECKED_IN,
                        "checked_in_at": now - timedelta(days=5, hours=2),
                        "token": uuid.uuid4(),
                    }
                )

        self.stdout.write(self.style.SUCCESS("✓ Successfully seeded events and tiered tickets!"))
