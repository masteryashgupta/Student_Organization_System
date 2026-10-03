from rest_framework.permissions import BasePermission


class IsOfficer(BasePermission):
    """
    Allows access only to Officers (Admins or Club Leaders).
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_officer
        )


class IsAdminRole(BasePermission):
    """
    Allows access only to Admin role users.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == request.user.ROLE_ADMIN or request.user.is_superuser)
        )


class IsMemberRole(BasePermission):
    """
    Allows access to Members, Leaders, and Admins.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_club_member
        )
