from django.urls import path
from .views import (
    MembershipTierListCreateView,
    MembershipTierDetailView,
    MembershipListCreateView,
    MembershipDetailView,
    MyMembershipDiscountView,
)

urlpatterns = [
    path('membership-tiers', MembershipTierListCreateView.as_view(), name='membership-tier-list'),
    path('membership-tiers/<int:pk>', MembershipTierDetailView.as_view(), name='membership-tier-detail'),
    path('members/me', MyMembershipDiscountView.as_view(), name='my-membership-discount'),
    path('members', MembershipListCreateView.as_view(), name='member-list'),
    path('members/<int:pk>', MembershipDetailView.as_view(), name='member-detail'),
]
