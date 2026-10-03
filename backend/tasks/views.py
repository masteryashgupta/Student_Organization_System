from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from .models import Project, Task
from .serializers import ProjectSerializer, TaskSerializer

User = get_user_model()


class ProjectViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Fundraiser Projects.
    GET /api/projects/ - List all projects
    POST /api/projects/ - Create a new fundraiser project
    GET /api/projects/{id}/ - Retrieve project details with nested tasks
    PUT/PATCH /api/projects/{id}/ - Update project details
    DELETE /api/projects/{id}/ - Delete project
    """
    queryset = Project.objects.prefetch_related('tasks__assignee').all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'goal_amount', 'name']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        return queryset

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(created_by=user)

    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        """
        GET /api/projects/{id}/tasks/
        Returns all tasks for this specific project.
        """
        project = self.get_object()
        tasks = project.tasks.select_related('assignee', 'project').all()
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)


class TaskViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Volunteer Tasks.
    GET /api/tasks/ - List all tasks (filterable by project, status, assignee)
    POST /api/tasks/ - Create a new volunteer task
    GET /api/tasks/{id}/ - Retrieve task details
    PUT/PATCH /api/tasks/{id}/ - Update task
    DELETE /api/tasks/{id}/ - Delete task
    POST /api/tasks/{id}/update_status/ - Fast status transition (todo/doing/done)
    POST /api/tasks/{id}/assign/ - Assign task to user (or self-claim)
    POST /api/tasks/{id}/unassign/ - Release task assignment
    """
    queryset = Task.objects.select_related('project', 'assignee').all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'project__name', 'assignee__name', 'assignee__username']
    ordering_fields = ['due_date', 'status', 'priority', 'created_at']
    ordering = ['due_date', 'status', '-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()

        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        assignee_id = self.request.query_params.get('assignee')
        if assignee_id:
            if assignee_id.lower() == 'unassigned':
                queryset = queryset.filter(assignee__isnull=True)
            elif assignee_id.lower() == 'me' and self.request.user.is_authenticated:
                queryset = queryset.filter(assignee=self.request.user)
            else:
                queryset = queryset.filter(assignee_id=assignee_id)

        priority_param = self.request.query_params.get('priority')
        if priority_param:
            queryset = queryset.filter(priority=priority_param)

        return queryset

    @action(detail=False, methods=['get'])
    def assignees(self, request):
        """
        GET /api/tasks/assignees/
        Returns list of eligible assignees (members, volunteers, officers, active users).
        """
        from .serializers import UserSimpleSerializer
        users = User.objects.filter(is_active=True).order_by('name', 'username')
        return Response(UserSimpleSerializer(users, many=True).data)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """
        POST /api/tasks/{id}/update_status/
        Payload: { "status": "doing" } or { "status": "done" }
        """
        task = self.get_object()
        new_status = request.data.get('status')
        if not new_status or new_status not in [Task.STATUS_TODO, Task.STATUS_DOING, Task.STATUS_DONE]:
            return Response(
                {"status": "error", "message": f"Invalid status. Must be one of: {', '.join([Task.STATUS_TODO, Task.STATUS_DOING, Task.STATUS_DONE])}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        task.status = new_status
        task.save(update_fields=['status', 'updated_at'])
        return Response(TaskSerializer(task).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """
        POST /api/tasks/{id}/assign/
        Payload: { "user_id": 3 } or empty payload (self-assign to request.user)
        """
        task = self.get_object()
        user_id = request.data.get('user_id')

        target_user = None
        if user_id:
            target_user = get_object_or_404(User, pk=user_id)
        elif request.user and request.user.is_authenticated:
            target_user = request.user
        else:
            return Response(
                {"status": "error", "message": "Please specify a 'user_id' or log in to claim this task."},
                status=status.HTTP_400_BAD_REQUEST
            )

        task.assignee = target_user
        task.save(update_fields=['assignee', 'updated_at'])
        return Response(
            {
                "status": "success",
                "message": f"Task '{task.title}' assigned to {task.assignee_display_name}.",
                "task": TaskSerializer(task).data,
            },
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    def unassign(self, request, pk=None):
        """
        POST /api/tasks/{id}/unassign/
        Releases the task assignment back to unassigned status.
        """
        task = self.get_object()
        task.assignee = None
        task.save(update_fields=['assignee', 'updated_at'])
        return Response(
            {
                "status": "success",
                "message": f"Task '{task.title}' is now unassigned.",
                "task": TaskSerializer(task).data,
            },
            status=status.HTTP_200_OK
        )
