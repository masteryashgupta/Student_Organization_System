from django.contrib import admin
from .models import Product, Variant, Order

class VariantInline(admin.TabularInline):
    model = Variant
    extra = 1

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "price", "total_stock", "is_active")
    inlines = [VariantInline]

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("buyer", "variant", "quantity", "total_price", "status", "created_at")
    list_filter = ("status",)
