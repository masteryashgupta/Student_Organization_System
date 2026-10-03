from django.contrib import admin
from .models import Product, ProductVariant, Order, OrderItem


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    min_num = 0
    fields = ('size', 'stock_qty', 'sku')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'price', 'get_total_stock', 'is_active', 'created_at')
    list_filter = ('type', 'is_active', 'created_at')
    search_fields = ('name', 'description', 'type')
    inlines = [ProductVariantInline]
    ordering = ('-created_at',)

    @admin.display(description='Total Stock')
    def get_total_stock(self, obj):
        return obj.total_stock


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ('product', 'size', 'stock_qty', 'sku', 'updated_at')
    list_filter = ('size', 'product__type', 'updated_at')
    search_fields = ('product__name', 'size', 'sku')
    ordering = ('product', 'size')


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('variant', 'qty', 'unit_price', 'total_price', 'created_at')
    can_delete = False

    @admin.display(description='Total Price')
    def total_price(self, obj):
        return f"${obj.total_price}"


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_buyer_display', 'status', 'subtotal', 'discount_pct', 'total', 'created_at', 'paid_at')
    list_filter = ('status', 'created_at', 'paid_at')
    search_fields = ('buyer__username', 'buyer__email', 'buyer_name', 'buyer_email', 'id')
    readonly_fields = ('created_at', 'updated_at', 'paid_at', 'fulfilled_at', 'cancelled_at')
    inlines = [OrderItemInline]
    ordering = ('-created_at',)

    @admin.display(description='Buyer')
    def get_buyer_display(self, obj):
        return obj.buyer_name or (obj.buyer.username if obj.buyer else "Guest")


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'variant', 'qty', 'unit_price', 'created_at')
    list_filter = ('order__status', 'created_at')
    search_fields = ('order__id', 'variant__product__name', 'variant__size')
