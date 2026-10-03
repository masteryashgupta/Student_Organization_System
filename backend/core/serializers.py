from rest_framework import serializers
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id',
            'type',
            'type_display',
            'category',
            'category_display',
            'amount',
            'date',
            'source',
            'description',
            'created_at',
        ]
        read_only_fields = fields
