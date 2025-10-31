


import React, { useState, useEffect, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { CartProvider } from './contexts/CartContext';
import AdminLayout from './components/layout/AdminLayout';
import { UserRole, SystemSettings, FeatureToggles } from './types';
import { getSystemSettings } from './services/api';
import { Loader2 } from 'lucide-react';
import OfflineBanner from './components/common/OfflineBanner';
import { AnimatePresence } from 'framer-motion';
import CartModal from './components/common/CartModal';

// --- Cached Hook for System Settings ---
// This hook ensures that system settings are fetched only once per application lifecycle,
// improving performance by avoiding redundant API calls across different components.
let settingsPromise: Promise<SystemSettings> | null = null;
const fetchSettings = () => {
    if (!settingsPromise) {
        settingsPromise = getSystemSettings();
    }
    return settingsPromise;
};

export const useSystemSettings = () => {
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSettings().then(data => {
            setSettings(data);
            setLoading(false);
        }).catch(err => {
            console.error("Failed to fetch cached system settings:", err);
            setLoading(false);
        });
    }, []);

    return { settings, loading };
};


// Fallback component for lazy loading
const SuspenseFallback = () => (
    <div className="flex h-screen w-full items-center justify-center bg-base-100">
        <div className="text-center">
            <Loader2 className="animate-spin text-primary mx-auto mb-4" size={48} />
            <p className="text-muted">Memuat halaman...</p>
        </div>
    </div>
);

// Lazy load all page components
const RoleSelectorPage = lazy(() => import('./pages/RoleSelectorPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const PackagesPage = lazy(() => import('./pages/PackagesPage'));
const StatusPage = lazy(() => import('./pages/StatusPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const StaffDashboardPage = lazy(() => import('./pages/staff/StaffDashboardPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AdminFinancePage = lazy(() => import('./pages/admin/AdminFinancePage'));
const AdminClientsPage = lazy(() => import('./pages/admin/AdminClientsPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const StaffBookingsPage = lazy(() => import('./pages/staff/StaffBookingsPage'));
const StaffClientsPage = lazy(() => import('./pages/staff/StaffClientsPage'));
const StaffFinancePage = lazy(() => import('./pages/staff/StaffFinancePage'));
const StaffTasksPage = lazy(() => import('./pages/staff/StaffTasksPage'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const AdminFeedbackPage = lazy(() => import('./pages/admin/AdminFeedbackPage'));
const PublicCalendarPage = lazy(() => import('./pages/public/PublicCalendarPage'));
const AdminActivityLogPage = lazy(() => import('./pages/admin/AdminActivityLogPage'));
const StaffInventoryPage = lazy(() => import('./pages/staff/StaffInventoryPage'));
const InternDashboardPage = lazy(() => import('./pages/intern/InternDashboardPage'));
const AdminInternsPage = lazy(() => import('./pages/admin/AdminInternsPage'));
const InternAttendancePage = lazy(() => import('./pages/intern/InternAttendancePage'));
const InternReportPage = lazy(() => import('./pages/intern/InternReportPage'));
const InternTasksPage = lazy(() => import('./pages/intern/InternTasksPage'));
const StaffMentoringPage = lazy(() => import('./pages/staff/StaffMentoringPage'));
const StaffInternDetailPage = lazy(() => import('./pages/staff/StaffInternDetailPage'));
const StaffReportPage = lazy(() => import('./pages/staff/StaffReportPage'));
const ChatPage = lazy(() => import('./pages/shared/ChatPage'));
const HighlightPage = lazy(() => import('./pages/public/HighlightPage'));
const AdminCertificatesPage = lazy(() => import('./pages/admin/AdminCertificatesPage'));
const StaffCertificatesPage = lazy(() => import('./pages/staff/StaffCertificatesPage'));
const CertificateValidationPage = lazy(() => import('./pages/public/CertificateValidationPage'));
const InternProgressPage = lazy(() => import('./pages/intern/InternProgressPage'));
const StaffEvaluationPage = lazy(() => import('./pages/staff/StaffEvaluationPage'));
const QuizListPage = lazy(() => import('./pages/intern/QuizListPage'));
const QuizTakingPage = lazy(() => import('./pages/intern/QuizTakingPage'));
const QuizResultPage = lazy(() => import('./pages/intern/QuizResultPage'));
const AdminQuizManagerPage = lazy(() => import('./pages/admin/QuizManagerPage'));
const StaffQuizManagerPage = lazy(() => import('./pages/staff/QuizManagerPage'));
const AdminHighlightManagerPage = lazy(() => import('./pages/admin/AdminHighlightManagerPage'));
const StaffHighlightManagerPage = lazy(() => import('./pages/staff/StaffHighlightManagerPage'));
const AdminCollaborationPage = lazy(() => import('./pages/admin/AdminCollaborationPage'));
const AcademyPage = lazy(() => import('./pages/shared/AcademyPage'));
const AssetManagerPage = lazy(() => import('./pages/shared/AssetManagerPage'));
const CommunityPage = lazy(() => import('./pages/shared/CommunityPage'));
const ForumThreadPage = lazy(() => import('./pages/shared/ForumThreadPage'));


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
    const { settings, loading } = useSystemSettings();

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
    <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/paket" element={<PackagesPage />} />
          <Route path="/highlight" element={<HighlightPage />} />
          <Route path="/validate/:id" element={<CertificateValidationPage />} />
          <Route path="/jadwal" element={<FeatureRoute feature="publicCalendar"><PublicCalendarPage /></FeatureRoute>} />
          <Route path="/pesan-sesi" element={<BookingPage />} />
          <Route path="/cek-status" element={<StatusPage />} />
          <Route path="/auth" element={<RoleSelectorPage />} />
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
                        <AdminLayout><ForumThreadPage /></AdminLayout>
                    </PrivateRoute>
                }
            />

          <Route path="*" element={<Navigate to={getDashboardPath(user)} />} />
        </Routes>
    </Suspense>
  );
};


function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isCartOpen, setIsCartOpen] = useState(false);

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
    const handleOpenCart = () => setIsCartOpen(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('open-cart', handleOpenCart);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('open-cart', handleOpenCart);
    };
  }, []);


  return (
    <HashRouter>
      <AuthProvider>
        <NotificationProvider>
          <CartProvider>
            <AppRoutes />
            <AnimatePresence>
              {!isOnline && <OfflineBanner />}
            </AnimatePresence>
            <CartModal isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
          </CartProvider>
        </NotificationProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;