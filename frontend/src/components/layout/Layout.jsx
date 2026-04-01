import React, { Suspense, useMemo, useEffect, memo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SidebarComponent from './Sidebar';
import TopBar from './TopBar';
import MaintenanceNotice, { useMaintenanceStatus } from './MaintenanceNotice';
import { useIdleTimer } from '../../hooks/useIdleTimer';
import { useAuthStore } from '../../store/useAuthStore';
import { useUIStore } from '../../store/useUIStore';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { RefreshCw } from 'lucide-react';
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
                    <p className="text-gray-500 text-sm max-w-md mb-8">{this.state.error?.message || "A critical error occurred in the operational node."}</p>
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
    <div className="w-full h-full min-height-[calc(100vh-140px)] rounded-[3rem] border border-[oklch(100%_0_0/0.05)] bg-[oklch(100%_0_0/0.01)] animate-pulse shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] flex items-center justify-center p-10" aria-hidden="true">
        <div className="w-full h-full rounded-[2rem] bg-[oklch(100%_0_0/0.02)] border border-[oklch(100%_0_0/0.03)]" />
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
    const { user } = useAuthStore();
    
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
        <div className="flex min-h-screen bg-[#09090b] relative overflow-x-hidden font-sans selection:bg-theme/20 selection:text-theme">
            {/* ── AMBIENT NODES ────────────────────────────────────────── */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden h-full bg-[#09090b]">
                {/* Simplified Grid */}
                <div className="absolute inset-0 opacity-[0.03]" 
                    style={{ 
                        backgroundImage: `linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)`,
                        backgroundSize: '48px 48px',
                    }} 
                />
                
                {/* Reduced Blur nodes for better INP */}
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
                "fixed bottom-0 left-0 z-[60] lg:z-40 transition-all duration-300 pointer-events-none",
                showNotice ? "top-11" : "top-0"
            ))}>
                <div className="h-full pointer-events-auto">
                    <SidebarComponent />
                </div>
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
                .custom-scrollbar::-webkit-scrollbar-thumb { background: oklch(100% 0 0 / 0.1); border-radius: 100px; border: 2px solid transparent; background-clip: padding-box; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: oklch(100% 0 0 / 0.2); }
            `}</style>
        </div>
    );
};

export default memo(Layout);

