from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError

from .models import Product, ProductVariant
from .serializers import (
    ProductSerializer,
    ProductVariantSerializer,
    RestockSerializer,
)
from .services import restock_variant


class IsOfficerOrReadOnly(permissions.BasePermission):
    """
    Allow read-only access to anyone, while write operations (create, update, delete)
    require authenticated users (officers, admins, or club leaders).
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        return getattr(request.user, 'is_officer', True) or request.user.is_staff


class ProductViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Products and their respective Variants.
    GET /api/products/ - List all products
    POST /api/products/ - Create a product with optional initial variants
    GET /api/products/{id}/ - Retrieve a product with all variants and total stock
    PUT/PATCH /api/products/{id}/ - Update product attributes and variants
    DELETE /api/products/{id}/ - Delete a product
    POST /api/products/{id}/restock/ - Restock a specific size/variant of the product
    """
    queryset = Product.objects.prefetch_related('variants').all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'type']
    ordering_fields = ['price', 'created_at', 'name']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Optional filter by product type
        product_type = self.request.query_params.get('type')
        if product_type:
            queryset = queryset.filter(type=product_type)

        # Optional filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            if is_active.lower() in ['true', '1']:
                queryset = queryset.filter(is_active=True)
            elif is_active.lower() in ['false', '0']:
                queryset = queryset.filter(is_active=False)

        return queryset

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def restock(self, request, pk=None):
        """
        POST /api/products/{id}/restock/
        Payload: { "size": "M", "quantity": 10 } OR { "variant_id": 1, "quantity": 10 }
        """
        product = self.get_object()
        serializer = RestockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quantity = serializer.validated_data['quantity']
        variant_id = serializer.validated_data.get('variant_id')
        size = serializer.validated_data.get('size')

        target_variant = None
        if variant_id:
            target_variant = product.variants.filter(id=variant_id).first()
        elif size:
            target_variant = product.variants.filter(size__iexact=size).first()
            if not target_variant:
                # Create variant if it doesn't exist yet for this size
                target_variant = ProductVariant.objects.create(
                    product=product,
                    size=size.upper(),
                    stock_qty=0
                )
        else:
            # If product has only 1 variant (e.g. One Size), default to it
            if product.variants.count() == 1:
                target_variant = product.variants.first()

        if not target_variant:
            return Response(
                {
                    "status": "error",
                    "message": "Please specify a valid 'variant_id' or 'size' to restock."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            updated_variant = restock_variant(target_variant.id, quantity)
        except ValidationError as exc:
            return Response(
                {"status": "error", "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

        product.refresh_from_db()
        return Response(
            {
                "status": "success",
                "message": f"Successfully added {quantity} unit(s) to {product.name} (Size {updated_variant.size}).",
                "variant": ProductVariantSerializer(updated_variant).data,
                "product": ProductSerializer(product).data,
            },
            status=status.HTTP_200_OK
        )


class ProductVariantViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for individual Product Variants (size & stock level management).
    POST /api/product-variants/{id}/restock/ - Restock an individual variant
    """
    queryset = ProductVariant.objects.select_related('product').all()
    serializer_class = ProductVariantSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['size', 'product__name', 'sku']
    ordering_fields = ['stock_qty', 'size', 'created_at']
    ordering = ['product', 'size']

    def get_queryset(self):
        queryset = super().get_queryset()
        product_id = self.request.query_params.get('product')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        return queryset

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def restock(self, request, pk=None):
        """
        POST /api/product-variants/{id}/restock/
        Payload: { "quantity": 15 }
        """
        variant = self.get_object()
        serializer = RestockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        quantity = serializer.validated_data['quantity']
        try:
            updated_variant = restock_variant(variant.id, quantity)
        except ValidationError as exc:
            return Response(
                {"status": "error", "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "status": "success",
                "message": f"Successfully restocked {quantity} unit(s) for Size {updated_variant.size}.",
                "variant": ProductVariantSerializer(updated_variant).data,
            },
            status=status.HTTP_200_OK
        )
