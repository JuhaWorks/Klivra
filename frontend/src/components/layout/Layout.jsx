import React, { Suspense, useMemo, useEffect, memo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SidebarComponent from './Sidebar';
import TopBar from './TopBar';
import MaintenanceNotice, { useMaintenanceStatus } from './MaintenanceNotice';
import { useIdleTimer } from '../../hooks/useIdleTimer';
import { useAuthStore } from '../../store/useAuthStore';
import { useSocketStore } from '../../store/useSocketStore';
import { useUIStore } from '../../store/useUIStore';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { RefreshCw, Bell } from 'lucide-react';
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
                        <RefreshCw className="w-10 h-10 text-rose-500" />
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
    <div className="w-full h-full min-height-[calc(100vh-140px)] rounded-[3rem] border border-subtle bg-surface animate-pulse flex items-center justify-center p-10" aria-hidden="true">
        <div className="w-full h-full rounded-[2rem] bg-sunken border border-subtle" />
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

        // Global Notification Listeners
        if (socket) {
            const handleNotification = (data) => {
                toast((t) => (
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-theme/10 flex items-center justify-center shrink-0">
                            <Bell className="w-5 h-5 text-theme" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-black uppercase text-primary">{data.type || 'Notification'}</span>
                            <span className="text-[11px] text-tertiary leading-tight">
                                <span className="font-bold text-white">{data.title}</span>: {data.message}
                            </span>
                        </div>
                    </div>
                ), { 
                    duration: 5000, 
                    position: 'top-right', 
                    style: { background: 'rgba(9,9,11,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '12px' } 
                });
            };

            socket.on('newNotification', handleNotification);
            return () => socket.off('newNotification', handleNotification);
        }
    }, [accessToken, socket, connect, disconnect]);

    // Responsive Detection
    const isMobile = useMediaQuery('(max-width: 1024px)');


    const showNotice = isUnderMaintenance && user?.role === 'Admin';
    const isActuallyCheckingAuth = checkingAuth && !user;

    // ── GPU-DRIVEN LAYOUT: System Variables ──────────────────────────
    useEffect(() => {
        const root = document.documentElement;
        // On mobile, the sidebar never pushes content
        const width = isMobile ? 0 : (isSidebarExpanded ? (isCollapsed ? 80 : 280) : 0);
        root.style.setProperty('--sb-width', `${width}px`);
        root.style.setProperty('--sb-offset', `${width}px`);
    }, [isSidebarExpanded, isCollapsed, isMobile]);

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
                            "px-4 sm:px-6 lg:px-10 h-full transition-opacity duration-300",
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
                
                {/* Reduced Blur elements for better performance */}
                <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-theme/5 rounded-full blur-[80px]" />
                <div className="absolute bottom-[5%] left-[-2%] w-[30%] h-[30%] bg-theme/3 rounded-full blur-[60px]" />
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'url("/noise.svg")' }} />
            </div>

            {/* ── LAYOUT SHELL ─────────────────────────────────────────── */}
            <div className={twMerge(clsx(
                "fixed right-0 z-50 transition-all duration-300",
                showNotice ? "top-11" : "top-0"
            ))} style={{ left: 'var(--sb-offset)' }}>
                <TopBar />
            </div>

            <div className={twMerge(clsx(
                "fixed bottom-0 left-0 transition-all duration-300",
                isMobile ? "z-[70] inset-0" : "z-40 top-0",
                "pointer-events-none", // Always transparent to events unless children override it
                showNotice && !isMobile ? "top-11" : ""
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

