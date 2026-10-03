from decimal import Decimal
from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Transaction


class FinanceSummaryAPITestCase(APITestCase):
    def setUp(self):
        self.summary_url = reverse('finance-summary')

    def test_empty_ledger_summary(self):
        response = self.client.get(self.summary_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(Decimal(data['total_income']), Decimal('0.00'))
        self.assertEqual(Decimal(data['total_expense']), Decimal('0.00'))
        self.assertEqual(Decimal(data['current_balance']), Decimal('0.00'))

        # Check all standard categories exist in breakdown
        breakdown_categories = {item['category'] for item in data['breakdown']}
        for choice, _ in Transaction.CATEGORY_CHOICES:
            self.assertIn(choice, breakdown_categories)

        # Check by_category dict
        self.assertIn('dues', data['by_category'])
        self.assertEqual(Decimal(data['by_category']['dues']['income']), Decimal('0.00'))

    def test_summary_with_transactions(self):
        now = timezone.now()
        Transaction.objects.create(
            type=Transaction.TYPE_INCOME,
            category=Transaction.CATEGORY_DUES,
            amount=Decimal('150.00'),
            source='Membership dues seed',
            date=now
        )
        Transaction.objects.create(
            type=Transaction.TYPE_INCOME,
            category=Transaction.CATEGORY_TICKET,
            amount=Decimal('50.00'),
            source='Ticket sales seed',
            date=now
        )
        Transaction.objects.create(
            type=Transaction.TYPE_EXPENSE,
            category=Transaction.CATEGORY_REIMBURSEMENT,
            amount=Decimal('45.00'),
            source='Reimbursement seed',
            date=now
        )

        response = self.client.get(self.summary_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(Decimal(data['total_income']), Decimal('200.00'))
        self.assertEqual(Decimal(data['total_expense']), Decimal('45.00'))
        self.assertEqual(Decimal(data['current_balance']), Decimal('155.00'))

        # Verify category specifics
        dues = data['by_category']['dues']
        self.assertEqual(Decimal(dues['income']), Decimal('150.00'))
        self.assertEqual(Decimal(dues['net']), Decimal('150.00'))
        self.assertEqual(dues['count'], 1)

        reimbursement = data['by_category']['reimbursement']
        self.assertEqual(Decimal(reimbursement['expense']), Decimal('45.00'))
        self.assertEqual(Decimal(reimbursement['net']), Decimal('-45.00'))
        self.assertEqual(reimbursement['count'], 1)

    def test_date_range_filtering(self):
        from datetime import timezone as dt_timezone
        jan_date = timezone.datetime(2026, 1, 15, 12, 0, 0, tzinfo=dt_timezone.utc)
        feb_date = timezone.datetime(2026, 2, 20, 12, 0, 0, tzinfo=dt_timezone.utc)

        Transaction.objects.create(
            type=Transaction.TYPE_INCOME,
            category=Transaction.CATEGORY_DUES,
            amount=Decimal('100.00'),
            source='Jan Dues',
            date=jan_date
        )
        Transaction.objects.create(
            type=Transaction.TYPE_INCOME,
            category=Transaction.CATEGORY_MERCH,
            amount=Decimal('80.00'),
            source='Feb Merch',
            date=feb_date
        )

        # 1. Filter only Jan
        res_jan = self.client.get(self.summary_url, {'start_date': '2026-01-01', 'end_date': '2026-01-31'})
        self.assertEqual(res_jan.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(res_jan.json()['total_income']), Decimal('100.00'))
        self.assertEqual(Decimal(res_jan.json()['by_category']['dues']['income']), Decimal('100.00'))
        self.assertEqual(Decimal(res_jan.json()['by_category']['merch']['income']), Decimal('0.00'))

        # 2. Filter from Feb onwards
        res_feb = self.client.get(self.summary_url, {'start_date': '2026-02-01'})
        self.assertEqual(res_feb.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(res_feb.json()['total_income']), Decimal('80.00'))
        self.assertEqual(Decimal(res_feb.json()['by_category']['merch']['income']), Decimal('80.00'))
        self.assertEqual(Decimal(res_feb.json()['by_category']['dues']['income']), Decimal('0.00'))

    def test_invalid_date_range_returns_bad_request(self):
        response = self.client.get(self.summary_url, {'start_date': '2026-05-01', 'end_date': '2026-01-01'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('end_date', response.json()['errors'])

    def test_all_required_categories_present(self):
        required_cats = ['dues', 'ticket', 'merch', 'fundraiser', 'reimbursement', 'other']
        response = self.client.get(self.summary_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        for cat in required_cats:
            self.assertIn(cat, data['by_category'])
            self.assertIn('income', data['by_category'][cat])
            self.assertIn('expense', data['by_category'][cat])
            self.assertIn('net', data['by_category'][cat])

    def test_endpoint_with_trailing_slash(self):
        response = self.client.get('/api/finance/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

