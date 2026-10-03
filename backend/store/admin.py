from django.contrib import admin
from .models import Product, ProductVariant


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
