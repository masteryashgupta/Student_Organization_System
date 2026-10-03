import api from '../../lib/api';

/**
 * Events and Ticketing API service.
 * Connects to the backend REST API running on Django/PostgreSQL.
 */

export async function fetchEvents(status) {
  const params = status ? { status } : {};
  const res = await api.get('/events/', { params });
  // Handle paginated responses (results array) or direct array
  return Array.isArray(res.data) ? res.data : (res.data.results || []);
}

export async function fetchEventById(id) {
  const res = await api.get(`/events/${id}/`);
  return res.data;
}

export async function fetchEventAvailability(id) {
  const res = await api.get(`/events/${id}/availability/`);
  return res.data;
}

export async function fetchMemberStatus() {
  /**
   * // MOCK /api/members/me: swap at integration
   * Attempts to fetch member discount contract; falls back gracefully
   * to non-member status (0% discount) if endpoint is unavailable or user is not logged in.
   */
  try {
    const res = await api.get('/members/me');
    return res.data;
  } catch (err) {
    // // MOCK /api/members/me: swap at integration
    return {
      is_active_member: false,
      tier: null,
      ticket_discount_pct: 0,
      merch_discount_pct: 0,
      expires_on: null,
    };
  }
}

export async function purchaseTicket(eventId, ticketData) {
  const res = await api.post(`/events/${eventId}/tickets/`, ticketData);
  return res.data;
}

export async function checkInTicket(token) {
  const res = await api.post(`/tickets/${token}/check-in/`);
  return res.data;
}

export async function fetchCheckInFeed(eventId) {
  const res = await api.get(`/events/${eventId}/checkin-feed/`);
  return res.data;
}

export async function fetchEventStats(eventId) {
  const res = await api.get(`/events/${eventId}/stats/`);
  return res.data;
}
