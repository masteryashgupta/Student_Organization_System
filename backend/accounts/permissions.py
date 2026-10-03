from rest_framework import permissions


class IsOfficerOrTreasurer(permissions.BasePermission):
    """Write access for officers/treasurers; read for any authenticated user."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff_role or request.user.is_superuser)
        )


class IsTreasurer(permissions.BasePermission):
    """Only treasurer / superuser (used for sensitive finance endpoints)."""

    def has_permission(self, request, view):
        u = request.user
        return bool(
            u
            and u.is_authenticated
            and (u.role == "treasurer" or u.is_superuser)
        )
