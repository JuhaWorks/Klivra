import React, { Suspense, useMemo, useEffect, memo } from 'react'; 
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SidebarComponent from './Sidebar';
import TopBar from './TopBar';
import MaintenanceNotice from './MaintenanceNotice';
import { useMaintenanceStatus } from '../../hooks/useMaintenanceStatus';
import { useIdleTimer } from '../../hooks/useIdleTimer';
import { useAuthStore } from '../../store/useAuthStore';
import { useSocketStore } from '../../store/useSocketStore';
import { useUIStore } from '../../store/useUIStore';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { RefreshCw, Bell } from 'lucide-react';
import { KlivraLogo } from '../ui/Loaders';
import { toast } from 'react-hot-toast';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ── Vanguard 2026: Physics Configuration ──
const LIQUID_SPRING = { 
    type: "spring", 
    stiffness: 280, 
    damping: 32, 
    mass: 0.5,
    restDelta: 0.01
};

// ── Vanguard 2026: Global Error Boundary ──
class GlobalErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, errorInfo) { console.error('Vanguard MX Caught Error:', error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-10 m-6 glass-2 bg-rose-500/5 border border-rose-500/20 rounded-[3rem] text-center">
                    <div className="w-20 h-20 rounded-[2rem] bg-rose-500/10 flex items-center justify-center mb-6">
                        <KlivraLogo pulse={false} />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tighter mb-2">Segment Desynchronized</h2>
                    <p className="text-gray-500 text-sm max-w-md mb-8">{this.state.error?.message || "A critical error occurred in the application."}</p>
                    <button 
                        onClick={() => this.setState({ hasError: false })}
                        className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold hover:bg-white/10 active:scale-95 transition-all outline-none focus:ring-4 focus:ring-white/20"
                    >
                        Execute Soft Reset
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// ── Zero-CLS Core Skeleton ──
const PageSkeleton = () => (
    <div className="w-full h-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 flex flex-col gap-10 animate-pulse" aria-hidden="true">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between pb-8 border-bottom border-white/5">
            <div className="flex flex-col gap-4">
                <div className="w-48 h-8 bg-white/5 rounded-2xl" />
                <div className="w-32 h-3 bg-white/5 rounded-full opacity-60" />
            </div>
            <div className="w-32 h-10 bg-white/5 rounded-full" />
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 flex flex-col gap-8">
                <div className="w-full h-[400px] bg-white/5 rounded-[2.5rem]" />
                <div className="w-full h-[200px] bg-white/5 rounded-[2rem]" />
            </div>
            <div className="flex flex-col gap-8">
                <div className="w-full h-[300px] bg-white/5 rounded-[2rem]" />
                <div className="w-full h-[300px] bg-white/5 rounded-[2rem]" />
            </div>
        </div>
    </div>
);


/**
 * Layout Component (Extreme Performance Refactor)
 * Decouples Global State from the Content Outlet to prevent redundant re-renders.
 */
const Layout = ({ checkingAuth }) => {
    useIdleTimer();
    const location = useLocation();
    const { isSidebarExpanded, isCollapsed, isPending, setSidebarExpanded } = useUIStore();
    const { isUnderMaintenance } = useMaintenanceStatus();
    const { user, accessToken } = useAuthStore();
    const { connect, disconnect, socket } = useSocketStore();

    // ── GLOBAL SOCKET LIFECYCLE ──────────────────────────────────────
    // Connect immediately when authenticated (globally, not just on project pages).
    // The socket store's on('connect') handler requests fresh presence automatically.
    useEffect(() => {
        if (accessToken && !socket) {
            connect(accessToken);
        }
        if (!accessToken && socket) {
            disconnect();
        }
    }, [accessToken, socket, connect, disconnect]);

    // Responsive Detection
    const isMobile = useMediaQuery('(max-width: 1024px)');


    const showNotice = isUnderMaintenance && user?.role === 'Admin';
    const isActuallyCheckingAuth = checkingAuth && !user;

    // ── GPU-DRIVEN LAYOUT: System Variables ──────────────────────────
    useEffect(() => {
        const root = document.documentElement;
        // The icon rail (80px) only shows on the Home page. On others, it stays hidden (0px).
        const isHome = location.pathname === '/';
        const width = isMobile ? 0 : (isSidebarExpanded ? 250 : (isHome ? 80 : 0));
        
        root.style.setProperty('--sb-width', `${width}px`);
        root.style.setProperty('--sb-offset', `${width}px`);
    }, [isSidebarExpanded, isCollapsed, isMobile, location.pathname]);

    // Handle mobile transition separately to avoid breaking the toggle button
    useEffect(() => {
        if (isMobile && isSidebarExpanded) {
            setSidebarExpanded(false);
        }
    }, [isMobile]); // Only run when window crosses the breakpoint

    // Memoize the content area to prevent re-renders when sidebar state changes in useUIStore
    const ContentArea = useMemo(() => (
        <section className="flex-1 relative perspective-1000 pb-4" aria-live="polite">
            <GlobalErrorBoundary>
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                        key={isActuallyCheckingAuth ? 'skeleton' : location.pathname}
                        initial={{ opacity: 0, scale: 0.99, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.99, y: -8 }}
                        transition={LIQUID_SPRING}
                        style={{ willChange: 'transform, opacity' }}
                        className={twMerge(clsx(
                            location.pathname === '/messaging' ? "px-0" : "px-4 sm:px-6 lg:px-10",
                            "h-full transition-opacity duration-300",
                            (isPending || isActuallyCheckingAuth) && "opacity-50 blur-sm pointer-events-none"
                        ))}
                    >
                        {isActuallyCheckingAuth ? (
                            <PageSkeleton />
                        ) : (
                            <Suspense fallback={<PageSkeleton />}>
                                <Outlet />
                            </Suspense>
                        )}
                    </motion.div>
                </AnimatePresence>
            </GlobalErrorBoundary>
        </section>
    ), [location.pathname, isPending, isActuallyCheckingAuth]);

    return (
        <div className="flex min-h-screen bg-base relative overflow-x-hidden font-sans selection:bg-theme/20 selection:text-theme">
            {/* ── VISUAL ELEMENTS ────────────────────────────────────────── */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden h-full bg-base">
                {/* Simplified Grid */}
                <div className="absolute inset-0 opacity-[0.03]" 
                    style={{ 
                        backgroundImage: `linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)`,
                        backgroundSize: '48px 48px',
                    }} 
                />
                
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'url("/noise.svg")' }} />
            </div>

            {/* ── LAYOUT SHELL ─────────────────────────────────────────── */}
            <div className={twMerge(clsx(
                "fixed inset-x-0 z-50 transition-all duration-300",
                showNotice ? "top-11" : "top-0"
            ))}>
                <TopBar />
            </div>

            <div className={twMerge(clsx(
                "fixed bottom-0 left-0 transition-all duration-300",
                isMobile ? "z-[70] inset-0" : "z-40",
                "pointer-events-none", // Always transparent to events unless children override it
                !isMobile ? (showNotice ? "top-[108px]" : "top-16") : ""
            ))}>
                <SidebarComponent />
            </div>

            <main 
                className={twMerge(clsx(
                    "flex-1 flex flex-col min-w-0 min-h-screen relative z-20 transition-all duration-300 ease-in-out",
                    showNotice ? "pt-[108px]" : "pt-16"
                ))} 
                style={{ transform: 'translateZ(0)', paddingLeft: 'var(--sb-offset)' }}
            >
                <div className="flex-1 w-full flex flex-col pt-4">
                    {ContentArea}
                </div>
            </main>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 100px; border: 2px solid transparent; background-clip: padding-box; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }
            `}</style>
        </div>
    );
};

export default memo(Layout);

