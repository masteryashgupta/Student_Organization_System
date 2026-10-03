from rest_framework import serializers
from .models import Transaction, Reimbursement


class TransactionSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField()
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id", "direction", "category", "category_display", "amount",
            "description", "member", "member_name", "source_ref", "created_at",
        ]

    def get_member_name(self, obj):
        return obj.member.get_full_name() or obj.member.username if obj.member else None


class ReimbursementSerializer(serializers.ModelSerializer):
    volunteer_name = serializers.SerializerMethodField()

    class Meta:
        model = Reimbursement
        fields = [
            "id", "volunteer", "volunteer_name", "amount", "reason",
            "receipt", "status", "transaction", "created_at",
        ]
        read_only_fields = ["status", "transaction", "volunteer"]

    def get_volunteer_name(self, obj):
        return obj.volunteer.get_full_name() or obj.volunteer.username
