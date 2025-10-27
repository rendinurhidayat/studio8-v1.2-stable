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
import InternDashboardPage from './pages/intern/InternDashboardPage';
import AdminInternsPage from './pages/admin/AdminInternsPage';
import InternLoginPage from './pages/intern/InternLoginPage';
import InternAttendancePage from './pages/intern/InternAttendancePage';
import InternReportPage from './pages/intern/InternReportPage';
import InternTasksPage from './pages/intern/InternTasksPage';
import StaffMentoringPage from './pages/staff/StaffMentoringPage';
import StaffInternDetailPage from './pages/staff/StaffInternDetailPage';
import StaffReportPage from './pages/staff/StaffReportPage';
import ChatPage from './pages/shared/ChatPage';
import HighlightPage from './pages/public/HighlightPage';
import AdminCertificatesPage from './pages/admin/AdminCertificatesPage';
import StaffCertificatesPage from './pages/staff/StaffCertificatesPage';
import CertificateValidationPage from './pages/public/CertificateValidationPage';
import InternProgressPage from './pages/intern/InternProgressPage';
import StaffEvaluationPage from './pages/staff/StaffEvaluationPage';
import QuizListPage from './pages/intern/QuizListPage';
import QuizTakingPage from './pages/intern/QuizTakingPage';
import QuizResultPage from './pages/intern/QuizResultPage';
import AdminQuizManagerPage from './pages/admin/QuizManagerPage';
import StaffQuizManagerPage from './pages/staff/QuizManagerPage';
import AdminHighlightManagerPage from './pages/admin/AdminHighlightManagerPage';
import StaffHighlightManagerPage from './pages/staff/StaffHighlightManagerPage';
import AdminCollaborationPage from './pages/admin/AdminCollaborationPage';
import AcademyPage from './pages/shared/AcademyPage';
import OfflineBanner from './components/common/OfflineBanner';
import { AnimatePresence } from 'framer-motion';
import AssetManagerPage from './pages/shared/AssetManagerPage';
import CommunityPage from './pages/shared/CommunityPage';
import ForumThreadPage from './pages/shared/ForumThreadPage';


const PrivateRoute: React.FC<{ children: React.ReactElement; roles: UserRole[] }> = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/auth" />;
  }
  if (!roles.includes(user.role)) {
    // If logged in but with the wrong role, redirect to their correct dashboard
    let dashboardPath = '/';
    switch (user.role) {
        case UserRole.Admin:
            dashboardPath = '/admin/dashboard';
            break;
        case UserRole.Staff:
            dashboardPath = '/staff/dashboard';
            break;
        case UserRole.AnakMagang:
        case UserRole.AnakPKL:
            dashboardPath = '/intern/dashboard';
            break;
    }
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
  
  const getDashboardPath = (user: {role: UserRole} | null) => {
      if (!user) return '/';
      switch (user.role) {
          case UserRole.Admin: return '/admin/dashboard';
          case UserRole.Staff: return '/staff/dashboard';
          case UserRole.AnakMagang:
          case UserRole.AnakPKL:
              return '/intern/dashboard';
          default: return '/';
      }
  }

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
      <Route path="/highlight" element={<HighlightPage />} />
      <Route path="/validate/:id" element={<CertificateValidationPage />} />
      <Route path="/jadwal" element={<FeatureRoute feature="publicCalendar"><PublicCalendarPage /></FeatureRoute>} />
      <Route path="/pesan-sesi" element={<BookingPage />} />
      <Route path="/cek-status" element={<StatusPage />} />
      <Route path="/auth" element={<RoleSelectorPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/intern-login" element={<InternLoginPage />} />
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
                <Route path="interns" element={<AdminInternsPage />} />
                <Route path="collaboration" element={<AdminCollaborationPage />} />
                <Route path="academy" element={<AcademyPage />} />
                <Route path="community" element={<CommunityPage />} />
                <Route path="quiz-manager" element={<AdminQuizManagerPage />} />
                <Route path="highlight-manager" element={<AdminHighlightManagerPage />} />
                <Route path="assets" element={<AssetManagerPage />} />
                <Route path="certificates" element={<AdminCertificatesPage />} />
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
                <Route path="mentoring" element={<StaffMentoringPage />} />
                <Route path="intern/:id" element={<StaffInternDetailPage />} />
                <Route path="report" element={<StaffReportPage />} />
                <Route path="academy" element={<AcademyPage />} />
                <Route path="community" element={<CommunityPage />} />
                <Route path="quiz-manager" element={<StaffQuizManagerPage />} />
                <Route path="highlight-manager" element={<StaffHighlightManagerPage />} />
                <Route path="assets" element={<AssetManagerPage />} />
                <Route path="certificates" element={<StaffCertificatesPage />} />
                <Route path="evaluation" element={<StaffEvaluationPage />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="*" element={<Navigate to="dashboard" />} />
              </Routes>
            </AdminLayout>
          </PrivateRoute>
        }
      />

      {/* Intern Routes */}
      <Route
        path="/intern/*"
        element={
          <PrivateRoute roles={[UserRole.AnakMagang, UserRole.AnakPKL]}>
            <AdminLayout>
              <Routes>
                <Route path="dashboard" element={<InternDashboardPage />} />
                <Route path="tasks" element={<InternTasksPage />} />
                <Route path="attendance" element={<InternAttendancePage />} />
                <Route path="report" element={<InternReportPage />} />
                <Route path="progress" element={<InternProgressPage />} />
                <Route path="academy" element={<AcademyPage />} />
                <Route path="community" element={<CommunityPage />} />
                <Route path="quiz" element={<QuizListPage />} />
                <Route path="quiz/take/:quizId" element={<QuizTakingPage />} />
                <Route path="quiz/result/:resultId" element={<QuizResultPage />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="*" element={<Navigate to="dashboard" />} />
              </Routes>
            </AdminLayout>
          </PrivateRoute>
        }
      />
      
       <Route
            path="/community/forum/:threadId"
            element={
                <PrivateRoute roles={[UserRole.Admin, UserRole.Staff, UserRole.AnakMagang, UserRole.AnakPKL]}>
                    <ForumThreadPage />
                </PrivateRoute>
            }
        />

      <Route path="*" element={<Navigate to={getDashboardPath(user)} />} />
    </Routes>
  );
};


function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('SW registered: ', registration);
        }).catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
      });
    }

    // Online/Offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  return (
    <HashRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
          <AnimatePresence>
            {!isOnline && <OfflineBanner />}
          </AnimatePresence>
        </NotificationProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;