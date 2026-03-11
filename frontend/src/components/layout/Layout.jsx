import React, { useState, useEffect, Suspense, useTransition } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { preload } from 'react-dom';
import SidebarComponent from './Sidebar';
import TopBar from './TopBar';
import GlobalPresence from './GlobalPresence';
import { useIdleTimer } from '../../hooks/useIdleTimer';
import { RefreshCw } from 'lucide-react/dist/esm/lucide-react';

// ── Vanguard 2026: Physics Configuration ──
const LIQUID_SPRING = { type: "spring", stiffness: 260, damping: 20, mass: 0.5 };

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

/**
 * 2026 Core Layout Shell: "The Vanguard"
 * Liquid Glass, Agentic MX, Hyper-Performance, Zero-CLS
 */
const Layout = () => {
    useIdleTimer(); // Global idle tracking
    const location = useLocation();
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Context-Driven Theme Analysis based on routing
    const isFocusMode = location.pathname.includes('/tasks') || location.pathname.includes('/whiteboard');
    const layoutVibe = isFocusMode ? 'bg-[#050508]' : 'bg-[#09090b]';

    useEffect(() => {
        // Preload core aesthetic assets immediately
        preload('https://grainy-gradients.vercel.app/noise.svg', { as: 'image', fetchpriority: 'low' });
    }, [location.pathname]);

    // Intent Handshake for routing transitions
    const handleRouteTransition = (newPathFn) => {
        startTransition(() => { newPathFn(); });
    };

    return (
        <div className={`flex h-screen ${layoutVibe} text-white selection:bg-cyan-500/30 overflow-hidden font-sans relative transition-colors duration-1000 ease-out`}>
            
            {/* Global Anti-grid Grain Layer for Tactile Maximalism */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.04] grayscale bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay z-[100]" aria-hidden="true" />
            
            {/* Ambient Background Mesh (Context Aware) */}
            <div className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000" style={{ opacity: isFocusMode ? 0.3 : 1 }}>
                <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-cyan-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[30vw] h-[30vw] bg-indigo-600/5 rounded-full blur-[120px]" />
            </div>

            {/* Sidebar (Navigation Node) */}
            <SidebarComponent 
                isOpen={isSidebarExpanded} 
                onClose={() => setIsSidebarExpanded(false)} 
            />

            {/* Main Operational Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10" aria-label="Core operational quadrant">
                {/* Top Command Bar */}
                <header className="shrink-0 z-20">
                    <TopBar onMenuToggle={() => setIsSidebarExpanded(!isSidebarExpanded)} />
                </header>

                {/* Vanguard Viewport with Morphing Transitions */}
                <section className="flex-1 overflow-y-auto relative custom-scrollbar perspective-1000" aria-live="polite">
                    <GlobalErrorBoundary>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={location.pathname}
                                initial={{ opacity: 0, scale: 0.99, rotateX: 2, y: 15 }}
                                animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98, rotateX: -2, y: -15 }}
                                transition={LIQUID_SPRING}
                                className={`p-inline-6 lg:p-inline-10 h-full ${isPending ? 'opacity-50 blur-sm pointer-events-none' : ''}`}
                            >
                                <Suspense fallback={<PageSkeleton />}>
                                    <Outlet context={{ handleRouteTransition }} />
                                </Suspense>
                            </motion.div>
                        </AnimatePresence>
                    </GlobalErrorBoundary>
                </section>
            </main>

            {/* Global Presence Synchronization */}
            <GlobalPresence aria-hidden="true" />

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
