import api from '../../lib/api';

export async function getAnnouncements(params = {}) {
  const response = await api.get('/announcements', { params });
  const data = response.data;
  return Array.isArray(data) ? data : data.results || [];
}

export async function getAnnouncementById(id) {
  const response = await api.get(`/announcements/${id}`);
  return response.data;
}

export async function createAnnouncement(payload) {
  const response = await api.post('/announcements', payload);
  return response.data;
}

export async function sendAnnouncement(id) {
  const response = await api.post(`/announcements/${id}/send`);
  return response.data;
}

export async function getSubscribers() {
  const response = await api.get('/announcements/subscribers');
  const data = response.data;
  return Array.isArray(data) ? data : data.results || [];
}

export async function subscribeEmail(email) {
  const response = await api.post('/announcements/subscribers', { email });
  return response.data;
}
