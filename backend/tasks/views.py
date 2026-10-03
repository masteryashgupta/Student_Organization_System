from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Task, Fundraiser
from .serializers import TaskSerializer, FundraiserSerializer
from accounts.permissions import IsOfficerOrTreasurer

class FundraiserViewSet(viewsets.ModelViewSet):
    queryset = Fundraiser.objects.prefetch_related("tasks")
    serializer_class = FundraiserSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsOfficerOrTreasurer()]

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.select_related("assignee", "fundraiser")
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        fundraiser = self.request.query_params.get("fundraiser")
        if fundraiser:
            qs = qs.filter(fundraiser=fundraiser)
        return qs
