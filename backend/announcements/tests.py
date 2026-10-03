from django.core import mail
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from .models import Announcement, MailingListSubscriber


class AnnouncementAPITestCase(APITestCase):
    def setUp(self):
        self.list_url = reverse('announcement-list-create')
        self.officer = User.objects.create_user(
            username='officer_ann',
            email='president@skyline.local',
            password='password123',
            role=User.ROLE_ADMIN
        )
        self.member_user = User.objects.create_user(
            username='member_ann',
            email='member@skyline.local',
            password='password123',
            role=User.ROLE_MEMBER
        )
        self.volunteer_user = User.objects.create_user(
            username='volunteer_ann',
            email='volunteer@skyline.local',
            password='password123',
            role=User.ROLE_VOLUNTEER
        )

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
        res_title = self.client.post(self.list_url, {
            'title': 'Hi',
            'body': 'Valid announcement body text',
            'audience': 'all'
        })
        self.assertEqual(res_title.status_code, status.HTTP_400_BAD_REQUEST)
        data_title = res_title.json().get('details', res_title.json())
        self.assertIn('title', data_title)

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

        res_get = self.client.get(detail_url)
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertEqual(res_get.json()['title'], 'Original Title')

        res_patch = self.client.patch(detail_url, {'title': 'Updated Title'})
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.json()['title'], 'Updated Title')

        res_delete = self.client.delete(detail_url)
        self.assertEqual(res_delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Announcement.objects.filter(id=ann.id).exists())

    def test_send_announcement_to_all_audience(self):
        subscriber = MailingListSubscriber.objects.create(email='external@skyline.local')
        ann = Announcement.objects.create(
            title='Weekly Newsletter',
            body='Here is what happened this week in Skyline Club!',
            audience=Announcement.AUDIENCE_ALL,
            author=self.officer
        )

        send_url = reverse('announcement-send', kwargs={'pk': ann.id})
        self.client.force_authenticate(user=self.officer)

        response = self.client.post(send_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn('recipients', data)
        self.assertIn('external@skyline.local', data['recipients'])
        self.assertIn('member@skyline.local', data['recipients'])
        self.assertIn('volunteer@skyline.local', data['recipients'])

        # Check Django mail outbox
        self.assertEqual(len(mail.outbox), 1)
        sent_email = mail.outbox[0]
        self.assertIn('Weekly Newsletter', sent_email.subject)
        self.assertIn('Here is what happened this week', sent_email.body)

        # Check database timestamp update
        ann.refresh_from_db()
        self.assertTrue(ann.is_sent)
        self.assertIsNotNone(ann.sent_at)

    def test_send_announcement_volunteers_only(self):
        ann = Announcement.objects.create(
            title='Volunteer Briefing',
            body='Briefing session for Saturday event setup',
            audience=Announcement.AUDIENCE_VOLUNTEERS
        )

        send_url = reverse('announcement-send', kwargs={'pk': ann.id})
        self.client.force_authenticate(user=self.officer)

        response = self.client.post(send_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn('volunteer@skyline.local', data['recipients'])
        self.assertNotIn('member@skyline.local', data['recipients'])

    def test_send_announcement_non_officer_denied(self):
        ann = Announcement.objects.create(
            title='Restricted Send',
            body='Only officers can dispatch this announcement',
            audience=Announcement.AUDIENCE_ALL
        )
        send_url = reverse('announcement-send', kwargs={'pk': ann.id})
        self.client.force_authenticate(user=self.member_user)

        response = self.client.post(send_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class MailingListSubscriberAPITestCase(APITestCase):
    def setUp(self):
        self.sub_url = reverse('subscriber-list-create')

    def test_subscribe_email_success(self):
        payload = {'email': 'newstudent@skyline.local'}
        response = self.client.post(self.sub_url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(MailingListSubscriber.objects.filter(email='newstudent@skyline.local').exists())

    def test_subscribe_invalid_email(self):
        response = self.client.post(self.sub_url, {'email': 'not-an-email'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
