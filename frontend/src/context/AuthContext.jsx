// ──────────────────────────────────────────────
// Auth context — manages global authentication state
// (user object, login, register, logout, token)
// ──────────────────────────────────────────────

import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

// ── Context (default value is empty — provider fills it) ──
const AuthContext = createContext();

// ── Provider component ──
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /*
   * On mount: attempt to restore a previously authenticated session
   * by reading a JWT from localStorage and validating it against the server.
   *
   * Why this exists:  If the user refreshes the page, we don't want them
   * to see the login screen briefly before the token check completes.
   * The `loading` flag prevents that flash.
   */
  useEffect(() => {
    const loadUser = async () => {
      const savedToken = localStorage.getItem('token');

      // No stored token — nothing to restore, skip network request
      if (!savedToken) {
        setLoading(false);
        return;
      }

      // Token exists — ask the server if it's still valid
      try {
        const response = await api.get('/auth/profile');
        setUser(response.data);
      } catch (error) {
        /*
         * Token is invalid, expired, or the server returned an error.
         * Clean up the stale token so the user is treated as logged-out.
         */
        localStorage.removeItem('token');
      }

      // Auth check complete — remove the loading state
      setLoading(false);
    };

    loadUser();
  }, []);

  /*
   * Login:  exchange credentials for a JWT, persist it, and set the
   *         authenticated user into state.
   */
  const login = async (email, password) => {
    // Step 1 — send credentials to the server
    const response = await api.post('/auth/login', { email, password });

    // Step 2 — store the JWT so it survives page reloads
    localStorage.setItem('token', response.data.token);

    // Step 3 — set the user object so the rest of the app knows who's logged in
    setUser(response.data.user);
  };

  /*
   * Register:  create a new account, receive a JWT, persist it,
   *            and log the user in immediately.
   */
  const register = async (username, email, password) => {
    // Step 1 — send new-account payload to the server
    const response = await api.post('/auth/signup', { username, email, password });

    // Step 2 — persist the returned token
    localStorage.setItem('token', response.data.token);

    // Step 3 — set the user into state
    setUser(response.data.user);
  };

  /*
   * Logout:  remove the JWT from storage and clear the in-memory user.
   *          No server call needed — the token is simply discarded client-side.
   */
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Convenience hook: lets any component access auth context ──
export const useAuth = () => useContext(AuthContext);
