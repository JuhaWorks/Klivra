import React, { useState, useEffect, Suspense, useTransition } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SidebarComponent from './Sidebar';
import TopBar from './TopBar';
import MaintenanceNotice, { useMaintenanceStatus } from './MaintenanceNotice';
import { useIdleTimer } from '../../hooks/useIdleTimer';
import { useAuthStore } from '../../store/useAuthStore';
import { RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ── Vanguard 2026: Physics Configuration ──
// Optimized for high-frequency navigation with less layout tension
const LIQUID_SPRING = { 
    type: "spring", 
    stiffness: 300, 
    damping: 30, 
    mass: 0.8,
    restDelta: 0.001
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

// ── Vanguard 2026: Zero-CLS Core Skeleton ──
const PageSkeleton = () => (
    <div className="w-full h-full min-height-[calc(100vh-140px)] rounded-[3rem] border border-[oklch(100%_0_0/0.05)] bg-[oklch(100%_0_0/0.01)] animate-pulse shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] flex items-center justify-center p-10" aria-hidden="true">
        <div className="w-full h-full rounded-[2rem] bg-[oklch(100%_0_0/0.02)] border border-[oklch(100%_0_0/0.03)]" />
    </div>
);

const Layout = () => {
    useIdleTimer();
    const location = useLocation();
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(
        localStorage.getItem('klivra-sidebar-visible') === null ? true : localStorage.getItem('klivra-sidebar-visible') === 'true'
    );
    const [isCollapsed, setIsCollapsed] = useState(localStorage.getItem('klivra-sidebar-collapsed') === 'true');
    const [isPending, startTransition] = useTransition();
    const { isUnderMaintenance } = useMaintenanceStatus();
    const { user } = useAuthStore();

    const showNotice = isUnderMaintenance && user?.role === 'Admin';

    const toggleSidebar = () => {
        const next = !isSidebarExpanded;
        setIsSidebarExpanded(next);
        localStorage.setItem('klivra-sidebar-visible', String(next));
    };

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('klivra-sidebar-collapsed', String(newState));
    };

    const handleRouteTransition = (newPathFn) => {
        startTransition(() => { newPathFn(); });
    };

    return (
        <div className="flex min-h-screen bg-base relative overflow-x-hidden font-sans selection:bg-theme/20 selection:text-theme">
            {/* Ambient Background Node */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden h-full bg-base">
                {/* Tech Grid Background */}
                <div 
                    className="absolute inset-0 opacity-[0.8]" 
                    style={{ 
                        backgroundImage: `
                            linear-gradient(var(--grid-line) 1px, transparent 1px),
                            linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)
                        `,
                        backgroundSize: '32px 32px',
                        maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)',
                        WebkitMaskImage: 'radial-gradient(ellipse at center, black, transparent 80%)'
                    }} 
                />
                
                {/* High-Performance Animated Glows */}
                <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] bg-theme/10 dark:bg-theme/15 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[10%] left-[-5%] w-[35%] h-[35%] bg-theme/5 dark:bg-theme/10 rounded-full blur-[100px]" />
                
                {/* Surface Gradient for Depth */}
                <div className="absolute inset-0 bg-gradient-to-tr from-base/5 via-transparent to-base/5 pointer-events-none dark:from-black/80 dark:to-black/60" />
                
                {/* Fine Texture Noise */}
                <div className="absolute inset-0 bg-repeat bg-center opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("/noise.svg")' }} />
            </div>

            {/* TopBar - Z Layout (Spans Full Width, Top Priority) */}
            <div className={twMerge(clsx(
                "fixed right-0 z-50 transition-all duration-300",
                showNotice ? "top-11" : "top-0",
                isSidebarExpanded ? (isCollapsed ? "left-20" : "left-[280px]") : "left-0"
            ))}>
                <TopBar onMenuToggle={toggleSidebar} />
            </div>

            {/* Desktop Sidebar */}
            <div className={twMerge(clsx(
                "hidden lg:block fixed bottom-0 left-0 z-40 transition-all duration-300",
                showNotice ? "top-11" : "top-0"
            ))}>
                <SidebarComponent
                    isOpen={isSidebarExpanded}
                    isCollapsed={isCollapsed}
                    onClose={() => setIsSidebarExpanded(false)}
                    onToggleCollapse={toggleCollapse}
                />
            </div>

            {/* Mobile Sidebar */}
            <div className={twMerge(clsx(
                "lg:hidden fixed bottom-0 left-0 z-40 transition-all duration-300",
                showNotice ? "top-11" : "top-0"
            ))}>
                <SidebarComponent
                    isOpen={isSidebarExpanded}
                    isCollapsed={isCollapsed}
                    onClose={() => setIsSidebarExpanded(false)}
                    onToggleCollapse={toggleCollapse}
                />
            </div>

            {/* Main Content Area */}
            <main 
                className={twMerge(clsx(
                    "flex-1 flex flex-col min-w-0 min-h-screen relative z-20 transition-all duration-300 ease-in-out",
                    showNotice ? "pt-[108px]" : "pt-16",
                    isSidebarExpanded ? (isCollapsed ? "lg:pl-20" : "lg:pl-[280px]") : "pl-0"
                ))} 
                style={{ transform: 'translateZ(0)' }}
            >
                {/* Content Container (Full Width) */}
                <div className="flex-1 w-full flex flex-col pt-4">
                    <section className="flex-1 relative perspective-1000 pb-4" aria-live="polite">
                        <GlobalErrorBoundary>
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.div
                                    key={location.pathname}
                                    initial={{ opacity: 0, scale: 0.99, y: 8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.99, y: -8 }}
                                    transition={LIQUID_SPRING}
                                    style={{ willChange: 'transform, opacity' }}
                                    className={`px-6 lg:px-10 h-full ${isPending ? 'opacity-50 blur-sm pointer-events-none' : ''}`}
                                >
                                    <Suspense fallback={<PageSkeleton />}>
                                        <Outlet context={{ handleRouteTransition }} />
                                    </Suspense>
                                </motion.div>
                            </AnimatePresence>
                        </GlobalErrorBoundary>
                    </section>
                </div>
            </main>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { 
                    background: oklch(100% 0 0 / 0.1); 
                    border-radius: 100px; 
                    border: 2px solid transparent;
                    background-clip: padding-box;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { 
                    background: oklch(100% 0 0 / 0.2); 
                    border: 2px solid transparent;
                    background-clip: padding-box;
                }
            `}</style>
        </div>
    );
};

export default Layout;
