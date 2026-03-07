import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useAuthStore } from './store/useAuthStore';
import Layout from './components/Layout';
import CommandPalette from './components/ui/CommandPalette';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Home from './pages/Home';
import RequireVerification from './components/RequireVerification';

// Code-split only secondary pages — entry pages must load instantly
const Register = lazy(() => import('./pages/Register'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const VerifyEmailChangePage = lazy(() => import('./pages/VerifyEmailChangePage'));
const Profile = lazy(() => import('./pages/Profile'));
const Whiteboard = lazy(() => import('./components/Whiteboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectSettings = lazy(() => import('./pages/ProjectSettings'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Sleek, zero-lag loading fallback for code-split chunks
const PageLoader = () => (
  <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
    <div className="relative flex items-center justify-center">
      <div className="absolute w-12 h-12 border-4 border-violet-500/20 rounded-full animate-ping shadow-[0_0_15px_rgba(139,92,246,0.3)]"></div>
      <div className="w-10 h-10 border-4 border-transparent border-t-violet-500 border-b-blue-500 rounded-full animate-spin"></div>
    </div>
  </div>
);

const GlobalLoadingScreen = () => (
  <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-6">
    {/* Pulsing brand logo */}
    <div className="relative">
      <div className="absolute inset-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/30 to-blue-500/30 blur-xl animate-pulse" />
      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-violet-500/25">
        <span className="text-white font-black text-xl">K</span>
      </div>
    </div>
    {/* Elegant loading bar */}
    <div className="w-32 h-0.5 bg-zinc-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
      <div className="h-full w-full bg-gradient-to-r from-violet-500 via-blue-500 to-violet-500 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"
        style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
    </div>
    <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
  </div>
);

// Protected Route Wrapper Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isCheckingAuth } = useAuthStore();

  if (isCheckingAuth) return null; // Gatekeeper in App.jsx handles the loading screen

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Wrapper specifically for the whiteboard to pass down the URL parameter as roomId
const WhiteboardWrapper = () => {
  const { roomId } = useParams();
  return <Whiteboard roomId={roomId} />;
};

function App() {
  const { checkAuth, isCheckingAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) {
    return <GlobalLoadingScreen />;
  }

  return (
    <Router>
      <CommandPalette />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Native Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/verify-email" element={<Suspense fallback={<PageLoader />}><VerifyEmail /></Suspense>} />
          <Route path="/verify-email-change/:token" element={<Suspense fallback={<PageLoader />}><VerifyEmailChangePage /></Suspense>} />

          {/* Secure Layout Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RequireVerification>
                  <ErrorBoundary>
                    <Layout />
                  </ErrorBoundary>
                </RequireVerification>
              </ProtectedRoute>
            }
          >
            {/* Suspense inside layout so the shell renders instantly */}
            <Route index element={<Home />} />
            <Route path="projects" element={<Suspense fallback={<PageLoader />}><Projects /></Suspense>} />
            <Route path="profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
            <Route path="projects/:id/settings" element={<Suspense fallback={<PageLoader />}><ProjectSettings /></Suspense>} />
            <Route path="admin" element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />

            <Route path="whiteboard/:roomId" element={<Suspense fallback={<PageLoader />}><WhiteboardWrapper /></Suspense>} />
          </Route>

          {/* Catch all unmatched routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
