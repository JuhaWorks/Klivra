import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { useTheme } from './store/useTheme';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from './store/useSocketStore';
import Layout from './components/layout/Layout';
import MaintenanceNotice from './components/layout/MaintenanceNotice';
import CommandPalette from './components/ui/CommandPalette';
import ErrorBoundary from './components/common/ErrorBoundary';
import Login from './pages/Login';
import RequireVerification from './components/auth/RequireVerification';
import { Toaster } from 'react-hot-toast';
import TaskTimer from './components/tools/Widgets/TaskTimer';

// Code-split only secondary pages — entry pages must load instantly
const Register = lazy(() => import('./pages/Register'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const VerifyEmailChangePage = lazy(() => import('./pages/VerifyEmailChangePage'));
const Profile = lazy(() => import('./pages/Profile'));
const ProjectWhiteboard = lazy(() => import('./pages/ProjectWhiteboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectSettings = lazy(() => import('./components/projects/ProjectSettingsDashboard'));
const Tasks = lazy(() => import('./pages/Tasks'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const SecurityFeed = lazy(() => import('./pages/SecurityFeed'));
const Home = lazy(() => import('./pages/Home'));
const Networking = lazy(() => import('./pages/Networking'));

import { GlobalLoadingScreen, PageLoader } from './components/ui/Loading';

// Protected Route Wrapper Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isCheckingAuth } = useAuthStore();

  // During auth check, we don't redirect, just let the parent handle the skeleton
  if (isCheckingAuth) return <PageLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Initialize theme immediately so there's no flash of green on reload
useTheme.getState().initTheme();

function App() {
  const { checkAuth, isCheckingAuth, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const { setQueryClient } = useSocketStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Connect Socket to React Query for zero-reload synchronized updates
  useEffect(() => {
    if (queryClient) {
      setQueryClient(queryClient);
    }
  }, [queryClient, setQueryClient]);

  // Zero-LCP Refactor: Render the Layout shell even during auth checks
  // This allows the browser to paint the UI structure (LCP) while waiting for the network.
  const appContent = (
    <Router>
      <Toaster position="top-right" toastOptions={{ style: { background: '#09090b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
      <CommandPalette />
      <TaskTimer />
      <MaintenanceNotice />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Native Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify-email-change/:token" element={<VerifyEmailChangePage />} />

          {/* Secure Layout Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RequireVerification>
                  <ErrorBoundary>
                    <Layout checkingAuth={isCheckingAuth} />
                  </ErrorBoundary>
                </RequireVerification>
              </ProtectedRoute>
            }
          >
            {/* Nested routes are already wrapped in the global Suspense at line 67 */}
            <Route index element={<Home />} />
            <Route path="projects" element={<Projects />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="projects/:id/settings" element={<ProjectSettings />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="networking" element={<Networking />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/security" element={<SecurityFeed />} />

            <Route path="whiteboard" element={<ProjectWhiteboard />} />
            <Route path="whiteboard/main-workspace" element={<ProjectWhiteboard />} />
          </Route>

          {/* Catch all unmatched routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );

  return appContent;
}

export default App;
