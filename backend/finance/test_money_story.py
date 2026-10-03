"""
test_money_story.py  —  End-to-end money story + approval math tests.

Verifies:
1. Summary math: dues + ticket + merch income, reimbursement expense, balance
2. Category breakdown aggregation correctness
3. Reimbursement approval creates exactly ONE ledger TX (idempotent)
4. Reimbursement rejection creates NO ledger TX
5. mark_paid does NOT create a second TX
6. Balance after a full approve → paid cycle
7. Date-range isolation: only the right transactions count
8. Multi-reimbursement balance: multiple approvals each post one expense TX
"""

from decimal import Decimal
from datetime import timedelta, timezone as dt_timezone
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from django.db.models import Sum
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from core.models import Transaction
from core.services import record_transaction
from finance.models import Reimbursement


# ─── Helpers ────────────────────────────────────────────────────────────────

def make_officer(n="officer"):
    return User.objects.create_user(
        username=f"{n}@test.local",
        email=f"{n}@test.local",
        password="pw",
        role=User.ROLE_ADMIN,
    )


def make_member(n="member"):
    return User.objects.create_user(
        username=f"{n}@test.local",
        email=f"{n}@test.local",
        password="pw",
        role=User.ROLE_MEMBER,
    )


def post_income(category, amount, source):
    return record_transaction(
        type="income",
        category=category,
        amount=Decimal(str(amount)),
        source=source,
    )


# ─── 1. Summary Math ────────────────────────────────────────────────────────

class FinanceSummaryMathTests(APITestCase):
    """
    Verifies GET /api/finance/summary correctly aggregates the full money story:
        dues + ticket + merch income → total_income
        approved reimbursement       → total_expense
        balance = income − expense
    """

    def setUp(self):
        self.url = reverse("finance-summary")
        self.officer = make_officer("math_officer")
        self.member  = make_member("math_member")

    # ── 1a. Empty ledger ────────────────────────────────────────────────────
    def test_empty_ledger_returns_zeros(self):
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(Decimal(data["total_income"]),   Decimal("0.00"))
        self.assertEqual(Decimal(data["total_expense"]),  Decimal("0.00"))
        self.assertEqual(Decimal(data["current_balance"]),Decimal("0.00"))

    # ── 1b. Full money story: dues + ticket + merch + reimbursement ─────────
    def test_full_money_story_summary(self):
        """
        Income:
            dues  = 150.00  (Gold VIP annual)
            ticket=  75.00  (5 event tickets)
            merch =  45.00  (sticker packs)
            total = 270.00

        Expense:
            reimbursement = 80.00  (approved event supplies)

        Balance = 270.00 − 80.00 = 190.00
        """
        post_income("dues",   "150.00", "Test: dues income")
        post_income("ticket",  "75.00", "Test: ticket income")
        post_income("merch",   "45.00", "Test: merch income")

        # Reimbursement approval posts the expense automatically
        r = Reimbursement.objects.create(
            requester=self.member,
            amount=Decimal("80.00"),
            description="Event supplies",
        )
        r.approve(officer=self.officer)

        res = self.client.get(self.url)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(Decimal(data["total_income"]),    Decimal("270.00"))
        self.assertEqual(Decimal(data["total_expense"]),   Decimal("80.00"))
        self.assertEqual(Decimal(data["current_balance"]), Decimal("190.00"))

    # ── 1c. Category breakdown accuracy ─────────────────────────────────────
    def test_category_breakdown_per_bucket(self):
        post_income("dues",       "100.00", "Test: dues cat")
        post_income("ticket",      "50.00", "Test: ticket cat")
        post_income("merch",       "30.00", "Test: merch cat")
        post_income("fundraiser",  "20.00", "Test: fundraiser cat")

        res = self.client.get(self.url)
        data = res.json()
        by_cat = data["by_category"]

        self.assertEqual(Decimal(by_cat["dues"]["income"]),       Decimal("100.00"))
        self.assertEqual(Decimal(by_cat["ticket"]["income"]),     Decimal("50.00"))
        self.assertEqual(Decimal(by_cat["merch"]["income"]),      Decimal("30.00"))
        self.assertEqual(Decimal(by_cat["fundraiser"]["income"]), Decimal("20.00"))
        self.assertEqual(Decimal(by_cat["reimbursement"]["expense"]), Decimal("0.00"))

        # All required categories always present
        for cat in ("dues", "ticket", "merch", "fundraiser", "reimbursement", "other"):
            self.assertIn(cat, by_cat)

    # ── 1d. Date-range isolation ─────────────────────────────────────────────
    def test_date_range_isolates_transactions(self):
        jan = timezone.datetime(2026, 1, 10, 12, 0, tzinfo=dt_timezone.utc)
        jun = timezone.datetime(2026, 6, 15, 12, 0, tzinfo=dt_timezone.utc)

        record_transaction("income","dues","100.00","Test: jan dues",  date=jan)
        record_transaction("income","dues","200.00","Test: jun dues",  date=jun)

        res_jan = self.client.get(self.url, {"start_date": "2026-01-01", "end_date": "2026-01-31"})
        self.assertEqual(Decimal(res_jan.json()["total_income"]), Decimal("100.00"))

        res_jun = self.client.get(self.url, {"start_date": "2026-06-01"})
        self.assertEqual(Decimal(res_jun.json()["total_income"]), Decimal("200.00"))

    # ── 1e. Reimbursement expense reduces balance ────────────────────────────
    def test_reimbursement_expense_reduces_balance(self):
        post_income("dues", "500.00", "Test: large dues")

        r1 = Reimbursement.objects.create(requester=self.member, amount=Decimal("120.00"), description="A")
        r2 = Reimbursement.objects.create(requester=self.member, amount=Decimal("80.00"),  description="B")
        r1.approve(officer=self.officer)
        r2.approve(officer=self.officer)

        res = self.client.get(self.url)
        data = res.json()
        self.assertEqual(Decimal(data["total_income"]),    Decimal("500.00"))
        self.assertEqual(Decimal(data["total_expense"]),   Decimal("200.00"))
        self.assertEqual(Decimal(data["current_balance"]), Decimal("300.00"))

    # ── 1f. Invalid date range returns 400 ───────────────────────────────────
    def test_invalid_date_range_returns_400(self):
        res = self.client.get(self.url, {"start_date": "2026-12-01", "end_date": "2026-01-01"})
        self.assertEqual(res.status_code, 400)
        self.assertIn("end_date", res.json().get("errors", {}))


# ─── 2. Reimbursement Approval Tests ────────────────────────────────────────

class ReimbursementApprovalTests(TestCase):
    """
    Model-level tests for the approval / rejection lifecycle
    and its interaction with the central ledger.
    """

    def setUp(self):
        self.officer = make_officer("appr_officer")
        self.member  = make_member("appr_member")

    def _make_reimbursement(self, amount="75.00", description="Test expense"):
        return Reimbursement.objects.create(
            requester=self.member,
            amount=Decimal(amount),
            description=description,
        )

    # ── 2a. Approval creates exactly ONE expense transaction ─────────────────
    def test_approval_creates_single_expense_tx(self):
        r = self._make_reimbursement("75.00")
        before = Transaction.objects.count()

        r.approve(officer=self.officer, notes="All good")

        self.assertEqual(Transaction.objects.count(), before + 1)
        r.refresh_from_db()
        self.assertEqual(r.status, Reimbursement.STATUS_APPROVED)
        self.assertIsNotNone(r.transaction_id)
        self.assertIsNotNone(r.approved_at)

        tx = Transaction.objects.get(pk=r.transaction_id)
        self.assertEqual(tx.type,     Transaction.TYPE_EXPENSE)
        self.assertEqual(tx.category, Transaction.CATEGORY_REIMBURSEMENT)
        self.assertEqual(tx.amount,   Decimal("75.00"))

    # ── 2b. Idempotent: second approval call does NOT create another TX ───────
    def test_double_approval_is_idempotent(self):
        r = self._make_reimbursement("120.00")
        r = r.approve(officer=self.officer)   # returns refreshed obj
        first_tx_id = r.transaction_id
        tx_count_after_first = Transaction.objects.count()

        # Call approve again — must be a no-op; model returns the same obj
        r2 = r.approve(officer=self.officer)

        self.assertEqual(Transaction.objects.count(), tx_count_after_first)
        # Both must reference the same ledger TX
        self.assertEqual(r2.transaction_id, first_tx_id)

    # ── 2c. Rejection creates NO ledger transaction ───────────────────────────
    def test_rejection_creates_no_tx(self):
        r = self._make_reimbursement("50.00")
        before = Transaction.objects.count()

        r.reject(officer=self.officer, notes="Policy violation")

        self.assertEqual(Transaction.objects.count(), before)
        r.refresh_from_db()
        self.assertEqual(r.status, Reimbursement.STATUS_REJECTED)
        self.assertIsNone(r.transaction_id)

    # ── 2d. mark_paid does NOT create a second TX ────────────────────────────
    def test_mark_paid_no_extra_tx(self):
        r = self._make_reimbursement("48.75")
        r.approve(officer=self.officer)
        after_approve = Transaction.objects.count()

        r.mark_paid(officer=self.officer, notes="Zelle done")

        self.assertEqual(Transaction.objects.count(), after_approve)
        r.refresh_from_db()
        self.assertEqual(r.status, Reimbursement.STATUS_PAID)
        self.assertIsNotNone(r.paid_at)

    # ── 2e. Cannot reject an already approved/ledgered reimbursement ──────────
    def test_cannot_reject_approved_reimbursement(self):
        from django.core.exceptions import ValidationError
        r = self._make_reimbursement("60.00")
        r.approve(officer=self.officer)

        with self.assertRaises((ValidationError, Exception)):
            r.reject(officer=self.officer, notes="Attempt to reject approved")

    # ── 2f. Balance correctness: income − approved reimbursements ────────────
    def test_balance_after_full_approve_pay_cycle(self):
        """
        Post $500 dues income, approve a $150 reimbursement, mark it paid.
        Balance should be $350 throughout (mark_paid adds no new TX).
        """
        from django.db.models import Sum, Value, DecimalField
        from django.db.models.functions import Coalesce

        record_transaction("income","dues","500.00","Balance cycle: dues")
        r = self._make_reimbursement("150.00")

        r.approve(officer=self.officer)
        inc  = Transaction.objects.filter(type="income").aggregate(
            t=Coalesce(Sum("amount"), Decimal("0"), output_field=DecimalField()))["t"]
        exp  = Transaction.objects.filter(type="expense").aggregate(
            t=Coalesce(Sum("amount"), Decimal("0"), output_field=DecimalField()))["t"]
        self.assertEqual(inc - exp, Decimal("350.00"))

        r.mark_paid(officer=self.officer)
        inc2 = Transaction.objects.filter(type="income").aggregate(
            t=Coalesce(Sum("amount"), Decimal("0"), output_field=DecimalField()))["t"]
        exp2 = Transaction.objects.filter(type="expense").aggregate(
            t=Coalesce(Sum("amount"), Decimal("0"), output_field=DecimalField()))["t"]
        # Same balance — mark_paid adds no new TX
        self.assertEqual(inc2 - exp2, Decimal("350.00"))

    # ── 2g. Multiple independent approvals each post exactly one TX ──────────
    def test_multiple_approvals_each_post_one_tx(self):
        from django.db.models import Sum as DjSum
        r1 = self._make_reimbursement("100.00", "Event A")
        r2 = self._make_reimbursement("200.00", "Event B")
        r3 = self._make_reimbursement("300.00", "Event C")

        before = Transaction.objects.count()
        r1.approve(officer=self.officer)
        r2.approve(officer=self.officer)
        r3.approve(officer=self.officer)

        self.assertEqual(Transaction.objects.count(), before + 3)

        expense_total = Transaction.objects.filter(
            type="expense", category="reimbursement"
        ).aggregate(t=DjSum("amount"))["t"]
        self.assertEqual(expense_total, Decimal("600.00"))

    # ── 2h. Positive amount validation via full_clean ────────────────────────
    def test_zero_amount_rejected_by_full_clean(self):
        """
        Reimbursement.save() calls full_clean(), which calls clean(),
        which rejects amounts <= 0.  The validator fires before the DB write.
        """
        from django.core.exceptions import ValidationError
        r = Reimbursement(
            requester=self.member,
            amount=Decimal("0.00"),
            description="Zero amount test",
        )
        with self.assertRaises(ValidationError):
            r.full_clean()
