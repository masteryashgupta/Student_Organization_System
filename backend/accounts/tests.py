from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class AccountsAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_user_registration_and_login_flow(self):
        # Register new account
        register_data = {
            "name": "Virendra Jonwal",
            "email": "virendrajonwal01@gmail.com",
            "phone": "9876543210",
            "role": "public",
            "password": "StrongPassword123!",
            "password_confirm": "StrongPassword123!",
        }

        # Test both with and without trailing slash
        response = self.client.post('/api/auth/register', register_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['user']['email'], 'virendrajonwal01@gmail.com')

        # Test logging in with email
        login_data = {
            "username": "virendrajonwal01@gmail.com",
            "password": "StrongPassword123!"
        }
        login_resp = self.client.post('/api/auth/login/', login_data, format='json')
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_resp.data)
        self.assertIn('refresh', login_resp.data)
        self.assertEqual(login_resp.data['user']['name'], 'Virendra Jonwal')

        # Test authenticated /api/auth/me endpoint
        token = login_resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        me_resp = self.client.get('/api/auth/me')
        self.assertEqual(me_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(me_resp.data['email'], 'virendrajonwal01@gmail.com')

    def test_duplicate_email_registration_fails(self):
        User.objects.create_user(
            username="existing@skyline.edu",
            email="existing@skyline.edu",
            password="password123",
            name="Existing User"
        )

        duplicate_data = {
            "name": "Another User",
            "email": "existing@skyline.edu",
            "password": "password12345",
            "password_confirm": "password12345",
        }
        response = self.client.post('/api/auth/register/', duplicate_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
