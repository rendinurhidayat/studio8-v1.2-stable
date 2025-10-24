

import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import LoginPage from './pages/LoginPage';
import BookingPage from './pages/BookingPage';
import StatusPage from './pages/StatusPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminBookingsPage from './pages/admin/AdminBookingsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import StaffDashboardPage from './pages/staff/StaffDashboardPage';
import AdminLayout from './components/layout/AdminLayout';
import { UserRole, SystemSettings, FeatureToggles } from './types';
import LandingPage from './pages/LandingPage';
import RoleSelectorPage from './pages/RoleSelectorPage';
import AdminFinancePage from './pages/admin/AdminFinancePage';
import AdminClientsPage from './pages/admin/AdminClientsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import StaffBookingsPage from './pages/staff/StaffBookingsPage';
import StaffClientsPage from './pages/staff/StaffClientsPage';
import StaffFinancePage from './pages/staff/StaffFinancePage';
import StaffTasksPage from './pages/staff/StaffTasksPage';
import FeedbackPage from './pages/FeedbackPage';
import AdminFeedbackPage from './pages/admin/AdminFeedbackPage';
import PublicCalendarPage from './pages/client/ClientLoginPage';
import { getSystemSettings } from './services/api';
import AdminActivityLogPage from './pages/admin/AdminActivityLogPage';
import StaffInventoryPage from './pages/staff/StaffInventoryPage';
import { Loader2 } from 'lucide-react';


const PrivateRoute: React.FC<{ children: React.ReactElement; roles: UserRole[] }> = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/auth" />;
  }
  if (!roles.includes(user.role)) {
    // If logged in but with the wrong role, redirect to their correct dashboard
    const dashboardPath = user.role === UserRole.Admin ? '/admin/dashboard' : '/staff/dashboard';
    return <Navigate to={dashboardPath} />;
  }
  return children;
};

const FeatureRoute: React.FC<{ children: React.ReactNode; feature: keyof FeatureToggles }> = ({ children, feature }) => {
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSystemSettings().then(data => {
            setSettings(data);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
    }

    if (settings && settings.featureToggles[feature]) {
        return <>{children}</>;
    }

    return <Navigate to="/" replace />;
};


const AppRoutes = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-base-100">
            <div className="text-center">
                <Loader2 className="animate-spin text-primary mx-auto mb-4" size={48} />
                <p className="text-muted">Memeriksa sesi Anda...</p>
            </div>
        </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/jadwal" element={<FeatureRoute feature="publicCalendar"><PublicCalendarPage /></FeatureRoute>} />
      <Route path="/pesan-sesi" element={<BookingPage />} />
      <Route path="/cek-status" element={<StatusPage />} />
      <Route path="/auth" element={<RoleSelectorPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/feedback" element={<FeatureRoute feature="publicFeedback"><FeedbackPage /></FeatureRoute>} />

      {/* Admin Routes */}
      <Route
        path="/admin/*"
        element={
          <PrivateRoute roles={[UserRole.Admin]}>
            <AdminLayout>
              <Routes>
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="schedule" element={<AdminBookingsPage />} />
                <Route path="finance" element={<AdminFinancePage />} />
                <Route path="clients" element={<AdminClientsPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="feedback" element={<AdminFeedbackPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="activity-log" element={<AdminActivityLogPage />} />
                <Route path="*" element={<Navigate to="dashboard" />} />
              </Routes>
            </AdminLayout>
          </PrivateRoute>
        }
      />

      {/* Staff Routes */}
      <Route
        path="/staff/*"
        element={
          <PrivateRoute roles={[UserRole.Staff]}>
            <AdminLayout>
              <Routes>
                <Route path="dashboard" element={<StaffDashboardPage />} />
                <Route path="schedule" element={<StaffBookingsPage />} />
                <Route path="clients" element={<StaffClientsPage />} />
                <Route path="finance" element={<StaffFinancePage />} />
                <Route path="tasks" element={<StaffTasksPage />} />
                <Route path="inventory" element={<StaffInventoryPage />} />
                <Route path="*" element={<Navigate to="dashboard" />} />
              </Routes>
            </AdminLayout>
          </PrivateRoute>
        }
      />
      
      <Route path="*" element={<Navigate to={user ? (user.role === UserRole.Admin ? '/admin/dashboard' : '/staff/dashboard') : '/'} />} />
    </Routes>
  );
};


function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
