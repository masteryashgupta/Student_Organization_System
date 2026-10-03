import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export function extractErrorMessage(error, defaultMessage = 'An unexpected error occurred.') {
  if (!error) return defaultMessage;

  // Timeout or Network Failure
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'Request timed out. Please check your connection and try again.';
  }
  if (error.message === 'Network Error' || !error.response) {
    return 'Network failure. Please verify the backend server is reachable.';
  }

  const { status, data } = error.response;

  // Custom backend envelope { details, message, detail }
  if (data?.details && typeof data.details === 'object') {
    const firstKey = Object.keys(data.details)[0];
    const firstVal = data.details[firstKey];
    if (Array.isArray(firstVal) && firstVal.length > 0) {
      return `${firstKey}: ${firstVal[0]}`;
    }
    if (typeof firstVal === 'string') {
      return `${firstKey}: ${firstVal}`;
    }
  }

  if (data?.message) return String(data.message);
  if (data?.detail) return String(data.detail);

  // Standard HTTP status fallbacks
  switch (status) {
    case 400:
      return 'Bad request. Please review your submitted data.';
    case 401:
      return 'Session expired or unauthorized. Please sign in again.';
    case 403:
      return 'Permission denied. You do not have authorization for this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'Conflict: The resource is in use or was already modified.';
    case 422:
      return 'Validation failed. Please verify the input values.';
    case 429:
      return 'Too many requests. Please slow down and try again shortly.';
    case 500:
    case 502:
    case 503:
      return 'Server error. The organization server encountered an issue.';
    default:
      return defaultMessage;
  }
}

export default api;
