// ──────────────────────────────────────────────
// Axios HTTP client — base configuration + auth interceptor
// ──────────────────────────────────────────────

import axios from 'axios';

/*
 * Create a pre-configured Axios instance with sensible defaults.
 *
 * - baseURL: points at the backend API (overridable via VITE_API_URL).
 * - timeout: 10 seconds — fail fast instead of hanging indefinitely.
 * - headers: every request is JSON unless overridden later.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/*
 * Request interceptor — runs before every outgoing HTTP request.
 *
 * Why this exists:  The backend expects a Bearer JWT for protected routes.
 * Rather than passing the token manually in every `api.get(...)` call, we
 * inject it globally here.
 */
api.interceptors.request.use((config) => {
  // Read the JWT from localStorage (saved by AuthContext on login)
  const token = localStorage.getItem('token');

  // If a token exists, attach it as an Authorization header
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Pass the (potentially modified) config through
  return config;
});

export default api;
