"""
seed_all.py  —  Master idempotent seed for Skyline Student Association.

Safe to re-run on the shared Supabase DB:
  * Users/tiers/memberships  → get_or_create
  * Finance transactions      → keyed by unique source string (_ensure_tx)
  * Announcements             → get_or_create on title
  * MailingListSubscribers    → get_or_create on email
  * Reimbursements            → get_or_create on (requester, description);
                                .approve()/.reject() are already idempotent

Run from project root after every wave merge:
    python manage.py seed_all
"""

import uuid
from decimal import Decimal
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from announcements.models import Announcement, MailingListSubscriber
from core.models import Transaction
from core.services import record_transaction
from finance.models import Reimbursement
from members.models import Membership, MembershipTier

User = get_user_model()


# ─── helpers ────────────────────────────────────────────────────────────────

def _ensure_tx(type_, category, amount, source, description="", date=None):
    """Create a ledger Transaction only if one with this source doesn't exist."""
    if not Transaction.objects.filter(source=source).exists():
        return record_transaction(
            type=type_,
            category=category,
            amount=Decimal(str(amount)),
            source=source,
            description=description,
            date=date,
        )
    return Transaction.objects.get(source=source)


# ─── command ────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Seeds all modules idempotently (safe for shared Supabase DB)."

    def handle(self, *args, **options):
        w = self.stdout.write
        w(self.style.NOTICE("=" * 60))
        w(self.style.NOTICE("  Skyline SA — Full Seed (Idempotent)"))
        w(self.style.NOTICE("=" * 60))

        tiers = self._seed_tiers()
        users = self._seed_users(tiers)
        self._seed_finance_transactions()
        self._seed_announcements(users)
        self._seed_subscribers(users)
        self._seed_reimbursements(users)

        w(self.style.SUCCESS("\n✓  All seeds applied successfully!"))

    # ── 1. Membership Tiers ─────────────────────────────────────────────────
    def _seed_tiers(self):
        self.stdout.write(self.style.MIGRATE_HEADING("\n[1/6] Membership Tiers"))
        specs = [
            ("Bronze Student Tier",    "25.00",  5,  5, 365),
            ("Silver Scholar Tier",    "50.00", 15, 10, 365),
            ("Gold VIP Executive Tier","100.00", 25, 20, 365),
            ("Semester Pass",          "30.00", 10,  5, 120),
        ]
        tiers = {}
        for name, price, td, md, days in specs:
            tier, created = MembershipTier.objects.get_or_create(
                name=name,
                defaults=dict(
                    price=Decimal(price),
                    ticket_discount_pct=Decimal(str(td)),
                    merch_discount_pct=Decimal(str(md)),
                    duration_days=days,
                    is_active=True,
                ),
            )
            tiers[name] = tier
            self.stdout.write(f"  [{'Created' if created else 'OK':7}] {name} (${tier.price})")
        return tiers

    # ── 2. Users & Memberships ───────────────────────────────────────────────
    def _seed_users(self, tiers):
        self.stdout.write(self.style.MIGRATE_HEADING("\n[2/6] Users & Memberships"))
        today = timezone.now().date()

        specs = [
            # email,                      name,             phone,      role,           tier_key,                 paid,  s,    e
            ("admin@skyline.edu",         "Sarah Jenkins",  "555-0101", User.ROLE_ADMIN,   "Gold VIP Executive Tier", True, -60,  305),
            ("leader@skyline.edu",        "Marcus Chen",    "555-0102", User.ROLE_LEADER,  "Gold VIP Executive Tier", True, -45,  320),
            ("jordan.lee@skyline.edu",    "Jordan Lee",     "555-0103", User.ROLE_MEMBER,  "Silver Scholar Tier",     True, -30,  335),
            ("maya.patel@skyline.edu",    "Maya Patel",     "555-0104", User.ROLE_MEMBER,  "Silver Scholar Tier",     True,-120,  245),
            ("sam.taylor@skyline.edu",    "Sam Taylor",     "555-0105", User.ROLE_MEMBER,  "Bronze Student Tier",     True,-355,   10),
            ("alex.rivera@skyline.edu",   "Alex Rivera",    "555-0106", User.ROLE_MEMBER,  "Bronze Student Tier",     True,-400,  -35),
            ("priya.sharma@skyline.edu",  "Priya Sharma",   "555-0109", User.ROLE_VOLUNTEER,"Semester Pass",          True, -10,  110),
            ("chris.evans@skyline.edu",   "Chris Evans",    "555-0107", User.ROLE_PUBLIC,  "Bronze Student Tier",    False,None, None),
        ]

        result = {}
        for email, name, phone, role, tier_key, dues_paid, s_delta, e_delta in specs:
            is_staff = role in (User.ROLE_ADMIN, User.ROLE_LEADER)
            is_super = role == User.ROLE_ADMIN

            user, created = User.objects.get_or_create(
                email=email,
                defaults=dict(
                    username=email,
                    name=name,
                    phone=phone,
                    role=role,
                    is_staff=is_staff,
                    is_superuser=is_super,
                ),
            )
            if created:
                user.set_password("Password123!")
                user.save()
                self.stdout.write(f"  [Created ] {email}  ({role})")
            else:
                user.role = role
                user.is_staff = is_staff
                user.is_superuser = is_super
                user.save(update_fields=["role", "is_staff", "is_superuser"])
                self.stdout.write(f"  [OK      ] {email}")

            result[email] = user

            if tier_key in tiers:
                tier = tiers[tier_key]
                start = today + timedelta(days=s_delta) if s_delta is not None else None
                end   = today + timedelta(days=e_delta) if e_delta is not None else None

                mem, m_created = Membership.objects.get_or_create(
                    user=user,
                    defaults=dict(
                        tier=tier,
                        dues_paid=dues_paid,
                        dues_amount_paid=tier.price if dues_paid else Decimal("0.00"),
                        start_date=start,
                        end_date=end,
                        verification_token=uuid.uuid4().hex,
                    ),
                )
                if not m_created:
                    mem.tier = tier
                    mem.dues_paid = dues_paid
                    mem.dues_amount_paid = tier.price if dues_paid else Decimal("0.00")
                    mem.start_date = start
                    mem.end_date = end
                    if not mem.verification_token:
                        mem.verification_token = uuid.uuid4().hex
                    mem.update_computed_status()
                    mem.save()

                self.stdout.write(
                    f"    ↳ [{('Created' if m_created else 'OK'):7}] "
                    f"{tier.name} — {mem.get_status_display()}"
                )

        return result

    # ── 3. Core Finance Transactions ─────────────────────────────────────────
    def _seed_finance_transactions(self):
        self.stdout.write(self.style.MIGRATE_HEADING("\n[3/6] Core Finance Transactions"))
        now = timezone.now()

        txs = [
            # Dues income
            ("income","dues",  "100.00","Seed: Dues — Gold VIP (Sarah Jenkins)",  "Annual Gold VIP dues",          -60),
            ("income","dues",  "100.00","Seed: Dues — Gold VIP (Marcus Chen)",    "Annual Gold VIP dues",          -45),
            ("income","dues",   "50.00","Seed: Dues — Silver (Jordan Lee)",       "Annual Silver Scholar dues",    -30),
            ("income","dues",   "50.00","Seed: Dues — Silver (Maya Patel)",       "Annual Silver Scholar dues",   -120),
            ("income","dues",   "25.00","Seed: Dues — Bronze (Sam Taylor)",       "Annual Bronze dues",           -355),
            ("income","dues",   "30.00","Seed: Dues — Semester (Priya Sharma)",   "Semester pass dues",            -10),
            # Ticket income
            ("income","ticket","120.00","Seed: Ticket — Annual Gala (12x$10)",    "12 tickets for Skyline Gala",   -21),
            ("income","ticket", "75.00","Seed: Ticket — Hackathon (5x$15)",       "5 tickets for Tech Hackathon",  -14),
            # Merch income
            ("income","merch",  "89.50","Seed: Merch — Hoodies + Totes batch 1", "2 hoodies + 3 tote bags",        -7),
            ("income","merch",  "45.00","Seed: Merch — Sticker Packs batch 2",   "9 premium sticker packs",        -3),
            # Fundraiser
            ("income","fundraiser","200.00","Seed: Fundraiser — Bake Sale",       "Cash at campus bake sale",      -35),
        ]

        for type_, cat, amt, source, desc, delta in txs:
            tx = _ensure_tx(type_, cat, amt, source, desc, now + timedelta(days=delta))
            self.stdout.write(f"  [TX] ${amt:>7}  {source[:52]}")

        self.stdout.write(
            f"\n  Ledger totals: {Transaction.objects.count()} transactions | "
            f"income={Transaction.objects.filter(type='income').count()} | "
            f"expense={Transaction.objects.filter(type='expense').count()}"
        )

    # ── 4. Announcements ─────────────────────────────────────────────────────
    def _seed_announcements(self, users):
        self.stdout.write(self.style.MIGRATE_HEADING("\n[4/6] Announcements"))
        officer = users.get("admin@skyline.edu") or users.get("leader@skyline.edu")

        data = [
            (
                "Welcome to Skyline SA — Fall 2026!",
                "Hi everyone! Membership dues are open — renew or sign up at the Members portal. "
                "First general meeting: Thursday 6 PM, Room 204.",
                Announcement.AUDIENCE_ALL, True,
            ),
            (
                "Annual Gala — Tickets Now Available",
                "Tickets: $10 members / $15 guests. Formal attire. Oct 25 · Grand Hall.",
                Announcement.AUDIENCE_ALL, True,
            ),
            (
                "Treasurer Update: Q3 Financial Summary",
                "Q3 income from dues, tickets, and merch exceeded $700. "
                "One approved reimbursement posted to the ledger. See Treasurer Dashboard.",
                Announcement.AUDIENCE_MEMBERS, True,
            ),
            (
                "Volunteer Shift Sign-Ups — Hackathon",
                "10 volunteers needed Nov 2. Shifts: 9AM-1PM and 1PM-5PM. "
                "Volunteers get a free Skyline hoodie!",
                Announcement.AUDIENCE_VOLUNTEERS, False,
            ),
            (
                "Merch Store: New Items In Stock",
                "New arrivals: Hoodies ($35), Tote Bags ($12), Enamel Pins ($5). "
                "Silver & Gold members get 10-20% off.",
                Announcement.AUDIENCE_ALL, False,
            ),
        ]

        for title, body, audience, is_sent in data:
            obj, created = Announcement.objects.get_or_create(
                title=title,
                defaults=dict(
                    body=body,
                    audience=audience,
                    author=officer,
                    is_sent=is_sent,
                    sent_at=timezone.now() if is_sent else None,
                ),
            )
            self.stdout.write(
                f"  [{'Created' if created else 'OK':7}] "
                f"[{('SENT' if obj.is_sent else 'DRAFT'):5}] "
                f"{title[:50]}"
            )

    # ── 5. Mailing List Subscribers ──────────────────────────────────────────
    def _seed_subscribers(self, users):
        self.stdout.write(self.style.MIGRATE_HEADING("\n[5/6] Mailing List Subscribers"))

        # Linked to user accounts
        linked_emails = [
            "admin@skyline.edu",
            "leader@skyline.edu",
            "jordan.lee@skyline.edu",
            "maya.patel@skyline.edu",
            "sam.taylor@skyline.edu",
            "priya.sharma@skyline.edu",
        ]
        for email in linked_emails:
            user_obj = users.get(email)
            if not user_obj:
                continue
            sub, created = MailingListSubscriber.objects.get_or_create(
                email=email,
                defaults=dict(user=user_obj, is_active=True),
            )
            if not created and sub.user is None:
                sub.user = user_obj
                sub.save(update_fields=["user"])
            self.stdout.write(f"  [{'Created' if created else 'OK':7}] {email} (linked user)")

        # External-only (no account)
        for ext in ["parent.jenkins@example.com", "alumni.2025@skyline.edu", "faculty.advisor@skyline.edu"]:
            sub, created = MailingListSubscriber.objects.get_or_create(
                email=ext,
                defaults=dict(user=None, is_active=True),
            )
            self.stdout.write(f"  [{'Created' if created else 'OK':7}] {ext} (external)")

    # ── 6. Reimbursements (all statuses) ─────────────────────────────────────
    def _seed_reimbursements(self, users):
        self.stdout.write(self.style.MIGRATE_HEADING("\n[6/6] Reimbursements"))

        officer   = users.get("admin@skyline.edu")
        jordan    = users.get("jordan.lee@skyline.edu")
        maya      = users.get("maya.patel@skyline.edu")
        priya     = users.get("priya.sharma@skyline.edu")
        sam       = users.get("sam.taylor@skyline.edu")

        # ── PENDING 1
        r1, c1 = Reimbursement.objects.get_or_create(
            requester=jordan,
            description="Event flyers and printing supplies for Annual Gala",
            defaults=dict(amount=Decimal("35.50"), status=Reimbursement.STATUS_PENDING),
        )
        self.stdout.write(f"  [{'Created' if c1 else 'OK':7}] PENDING   #{r1.pk}  ${r1.amount}")

        # ── PENDING 2
        r2, c2 = Reimbursement.objects.get_or_create(
            requester=priya,
            description="Volunteer orientation snack packs and name badges",
            defaults=dict(amount=Decimal("62.00"), status=Reimbursement.STATUS_PENDING),
        )
        self.stdout.write(f"  [{'Created' if c2 else 'OK':7}] PENDING   #{r2.pk}  ${r2.amount}")

        # ── APPROVED (single ledger TX created on first approval only)
        r3, c3 = Reimbursement.objects.get_or_create(
            requester=maya,
            description="Audio equipment rental for Tech Hackathon",
            defaults=dict(amount=Decimal("150.00"), status=Reimbursement.STATUS_PENDING),
        )
        if r3.status == Reimbursement.STATUS_PENDING and r3.transaction_id is None:
            r3 = r3.approve(officer=officer, notes="Valid receipt verified by Treasurer.")
        self.stdout.write(
            f"  [{'Created' if c3 else 'OK':7}] APPROVED  #{r3.pk}  ${r3.amount}  "
            f"TX #{r3.transaction_id}"
        )

        # ── PAID (approve then mark_paid — both guarded by status checks)
        r4, c4 = Reimbursement.objects.get_or_create(
            requester=maya,
            description="Pizza and refreshments for club meeting Oct 1",
            defaults=dict(amount=Decimal("48.75"), status=Reimbursement.STATUS_PENDING),
        )
        if r4.status == Reimbursement.STATUS_PENDING and r4.transaction_id is None:
            r4 = r4.approve(officer=officer, notes="Pre-approved bulk order.")
        if r4.status == Reimbursement.STATUS_APPROVED:
            r4 = r4.mark_paid(officer=officer, notes="Zelle transfer sent Oct 3.")
        self.stdout.write(
            f"  [{'Created' if c4 else 'OK':7}] PAID      #{r4.pk}  ${r4.amount}  "
            f"TX #{r4.transaction_id}"
        )

        # ── REJECTED (no ledger TX)
        r5, c5 = Reimbursement.objects.get_or_create(
            requester=sam,
            description="Personal gym membership — incorrectly submitted",
            defaults=dict(amount=Decimal("55.00"), status=Reimbursement.STATUS_PENDING),
        )
        if r5.status == Reimbursement.STATUS_PENDING and r5.transaction_id is None:
            r5 = r5.reject(
                officer=officer,
                notes="Personal expenses not covered under club policy.",
            )
        self.stdout.write(f"  [{'Created' if c5 else 'OK':7}] REJECTED  #{r5.pk}  ${r5.amount}")

        # Summary
        from django.db.models import Sum
        qs = Reimbursement.objects
        self.stdout.write(
            f"\n  Reimbursements: "
            f"{qs.count()} total | "
            f"pending={qs.filter(status='pending').count()} | "
            f"approved={qs.filter(status='approved').count()} | "
            f"paid={qs.filter(status='paid').count()} | "
            f"rejected={qs.filter(status='rejected').count()}"
        )
        # Cross-module money story check
        from decimal import Decimal as D
        from django.db.models import Sum, Value
        from django.db.models.functions import Coalesce
        from django.db.models import DecimalField
        total_in  = Transaction.objects.filter(type="income").aggregate(
            t=Coalesce(Sum("amount"), D("0"), output_field=DecimalField()))["t"]
        total_exp = Transaction.objects.filter(type="expense").aggregate(
            t=Coalesce(Sum("amount"), D("0"), output_field=DecimalField()))["t"]
        self.stdout.write(self.style.SUCCESS(
            f"\n  Money story check:\n"
            f"    Income  = ${total_in}\n"
            f"    Expense = ${total_exp} (reimbursements approved/paid)\n"
            f"    Balance = ${total_in - total_exp}"
        ))
