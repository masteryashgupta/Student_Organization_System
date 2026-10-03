from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction as db_transaction

from .models import Product, Variant, Order
from .serializers import ProductSerializer, VariantSerializer, OrderSerializer
from accounts.permissions import IsOfficerOrTreasurer
from finance.services import record_transaction


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.prefetch_related("variants")
    serializer_class = ProductSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsOfficerOrTreasurer()]


class VariantViewSet(viewsets.ModelViewSet):
    queryset = Variant.objects.all()
    serializer_class = VariantSerializer
    permission_classes = [IsOfficerOrTreasurer]


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff_role or user.is_superuser:
            return Order.objects.select_related("variant__product", "buyer")
        return Order.objects.filter(buyer=user).select_related("variant__product")

    def create(self, request, *args, **kwargs):
        """Place an order: checks stock, applies member discount, posts to ledger."""
        variant_id = request.data.get("variant")
        quantity = int(request.data.get("quantity", 1))

        try:
            variant = Variant.objects.select_related("product").get(id=variant_id)
        except Variant.DoesNotExist:
            return Response({"detail": "Variant not found"}, status=404)

        if quantity < 1:
            return Response({"detail": "Quantity must be >= 1"}, status=400)
        if variant.stock < quantity:
            return Response({"detail": f"Only {variant.stock} left in stock"}, status=400)

        unit_price = variant.product.price
        membership = getattr(request.user, "membership", None)
        if membership and membership.is_valid and membership.tier:
            disc = membership.tier.merch_discount_percent
            unit_price = unit_price * (Decimal("100") - Decimal(disc)) / Decimal("100")
        total = (unit_price * quantity).quantize(Decimal("0.01"))

        with db_transaction.atomic():
            variant.stock -= quantity
            variant.save(update_fields=["stock"])
            order = Order.objects.create(
                buyer=request.user, variant=variant,
                quantity=quantity, total_price=total,
            )
            record_transaction(
                amount=total, direction="in", category="merch",
                description=f"Merch · {variant.product.name} {variant.size} x{quantity}",
                member=request.user, source_ref=f"order:{order.id}",
            )
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
