from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import ProductVariant, Order, OrderItem
from core.services import record_transaction


def get_user_merch_discount_pct(user) -> Decimal:
    """
    Retrieves member merch discount percentage for the given user from Membership tier.
    """
    if not user or not user.is_authenticated:
        return Decimal('0.00')

    try:
        from members.models import Membership
        membership = Membership.objects.select_related('tier').get(user=user)
        if membership.is_active_member and membership.tier:
            return Decimal(str(membership.tier.merch_discount_pct))
    except Exception:
        return Decimal('0.00')

    return Decimal('0.00')


def decrement_variant_stock(variant_id: int, quantity: int) -> ProductVariant:
    """
    Atomically checks availability and decrements inventory for a specific ProductVariant.
    Uses PostgreSQL row-level locking (select_for_update) inside an atomic transaction block
    to prevent race conditions when multiple buyers attempt to purchase concurrently.
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
    """
    if not items_data:
        raise ValidationError({'items': 'Order item list cannot be empty for stock deduction.'})

    updated_variants = []
    
    with transaction.atomic():
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


def create_order_from_cart(items_data: list, buyer=None, buyer_name: str = "", buyer_email: str = "", notes: str = "") -> Order:
    """
    Validates cart items and availability, computes member discounts, and creates a pending Order with OrderItems.
    """
    if not items_data:
        raise ValidationError({'items': 'Cannot place an order with an empty cart.'})

    # Pre-validate variants and compute totals
    subtotal = Decimal('0.00')
    validated_items = []

    for idx, item in enumerate(items_data):
        variant_id = item.get('variant_id')
        qty = item.get('qty', item.get('quantity', 1))

        if not variant_id:
            raise ValidationError({'items': f"Item at index {idx} is missing 'variant_id'."})

        try:
            qty = int(qty)
            if qty < 1:
                raise ValueError
        except (ValueError, TypeError):
            raise ValidationError({'items': f"Quantity for variant {variant_id} must be an integer >= 1."})

        try:
            variant = ProductVariant.objects.select_related('product').get(id=variant_id)
        except ProductVariant.DoesNotExist:
            raise ValidationError({'items': f"Product variant with ID {variant_id} does not exist."})

        if variant.stock_qty < qty:
            raise ValidationError({
                'items': (
                    f"Insufficient stock for '{variant.product.name}' (Size {variant.size}). "
                    f"Available: {variant.stock_qty}, Requested: {qty}."
                )
            })

        unit_price = variant.product.price
        line_total = unit_price * qty
        subtotal += line_total

        validated_items.append({
            'variant': variant,
            'qty': qty,
            'unit_price': unit_price,
        })

    # Resolve member discount percentage
    discount_pct = get_user_merch_discount_pct(buyer)
    discount_amount = (subtotal * (discount_pct / Decimal('100.00'))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    total = max(Decimal('0.00'), subtotal - discount_amount)

    # Resolve buyer name and email
    if buyer and buyer.is_authenticated:
        resolved_name = buyer_name or getattr(buyer, 'name', '') or buyer.username
        resolved_email = buyer_email or getattr(buyer, 'email', '')
    else:
        resolved_name = buyer_name
        resolved_email = buyer_email

    with transaction.atomic():
        order = Order.objects.create(
            buyer=buyer if (buyer and buyer.is_authenticated) else None,
            buyer_name=resolved_name,
            buyer_email=resolved_email,
            status=Order.STATUS_PENDING,
            subtotal=subtotal,
            discount_pct=discount_pct,
            discount_amount=discount_amount,
            total=total,
            notes=notes,
        )

        order_items = [
            OrderItem(
                order=order,
                variant=item['variant'],
                qty=item['qty'],
                unit_price=item['unit_price']
            )
            for item in validated_items
        ]
        OrderItem.objects.bulk_create(order_items)

    return order


def mark_order_as_paid(order: Order, payment_provider: str = "mock", payment_reference: str = "") -> Order:
    """
    Transitions order from 'pending' to 'paid':
    1. Atomically decrements variant inventory using row-level locking.
    2. Records transaction in core ledger: record_transaction('income', 'merch', amount=order.total, ...).
    3. Updates order status to 'paid' with payment provider metadata.
    """
    if order.status != Order.STATUS_PENDING:
        raise ValidationError({'status': f"Cannot pay for order with status '{order.status}'. Only pending orders can be paid."})

    with transaction.atomic():
        # Atomically check and deduct stock for each order item
        for item in order.items.select_related('variant', 'variant__product').all():
            decrement_variant_stock(item.variant.id, item.qty)

        # Record income in central financial ledger (core.record_transaction)
        if order.total > Decimal('0.00'):
            buyer_label = order.buyer_name or (order.buyer.username if order.buyer else "Customer")
            record_transaction(
                type='income',
                category='merch',
                amount=order.total,
                source=f"Merch Order #{order.id}",
                description=f"Merch store purchase for {buyer_label} ({order.items.count()} items via {payment_provider})"
            )

        order.status = Order.STATUS_PAID
        order.payment_provider = payment_provider
        order.payment_reference = payment_reference
        order.paid_at = timezone.now()
        order.save(update_fields=['status', 'payment_provider', 'payment_reference', 'paid_at', 'updated_at'])

    return order


def process_order_payment(order: Order, provider_name: str = "mock", payment_data: dict = None):
    """
    Executes payment for an order through the specified provider ('mock' or 'stripe').
    Flips the order to 'paid' upon successful payment verification.
    """
    from .payments import get_payment_provider
    provider = get_payment_provider(provider_name)
    payment_result = provider.process_payment(order, payment_data=payment_data)

    if not payment_result.success:
        raise ValidationError({'payment': payment_result.message})

    if payment_result.status == 'paid':
        mark_order_as_paid(
            order,
            payment_provider=provider.provider_id,
            payment_reference=payment_result.transaction_id
        )

    return order, payment_result


def fulfill_order(order: Order) -> Order:
    """
    Transitions order from 'paid' to 'fulfilled'.
    """
    if order.status != Order.STATUS_PAID:
        raise ValidationError({'status': f"Cannot fulfill order with status '{order.status}'. Only paid orders can be fulfilled."})

    order.status = Order.STATUS_FULFILLED
    order.fulfilled_at = timezone.now()
    order.save(update_fields=['status', 'fulfilled_at', 'updated_at'])
    return order


def cancel_order(order: Order, reason: str = "") -> Order:
    """
    Transitions order to 'cancelled'. Restores inventory if the order was already paid.
    """
    if order.status == Order.STATUS_CANCELLED:
        raise ValidationError({'status': "Order is already cancelled."})

    with transaction.atomic():
        # If stock was already deducted (paid or fulfilled), restore it
        if order.status in [Order.STATUS_PAID, Order.STATUS_FULFILLED]:
            for item in order.items.select_related('variant').all():
                restore_variant_stock(item.variant.id, item.qty)

        order.status = Order.STATUS_CANCELLED
        order.cancelled_at = timezone.now()
        if reason:
            order.notes = f"{order.notes}\n[Cancellation Reason]: {reason}".strip()
        order.save(update_fields=['status', 'cancelled_at', 'notes', 'updated_at'])

    return order
