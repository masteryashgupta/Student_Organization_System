from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.utils import timezone

from core.services import record_transaction


def validate_receipt_file(file_obj):
    """
    Validates uploaded receipt files for size and allowed extensions (.pdf, .jpg, .jpeg, .png, .webp).
    """
    if not file_obj:
        return

    # Check file size (max 10MB)
    max_size_mb = 10
    if file_obj.size > max_size_mb * 1024 * 1024:
        raise ValidationError(f"Receipt file size cannot exceed {max_size_mb}MB.")

    # Check file extension
    ext = file_obj.name.split('.')[-1].lower() if '.' in file_obj.name else ''
    allowed_extensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp']
    if ext not in allowed_extensions:
        raise ValidationError(f"Invalid file type '.{ext}'. Allowed types: {', '.join(allowed_extensions)}")


class Reimbursement(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_PAID = 'paid'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending Review'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_PAID, 'Paid'),
    ]

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reimbursements',
        help_text="Member/Volunteer requesting reimbursement"
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Requested reimbursement amount (must be strictly positive)"
    )
    description = models.TextField(help_text="Itemized reason or details for expense")
    receipt = models.FileField(
        upload_to='reimbursements/receipts/',
        validators=[validate_receipt_file],
        blank=True,
        null=True,
        help_text="Receipt image or PDF proof"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        help_text="Current approval and disbursement status"
    )
    approver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_reimbursements',
        help_text="Officer who reviewed/approved the reimbursement"
    )
    transaction = models.OneToOneField(
        'core.Transaction',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reimbursement',
        help_text="Central ledger transaction recorded upon approval (prevents double-recording)"
    )
    notes = models.TextField(
        blank=True,
        default='',
        help_text="Officer notes or rejection reasons"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Reimbursement'
        verbose_name_plural = 'Reimbursements'

    def clean(self):
        super().clean()
        if self.amount is not None and self.amount <= Decimal('0.00'):
            raise ValidationError({'amount': 'Reimbursement amount must be strictly positive.'})
        if self.status not in dict(self.STATUS_CHOICES):
            raise ValidationError({'status': f'Invalid status choice: {self.status}'})

    def approve(self, officer=None, notes=None):
        """
        Idempotently approves the reimbursement request and posts a single expense transaction
        to the central core.Transaction ledger.
        """
        with transaction.atomic():
            # Lock the row to prevent concurrent approval race conditions
            obj = Reimbursement.objects.select_for_update().get(pk=self.pk)

            # Idempotency check: if already approved or ledger transaction linked, do not double-record!
            if obj.transaction is not None or obj.status in [self.STATUS_APPROVED, self.STATUS_PAID]:
                return obj

            if notes:
                obj.notes = notes

            # Record single expense entry in the central shared ledger
            source_id = f"Reimbursement #{obj.id}"
            user_label = obj.requester.email if obj.requester else "Unknown Member"
            tx_desc = f"Reimbursement to {user_label}: {obj.description[:100]}"

            ledger_tx = record_transaction(
                type='expense',
                category='reimbursement',
                amount=obj.amount,
                source=source_id,
                description=tx_desc
            )

            obj.transaction = ledger_tx
            obj.status = self.STATUS_APPROVED
            if officer:
                obj.approver = officer
            obj.approved_at = timezone.now()
            obj.save()
            return obj

    def reject(self, officer=None, notes=None):
        """
        Rejects a reimbursement request. No ledger entry is created.
        """
        with transaction.atomic():
            obj = Reimbursement.objects.select_for_update().get(pk=self.pk)
            if obj.status == self.STATUS_PAID:
                raise ValidationError("Cannot reject a reimbursement that has already been paid.")
            if obj.transaction is not None:
                raise ValidationError("Cannot reject an approved reimbursement already posted to the ledger.")

            obj.status = self.STATUS_REJECTED
            if officer:
                obj.approver = officer
            if notes:
                obj.notes = notes
            obj.save()
            return obj

    def mark_paid(self, officer=None, notes=None):
        """
        Marks an approved reimbursement as paid out.
        """
        with transaction.atomic():
            obj = Reimbursement.objects.select_for_update().get(pk=self.pk)
            if obj.status != self.STATUS_APPROVED and obj.transaction is None:
                raise ValidationError("Reimbursement must be approved before marking as paid.")

            obj.status = self.STATUS_PAID
            if officer and not obj.approver:
                obj.approver = officer
            if notes:
                obj.notes = notes
            obj.paid_at = timezone.now()
            obj.save()
            return obj

    def __str__(self):
        return f"Reimbursement #{self.id} (${self.amount}) - {self.get_status_display()}"
