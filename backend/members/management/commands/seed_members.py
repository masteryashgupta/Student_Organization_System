import uuid
from decimal import Decimal
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from members.models import MembershipTier, Membership
from core.models import Transaction

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds initial membership tiers and sample members idempotently (safe for shared DB)."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("--- Seeding Membership Tiers & Members (Idempotent) ---"))

        # 1. Seed Tiers
        tier_data = [
            {
                "name": "Bronze Student Tier",
                "description": "Standard annual membership with core club access, newsletter, and event discounts.",
                "price": Decimal("25.00"),
                "duration_days": 365,
                "ticket_discount_pct": Decimal("5.00"),
                "merch_discount_pct": Decimal("5.00"),
                "is_active": True,
            },
            {
                "name": "Silver Scholar Tier",
                "description": "Enhanced annual membership with higher event discounts, workshop priority, and free merch sticker pack.",
                "price": Decimal("50.00"),
                "duration_days": 365,
                "ticket_discount_pct": Decimal("15.00"),
                "merch_discount_pct": Decimal("10.00"),
                "is_active": True,
            },
            {
                "name": "Gold VIP Executive Tier",
                "description": "Premium VIP membership with maximum ticket discounts, exclusive executive dinners, and annual swag bundle.",
                "price": Decimal("100.00"),
                "duration_days": 365,
                "ticket_discount_pct": Decimal("25.00"),
                "merch_discount_pct": Decimal("20.00"),
                "is_active": True,
            },
            {
                "name": "Semester Pass",
                "description": "Short-term pass designed for exchange and single-term students (120 days).",
                "price": Decimal("30.00"),
                "duration_days": 120,
                "ticket_discount_pct": Decimal("10.00"),
                "merch_discount_pct": Decimal("5.00"),
                "is_active": True,
            },
        ]

        tiers = {}
        for td in tier_data:
            name = td.pop("name")
            tier, created = MembershipTier.objects.get_or_create(name=name, defaults=td)
            if not created:
                for k, v in td.items():
                    setattr(tier, k, v)
                tier.save()
            tiers[name] = tier
            status_str = "Created" if created else "Updated"
            self.stdout.write(f"  [Tier] {status_str}: {tier.name} (${tier.price})")

        # 2. Seed Users & Memberships
        today = timezone.now().date()
        users_data = [
            {
                "username": "admin@skyline.edu",
                "email": "admin@skyline.edu",
                "name": "Sarah Jenkins",
                "phone": "555-0101",
                "role": User.ROLE_ADMIN,
                "tier_name": "Gold VIP Executive Tier",
                "status": Membership.STATUS_ACTIVE,
                "dues_paid": True,
                "start_delta": -60,
                "end_delta": 305,
            },
            {
                "username": "leader@skyline.edu",
                "email": "leader@skyline.edu",
                "name": "Marcus Chen",
                "phone": "555-0102",
                "role": User.ROLE_LEADER,
                "tier_name": "Gold VIP Executive Tier",
                "status": Membership.STATUS_ACTIVE,
                "dues_paid": True,
                "start_delta": -45,
                "end_delta": 320,
            },
            {
                "username": "jordan.lee@skyline.edu",
                "email": "jordan.lee@skyline.edu",
                "name": "Jordan Lee",
                "phone": "555-0103",
                "role": User.ROLE_MEMBER,
                "tier_name": "Gold VIP Executive Tier",
                "status": Membership.STATUS_ACTIVE,
                "dues_paid": True,
                "start_delta": -30,
                "end_delta": 335,
            },
            {
                "username": "maya.patel@skyline.edu",
                "email": "maya.patel@skyline.edu",
                "name": "Maya Patel",
                "phone": "555-0104",
                "role": User.ROLE_MEMBER,
                "tier_name": "Silver Scholar Tier",
                "status": Membership.STATUS_ACTIVE,
                "dues_paid": True,
                "start_delta": -120,
                "end_delta": 245,
            },
            {
                "username": "sam.taylor@skyline.edu",
                "email": "sam.taylor@skyline.edu",
                "name": "Sam Taylor",
                "phone": "555-0105",
                "role": User.ROLE_MEMBER,
                "tier_name": "Silver Scholar Tier",
                "status": Membership.STATUS_ACTIVE,
                "dues_paid": True,
                "start_delta": -355,
                "end_delta": 10,  # Expiring in 10 days
            },
            {
                "username": "alex.rivera@skyline.edu",
                "email": "alex.rivera@skyline.edu",
                "name": "Alex Rivera",
                "phone": "555-0106",
                "role": User.ROLE_MEMBER,
                "tier_name": "Bronze Student Tier",
                "status": Membership.STATUS_EXPIRED,
                "dues_paid": True,
                "start_delta": -400,
                "end_delta": -35,  # Expired 35 days ago
            },
            {
                "username": "chris.evans@skyline.edu",
                "email": "chris.evans@skyline.edu",
                "name": "Chris Evans",
                "phone": "555-0107",
                "role": User.ROLE_PUBLIC,
                "tier_name": "Bronze Student Tier",
                "status": Membership.STATUS_PENDING,
                "dues_paid": False,
                "start_delta": None,
                "end_delta": None,
            },
            {
                "username": "taylor.swift@skyline.edu",
                "email": "taylor.swift@skyline.edu",
                "name": "Taylor Swift",
                "phone": "555-0108",
                "role": User.ROLE_PUBLIC,
                "tier_name": None,  # No membership
                "status": None,
                "dues_paid": False,
                "start_delta": None,
                "end_delta": None,
            },
        ]

        for ud in users_data:
            email = ud["email"]
            username = ud["username"]
            role = ud["role"]
            name = ud["name"]
            phone = ud["phone"]

            user, u_created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": username,
                    "name": name,
                    "phone": phone,
                    "role": role,
                    "is_staff": role in [User.ROLE_ADMIN, User.ROLE_LEADER],
                    "is_superuser": role == User.ROLE_ADMIN,
                }
            )

            # Set default password
            if u_created:
                user.set_password("Password123!")
                user.save()
                self.stdout.write(f"  [User] Created user: {email} (Password123!)")
            else:
                user.role = role
                user.name = name
                user.phone = phone
                user.is_staff = role in [User.ROLE_ADMIN, User.ROLE_LEADER]
                user.is_superuser = role == User.ROLE_ADMIN
                user.save()

            # Create/Update membership
            tier_name = ud.get("tier_name")
            if tier_name and tier_name in tiers:
                tier = tiers[tier_name]
                start_d = today + timedelta(days=ud["start_delta"]) if ud["start_delta"] is not None else None
                end_d = today + timedelta(days=ud["end_delta"]) if ud["end_delta"] is not None else None

                mem, m_created = Membership.objects.get_or_create(
                    user=user,
                    defaults={
                        "tier": tier,
                        "status": ud["status"] or Membership.STATUS_PENDING,
                        "dues_paid": ud["dues_paid"],
                        "dues_amount_paid": tier.price if ud["dues_paid"] else Decimal("0.00"),
                        "start_date": start_d,
                        "end_date": end_d,
                        "verification_token": uuid.uuid4().hex,
                    }
                )

                if not m_created:
                    mem.tier = tier
                    mem.dues_paid = ud["dues_paid"]
                    mem.dues_amount_paid = tier.price if ud["dues_paid"] else Decimal("0.00")
                    mem.start_date = start_d
                    mem.end_date = end_d
                    if not mem.verification_token:
                        mem.verification_token = uuid.uuid4().hex
                    mem.update_computed_status()
                    mem.save()

                status_txt = "Created" if m_created else "Updated"
                self.stdout.write(f"    [Membership] {status_txt}: {user.email} -> {tier.name} ({mem.get_status_display()})")

        self.stdout.write(self.style.SUCCESS("Successfully seeded membership tiers and members!"))
