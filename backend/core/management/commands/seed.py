from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from accounts.models import Membership, MembershipTier
from events.models import Event, Ticket
from merch.models import Product, Variant, Order
from comms.models import Announcement
from tasks.models import Fundraiser, Task
from finance.services import record_transaction

User = get_user_model()


class Command(BaseCommand):
    help = "Load demo data: users, tiers, events, merch, announcements, fundraiser, finance."

    def handle(self, *args, **options):
        self.stdout.write("Seeding Skyline demo data...")

        # --- Users & roles ---
        admin, created = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@skyline.club", "role": "treasurer",
                      "is_staff": True, "is_superuser": True,
                      "first_name": "Ada", "last_name": "Treasurer"},
        )
        if created:
            admin.set_password("admin123")
            admin.save()

        officer, _ = User.objects.get_or_create(
            username="officer",
            defaults={"email": "officer@skyline.club", "role": "officer",
                      "first_name": "Omar", "last_name": "Officer"},
        )
        officer.set_password("officer123"); officer.save()

        tier_std, _ = MembershipTier.objects.get_or_create(
            name="Standard",
            defaults={"price": Decimal("300"), "ticket_discount_percent": 20,
                      "merch_discount_percent": 10,
                      "description": "Core membership with event & merch discounts."},
        )
        tier_prem, _ = MembershipTier.objects.get_or_create(
            name="Premium",
            defaults={"price": Decimal("600"), "ticket_discount_percent": 40,
                      "merch_discount_percent": 20,
                      "description": "Bigger discounts and priority access."},
        )

        # --- Members ---
        members = []
        sample = [
            ("alex", "Alex", "Morgan", tier_prem, True, "alex@skyline.edu"),
            ("riya", "Riya", "Shah", tier_prem, True, "riya@skyline.club"),
            ("kabir", "Kabir", "Mehta", tier_prem, True, "kabir@skyline.club"),
            ("ananya", "Ananya", "Rao", tier_std, False, "ananya@skyline.club"),
            ("vihaan", "Vihaan", "Patel", None, False, "vihaan@skyline.club"),
        ]
        for item in sample:
            uname, fn, ln, tier, paid = item[0], item[1], item[2], item[3], item[4]
            email = item[5] if len(item) > 5 else f"{uname}@skyline.club"
            u, created = User.objects.get_or_create(
                username=uname,
                defaults={"email": email, "role": "member",
                          "first_name": fn, "last_name": ln},
            )
            if created or not u.check_password("member123"):
                u.set_password("member123")
                u.save()
            m, _ = Membership.objects.get_or_create(user=u, defaults={"tier": tier})
            m.tier = tier
            if paid:
                m.activate(months=12)
                record_transaction(
                    amount=tier.price if tier else 0, direction="in",
                    category="dues", description=f"Membership dues · {uname}", member=u,
                )
            else:
                m.save()
            members.append(u)

        # make vihaan a volunteer for task assignment
        volunteer = members[4]
        volunteer.role = "volunteer"; volunteer.save()

        # --- Events ---
        event1, _ = Event.objects.get_or_create(
            title="Skyline Social: Open Mic",
            defaults={
                "description": "Live student performances, poetry, and acoustic sets at the amphitheatre.",
                "location": "The Quad Amphitheatre",
                "starts_at": timezone.now() + timedelta(days=15),
                "capacity": 100,
                "price_member": Decimal("180"),
                "price_non_member": Decimal("250"),
            },
        )
        event2, _ = Event.objects.get_or_create(
            title="Designing for Tomorrow",
            defaults={
                "description": "Collaborative design sprint and workshop hosted by alumni designers.",
                "location": "Innovation Lab 02",
                "starts_at": timezone.now() + timedelta(days=21),
                "capacity": 45,
                "price_member": Decimal("0"),
                "price_non_member": Decimal("0"),
            },
        )
        event3, _ = Event.objects.get_or_create(
            title="Campus Night Run",
            defaults={
                "description": "5K evening community jog around campus with neon gear and refreshments.",
                "location": "North Gate",
                "starts_at": timezone.now() + timedelta(days=29),
                "capacity": 250,
                "price_member": Decimal("120"),
                "price_non_member": Decimal("200"),
            },
        )

        if event1.tickets.count() == 0:
            for u in members[:3]:
                m = getattr(u, "membership", None)
                is_member = bool(m and m.is_valid)
                price = event1.price_member if is_member else event1.price_non_member
                Ticket.objects.create(
                    event=event1, holder=u,
                    holder_name=u.get_full_name(), holder_email=u.email,
                    price_paid=price, is_member_price=is_member,
                )
                record_transaction(
                    amount=price, direction="in", category="ticket",
                    description=f"Ticket · {event1.title} · {u.username}", member=u,
                )

        # --- Merch ---
        jacket, created = Product.objects.get_or_create(
            name="Skyline Varsity Jacket",
            defaults={"description": "Classic heavyweight collegiate varsity jacket with premium leather sleeves.", "price": Decimal("1299")},
        )
        if created:
            for size, stock in [("S", 12), ("M", 20), ("L", 15), ("XL", 8)]:
                Variant.objects.create(product=jacket, size=size, stock=stock)

        tee, created = Product.objects.get_or_create(
            name="Everyday Campus Tee",
            defaults={"description": "Super-soft combed organic cotton daily club tee in signature colors.", "price": Decimal("499")},
        )
        if created:
            for size, stock in [("S", 25), ("M", 35), ("L", 30), ("XL", 15)]:
                Variant.objects.create(product=tee, size=size, stock=stock)

        tote, created = Product.objects.get_or_create(
            name="Canvas Field Tote",
            defaults={"description": "Heavy duty natural cotton canvas tote bag with reinforced handles.", "price": Decimal("349")},
        )
        if created:
            Variant.objects.create(product=tote, size="Standard", stock=45)

        bottle, created = Product.objects.get_or_create(
            name="Steel Water Bottle",
            defaults={"description": "Double-wall vacuum insulated stainless steel water bottle in matte finish.", "price": Decimal("599")},
        )
        if created:
            Variant.objects.create(product=bottle, size="750ml", stock=30)

        # --- Announcements ---
        announcements_data = [
            ("Volunteer briefing moved to 5:30 PM", "The operational sync for this weekend's setup has been moved up by 30 minutes to Innovation Hall room 104.", "urgent"),
            ("Open Mic sign-ups are now live", "Performer slots for this Friday's Skyline Social are now open. First 12 entries get guaranteed stage time.", "event"),
            ("Spring membership renewal window", "Early bird renewals for the 2026/27 academic year are now unlocked for all tier levels with locked-in discount perks.", "general"),
        ]
        for title, body, cat in announcements_data:
            Announcement.objects.get_or_create(
                title=title,
                defaults={"body": body, "author": officer},
            )

        # --- Fundraiser + tasks ---
        bake, created = Fundraiser.objects.get_or_create(
            name="Campus Tech Gala Fundraiser",
            defaults={"description": "Raising capital for new collaborative workshop spaces.",
                      "goal_amount": Decimal("50000"),
                      "raised_amount": Decimal("42860"),
                      "event_date": (timezone.now() + timedelta(days=12)).date()},
        )
        if created:
            Task.objects.create(fundraiser=bake, title="Organize stage equipment",
                                assignee=volunteer, status="done")
            Task.objects.create(fundraiser=bake, title="Confirm catering vendor",
                                assignee=members[0], status="in_progress")
            Task.objects.create(fundraiser=bake, title="Design entrance signage",
                                assignee=members[1], status="todo")
            record_transaction(
                amount=Decimal("42860"), direction="in", category="fundraiser",
                description="Campus Tech Gala proceeds",
            )

        self.stdout.write(self.style.SUCCESS("Done! Demo data loaded."))
        self.stdout.write("Logins (password in parentheses):")
        self.stdout.write("  admin / admin123        (treasurer + Django admin)")
        self.stdout.write("  officer / officer123    (officer)")
        self.stdout.write("  riya / member123        (active member)")
        self.stdout.write("  vihaan / member123      (volunteer)")
