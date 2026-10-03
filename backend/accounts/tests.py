from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

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


class AuthenticationAndPermissionAuditTestCase(APITestCase):
    def setUp(self):
        self.register_url = reverse('auth-register')
        self.login_url = reverse('auth-login')
        self.refresh_url = reverse('auth-refresh')
        self.me_url = reverse('auth-me')

        # Create baseline users with different roles
        self.admin_user = User.objects.create_user(
            username='admin_audit',
            email='admin@skyline.local',
            password='AdminPassword123!',
            name='Auditor Admin',
            role=User.ROLE_ADMIN,
        )
        self.leader_user = User.objects.create_user(
            username='leader_audit',
            email='leader@skyline.local',
            password='LeaderPassword123!',
            name='Auditor Leader',
            role=User.ROLE_LEADER,
        )
        self.member_user = User.objects.create_user(
            username='member_audit',
            email='member@skyline.local',
            password='MemberPassword123!',
            name='Auditor Member',
            role=User.ROLE_MEMBER,
        )
        self.volunteer_user = User.objects.create_user(
            username='volunteer_audit',
            email='volunteer@skyline.local',
            password='VolunteerPassword123!',
            name='Auditor Volunteer',
            role=User.ROLE_VOLUNTEER,
        )
        self.public_user = User.objects.create_user(
            username='public_audit',
            email='public@skyline.local',
            password='PublicPassword123!',
            name='Auditor Public',
            role=User.ROLE_PUBLIC,
        )

    # 1. Register with valid data
    def test_01_register_with_valid_data(self):
        payload = {
            'username': 'new_student',
            'email': 'student@skyline.edu',
            'name': 'New Student',
            'password': 'SecureStudentPass123!',
            'password_confirm': 'SecureStudentPass123!',
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['user']['email'], 'student@skyline.edu')

    # 2. Register with duplicate email
    def test_02_register_with_duplicate_email(self):
        payload = {
            'username': 'unique_user',
            'email': 'admin@skyline.local',  # duplicate email
            'name': 'Duplicate User',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        details = response.data.get('details', response.data)
        self.assertIn('email', details)

    # 3. Register with duplicate username
    def test_03_register_with_duplicate_username(self):
        payload = {
            'username': 'admin_audit',  # duplicate username
            'email': 'unique_email@skyline.local',
            'name': 'Duplicate Username',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        details = response.data.get('details', response.data)
        self.assertIn('username', details)

    # 4. Register with invalid email
    def test_04_register_with_invalid_email(self):
        payload = {
            'username': 'invalid_email_user',
            'email': 'not-an-email',
            'name': 'Invalid Email User',
            'password': 'SecurePass123!',
            'password_confirm': 'SecurePass123!',
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        details = response.data.get('details', response.data)
        self.assertIn('email', details)

    # 5. Register with missing fields
    def test_05_register_with_missing_fields(self):
        payload = {
            'email': 'missing_fields@skyline.local',
            # missing password, password_confirm, name
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        details = response.data.get('details', response.data)
        self.assertIn('password', details)
        self.assertIn('name', details)

    # 6. Register with weak password
    def test_06_register_with_weak_password(self):
        payload = {
            'username': 'weak_pass_user',
            'email': 'weak@skyline.local',
            'name': 'Weak Password User',
            'password': '123',  # too short / numeric
            'password_confirm': '123',
        }
        response = self.client.post(self.register_url, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        details = response.data.get('details', response.data)
        self.assertIn('password', details)

    # 7. Login with correct credentials
    def test_07_login_with_correct_credentials(self):
        payload = {
            'username': 'member_audit',
            'password': 'MemberPassword123!',
        }
        response = self.client.post(self.login_url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], 'member_audit')

    # 8. Login with incorrect password
    def test_08_login_with_incorrect_password(self):
        payload = {
            'username': 'member_audit',
            'password': 'WrongPassword123!',
        }
        response = self.client.post(self.login_url, payload)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # 9. Login with nonexistent user
    def test_09_login_with_nonexistent_user(self):
        payload = {
            'username': 'nonexistent_user_xyz',
            'password': 'SomePassword123!',
        }
        response = self.client.post(self.login_url, payload)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # 10. Logout behavior
    def test_10_logout_behavior(self):
        self.client.credentials()  # Clear credentials
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # 11. Refresh while logged in
    def test_11_refresh_while_logged_in(self):
        refresh = RefreshToken.for_user(self.member_user)
        payload = {'refresh': str(refresh)}
        response = self.client.post(self.refresh_url, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    # 12. Refresh while logged out / invalid refresh token
    def test_12_refresh_while_logged_out_invalid_token(self):
        payload = {'refresh': 'invalid_refresh_token_string'}
        response = self.client.post(self.refresh_url, payload)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # 13. Access protected route / endpoint while logged out
    def test_13_access_protected_endpoint_logged_out(self):
        self.client.credentials()  # No token
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # 14. Access protected API while logged out
    def test_14_access_protected_api_logged_out(self):
        self.client.credentials()
        response = self.client.get(reverse('member-list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # 15. Expired / invalid token behavior
    def test_15_invalid_token_behavior(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer totally_invalid_jwt_token_payload')
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # 16. Authorization headers
    def test_16_authorization_headers(self):
        refresh = RefreshToken.for_user(self.member_user)
        access_token = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'member_audit')

    # 17. Token persistence across multiple requests
    def test_17_token_persistence(self):
        refresh = RefreshToken.for_user(self.member_user)
        access_token = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        # Request 1
        res1 = self.client.get(self.me_url)
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        
        # Request 2
        res2 = self.client.get(reverse('my-membership-discount'))
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

    # 18. Role & Permission checks: Unauthorized roles receive 403 Forbidden
    def test_18_role_permission_enforcement(self):
        # Public / Member cannot access officer-only member roster
        member_refresh = RefreshToken.for_user(self.member_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {member_refresh.access_token}')
        res_member = self.client.get(reverse('member-list'))
        self.assertEqual(res_member.status_code, status.HTTP_403_FORBIDDEN)

        # Volunteer cannot access officer-only member roster
        vol_refresh = RefreshToken.for_user(self.volunteer_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {vol_refresh.access_token}')
        res_vol = self.client.get(reverse('member-list'))
        self.assertEqual(res_vol.status_code, status.HTTP_403_FORBIDDEN)

        # Officer / Leader CAN access member roster
        leader_refresh = RefreshToken.for_user(self.leader_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {leader_refresh.access_token}')
        res_leader = self.client.get(reverse('member-list'))
        self.assertEqual(res_leader.status_code, status.HTTP_200_OK)

        # Admin CAN access member roster
        admin_refresh = RefreshToken.for_user(self.admin_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_refresh.access_token}')
        res_admin = self.client.get(reverse('member-list'))
        self.assertEqual(res_admin.status_code, status.HTTP_200_OK)
