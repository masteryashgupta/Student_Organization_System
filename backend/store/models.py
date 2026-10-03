from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError


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
