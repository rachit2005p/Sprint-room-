// ──────────────────────────────────────────────
// Root app component — routing & auth guard setup
// ──────────────────────────────────────────────

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Room from './pages/Room';
import JoinRoom from './pages/JoinRoom';
import Tasks from './pages/Tasks';
import Files from './pages/Files';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import MainLayout from './layouts/MainLayout';

// ── Route guard: redirects unauthenticated users to /landing ──
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Still checking auth? Show a centered loading spinner
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  // No authenticated user? Kick them to the landing page
  if (!user) {
    return <Navigate to="/landing" />;
  }

  // Authenticated — render the requested children
  return children;
};

// ── Public-only route: redirects logged-in users to dashboard ──
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // While auth is still resolving, render nothing (avoids flash of wrong page)
  if (loading) {
    return null;
  }

  // Already logged in? Send them to the dashboard
  if (user) {
    return <Navigate to="/" />;
  }

  // Not logged in — safe to show the public page
  return children;
};

// ── Centralized route definitions ──
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/landing" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Login isSignup /></PublicRoute>} />

      {/* Protected (authenticated) pages wrapped inside MainLayout */}
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="room/:roomId" element={<Room />} />
        <Route path="join" element={<JoinRoom />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="files" element={<Files />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* 404 fallback */}
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

// ── App shell: wraps everything in AuthProvider + Router ──
function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
