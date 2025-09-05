import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import AIChat from './pages/AIChat';
import Appointments from './pages/Appointments';
import Resources from './pages/Resources';
import Forum from './pages/Forum';
import AdminDashboard from './pages/AdminDashboard';
import CollegeManagement from './pages/CollegeManagement';
import Screening from './pages/Screening';
import CounselorDashboard from './pages/CounselorDashboard';
import StudentManagement from './pages/StudentManagement';
import AppointmentManagement from './pages/AppointmentManagement';

function ProtectedRoute({ children, requiredRole, excludeRoles = [] }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  // Check if user role is excluded
  if (excludeRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // Check if specific role is required
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

function DashboardRoute() {
  const { user } = useAuth();
  
  if (user?.role === 'counselor') {
    return <Navigate to="/counselor" replace />;
  } else if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  
  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-white">
          <Navbar />
          <main className="pt-16">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/screening" element={
                <ProtectedRoute>
                  <Screening />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardRoute />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute requiredRole="student">
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/chat" element={
                <ProtectedRoute requiredRole="student">
                  <AIChat />
                </ProtectedRoute>
              } />
              <Route path="/appointments" element={
                <ProtectedRoute excludeRoles={['counselor', 'admin']}>
                  <Appointments />
                </ProtectedRoute>
              } />
              <Route path="/resources" element={
                <ProtectedRoute>
                  <Resources />
                </ProtectedRoute>
              } />
              <Route path="/forum" element={
                <ProtectedRoute>
                  <Forum />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/colleges" element={
                <ProtectedRoute requiredRole="admin">
                  <CollegeManagement />
                </ProtectedRoute>
              } />
              <Route path="/counselor" element={
                <ProtectedRoute requiredRole="counselor">
                  <CounselorDashboard />
                </ProtectedRoute>
              } />
              <Route path="/students" element={
                <ProtectedRoute requiredRole="counselor">
                  <StudentManagement />
                </ProtectedRoute>
              } />
              <Route path="/appointments-manage" element={
                <ProtectedRoute requiredRole="counselor">
                  <AppointmentManagement />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
        </div>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;
