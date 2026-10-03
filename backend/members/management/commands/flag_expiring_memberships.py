from datetime import timedelta
from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from members.models import Membership, RenewalReminder


class Command(BaseCommand):
    help = "Finds memberships expiring within N days, flags expired memberships, and queues/sends renewal email reminders."

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Number of threshold days before expiry to check (default: 30)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Perform a trial run without sending emails or creating database records'
        )

    def handle(self, *args, **options):
        days_threshold = options['days']
        dry_run = options['dry_run']
        today = timezone.now().date()
        target_expiry_date = today + timedelta(days=days_threshold)

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"--- Flagging Expiring Memberships (Threshold: {days_threshold} days | Today: {today}) ---"
        ))

        # 1. Update status of past expired memberships
        expired_memberships = Membership.objects.filter(
            end_date__lt=today,
            status=Membership.STATUS_ACTIVE
        )
        expired_count = expired_memberships.count()

        if not dry_run and expired_count > 0:
            for m in expired_memberships:
                m.status = Membership.STATUS_EXPIRED
                m.save()
            self.stdout.write(self.style.WARNING(f"Flagged {expired_count} active memberships as EXPIRED."))
        elif dry_run:
            self.stdout.write(self.style.WARNING(f"[DRY-RUN] Would flag {expired_count} memberships as EXPIRED."))

        # 2. Find active memberships expiring within N days
        expiring_memberships = Membership.objects.filter(
            status=Membership.STATUS_ACTIVE,
            dues_paid=True,
            end_date__gte=today,
            end_date__lte=target_expiry_date
        ).select_related('user', 'tier')

        found_count = expiring_memberships.count()
        self.stdout.write(f"Found {found_count} active memberships expiring on or before {target_expiry_date}.")

        reminder_count = 0
        for membership in expiring_memberships:
            days_left = membership.days_until_expiry
            user = membership.user
            email = user.email

            if not email:
                self.stdout.write(self.style.NOTICE(f"Skipping User #{user.id} ({user.name}): No email address."))
                continue

            # Prevent duplicate reminders sent in the last 7 days for the same threshold
            recent_reminder = RenewalReminder.objects.filter(
                membership=membership,
                sent_at__gte=timezone.now() - timedelta(days=7)
            ).exists()

            if recent_reminder:
                self.stdout.write(f"Skipping {email}: Reminder already sent within the past 7 days.")
                continue

            subject = f"Skyline Club Membership Renewal Notice — {days_left} Days Remaining"
            message_body = (
                f"Hello {user.name or user.username},\n\n"
                f"Your Skyline Student Association membership ({membership.tier.name}) will expire in {days_left} days on {membership.end_date}.\n"
                f"Please renew your dues to retain your ticket & merch discounts and member benefits.\n\n"
                f"Sign in to your account at http://localhost:5173 to renew.\n\n"
                f"Best regards,\nSkyline Student Association Team"
            )

            if dry_run:
                self.stdout.write(self.style.SUCCESS(
                    f"[DRY-RUN] Would send email to {email} ({days_left} days left)"
                ))
            else:
                # Send email via Django mail backend (console backend in dev for offline compatibility)
                send_mail(
                    subject=subject,
                    message=message_body,
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@skyline.edu'),
                    recipient_list=[email],
                    fail_silently=False,
                )

                # Record reminder log
                RenewalReminder.objects.create(
                    membership=membership,
                    days_before_expiry=days_left,
                    email_to=email,
                    message_body=message_body,
                    status='sent'
                )
                reminder_count += 1
                self.stdout.write(self.style.SUCCESS(f"Sent renewal reminder to {email} ({days_left} days left)."))

        self.stdout.write(self.style.SUCCESS(
            f"Finished flagging expiring memberships. Processed {reminder_count} reminders."
        ))
