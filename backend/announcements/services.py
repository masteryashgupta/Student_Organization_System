from typing import List, Set
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone

from .models import Announcement, MailingListSubscriber

User = get_user_model()


def get_recipient_emails(audience: str) -> List[str]:
    """
    Resolves recipient email addresses based on target audience:
      - 'all': All active mailing subscribers + all active users/members
      - 'members': Active registered club members
      - 'volunteers': Registered volunteers

    Reads member data from accounts and members apps (read-only).
    """
    emails: Set[str] = set()

    # 1. Explicit Mailing List Subscribers
    active_subscribers = MailingListSubscriber.objects.filter(is_active=True)

    # 2. Account Users (accounts.models.User)
    active_users = User.objects.filter(is_active=True)

    if audience == Announcement.AUDIENCE_ALL:
        for subscriber in active_subscribers:
            if subscriber.email:
                emails.add(subscriber.email.lower().strip())

        for u in active_users:
            if u.email:
                emails.add(u.email.lower().strip())

    elif audience == Announcement.AUDIENCE_MEMBERS:
        # Members = Admin, Leader, or Member role
        member_roles = [User.ROLE_ADMIN, User.ROLE_LEADER, User.ROLE_MEMBER]
        for u in active_users.filter(role__in=member_roles):
            if u.email:
                emails.add(u.email.lower().strip())

    elif audience == Announcement.AUDIENCE_VOLUNTEERS:
        # Volunteers = Volunteer role
        for u in active_users.filter(role=User.ROLE_VOLUNTEER):
            if u.email:
                emails.add(u.email.lower().strip())

    # 3. Read-only fallback check for members.models.Member (if present)
    try:
        from members.models import Member
        members_qs = Member.objects.all()
        if audience == Announcement.AUDIENCE_MEMBERS:
            members_qs = members_qs.filter(status__iexact='active')
        elif audience == Announcement.AUDIENCE_VOLUNTEERS:
            members_qs = members_qs.filter(membership_type__iexact='volunteer')

        for m in members_qs:
            if m.email:
                emails.add(m.email.lower().strip())
    except Exception:
        pass

    return list(emails)


def dispatch_announcement_email(announcement: Announcement) -> dict:
    """
    Dispatches announcement email to target audience using Django's email backend.
    In development mode, default console backend prints message to terminal log (works offline).
    Updates announcement record with sent status and timestamp upon dispatch.
    """
    recipients = get_recipient_emails(announcement.audience)

    audience_title = announcement.get_audience_display()
    subject = f"[{audience_title}] {announcement.title}"
    body = f"Hello Skyline Club Community,\n\n{announcement.body}\n\n---\nSent by {announcement.author or 'Club Officer'} on {timezone.now().strftime('%Y-%m-%d %H:%M')}"
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Skyline Club <no-reply@skyline.local>')

    if recipients:
        send_mail(
            subject=subject,
            message=body,
            from_email=from_email,
            recipient_list=recipients,
            fail_silently=False,
        )

    announcement.is_sent = True
    announcement.sent_at = timezone.now()
    announcement.save()

    return {
        'message': f"Announcement '{announcement.title}' dispatched to {len(recipients)} recipient(s).",
        'recipient_count': len(recipients),
        'recipients': recipients,
        'sent_at': announcement.sent_at,
    }
