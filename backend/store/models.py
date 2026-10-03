from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone


class Product(models.Model):
    TYPE_HOODIE = 'hoodie'
    TYPE_TEE = 'tee'
    TYPE_CAP = 'cap'
    TYPE_SWEATSHIRT = 'sweatshirt'
    TYPE_ACCESSORY = 'accessory'
    TYPE_STICKER = 'sticker'
    TYPE_OTHER = 'other'

    TYPE_CHOICES = [
        (TYPE_HOODIE, 'Hoodie'),
        (TYPE_TEE, 'T-Shirt'),
        (TYPE_CAP, 'Cap / Hat'),
        (TYPE_SWEATSHIRT, 'Sweatshirt'),
        (TYPE_ACCESSORY, 'Accessory'),
        (TYPE_STICKER, 'Sticker'),
        (TYPE_OTHER, 'Other'),
    ]

    name = models.CharField(max_length=255, help_text="Product name (e.g., 'Skyline Club Navy Hoodie')")
    type = models.CharField(
        max_length=50,
        choices=TYPE_CHOICES,
        default=TYPE_TEE,
        help_text="Product category/type"
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Base retail price (must be greater than 0.00)"
    )
    description = models.TextField(blank=True, default='', help_text="Detailed product description and fabric details")
    image = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text="Product image URL or static asset path"
    )
    is_active = models.BooleanField(default=True, help_text="Whether this product is displayed in the active store")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Product'
        verbose_name_plural = 'Products'
        constraints = [
            models.CheckConstraint(
                check=models.Q(price__gt=Decimal('0.00')),
                name='product_price_strictly_positive'
            )
        ]

    @property
    def total_stock(self) -> int:
        """Returns the aggregate remaining stock count across all sizes/variants."""
        return sum(variant.stock_qty for variant in self.variants.all())

    @property
    def is_in_stock(self) -> bool:
        """True if any variant has at least 1 unit available."""
        return any(variant.is_in_stock for variant in self.variants.all())

    def clean(self):
        super().clean()
        if self.price is not None and self.price <= Decimal('0.00'):
            raise ValidationError({'price': 'Product price must be strictly greater than 0.00.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} (${self.price})"


class ProductVariant(models.Model):
    SIZE_CHOICES = [
        ('XS', 'Extra Small (XS)'),
        ('S', 'Small (S)'),
        ('M', 'Medium (M)'),
        ('L', 'Large (L)'),
        ('XL', 'Extra Large (XL)'),
        ('2XL', '2X Large (2XL)'),
        ('3XL', '3X Large (3XL)'),
        ('One Size', 'One Size / Universal'),
    ]

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='variants',
        help_text="Parent product this variant belongs to"
    )
    size = models.CharField(
        max_length=30,
        help_text="Variant size (e.g. XS, S, M, L, XL, One Size)"
    )
    stock_qty = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Available inventory stock quantity for this size (must be >= 0)"
    )
    sku = models.CharField(max_length=64, blank=True, default='', help_text="Optional SKU identifier")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['product', 'size']
        unique_together = ('product', 'size')
        verbose_name = 'Product Variant'
        verbose_name_plural = 'Product Variants'
        constraints = [
            models.CheckConstraint(
                check=models.Q(stock_qty__gte=0),
                name='variant_stock_qty_non_negative'
            )
        ]

    @property
    def is_in_stock(self) -> bool:
        return self.stock_qty > 0

    @property
    def is_low_stock(self) -> bool:
        return 0 < self.stock_qty <= 5

    def clean(self):
        super().clean()
        if self.stock_qty is not None and self.stock_qty < 0:
            raise ValidationError({'stock_qty': 'Stock quantity cannot be negative.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} - Size {self.size} ({self.stock_qty} in stock)"


class Order(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_PAID = 'paid'
    STATUS_FULFILLED = 'fulfilled'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending Payment'),
        (STATUS_PAID, 'Paid'),
        (STATUS_FULFILLED, 'Fulfilled'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='store_orders',
        help_text="Registered user who placed the order"
    )
    buyer_name = models.CharField(max_length=255, blank=True, default='', help_text="Customer name")
    buyer_email = models.EmailField(blank=True, default='', help_text="Customer email for notifications")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        help_text="Current state in the order fulfillment lifecycle"
    )
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Cart subtotal before member discounts"
    )
    discount_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Applied member discount percentage"
    )
    discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Total savings applied from discount"
    )
    total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Final payable amount"
    )
    payment_provider = models.CharField(
        max_length=50,
        default='mock',
        help_text="Payment gateway provider used ('mock', 'stripe', 'cash', etc.)"
    )
    payment_reference = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text="External transaction / intent ID from payment provider"
    )
    notes = models.TextField(blank=True, default='', help_text="Customer order notes or instructions")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    fulfilled_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Merch Order'
        verbose_name_plural = 'Merch Orders'
        constraints = [
            models.CheckConstraint(
                check=models.Q(total__gte=Decimal('0.00')),
                name='order_total_non_negative'
            )
        ]

    def __str__(self):
        buyer_label = self.buyer_name or (self.buyer.username if self.buyer else "Guest")
        return f"Order #{self.id} ({buyer_label}) - ${self.total} [{self.get_status_display()}]"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items',
        help_text="Associated parent order"
    )
    variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.PROTECT,
        related_name='order_items',
        help_text="Purchased product variant/size"
    )
    qty = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Quantity ordered (must be >= 1)"
    )
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Snapshot unit price at time of order creation"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']
        verbose_name = 'Order Item'
        verbose_name_plural = 'Order Items'

    @property
    def total_price(self) -> Decimal:
        return self.qty * self.unit_price

    def __str__(self):
        return f"{self.qty}x {self.variant.product.name} ({self.variant.size}) @ ${self.unit_price}"
