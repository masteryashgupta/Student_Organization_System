"""
Central money service. EVERY module that moves money calls record_transaction().
This is what makes the system "one system" instead of six: dues, tickets, merch
and reimbursements all land in the same ledger automatically.
"""
from decimal import Decimal
from .models import Transaction


def record_transaction(amount, direction, category, description="",
                        member=None, source_ref=""):
    """Create and return a Transaction. amount may be int/float/str/Decimal."""
    if not isinstance(amount, Decimal):
        amount = Decimal(str(amount))
    return Transaction.objects.create(
        amount=amount,
        direction=direction,
        category=category,
        description=description,
        member=member,
        source_ref=str(source_ref),
    )


def ledger_summary():
    """Return totals used by the treasurer dashboard."""
    income = Decimal("0")
    expense = Decimal("0")
    by_category = {}
    for t in Transaction.objects.all():
        if t.direction == Transaction.Direction.IN:
            income += t.amount
        else:
            expense += t.amount
        key = t.get_category_display()
        by_category.setdefault(key, {"in": Decimal("0"), "out": Decimal("0")})
        by_category[key][t.direction] += t.amount

    # make decimals JSON-friendly
    by_category = {
        k: {"in": float(v["in"]), "out": float(v["out"])}
        for k, v in by_category.items()
    }
    return {
        "total_income": float(income),
        "total_expense": float(expense),
        "balance": float(income - expense),
        "by_category": by_category,
    }
