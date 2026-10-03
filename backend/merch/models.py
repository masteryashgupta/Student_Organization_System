from django.db import models
from django.conf import settings
from django.utils import timezone


class Product(models.Model):
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    image = models.ImageField(upload_to="merch/", null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    @property
    def total_stock(self):
        return sum(v.stock for v in self.variants.all())

    def __str__(self):
        return self.name


class Variant(models.Model):
    """Size/colour variant of a product, each with its own stock count."""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="variants")
    size = models.CharField(max_length=20)  # S, M, L, XL...
    stock = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("product", "size")

    def __str__(self):
        return f"{self.product.name} · {self.size} ({self.stock})"


class Order(models.Model):
    class Status(models.TextChoices):
        PAID = "paid", "Paid"
        FULFILLED = "fulfilled", "Fulfilled"
        CANCELLED = "cancelled", "Cancelled"

    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders"
    )
    variant = models.ForeignKey(Variant, on_delete=models.PROTECT, related_name="orders")
    quantity = models.PositiveIntegerField(default=1)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PAID)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Order<{self.buyer} · {self.variant} x{self.quantity}>"
