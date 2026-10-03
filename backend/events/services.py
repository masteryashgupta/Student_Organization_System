import io
import base64
import uuid
from decimal import Decimal
import qrcode
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import Event, Ticket


def generate_ticket_qr_bytes(token: str) -> bytes:
    """
    Generates a PNG image of a QR code encoding the ticket UUID token.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(str(token))
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


def generate_ticket_qr_data_url(token: str) -> str:
    """
    Generates a base64 Data URL string of the ticket QR code.
    Format: data:image/png;base64,...
    """
    raw_bytes = generate_ticket_qr_bytes(token)
    encoded = base64.b64encode(raw_bytes).decode('utf-8')
    return f"data:image/png;base64,{encoded}"


def get_event_availability(event: Event) -> dict:
    """
    Computes real-time availability directly from the database ticket count.
    
    Returns:
        dict: {
            "capacity": int,
            "sold": int,
            "remaining": int
        }
    """
    return event.get_availability()


def check_event_availability(event: Event, quantity: int = 1) -> dict:
    """
    Reusable validation check that ensures tickets can be sold for an event.
    
    Enforces:
    1. Event must be in 'published' status (not draft or closed).
    2. Event remaining seats must be > 0.
    3. Requested quantity must not exceed remaining seats.
    
    Raises:
        ValidationError: If the event is sold out, closed, or requested quantity exceeds capacity.
        
    Returns:
        dict: Current availability dictionary {'capacity', 'sold', 'remaining'}.
    """
    if event.status != Event.STATUS_PUBLISHED:
        raise ValidationError({
            "detail": f"Ticket sales are not active for this event (current status: '{event.get_status_display()}')."
        })

    availability = get_event_availability(event)
    remaining = availability['remaining']

    if remaining <= 0:
        raise ValidationError({
            "detail": "This event is completely sold out. No tickets remaining."
        })

    if quantity > remaining:
        raise ValidationError({
            "detail": f"Cannot purchase {quantity} ticket(s). Only {remaining} seat(s) remaining."
        })

    return availability


def get_buyer_member_info(request=None, user=None) -> dict:
    """
    Determines whether the buyer is an active club member and any discount pct.
    """
    if user and user.is_authenticated:
        try:
            from members.models import Membership
            membership = Membership.objects.select_related('tier').get(user=user)
            if membership.is_active_member:
                return {
                    'is_active_member': True,
                    'tier': membership.tier.name if membership.tier else None,
                    'ticket_discount_pct': float(membership.tier.ticket_discount_pct) if membership.tier else 0.0,
                }
        except Exception:
            pass

    return {
        'is_active_member': False,
        'tier': None,
        'ticket_discount_pct': 0.0,
    }


def calculate_ticket_price(event: Event, member_info: dict) -> tuple:
    """
    Calculates ticket type ('member' or 'nonmember') and price paid based on membership status.
    
    Returns:
        tuple[str, Decimal]: (ticket_type, price_paid)
    """
    if member_info.get('is_active_member', False):
        ticket_type = Ticket.TYPE_MEMBER
        base_price = event.member_price
        discount_pct = Decimal(str(member_info.get('ticket_discount_pct', 0.0)))
        if discount_pct > Decimal('0.00') and event.nonmember_price > Decimal('0.00'):
            discounted_price = (event.nonmember_price * (Decimal('1.00') - (discount_pct / Decimal('100.00')))).quantize(Decimal('0.01'))
            final_price = min(base_price, discounted_price)
        else:
            final_price = base_price
    else:
        ticket_type = Ticket.TYPE_NONMEMBER
        final_price = event.nonmember_price

    return ticket_type, max(Decimal('0.00'), final_price)


@transaction.atomic
def purchase_ticket(event_id: int, buyer_user=None, holder_name: str = "", holder_email: str = "", request=None) -> Ticket:
    """
    Atomically purchases a ticket for an event with strict concurrency protection.
    
    1. Locks the Event row via select_for_update() to serialize concurrent purchases.
    2. Re-checks live capacity under the lock to prevent overselling.
    3. Resolves member vs non-member pricing via GET /api/members/me (or mock).
    4. Validates buyer details.
    5. Generates unique UUID token and creates Ticket.
    6. Records income transaction in core ledger via core.record_transaction.
    """
    # 1. Lock event row to prevent race conditions on last seat
    try:
        event = Event.objects.select_for_update().get(id=event_id)
    except Event.DoesNotExist:
        raise ValidationError({"detail": f"Event with id {event_id} does not exist."})

    # Validate event is published
    if event.status != Event.STATUS_PUBLISHED:
        raise ValidationError({
            "detail": f"Cannot purchase tickets for an event that is {event.get_status_display().lower()}."
        })

    # 2. Re-check availability under lock
    sold_count = event.tickets.exclude(status=Ticket.STATUS_CANCELLED).count()
    if sold_count >= event.capacity:
        raise ValidationError({"detail": "This event is completely sold out. No tickets remaining."})

    # 3. Determine pricing (member vs nonmember)
    member_info = get_buyer_member_info(request=request, user=buyer_user)
    ticket_type, price_paid = calculate_ticket_price(event, member_info)

    # 4. Validate buyer details
    if buyer_user and buyer_user.is_authenticated:
        if not holder_name:
            holder_name = getattr(buyer_user, 'name', '') or buyer_user.username
        if not holder_email:
            holder_email = buyer_user.email
    elif not holder_name or not holder_email:
        raise ValidationError({
            "detail": "Both holder_name and holder_email are required for ticket purchases."
        })

    # 5. Generate unique UUID token and create Ticket
    ticket = Ticket.objects.create(
        event=event,
        holder=buyer_user if (buyer_user and buyer_user.is_authenticated) else None,
        holder_name=holder_name,
        holder_email=holder_email,
        type=ticket_type,
        price_paid=price_paid,
        status=Ticket.STATUS_VALID,
        token=uuid.uuid4(),
    )

    # 6. Call core.record_transaction on successful ticket purchase
    if price_paid > Decimal('0.00'):
        try:
            from core.services import record_transaction
            record_transaction(
                type='income',
                category='ticket',
                amount=price_paid,
                source=f"Ticket #{ticket.token}",
                description=f"Ticket purchase for '{event.title}' ({ticket.get_type_display()}) by {holder_name} ({holder_email})"
            )
        except Exception as exc:
            # Transaction atomic rolls back everything if ledger fails
            raise ValidationError({"detail": f"Failed to record ticket transaction in central ledger: {str(exc)}"})

    return ticket


from django.core.exceptions import ValidationError as DjangoValidationError

@transaction.atomic
def check_in_ticket(token: str) -> Ticket:
    """
    Validates and marks a ticket as checked in.
    Uses select_for_update() inside transaction.atomic to prevent double check-ins
    under concurrent scan conditions.
    
    Raises:
        ValidationError:
            - If ticket token is unknown / does not exist (404)
            - If ticket is cancelled (400)
            - If ticket is already checked in (400 with timestamp)
    """
    try:
        # Lock ticket row exclusively
        ticket = Ticket.objects.select_for_update().select_related('event').get(token=token)
    except (Ticket.DoesNotExist, ValueError, DjangoValidationError):
        raise ValidationError({
            "detail": "Ticket not found. Invalid or unknown ticket token."
        })

    if ticket.status == Ticket.STATUS_CANCELLED:
        raise ValidationError({
            "detail": "This ticket has been cancelled and cannot be used for admission."
        })

    if ticket.status == Ticket.STATUS_CHECKED_IN:
        timestamp_str = ticket.checked_in_at.strftime('%Y-%m-%d %H:%M:%S UTC') if ticket.checked_in_at else "previously"
        raise ValidationError({
            "detail": f"Double check-in rejected: Ticket was already checked in at {timestamp_str}."
        })

    # Mark checked in
    ticket.status = Ticket.STATUS_CHECKED_IN
    ticket.checked_in_at = timezone.now()
    ticket.save(update_fields=['status', 'checked_in_at', 'updated_at'])
    return ticket


def get_event_checkin_feed(event: Event, limit: int = 50) -> dict:
    """
    Computes real-time check-in stats and recent check-ins feed for an event.
    """
    total_sold = event.tickets.exclude(status=Ticket.STATUS_CANCELLED).count()
    checked_in_count = event.tickets.filter(status=Ticket.STATUS_CHECKED_IN).count()
    attendance_pct = round((checked_in_count / total_sold * 100), 1) if total_sold > 0 else 0.0

    recent_tickets = event.tickets.filter(
        status=Ticket.STATUS_CHECKED_IN
    ).order_by('-checked_in_at')[:limit]

    feed_items = [
        {
            "token": str(t.token),
            "holder_name": t.holder_name,
            "holder_email": t.holder_email,
            "type": t.type,
            "checked_in_at": t.checked_in_at,
        }
        for t in recent_tickets
    ]

    return {
        "event_id": event.id,
        "event_title": event.title,
        "capacity": event.capacity,
        "total_sold": total_sold,
        "checked_in_count": checked_in_count,
        "attendance_pct": attendance_pct,
        "recent_checkins": feed_items,
    }


def get_event_stats(event: Event) -> dict:
    """
    Computes comprehensive post-event and live statistics derived directly from the tickets ledger:
    - Tickets sold (total and broken down by member/non-member)
    - Attendance (checked-in count)
    - Attendance rate (checked-in count / tickets sold)
    - Revenue (sum of price_paid, split by member and non-member)
    
    All figures are derived directly in real-time from the Ticket rows (Single Source of Truth).
    """
    active_tickets = event.tickets.exclude(status=Ticket.STATUS_CANCELLED)

    agg = active_tickets.aggregate(
        total_sold=Count('id'),
        member_sold=Count('id', filter=Q(type=Ticket.TYPE_MEMBER)),
        nonmember_sold=Count('id', filter=Q(type=Ticket.TYPE_NONMEMBER)),
        checked_in_count=Count('id', filter=Q(status=Ticket.STATUS_CHECKED_IN)),
        total_revenue=Sum('price_paid', default=Decimal('0.00')),
        member_revenue=Sum('price_paid', filter=Q(type=Ticket.TYPE_MEMBER), default=Decimal('0.00')),
        nonmember_revenue=Sum('price_paid', filter=Q(type=Ticket.TYPE_NONMEMBER), default=Decimal('0.00')),
    )

    total_sold = agg['total_sold'] or 0
    checked_in_count = agg['checked_in_count'] or 0
    attendance_rate = round((checked_in_count / total_sold * 100), 2) if total_sold > 0 else 0.0

    return {
        "event_id": event.id,
        "event_title": event.title,
        "capacity": event.capacity,
        "tickets_sold": total_sold,
        "tickets_sold_breakdown": {
            "member": agg['member_sold'] or 0,
            "nonmember": agg['nonmember_sold'] or 0,
        },
        "attendance": checked_in_count,
        "attendance_rate": attendance_rate,
        "revenue": {
            "total": agg['total_revenue'] or Decimal('0.00'),
            "member": agg['member_revenue'] or Decimal('0.00'),
            "nonmember": agg['nonmember_revenue'] or Decimal('0.00'),
        },
        "total_revenue": agg['total_revenue'] or Decimal('0.00'),
        "member_revenue": agg['member_revenue'] or Decimal('0.00'),
        "nonmember_revenue": agg['nonmember_revenue'] or Decimal('0.00'),
        "checked_in_count": checked_in_count,
    }

