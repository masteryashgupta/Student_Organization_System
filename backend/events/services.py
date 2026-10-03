from rest_framework.exceptions import ValidationError
from .models import Event, Ticket


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
