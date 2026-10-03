import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class Event(models.Model):
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=150, blank=True)
    starts_at = models.DateTimeField()
    capacity = models.PositiveIntegerField(default=100)
    price_member = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    price_non_member = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-starts_at"]

    @property
    def tickets_sold(self):
        return self.tickets.count()

    @property
    def seats_left(self):
        return max(self.capacity - self.tickets_sold, 0)

    @property
    def attendance(self):
        return self.tickets.filter(checked_in=True).count()

    @property
    def revenue(self):
        from django.db.models import Sum
        return self.tickets.aggregate(s=Sum("price_paid"))["s"] or 0

    def __str__(self):
        return self.title


class Ticket(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="tickets")
    holder = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tickets",
        null=True, blank=True,
    )
    holder_name = models.CharField(max_length=120, blank=True)
    holder_email = models.EmailField(blank=True)
    code = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    price_paid = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    is_member_price = models.BooleanField(default=False)
    checked_in = models.BooleanField(default=False)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def check_in(self):
        if self.checked_in:
            return False
        self.checked_in = True
        self.checked_in_at = timezone.now()
        self.save(update_fields=["checked_in", "checked_in_at"])
        return True

    def __str__(self):
        return f"Ticket<{self.event.title} · {self.code}>"
