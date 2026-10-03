import api from '../../lib/api';

export async function getFinanceSummary(params = {}) {
  const response = await api.get('/finance/summary', { params });
  return response.data;
}

export async function getTransactions(params = {}) {
  const response = await api.get('/finance/transactions', { params });
  const data = response.data;
  return {
    results: Array.isArray(data) ? data : data.results || [],
    count: data.count || (Array.isArray(data) ? data.length : 0),
  };
}

export async function createManualTransaction(payload) {
  const response = await api.post('/finance/transactions', payload);
  return response.data;
}

export async function getReimbursements(params = {}) {
  const response = await api.get('/reimbursements', { params });
  const data = response.data;
  return Array.isArray(data) ? data : data.results || [];
}

export async function createReimbursement(formData) {
  const response = await api.post('/reimbursements', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

export async function approveReimbursement(id, notes = '') {
  const response = await api.post(`/reimbursements/${id}/approve`, { notes });
  return response.data;
}

export async function rejectReimbursement(id, notes = '') {
  const response = await api.post(`/reimbursements/${id}/reject`, { notes });
  return response.data;
}

export async function markReimbursementPaid(id, notes = '') {
  const response = await api.post(`/reimbursements/${id}/mark-paid`, { notes });
  return response.data;
}
