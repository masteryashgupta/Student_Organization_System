from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Membership, MembershipTier

User = get_user_model()


class MembershipTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipTier
        fields = "__all__"


class MembershipSerializer(serializers.ModelSerializer):
    tier_detail = MembershipTierSerializer(source="tier", read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    days_until_expiry = serializers.IntegerField(read_only=True)

    class Meta:
        model = Membership
        fields = [
            "id", "tier", "tier_detail", "status", "joined_on",
            "expires_on", "dues_paid", "is_valid", "days_until_expiry",
        ]
        read_only_fields = ["status", "expires_on", "dues_paid", "joined_on"]


class UserSerializer(serializers.ModelSerializer):
    membership = MembershipSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "full_name", "role", "phone", "membership", "date_joined",
        ]
        read_only_fields = ["role", "date_joined"]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    tier = serializers.PrimaryKeyRelatedField(
        queryset=MembershipTier.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = User
        fields = [
            "username", "email", "password",
            "first_name", "last_name", "phone", "tier",
        ]

    def create(self, validated_data):
        from django.db import transaction
        tier = validated_data.pop("tier", None)
        password = validated_data.pop("password")
        with transaction.atomic():
            user = User(**validated_data)
            user.set_password(password)
            user.role = User.Role.MEMBER
            user.save()
            Membership.objects.create(user=user, tier=tier)
        return user
