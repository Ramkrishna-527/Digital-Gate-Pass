import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import StudentPage from './pages/StudentPage';
import VisitorPage from './pages/VisitorPage';
import HodPage from './pages/HodPage';
import GatekeeperPage from './pages/GatekeeperPage';
import './App.css';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  const getDashboard = () => {
    if (!user) return '/';
    const map = { student: '/student', visitor: '/visitor', hod: '/hod', gatekeeper: '/gatekeeper' };
    return map[user.role] || '/';
  };

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={getDashboard()} /> : <LandingPage />} />
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentPage /></ProtectedRoute>} />
      <Route path="/visitor" element={<ProtectedRoute allowedRoles={['visitor']}><VisitorPage /></ProtectedRoute>} />
      <Route path="/hod" element={<ProtectedRoute allowedRoles={['hod']}><HodPage /></ProtectedRoute>} />
      <Route path="/gatekeeper" element={<ProtectedRoute allowedRoles={['gatekeeper']}><GatekeeperPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

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
