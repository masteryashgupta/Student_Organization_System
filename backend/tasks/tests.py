from decimal import Decimal
from datetime import date, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APIClient
from rest_framework import status
from .models import Project, Task

User = get_user_model()


class TaskModelTests(TestCase):
    def setUp(self):
        self.officer = User.objects.create_user(
            username='lead_officer',
            email='officer@skyline.edu',
            password='password123',
            role=User.ROLE_LEADER,
            name='Jane Lead'
        )
        self.volunteer = User.objects.create_user(
            username='volunteer_bob',
            email='bob@skyline.edu',
            password='password123',
            role=User.ROLE_VOLUNTEER,
            name='Bob Baker'
        )
        self.project = Project.objects.create(
            name='Spring Bake Sale Fundraiser',
            description='Raising funds for the annual club hackathon.',
            goal_amount=Decimal('500.00'),
            status=Project.STATUS_ACTIVE,
            created_by=self.officer
        )

    def test_project_creation_and_properties(self):
        self.assertEqual(self.project.name, 'Spring Bake Sale Fundraiser')
        self.assertEqual(self.project.goal_amount, Decimal('500.00'))
        self.assertEqual(self.project.total_tasks, 0)
        self.assertEqual(self.project.completed_tasks, 0)
        self.assertEqual(self.project.progress_percentage, 0)

    def test_project_negative_goal_fails_validation(self):
        project = Project(
            name='Invalid Project',
            goal_amount=Decimal('-50.00'),
            status=Project.STATUS_ACTIVE
        )
        with self.assertRaises(ValidationError):
            project.full_clean()

    def test_task_creation_and_completion_progress(self):
        task1 = Task.objects.create(
            project=self.project,
            title='Bake 3 dozen chocolate chip cookies',
            description='Nut-free recipe requested',
            assignee=self.volunteer,
            status=Task.STATUS_TODO,
            priority=Task.PRIORITY_HIGH,
            due_date=date.today() + timedelta(days=2)
        )
        task2 = Task.objects.create(
            project=self.project,
            title='Buy paper plates and napkins',
            assignee=self.volunteer,
            status=Task.STATUS_DONE,
            priority=Task.PRIORITY_MEDIUM,
            due_date=date.today() + timedelta(days=1)
        )

        self.assertEqual(self.project.total_tasks, 2)
        self.assertEqual(self.project.completed_tasks, 1)
        self.assertEqual(self.project.progress_percentage, 50)
        self.assertEqual(task1.assignee_display_name, 'Bob Baker')
        self.assertFalse(task1.is_overdue)

    def test_task_without_project_fails_validation(self):
        task = Task(
            title='Orphan task without project',
            status=Task.STATUS_TODO
        )
        with self.assertRaises(ValidationError):
            task.full_clean()

    def test_task_invalid_status_fails_validation(self):
        task = Task(
            project=self.project,
            title='Invalid status task',
            status='invalid_status_xyz'
        )
        with self.assertRaises(ValidationError):
            task.full_clean()


class TaskAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.officer = User.objects.create_user(
            username='officer_alice',
            email='alice@skyline.edu',
            password='password123',
            role=User.ROLE_LEADER,
            name='Alice Organizer'
        )
        self.volunteer = User.objects.create_user(
            username='volunteer_charlie',
            email='charlie@skyline.edu',
            password='password123',
            role=User.ROLE_VOLUNTEER,
            name='Charlie Cook'
        )
        self.project = Project.objects.create(
            name='Campus Charity Car Wash',
            description='Community fundraiser in parking lot B',
            goal_amount=Decimal('750.00'),
            status=Project.STATUS_ACTIVE,
            created_by=self.officer
        )
        self.task = Task.objects.create(
            project=self.project,
            title='Buy car wash soap & sponges',
            assignee=self.volunteer,
            status=Task.STATUS_TODO,
            priority=Task.PRIORITY_MEDIUM,
            due_date=date.today() + timedelta(days=3)
        )

    def test_list_projects(self):
        response = self.client.get('/api/projects/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], 'Campus Charity Car Wash')
        self.assertEqual(results[0]['total_tasks'], 1)

    def test_create_project(self):
        payload = {
            'name': 'Winter Clothing Drive',
            'description': 'Collecting coats and blankets',
            'goal_amount': '1200.00',
            'status': 'active'
        }
        response = self.client.post('/api/projects/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Winter Clothing Drive')
        self.assertEqual(Decimal(str(response.data['goal_amount'])), Decimal('1200.00'))

    def test_get_project_tasks_endpoint(self):
        response = self.client.get(f'/api/projects/{self.project.id}/tasks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Buy car wash soap & sponges')

    def test_create_task_validation_success(self):
        payload = {
            'project': self.project.id,
            'title': 'Run cash & check-in table (10am-12pm)',
            'description': 'Handle cash box and sign-in sheets',
            'assignee': self.volunteer.id,
            'status': 'todo',
            'priority': 'high',
            'due_date': str(date.today() + timedelta(days=2))
        }
        response = self.client.post('/api/tasks/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Run cash & check-in table (10am-12pm)')
        self.assertEqual(response.data['project_name'], 'Campus Charity Car Wash')
        self.assertEqual(response.data['assignee_name'], 'Charlie Cook')

    def test_create_task_missing_project_fails(self):
        payload = {
            'title': 'Orphan task without project',
            'status': 'todo'
        }
        response = self.client.post('/api/tasks/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        err_details = response.data.get('details', response.data)
        self.assertIn('project', err_details)

    def test_create_task_invalid_status_fails(self):
        payload = {
            'project': self.project.id,
            'title': 'Task with bad status',
            'status': 'not_a_valid_status'
        }
        response = self.client.post('/api/tasks/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_task_status_action(self):
        # Move task to doing
        response = self.client.post(f'/api/tasks/{self.task.id}/update_status/', {'status': 'doing'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'doing')

        # Move task to done
        response = self.client.post(f'/api/tasks/{self.task.id}/update_status/', {'status': 'done'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'done')

    def test_assign_and_unassign_task_action(self):
        new_volunteer = User.objects.create_user(
            username='dave_volunteer',
            email='dave@skyline.edu',
            password='password123',
            name='Dave Detail'
        )
        # Reassign task to Dave
        response = self.client.post(f'/api/tasks/{self.task.id}/assign/', {'user_id': new_volunteer.id}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['task']['assignee'], new_volunteer.id)

        # Unassign task
        response = self.client.post(f'/api/tasks/{self.task.id}/unassign/', format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['task']['assignee'])
