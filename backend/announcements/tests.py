from django.urls import reverse
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Announcement


class AnnouncementAPITestCase(APITestCase):
    def setUp(self):
        self.list_url = reverse('announcement-list-create')

    def test_create_announcement_success(self):
        payload = {
            'title': 'General Meeting Notice',
            'body': 'Join us this Friday at 5 PM in Room 101 for elections!',
            'audience': 'all'
        }
        response = self.client.post(self.list_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data['title'], payload['title'])
        self.assertEqual(data['audience'], 'all')
        self.assertEqual(data['audience_display'], 'All Club Members')
        self.assertFalse(data['is_sent'])
        self.assertIsNone(data['sent_at'])
        self.assertIsNotNone(data['created_at'])

    def test_validation_title_and_body_length(self):
        # Short title (< 3 chars)
        res_title = self.client.post(self.list_url, {
            'title': 'Hi',
            'body': 'Valid announcement body text',
            'audience': 'all'
        })
        self.assertEqual(res_title.status_code, status.HTTP_400_BAD_REQUEST)
        data_title = res_title.json().get('details', res_title.json())
        self.assertIn('title', data_title)

        # Short body (< 5 chars)
        res_body = self.client.post(self.list_url, {
            'title': 'Valid Title',
            'body': 'Hey',
            'audience': 'all'
        })
        self.assertEqual(res_body.status_code, status.HTTP_400_BAD_REQUEST)
        data_body = res_body.json().get('details', res_body.json())
        self.assertIn('body', data_body)

    def test_validation_invalid_audience(self):
        response = self.client.post(self.list_url, {
            'title': 'Invalid Audience Title',
            'body': 'Some long description here',
            'audience': 'invalid_choice'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data_aud = response.json().get('details', response.json())
        self.assertIn('audience', data_aud)

    def test_list_archive_ordering(self):
        ann1 = Announcement.objects.create(
            title='First Announcement',
            body='Body content for first announcement',
            audience=Announcement.AUDIENCE_ALL
        )
        ann2 = Announcement.objects.create(
            title='Second Announcement',
            body='Body content for second announcement',
            audience=Announcement.AUDIENCE_MEMBERS
        )

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()['results'] if 'results' in response.json() else response.json()
        
        # Should be ordered by -created_at (newest first)
        self.assertEqual(results[0]['id'], ann2.id)
        self.assertEqual(results[1]['id'], ann1.id)

    def test_audience_filter(self):
        Announcement.objects.create(
            title='Volunteers Call',
            body='We need volunteers for setup',
            audience=Announcement.AUDIENCE_VOLUNTEERS
        )
        Announcement.objects.create(
            title='General Broadcast',
            body='General information for everybody',
            audience=Announcement.AUDIENCE_ALL
        )

        response = self.client.get(self.list_url, {'audience': 'volunteers'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()['results'] if 'results' in response.json() else response.json()
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['title'], 'Volunteers Call')

    def test_crud_operations(self):
        ann = Announcement.objects.create(
            title='Original Title',
            body='Original body content for testing',
            audience=Announcement.AUDIENCE_ALL
        )
        detail_url = reverse('announcement-detail', kwargs={'pk': ann.id})

        # Retrieve
        res_get = self.client.get(detail_url)
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertEqual(res_get.json()['title'], 'Original Title')

        # Update
        res_patch = self.client.patch(detail_url, {'title': 'Updated Title'})
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.json()['title'], 'Updated Title')

        # Delete
        res_delete = self.client.delete(detail_url)
        self.assertEqual(res_delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Announcement.objects.filter(id=ann.id).exists())
