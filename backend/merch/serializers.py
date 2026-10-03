from rest_framework import serializers
from .models import Product, Variant, Order


class VariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Variant
        fields = ["id", "size", "stock", "product"]
        extra_kwargs = {"product": {"required": False}}


class ProductSerializer(serializers.ModelSerializer):
    variants = VariantSerializer(many=True, read_only=True)
    total_stock = serializers.IntegerField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "description", "price", "image",
            "is_active", "variants", "total_stock", "created_at",
        ]


class OrderSerializer(serializers.ModelSerializer):
    buyer_name = serializers.SerializerMethodField()
    product_name = serializers.CharField(source="variant.product.name", read_only=True)
    size = serializers.CharField(source="variant.size", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "buyer", "buyer_name", "variant", "product_name", "size",
            "quantity", "total_price", "status", "created_at",
        ]
        read_only_fields = ["buyer", "total_price", "status"]

    def get_buyer_name(self, obj):
        return obj.buyer.get_full_name() or obj.buyer.username
