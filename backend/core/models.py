from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone


class Transaction(models.Model):
    TYPE_INCOME = 'income'
    TYPE_EXPENSE = 'expense'
    
    TYPE_CHOICES = [
        (TYPE_INCOME, 'Income'),
        (TYPE_EXPENSE, 'Expense'),
    ]

    CATEGORY_DUES = 'dues'
    CATEGORY_TICKET = 'ticket'
    CATEGORY_MERCH = 'merch'
    CATEGORY_FUNDRAISER = 'fundraiser'
    CATEGORY_REIMBURSEMENT = 'reimbursement'
    CATEGORY_OTHER = 'other'

    CATEGORY_CHOICES = [
        (CATEGORY_DUES, 'Membership Dues'),
        (CATEGORY_TICKET, 'Event Ticket'),
        (CATEGORY_MERCH, 'Merch Store'),
        (CATEGORY_FUNDRAISER, 'Fundraiser'),
        (CATEGORY_REIMBURSEMENT, 'Reimbursement'),
        (CATEGORY_OTHER, 'Other'),
    ]

    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    date = models.DateTimeField(default=timezone.now)
    source = models.CharField(max_length=100, help_text="Short string identifying transaction origin/module")
    description = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name = 'Transaction'
        verbose_name_plural = 'Transactions'

    def clean(self):
        super().clean()
        if self.amount is not None and self.amount <= Decimal('0.00'):
            raise ValidationError({'amount': 'Transaction amount must be strictly positive.'})
        if self.type not in dict(self.TYPE_CHOICES):
            raise ValidationError({'type': f'Invalid transaction type: {self.type}'})
        if self.category not in dict(self.CATEGORY_CHOICES):
            raise ValidationError({'category': f'Invalid transaction category: {self.category}'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.type.upper()}] {self.get_category_display()} - ${self.amount} ({self.source})"
