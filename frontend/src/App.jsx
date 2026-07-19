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

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (!user) return <Navigate to="/landing" />;

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/landing" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Login isSignup /></PublicRoute>} />

      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="room/:roomId" element={<Room />} />
        <Route path="join" element={<JoinRoom />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="files" element={<Files />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

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
