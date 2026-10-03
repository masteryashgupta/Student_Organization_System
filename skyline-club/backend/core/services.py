from decimal import Decimal
from django.core.exceptions import ValidationError
from .models import Transaction


def record_transaction(type: str, category: str, amount, source: str, description: str = "", date=None) -> Transaction:
    """
    Reusable helper function to record a financial transaction in the central ledger.

    Parameters:
        type (str): 'income' or 'expense'
        category (str): 'dues', 'ticket', 'merch', 'fundraiser', 'reimbursement', or 'other'
        amount (Decimal|float|int|str): Amount of transaction (must be positive)
        source (str): Origin module or payment source identifier (e.g. "Members module", "Order #102")
        description (str): Additional details about the transaction
        date (datetime, optional): Transaction timestamp (defaults to current time)

    Returns:
        Transaction: The saved Transaction instance.

    Raises:
        ValidationError: If amount <= 0 or invalid type/category.
    """
    if isinstance(amount, (int, float, str)):
        try:
            amount = Decimal(str(amount))
        except Exception as exc:
            raise ValidationError({'amount': f'Invalid amount format: {amount}'}) from exc

    if amount <= Decimal('0.00'):
        raise ValidationError({'amount': 'Transaction amount must be strictly positive.'})

    transaction_kwargs = {
        'type': type,
        'category': category,
        'amount': amount,
        'source': source,
        'description': description,
    }
    
    if date is not None:
        transaction_kwargs['date'] = date

    transaction = Transaction(**transaction_kwargs)
    transaction.full_clean()
    transaction.save()
    return transaction
