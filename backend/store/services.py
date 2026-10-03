from django.db import transaction
from django.core.exceptions import ValidationError
from .models import ProductVariant


def decrement_variant_stock(variant_id: int, quantity: int) -> ProductVariant:
    """
    Atomically checks availability and decrements inventory for a specific ProductVariant.
    Uses PostgreSQL row-level locking (select_for_update) inside an atomic transaction block
    to prevent race conditions when multiple buyers attempt to purchase concurrently.

    Parameters:
        variant_id (int): Primary key of the ProductVariant.
        quantity (int): Number of units to deduct (must be positive).

    Returns:
        ProductVariant: The updated variant with decremented stock.

    Raises:
        ValidationError: If quantity is invalid or exceeds available stock.
    """
    if quantity <= 0:
        raise ValidationError({'quantity': 'Deduction quantity must be greater than zero.'})

    with transaction.atomic():
        try:
            variant = ProductVariant.objects.select_for_update().select_related('product').get(id=variant_id)
        except ProductVariant.DoesNotExist:
            raise ValidationError({'variant_id': f'ProductVariant with ID {variant_id} does not exist.'})

        if variant.stock_qty < quantity:
            product_name = variant.product.name if variant.product else 'Item'
            raise ValidationError({
                'stock_qty': (
                    f"Insufficient stock for '{product_name}' (Size {variant.size}). "
                    f"Requested: {quantity}, Available: {variant.stock_qty}."
                )
            })

        variant.stock_qty -= quantity
        variant.save(update_fields=['stock_qty', 'updated_at'])
        return variant


def decrement_order_stock(items_data: list) -> list[ProductVariant]:
    """
    Atomically decrements inventory across all items in an order.
    Ensures an all-or-nothing guarantee: if any item lacks stock, none are deducted.

    Parameters:
        items_data (list): List of dicts or objects containing 'variant_id' and 'quantity'.
                           e.g., [{'variant_id': 1, 'quantity': 2}, {'variant_id': 3, 'quantity': 1}]

    Returns:
        list[ProductVariant]: List of updated variants.

    Raises:
        ValidationError: If any item in the order has insufficient stock.
    """
    if not items_data:
        raise ValidationError({'items': 'Order item list cannot be empty for stock deduction.'})

    updated_variants = []
    
    with transaction.atomic():
        # Sort variant IDs to prevent deadlock when multiple transactions lock multiple rows
        sorted_items = sorted(items_data, key=lambda x: x.get('variant_id', 0))

        for item in sorted_items:
            variant_id = item.get('variant_id')
            qty = item.get('quantity', item.get('qty', 1))

            if qty <= 0:
                raise ValidationError({'quantity': f'Quantity for variant {variant_id} must be positive.'})

            try:
                variant = ProductVariant.objects.select_for_update().select_related('product').get(id=variant_id)
            except ProductVariant.DoesNotExist:
                raise ValidationError({'variant_id': f'Variant with ID {variant_id} not found.'})

            if variant.stock_qty < qty:
                raise ValidationError({
                    'stock_qty': (
                        f"Insufficient stock for '{variant.product.name}' ({variant.size}). "
                        f"Requested: {qty}, Available: {variant.stock_qty}."
                    )
                })

            variant.stock_qty -= qty
            variant.save(update_fields=['stock_qty', 'updated_at'])
            updated_variants.append(variant)

    return updated_variants


def restock_variant(variant_id: int, quantity: int) -> ProductVariant:
    """
    Restocks a product variant by adding the specified quantity.

    Parameters:
        variant_id (int): Primary key of the ProductVariant.
        quantity (int): Number of units to add (must be > 0).

    Returns:
        ProductVariant: The updated variant with increased stock.

    Raises:
        ValidationError: If quantity is <= 0 or variant does not exist.
    """
    if quantity <= 0:
        raise ValidationError({'quantity': 'Restock quantity must be strictly greater than zero.'})

    with transaction.atomic():
        try:
            variant = ProductVariant.objects.select_for_update().select_related('product').get(id=variant_id)
        except ProductVariant.DoesNotExist:
            raise ValidationError({'variant_id': f'ProductVariant with ID {variant_id} does not exist.'})

        variant.stock_qty += quantity
        variant.save(update_fields=['stock_qty', 'updated_at'])
        return variant


def restore_variant_stock(variant_id: int, quantity: int) -> ProductVariant:
    """
    Restores stock for a variant (e.g. upon order cancellation or refund).
    """
    return restock_variant(variant_id, quantity)
