from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError

from .models import Product, ProductVariant, Order, OrderItem
from .serializers import (
    ProductSerializer,
    ProductVariantSerializer,
    RestockSerializer,
    OrderSerializer,
    CreateOrderSerializer,
    PayOrderInputSerializer,
)
from .services import (
    restock_variant,
    create_order_from_cart,
    mark_order_as_paid,
    process_order_payment,
    fulfill_order,
    cancel_order,
)


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
                target_variant = ProductVariant.objects.create(
                    product=product,
                    size=size.upper(),
                    stock_qty=0
                )
        else:
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


class OrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Merch Orders lifecycle:
    GET /api/orders/ - List orders
    POST /api/orders/ - Create pending order from cart with stock validation & member discount
    GET /api/orders/{id}/ - Retrieve order details
    POST /api/orders/{id}/pay/ - Mark order as paid, decrement stock, and record ledger income
    POST /api/orders/{id}/fulfill/ - Mark order as fulfilled
    POST /api/orders/{id}/cancel/ - Cancel order and restore stock if already paid
    """
    queryset = Order.objects.prefetch_related('items__variant__product').select_related('buyer').all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['buyer_name', 'buyer_email', 'buyer__username', 'id']
    ordering_fields = ['created_at', 'total', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status__iexact=status_param)

        # Officers and admins see all orders
        if user and user.is_authenticated:
            if getattr(user, 'is_officer', False) or user.is_staff:
                return queryset
            # Regular authenticated members see their own orders
            return queryset.filter(buyer=user)

        # For unauthenticated requests, allow querying by specific id if provided
        return queryset

    def create(self, request, *args, **kwargs):
        """
        POST /api/orders/
        Payload:
        {
            "items": [
                { "variant_id": 1, "qty": 2 },
                { "variant_id": 3, "qty": 1 }
            ],
            "buyer_name": "Alex Smith",
            "buyer_email": "alex@skyline.edu",
            "notes": "Please hold at club room"
        }
        """
        serializer = CreateOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items_data = serializer.validated_data['items']
        buyer_name = serializer.validated_data.get('buyer_name', '')
        buyer_email = serializer.validated_data.get('buyer_email', '')
        notes = serializer.validated_data.get('notes', '')

        try:
            order = create_order_from_cart(
                items_data=items_data,
                buyer=request.user if request.user.is_authenticated else None,
                buyer_name=buyer_name,
                buyer_email=buyer_email,
                notes=notes,
            )
        except ValidationError as exc:
            return Response(
                {"status": "error", "message": exc.message_dict if hasattr(exc, 'message_dict') else str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

        output_serializer = OrderSerializer(order)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def pay(self, request, pk=None):
        """
        POST /api/orders/{id}/pay/
        Processes payment via the requested provider ('mock' or 'stripe').
        Atomically decrements stock and logs financial ledger transaction upon successful payment.
        Payload:
        {
            "provider": "mock", // or "stripe"
            "payment_reference": "CASH_AT_DOOR_123",
            "payment_data": {}
        }
        """
        order = self.get_object()
        serializer = PayOrderInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        provider = serializer.validated_data.get('provider', 'mock')
        payment_reference = serializer.validated_data.get('payment_reference', '')
        payment_data = serializer.validated_data.get('payment_data', {})
        if payment_reference and not payment_data.get('payment_reference'):
            payment_data['payment_reference'] = payment_reference

        try:
            updated_order, payment_result = process_order_payment(
                order=order,
                provider_name=provider,
                payment_data=payment_data
            )
        except ValidationError as exc:
            return Response(
                {"status": "error", "message": exc.message_dict if hasattr(exc, 'message_dict') else str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "status": "success",
                "message": payment_result.message,
                "payment_result": {
                    "provider": provider,
                    "transaction_id": payment_result.transaction_id,
                    "status": payment_result.status,
                    "client_secret": payment_result.client_secret,
                },
                "order": OrderSerializer(updated_order).data,
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def fulfill(self, request, pk=None):
        """
        POST /api/orders/{id}/fulfill/
        Marks a paid order as fulfilled.
        """
        order = self.get_object()
        try:
            updated_order = fulfill_order(order)
        except ValidationError as exc:
            return Response(
                {"status": "error", "message": exc.message_dict if hasattr(exc, 'message_dict') else str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "status": "success",
                "message": f"Order #{updated_order.id} marked as FULFILLED.",
                "order": OrderSerializer(updated_order).data,
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def cancel(self, request, pk=None):
        """
        POST /api/orders/{id}/cancel/
        Cancels an order and restores stock if the order was paid.
        """
        order = self.get_object()
        reason = request.data.get('reason', '')
        try:
            updated_order = cancel_order(order, reason=reason)
        except ValidationError as exc:
            return Response(
                {"status": "error", "message": exc.message_dict if hasattr(exc, 'message_dict') else str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "status": "success",
                "message": f"Order #{updated_order.id} has been CANCELLED.",
                "order": OrderSerializer(updated_order).data,
            },
            status=status.HTTP_200_OK
        )
