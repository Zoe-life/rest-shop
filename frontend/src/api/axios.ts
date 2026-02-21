import axios from 'axios';

// Get backend URL from environment variable.
// In development, fall back to localhost. In production, VITE_BACKEND_URL must be set
// (e.g. to the Cloudflare Worker URL). Using localhost in production would cause the
// browser to block requests as mixed content (HTTPS page → HTTP target → ERR_NETWORK).
const API_URL = import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data on unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
    }
    return Promise.reject(error);
  }
);
