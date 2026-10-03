from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase
from rest_framework import status

from .models import Product, ProductVariant
from .services import (
    decrement_variant_stock,
    decrement_order_stock,
    restock_variant,
    restore_variant_stock,
)


class ProductModelTests(TestCase):
    def test_create_valid_product_and_variant(self):
        product = Product.objects.create(
            name="Skyline Premium Hoodie",
            type="hoodie",
            price=Decimal("45.00"),
            description="Ultra soft fleece hoodie",
            image="https://example.com/hoodie.jpg"
        )
        variant_m = ProductVariant.objects.create(
            product=product,
            size="M",
            stock_qty=20
        )
        variant_l = ProductVariant.objects.create(
            product=product,
            size="L",
            stock_qty=0
        )

        self.assertEqual(product.total_stock, 20)
        self.assertTrue(product.is_in_stock)
        self.assertTrue(variant_m.is_in_stock)
        self.assertFalse(variant_l.is_in_stock)
        self.assertEqual(str(product), "Skyline Premium Hoodie ($45.00)")
        self.assertEqual(str(variant_m), "Skyline Premium Hoodie - Size M (20 in stock)")

    def test_product_price_must_be_positive(self):
        with self.assertRaises(ValidationError):
            Product.objects.create(
                name="Free Sticker",
                type="sticker",
                price=Decimal("0.00")
            )

        with self.assertRaises(ValidationError):
            Product.objects.create(
                name="Negative Product",
                type="sticker",
                price=Decimal("-5.00")
            )

    def test_variant_stock_cannot_be_negative(self):
        product = Product.objects.create(
            name="Skyline T-Shirt",
            type="tee",
            price=Decimal("20.00")
        )
        with self.assertRaises(ValidationError):
            ProductVariant.objects.create(
                product=product,
                size="S",
                stock_qty=-1
            )


class StockServiceTests(TestCase):
    def setUp(self):
        self.product = Product.objects.create(
            name="Skyline Crewneck",
            type="sweatshirt",
            price=Decimal("35.00")
        )
        self.variant_s = ProductVariant.objects.create(
            product=self.product,
            size="S",
            stock_qty=10
        )
        self.variant_m = ProductVariant.objects.create(
            product=self.product,
            size="M",
            stock_qty=5
        )

    def test_decrement_variant_stock_success(self):
        updated = decrement_variant_stock(self.variant_s.id, quantity=3)
        self.assertEqual(updated.stock_qty, 7)
        self.variant_s.refresh_from_db()
        self.assertEqual(self.variant_s.stock_qty, 7)

    def test_decrement_variant_stock_exact_amount(self):
        updated = decrement_variant_stock(self.variant_m.id, quantity=5)
        self.assertEqual(updated.stock_qty, 0)
        self.assertFalse(updated.is_in_stock)

    def test_reject_decrement_exceeding_stock(self):
        with self.assertRaises(ValidationError):
            decrement_variant_stock(self.variant_m.id, quantity=6)
        
        # Ensure stock remained untouched
        self.variant_m.refresh_from_db()
        self.assertEqual(self.variant_m.stock_qty, 5)

    def test_reject_zero_or_negative_decrement_qty(self):
        with self.assertRaises(ValidationError):
            decrement_variant_stock(self.variant_s.id, quantity=0)
        with self.assertRaises(ValidationError):
            decrement_variant_stock(self.variant_s.id, quantity=-2)

    def test_decrement_order_stock_all_or_nothing(self):
        items_payload = [
            {'variant_id': self.variant_s.id, 'quantity': 2},
            {'variant_id': self.variant_m.id, 'quantity': 10}, # Exceeds variant_m stock (5)
        ]

        with self.assertRaises(ValidationError):
            decrement_order_stock(items_payload)

        # Verify rollback: variant_s should STILL have 10, not 8!
        self.variant_s.refresh_from_db()
        self.variant_m.refresh_from_db()
        self.assertEqual(self.variant_s.stock_qty, 10)
        self.assertEqual(self.variant_m.stock_qty, 5)

    def test_decrement_order_stock_success(self):
        items_payload = [
            {'variant_id': self.variant_s.id, 'quantity': 4},
            {'variant_id': self.variant_m.id, 'quantity': 3},
        ]
        updated_list = decrement_order_stock(items_payload)
        self.assertEqual(len(updated_list), 2)
        self.variant_s.refresh_from_db()
        self.variant_m.refresh_from_db()
        self.assertEqual(self.variant_s.stock_qty, 6)
        self.assertEqual(self.variant_m.stock_qty, 2)

    def test_restock_and_restore_variant(self):
        updated = restock_variant(self.variant_s.id, quantity=15)
        self.assertEqual(updated.stock_qty, 25)

        restored = restore_variant_stock(self.variant_m.id, quantity=3)
        self.assertEqual(restored.stock_qty, 8)


class ProductAPITests(APITestCase):
    def setUp(self):
        self.product = Product.objects.create(
            name="Skyline Club Cap",
            type="cap",
            price=Decimal("18.50"),
            description="Adjustable strap dad hat",
            image="https://example.com/cap.jpg"
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            size="One Size",
            stock_qty=50
        )

    def test_list_products_exposes_stock_flags(self):
        response = self.client.get('/api/products/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], "Skyline Club Cap")
        self.assertEqual(results[0]['total_stock'], 50)
        self.assertTrue(results[0]['is_in_stock'])
        self.assertEqual(results[0]['variants'][0]['stock_qty'], 50)
        self.assertTrue(results[0]['variants'][0]['is_in_stock'])

    def test_retrieve_product(self):
        response = self.client.get(f'/api/products/{self.product.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "Skyline Club Cap")
        self.assertEqual(response.data['price'], "18.50")
        self.assertEqual(response.data['total_stock'], 50)
        self.assertTrue(response.data['is_in_stock'])

    def test_create_product_with_variants(self):
        payload = {
            "name": "Skyline Varsity Jacket",
            "type": "hoodie",
            "price": "65.00",
            "description": "Embroidered club jacket",
            "image": "https://example.com/jacket.jpg",
            "variants": [
                {"size": "S", "stock_qty": 10},
                {"size": "M", "stock_qty": 25},
                {"size": "L", "stock_qty": 15}
            ]
        }
        response = self.client.post('/api/products/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], "Skyline Varsity Jacket")
        self.assertEqual(response.data['total_stock'], 50)
        self.assertTrue(response.data['is_in_stock'])
        self.assertEqual(len(response.data['variants']), 3)

    def test_reject_zero_or_negative_price(self):
        payload = {
            "name": "Invalid Price Item",
            "type": "tee",
            "price": "0.00"
        }
        response = self.client.post('/api/products/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue('price' in response.data or 'price' in response.data.get('details', {}))

    def test_reject_negative_variant_stock(self):
        payload = {
            "name": "Invalid Stock Item",
            "type": "tee",
            "price": "15.00",
            "variants": [
                {"size": "M", "stock_qty": -5}
            ]
        }
        response = self.client.post('/api/products/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue('variants' in response.data or 'variants' in response.data.get('details', {}))

    def test_restock_endpoint_on_product(self):
        payload = {
            "size": "One Size",
            "quantity": 25
        }
        response = self.client.post(f'/api/products/{self.product.id}/restock/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['variant']['stock_qty'], 75)
        self.assertEqual(response.data['product']['total_stock'], 75)

    def test_restock_endpoint_on_variant(self):
        payload = {
            "quantity": 10
        }
        response = self.client.post(f'/api/product-variants/{self.variant.id}/restock/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['variant']['stock_qty'], 60)

    def test_delete_product(self):
        response = self.client.delete(f'/api/products/{self.product.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Product.objects.filter(id=self.product.id).exists())
