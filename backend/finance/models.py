from django.db import models
from django.conf import settings
from django.utils import timezone


class Transaction(models.Model):
    """Single source of truth for all club money in and out."""

    class Direction(models.TextChoices):
        IN = "in", "Income"
        OUT = "out", "Expense"

    class Category(models.TextChoices):
        DUES = "dues", "Membership Dues"
        TICKET = "ticket", "Ticket Sale"
        MERCH = "merch", "Merchandise Sale"
        FUNDRAISER = "fundraiser", "Fundraiser"
        REIMBURSEMENT = "reimbursement", "Volunteer Reimbursement"
        OTHER = "other", "Other"

    direction = models.CharField(max_length=3, choices=Direction.choices)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=255, blank=True)
    member = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="transactions",
    )
    # loose link back to the object that created it (event id, order id...)
    source_ref = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    @property
    def signed_amount(self):
        return self.amount if self.direction == self.Direction.IN else -self.amount

    def __str__(self):
        sign = "+" if self.direction == "in" else "-"
        return f"{sign}₹{self.amount} {self.category}"


class Reimbursement(models.Model):
    """A volunteer expense awaiting / completed reimbursement."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        PAID = "paid", "Paid"
        REJECTED = "rejected", "Rejected"

    volunteer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reimbursements"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.CharField(max_length=255)
    receipt = models.ImageField(upload_to="receipts/", null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    transaction = models.OneToOneField(
        Transaction, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Reimbursement<{self.volunteer} ₹{self.amount} {self.status}>"
