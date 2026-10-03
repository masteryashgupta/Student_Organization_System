from decimal import Decimal
from django.utils import timezone
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Transaction
from accounts.models import User
from .models import Reimbursement


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

        breakdown_categories = {item['category'] for item in data['breakdown']}
        for choice, _ in Transaction.CATEGORY_CHOICES:
            self.assertIn(choice, breakdown_categories)

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

        res_jan = self.client.get(self.summary_url, {'start_date': '2026-01-01', 'end_date': '2026-01-31'})
        self.assertEqual(res_jan.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(res_jan.json()['total_income']), Decimal('100.00'))

        res_feb = self.client.get(self.summary_url, {'start_date': '2026-02-01'})
        self.assertEqual(res_feb.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(res_feb.json()['total_income']), Decimal('80.00'))

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

    def test_endpoint_with_trailing_slash(self):
        response = self.client.get('/api/finance/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class FinanceTransactionAPITestCase(APITestCase):
    def setUp(self):
        self.officer = User.objects.create_user(
            username='treasurer_user',
            email='treasurer@skyline.local',
            password='password123',
            role=User.ROLE_ADMIN
        )
        self.member = User.objects.create_user(
            username='regular_member',
            email='member@skyline.local',
            password='password123',
            role=User.ROLE_MEMBER
        )
        self.tx_url = reverse('finance-transaction-list-create')

    def test_list_transactions_paginated_and_filtered(self):
        now = timezone.now()
        Transaction.objects.create(
            type=Transaction.TYPE_INCOME,
            category=Transaction.CATEGORY_DUES,
            amount=Decimal('100.00'),
            source='Membership dues online',
            description='Annual membership dues payment',
            date=now
        )
        Transaction.objects.create(
            type=Transaction.TYPE_EXPENSE,
            category=Transaction.CATEGORY_REIMBURSEMENT,
            amount=Decimal('40.00'),
            source='Reimbursement #1',
            description='Paper supplies',
            date=now
        )

        # 1. Unfiltered list
        res = self.client.get(self.tx_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        results = data['results'] if 'results' in data else data
        self.assertEqual(len(results), 2)

        # 2. Filter by type=income
        res_income = self.client.get(self.tx_url, {'type': 'income'})
        self.assertEqual(res_income.status_code, status.HTTP_200_OK)
        results_inc = res_income.json()['results'] if 'results' in res_income.json() else res_income.json()
        self.assertEqual(len(results_inc), 1)
        self.assertEqual(results_inc[0]['category'], 'dues')

        # 3. Filter by search query
        res_search = self.client.get(self.tx_url, {'search': 'Paper'})
        self.assertEqual(res_search.status_code, status.HTTP_200_OK)
        results_search = res_search.json()['results'] if 'results' in res_search.json() else res_search.json()
        self.assertEqual(len(results_search), 1)
        self.assertEqual(results_search[0]['source'], 'Reimbursement #1')

    def test_create_manual_transaction_by_officer(self):
        self.client.force_authenticate(user=self.officer)
        payload = {
            'type': 'income',
            'category': 'fundraiser',
            'amount': '250.00',
            'source': 'Bake Sale Cash Box',
            'description': 'Cash collected during Friday campus bake sale'
        }
        response = self.client.post(self.tx_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()

        self.assertEqual(Decimal(data['amount']), Decimal('250.00'))
        self.assertEqual(data['source'], payload['source'])
        self.assertEqual(data['category'], 'fundraiser')
        self.assertEqual(data['category_display'], 'Fundraiser')

        # Verify transaction recorded in DB
        self.assertTrue(Transaction.objects.filter(source=payload['source']).exists())

    def test_create_manual_transaction_by_non_officer_denied(self):
        self.client.force_authenticate(user=self.member)
        payload = {
            'type': 'income',
            'category': 'other',
            'amount': '100.00',
            'source': 'Unauthorized Entry'
        }
        response = self.client.post(self.tx_url, payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manual_transaction_validation(self):
        self.client.force_authenticate(user=self.officer)

        # Invalid amount (0.00)
        res_amount = self.client.post(self.tx_url, {
            'type': 'income',
            'category': 'other',
            'amount': '0.00',
            'source': 'Zero Amount Test'
        })
        self.assertEqual(res_amount.status_code, status.HTTP_400_BAD_REQUEST)

        # Short source identifier (< 3 chars)
        res_source = self.client.post(self.tx_url, {
            'type': 'expense',
            'category': 'other',
            'amount': '15.00',
            'source': 'AB'
        })
        self.assertEqual(res_source.status_code, status.HTTP_400_BAD_REQUEST)


class ReimbursementAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='volunteer_user',
            email='volunteer@skyline.local',
            password='password123',
            first_name='Jane',
            last_name='Doe',
            role=User.ROLE_MEMBER
        )
        self.officer = User.objects.create_user(
            username='treasurer_user',
            email='treasurer@skyline.local',
            password='password123',
            first_name='Alex',
            last_name='Smith',
            role=User.ROLE_ADMIN
        )
        self.list_url = reverse('reimbursement-list-create')

    def test_submit_reimbursement_success(self):
        self.client.force_authenticate(user=self.user)
        pdf_file = SimpleUploadedFile("receipt.pdf", b"%PDF-1.4 sample receipt content", content_type="application/pdf")
        
        payload = {
            'amount': '35.50',
            'description': 'Event flyers and printing supplies',
            'receipt': pdf_file
        }
        response = self.client.post(self.list_url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()

        self.assertEqual(Decimal(data['amount']), Decimal('35.50'))
        self.assertEqual(data['status'], 'pending')
        self.assertEqual(data['requester_email'], 'volunteer@skyline.local')
        self.assertIsNotNone(data['receipt_url'])

    def test_validation_negative_amount(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            'amount': '-10.00',
            'description': 'Negative amount attempt'
        }
        response = self.client.post(self.list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_validation_invalid_file_extension(self):
        self.client.force_authenticate(user=self.user)
        invalid_file = SimpleUploadedFile("malicious.exe", b"binary data", content_type="application/octet-stream")
        payload = {
            'amount': '20.00',
            'description': 'Invalid receipt file upload',
            'receipt': invalid_file
        }
        response = self.client.post(self.list_url, payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_approve_creates_single_ledger_transaction(self):
        self.client.force_authenticate(user=self.user)
        reimbursement = Reimbursement.objects.create(
            requester=self.user,
            amount=Decimal('75.00'),
            description='Pizza for club meeting'
        )

        approve_url = reverse('reimbursement-approve', kwargs={'pk': reimbursement.id})
        self.client.force_authenticate(user=self.officer)

        initial_tx_count = Transaction.objects.count()
        response = self.client.post(approve_url, {'notes': 'Approved by Treasurer'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data['status'], 'approved')
        self.assertIsNotNone(data['transaction_id'])
        self.assertEqual(Transaction.objects.count(), initial_tx_count + 1)

        tx = Transaction.objects.get(id=data['transaction_id'])
        self.assertEqual(tx.type, Transaction.TYPE_EXPENSE)
        self.assertEqual(tx.category, Transaction.CATEGORY_REIMBURSEMENT)
        self.assertEqual(tx.amount, Decimal('75.00'))

    def test_idempotent_approval_does_not_double_record(self):
        reimbursement = Reimbursement.objects.create(
            requester=self.user,
            amount=Decimal('120.00'),
            description='Audio equipment rental'
        )
        approve_url = reverse('reimbursement-approve', kwargs={'pk': reimbursement.id})
        self.client.force_authenticate(user=self.officer)

        res1 = self.client.post(approve_url, {'notes': 'First approval'})
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        tx_id_1 = res1.json()['transaction_id']

        tx_count_before = Transaction.objects.count()
        res2 = self.client.post(approve_url, {'notes': 'Second approval attempt'})
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        tx_id_2 = res2.json()['transaction_id']

        self.assertEqual(tx_id_1, tx_id_2)
        self.assertEqual(Transaction.objects.count(), tx_count_before)

    def test_reject_reimbursement(self):
        reimbursement = Reimbursement.objects.create(
            requester=self.user,
            amount=Decimal('50.00'),
            description='Personal mileage request'
        )
        reject_url = reverse('reimbursement-reject', kwargs={'pk': reimbursement.id})
        self.client.force_authenticate(user=self.officer)

        response = self.client.post(reject_url, {'notes': 'Outside club policy'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['status'], 'rejected')
        self.assertIsNone(response.json()['transaction_id'])

    def test_mark_paid(self):
        reimbursement = Reimbursement.objects.create(
            requester=self.user,
            amount=Decimal('40.00'),
            description='Refreshments'
        )
        reimbursement.approve(officer=self.officer)

        paid_url = reverse('reimbursement-mark-paid', kwargs={'pk': reimbursement.id})
        self.client.force_authenticate(user=self.officer)

        response = self.client.post(paid_url, {'notes': 'Zelle transfer complete'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['status'], 'paid')
        self.assertIsNotNone(response.json()['paid_at'])
