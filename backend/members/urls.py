from django.urls import path
from .views import (
    MembershipTierListCreateView,
    MembershipTierDetailView,
    MembershipListCreateView,
    MembershipDetailView,
    MyMembershipDiscountView,
    MyMembershipProfileView,
    ExpiringMembershipsView,
    MemberVerifyView,
    PayDuesView,
    JoinClubView,
)

urlpatterns = [
    path('membership-tiers', MembershipTierListCreateView.as_view(), name='membership-tier-list'),
    path('membership-tiers/<int:pk>', MembershipTierDetailView.as_view(), name='membership-tier-detail'),
    path('members/me', MyMembershipDiscountView.as_view(), name='my-membership-discount'),
    path('members/profile/me', MyMembershipProfileView.as_view(), name='my-membership-profile'),
    path('members/join', JoinClubView.as_view(), name='member-join'),
    path('members/verify', MemberVerifyView.as_view(), name='member-verify'),
    path('members/expiring', ExpiringMembershipsView.as_view(), name='members-expiring-list'),
    path('members/pay-dues', PayDuesView.as_view(), name='member-pay-my-dues'),
    path('members/<int:pk>/pay-dues', PayDuesView.as_view(), name='member-pay-dues'),
    path('members', MembershipListCreateView.as_view(), name='member-list'),
    path('members/<int:pk>', MembershipDetailView.as_view(), name='member-detail'),
]


