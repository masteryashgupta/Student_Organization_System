from decimal import Decimal
from rest_framework import serializers
from .models import Product, ProductVariant, Order, OrderItem


class ProductVariantSerializer(serializers.ModelSerializer):
    is_in_stock = serializers.BooleanField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = [
            'id',
            'product',
            'size',
            'stock_qty',
            'is_in_stock',
            'is_low_stock',
            'sku',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'is_in_stock', 'is_low_stock', 'created_at', 'updated_at']

    def validate_stock_qty(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock quantity cannot be negative.")
        return value


class ProductVariantNestedSerializer(serializers.ModelSerializer):
    """
    Serializer used for nested variant operations within Product CRUD.
    """
    id = serializers.IntegerField(required=False)
    is_in_stock = serializers.BooleanField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = [
            'id',
            'size',
            'stock_qty',
            'is_in_stock',
            'is_low_stock',
            'sku',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['is_in_stock', 'is_low_stock', 'created_at', 'updated_at']

    def validate_stock_qty(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock quantity cannot be negative.")
        return value


class RestockSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, required=True, help_text="Quantity of stock to add (must be >= 1)")
    size = serializers.CharField(required=False, allow_blank=True, help_text="Size to restock if called on product endpoint")
    variant_id = serializers.IntegerField(required=False, help_text="Variant ID to restock")


class ProductSerializer(serializers.ModelSerializer):
    variants = ProductVariantNestedSerializer(many=True, required=False)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    total_stock = serializers.IntegerField(read_only=True)
    is_in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'type',
            'type_display',
            'price',
            'description',
            'image',
            'is_active',
            'total_stock',
            'is_in_stock',
            'variants',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'total_stock', 'is_in_stock', 'type_display', 'created_at', 'updated_at']

    def validate_price(self, value):
        if value is None or Decimal(str(value)) <= Decimal('0.00'):
            raise serializers.ValidationError("Price must be strictly greater than 0.00.")
        return value

    def create(self, validated_data):
        variants_data = validated_data.pop('variants', [])
        product = Product.objects.create(**validated_data)

        for variant_data in variants_data:
            variant_data.pop('id', None)
            ProductVariant.objects.create(product=product, **variant_data)

        return product

    def update(self, instance, validated_data):
        variants_data = validated_data.pop('variants', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if variants_data is not None:
            existing_variants = {v.size: v for v in instance.variants.all()}
            incoming_sizes = set()

            for var_data in variants_data:
                size = var_data.get('size')
                stock_qty = var_data.get('stock_qty', 0)
                sku = var_data.get('sku', '')
                incoming_sizes.add(size)

                if size in existing_variants:
                    variant_obj = existing_variants[size]
                    variant_obj.stock_qty = stock_qty
                    variant_obj.sku = sku
                    variant_obj.save()
                else:
                    ProductVariant.objects.create(
                        product=instance,
                        size=size,
                        stock_qty=stock_qty,
                        sku=sku
                    )

        return instance


class OrderItemSerializer(serializers.ModelSerializer):
    variant_id = serializers.IntegerField(source='variant.id', read_only=True)
    size = serializers.CharField(source='variant.size', read_only=True)
    product_id = serializers.IntegerField(source='variant.product.id', read_only=True)
    product_name = serializers.CharField(source='variant.product.name', read_only=True)
    product_image = serializers.CharField(source='variant.product.image', read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id',
            'variant_id',
            'size',
            'product_id',
            'product_name',
            'product_image',
            'qty',
            'unit_price',
            'total_price',
            'created_at',
        ]
        read_only_fields = ['id', 'variant_id', 'size', 'product_id', 'product_name', 'product_image', 'unit_price', 'total_price', 'created_at']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    buyer_username = serializers.CharField(source='buyer.username', read_only=True, default='')

    class Meta:
        model = Order
        fields = [
            'id',
            'buyer',
            'buyer_username',
            'buyer_name',
            'buyer_email',
            'status',
            'status_display',
            'subtotal',
            'discount_pct',
            'discount_amount',
            'total',
            'payment_provider',
            'payment_reference',
            'items',
            'notes',
            'created_at',
            'updated_at',
            'paid_at',
            'fulfilled_at',
            'cancelled_at',
        ]
        read_only_fields = [
            'id',
            'buyer',
            'buyer_username',
            'status',
            'status_display',
            'subtotal',
            'discount_pct',
            'discount_amount',
            'total',
            'payment_provider',
            'payment_reference',
            'items',
            'created_at',
            'updated_at',
            'paid_at',
            'fulfilled_at',
            'cancelled_at',
        ]


class CartItemInputSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField(required=True, help_text="ID of the ProductVariant to purchase")
    qty = serializers.IntegerField(min_value=1, default=1, required=False, help_text="Quantity to purchase (must be >= 1)")


class CreateOrderSerializer(serializers.Serializer):
    items = CartItemInputSerializer(many=True, required=True, help_text="Array of cart items with variant_id and qty")
    buyer_name = serializers.CharField(required=False, allow_blank=True, default='')
    buyer_email = serializers.EmailField(required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Cart cannot be empty.")
        return value


class PayOrderInputSerializer(serializers.Serializer):
    provider = serializers.CharField(required=False, default='mock', help_text="Payment provider ('mock' or 'stripe')")
    payment_reference = serializers.CharField(required=False, allow_blank=True, default='', help_text="Optional custom reference or check/cash note")
    payment_data = serializers.DictField(required=False, default=dict, help_text="Optional provider-specific payload (e.g. stripe token)")
