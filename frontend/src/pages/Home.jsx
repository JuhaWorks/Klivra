import { useRef, useState, useEffect, Suspense } from 'react';
import { useAuthStore, api } from '../store/useAuthStore';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { preload } from 'react-dom';
import { 
    FolderKanban, CheckSquare, Zap, Plus, ChevronRight, Activity, 
    Lock, Cpu, Network, Trophy, RefreshCw
} from 'lucide-react/dist/esm/lucide-react';
import ApodWidget from '../components/tools/ApodWidget';
import { useSocketStore } from '../store/useSocketStore';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

// ── Vanguard 2026: Physics Configuration ──
const LIQUID_SPRING = { type: 'spring', stiffness: 260, damping: 20, mass: 0.5 };
const KINETIC_SPRING = { type: 'spring', stiffness: 100, damping: 30 };

// ── Vanguard 2026: Error Boundary ──
class DashboardErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
        if (this.state.hasError) {
            return (
                <div className="w-full flex-1 flex flex-col items-center justify-center p-10 bg-rose-500/5 rounded-[3rem] border border-rose-500/20 text-center">
                    <RefreshCw className="w-8 h-8 text-rose-500 mb-4" />
                    <h2 className="text-xl font-black text-rose-400">Dashboard Synchronization Failed</h2>
                </div>
            );
        }
        return this.props.children;
    }
}

// ── Vanguard 2026: Zero-CLS Skeleton Array ──
const ActivitySkeleton = () => (
    <div className="flex items-center gap-5 border-b border-[oklch(100%_0_0/0.03)] pb-4 mb-4 opacity-50 animate-pulse">
        <div className="w-10 h-10 rounded-2xl bg-[oklch(100%_0_0/0.05)] border border-[oklch(100%_0_0/0.05)]" />
        <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded-md bg-[oklch(100%_0_0/0.05)]" />
            <div className="h-2 w-1/4 rounded-md bg-[oklch(100%_0_0/0.05)]" />
        </div>
    </div>
);

const Home = () => {
    const { user } = useAuthStore();
    const { onlineUsers } = useSocketStore();
    const canViewActivity = user && ['Admin', 'Manager'].includes(user.role);
    const containerRef = useRef(null);
    const parentRef = useRef();

    // ── Vanguard 2026: Kinetics & Parallax 3.0 ──
    const { scrollYProgress } = useScroll({ container: containerRef });
    const parallaxY1 = useTransform(scrollYProgress, [0, 1], [0, 150]);
    const parallaxY2 = useTransform(scrollYProgress, [0, 1], [0, -100]);
    const kineticLetterSpacing = useTransform(scrollYProgress, [0, 0.2], ['-0.05em', '0em'], KINETIC_SPRING);
    const kineticScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

    // LCP Speculative Preload
    useEffect(() => {
        preload('/fonts/Inter-Black.woff2', { as: 'font', type: 'font/woff2', fetchpriority: 'high', crossOrigin: 'anonymous' });
    }, []);

    const { data: actRes, isLoading: actLoading } = useQuery({
        queryKey: ['activityFeed'],
        queryFn: async ({ signal }) => (await api.get('/audit?limit=100', { signal })).data,
        staleTime: 1000 * 60 * 5,
        enabled: canViewActivity,
    });

    const activity = actRes?.data || [];

    const { data: statsRes } = useQuery({
        queryKey: ['workspaceStats'],
        queryFn: async ({ signal }) => (await api.get('/projects/workspace/stats', { signal })).data,
        staleTime: 1000 * 60 * 5,
    });

    const { data: platformStatsRes } = useQuery({
        queryKey: ['platformStats'],
        queryFn: async ({ signal }) => (await api.get('/admin/stats', { signal })).data,
        enabled: user?.role === 'Admin',
        staleTime: 1000 * 60 * 5,
    });

    const statsData = user?.role === 'Admin'
        ? {
            activeProjects: platformStatsRes?.data?.projects.total || 0,
            totalTasks: platformStatsRes?.data?.tasks.total || 0,
            completedTasks: platformStatsRes?.data?.tasks.completed || 0,
            pendingTasks: platformStatsRes?.data?.tasks.pending || 0,
            completionPct: platformStatsRes?.data?.tasks.completionPct || 0,
            totalProjects: platformStatsRes?.data?.projects.total || 0
        }
        : statsRes?.data || { activeProjects: 0, totalTasks: 0, completedTasks: 0, pendingTasks: 0, completionPct: 0 };

    const STATS = [
        { label: 'Active Projects', value: statsData.activeProjects, sub: `${statsData.totalProjects || 0} total`, icon: FolderKanban, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
        { label: 'Total Tasks', value: statsData.totalTasks, sub: `${statsData.pendingTasks} pending`, icon: CheckSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
        { label: 'Platform Velocity', value: statsData.completedTasks, sub: `${statsData.completionPct}% output`, icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { label: 'Neural Nodes', value: onlineUsers.filter(u => u.status !== 'Offline').length, sub: 'Quantum Link Active', icon: Network, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
    ];

    const virt = useVirtualizer({
        count: activity.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 76,
        overscan: 5,
    });

    const [greeting, setGreeting] = useState('');
    useEffect(() => {
        const h = new Date().getHours();
        if (h < 5) setGreeting('System Standby');
        else if (h < 12) setGreeting('Morning Session');
        else if (h < 17) setGreeting('Peak Frequency');
        else setGreeting('Evening Sync');
    }, []);

    const firstName = user?.name?.split(' ')[0] || 'Operator';

    return (
        <article 
            ref={containerRef} 
            className="space-y-12 pb-20 relative h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar @container"
        >
            {/* Parallax 3.0 Background Layers */}
            <motion.div style={{ y: parallaxY1 }} className="absolute -top-40 right-10 w-[40vw] h-[40vw] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none -z-10 mix-blend-screen" aria-hidden />
            <motion.div style={{ y: parallaxY2 }} className="absolute top-60 -left-20 w-[30vw] h-[30vw] bg-fuchsia-600/5 rounded-full blur-[120px] pointer-events-none -z-10 mix-blend-screen" aria-hidden />

            <DashboardErrorBoundary>
                {/* ── Header Area (Kinetic Typography) ── */}
                <header className="relative pt-10 z-10 w-full">
                    <div className="flex flex-col @4xl:flex-row @4xl:items-end justify-between gap-8">
                        <div className="space-y-3">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={LIQUID_SPRING}
                                className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-[oklch(100%_0_0/0.03)] border border-[oklch(100%_0_0/0.05)] text-cyan-400 font-black text-[10px] uppercase tracking-[0.4em] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]"
                            >
                                <Cpu className="w-3 h-3 animate-pulse" />
                                <span>Node Status: Standard</span>
                            </motion.div>
                            
                            {/* Kinetic Typography */}
                            <motion.h1 
                                style={{ letterSpacing: kineticLetterSpacing, scale: kineticScale }}
                                className="text-[length:clamp(3rem,6vw,5rem)] font-black tracking-tighter text-white leading-none transform-origin-left"
                            >
                                {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-fuchsia-400 animate-pulse bg-[length:200%_auto]">{firstName}</span>.
                            </motion.h1>
                            
                            <motion.p 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, ...LIQUID_SPRING }}
                                className="text-gray-500 font-medium text-[length:clamp(1rem,1.5vw,1.125rem)] max-w-xl leading-relaxed"
                            >
                                {user?.role === 'Admin'
                                    ? "Platform architectural integrity preserved. Monitoring global nexus activity and machine telemetry."
                                    : "Workspace is operational. All neural links are stable and ready for dispatch."}
                            </motion.p>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2, ...LIQUID_SPRING }}
                            className="shrink-0"
                        >
                            <Button 
                                variant="primary" 
                                size="lg" 
                                leftIcon={Plus}
                                as={Link}
                                to="/projects"
                                hapticIntensity="light"
                                className="shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),_0_15px_30px_rgba(6,182,212,0.3)]"
                            >
                                New Initiative
                            </Button>
                        </motion.div>
                    </div>
                </header>

                {/* ── Vanguard 2026: Generative UI Grid ── */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 @container" aria-label="System Metrics">
                    {STATS.map((s, i) => (
                        <Card 
                            key={i} 
                            className="group relative overflow-hidden bg-[oklch(100%_0_0/0.02)] border-[oklch(100%_0_0/0.05)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] !p-8 transform-gpu transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
                        >

                            <div className={cn("absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[50px] opacity-20 transition-all duration-700 group-hover:opacity-40", s.bg.replace('bg-', 'bg-'))} aria-hidden />

                            <div className="relative z-10 flex flex-col justify-between h-full gap-8">
                                <div className={cn("w-14 h-14 rounded-[1.25rem] flex items-center justify-center border border-white/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-inner", s.bg)}>
                                    <s.icon className={cn("w-6 h-6", s.color)} />
                                </div>
                                
                                <div className="space-y-1">
                                    <motion.span 
                                        className="text-5xl font-black text-white block tracking-tighter"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: i * 0.1, ...LIQUID_SPRING }}
                                    >
                                        {s.value}
                                    </motion.span>
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 group-hover:text-white transition-colors duration-300">
                                        {s.label}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="h-0.5 flex-1 bg-[oklch(100%_0_0/0.05)] rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (s.value / (statsData.totalProjects || 100)) * 100)}%` }} // Fallback purely visual calculation
                                            className={cn("h-full", s.bg.replace('/10', ''))}
                                            transition={{ duration: 1, delay: i * 0.1 + 0.5 }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-600 whitespace-nowrap uppercase">{s.sub}</span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </section>

                {/* ── Main Dashboard Area ── */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
                    {/* Neural Feed (Activity) - Liquid Glass Container */}
                    <Card className="lg:col-span-2 flex flex-col h-[550px] !p-0 bg-[oklch(100%_0_0/0.02)] border-[oklch(100%_0_0/0.05)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)] overflow-hidden relative">
                        <header className="p-8 border-b border-[oklch(100%_0_0/0.05)] flex items-center justify-between bg-[oklch(100%_0_0/0.01)] backdrop-blur-md relative z-20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-[1.25rem] bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                    <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-tighter">Neural Feed</h3>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Real-time Synchronization</p>
                                </div>
                            </div>
                            {canViewActivity && (
                                <Link to="/admin/security" className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400 hover:text-white transition-colors">
                                    Full Audit Log
                                </Link>
                            )}
                        </header>

                        <div className="flex-1 min-h-0 relative z-10 bg-gradient-to-b from-[oklch(100%_0_0/0.02)] to-transparent">
                            {!canViewActivity ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                                    <Lock className="w-12 h-12 text-rose-500/80 mb-6 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]" />
                                    <h4 className="text-white text-lg font-black tracking-tight mb-2">Encrypted Segment</h4>
                                    <p className="text-sm text-gray-500 font-medium max-w-xs leading-relaxed">
                                        Neural activity stream requires level 3 architectural clearance.
                                    </p>
                                </div>
                            ) : actLoading ? (
                                <div className="p-8 space-y-2">
                                    {[1, 2, 3, 4, 5].map(i => <ActivitySkeleton key={i} />)}
                                </div>
                            ) : (
                                <div ref={parentRef} className="h-full overflow-y-auto px-8 py-4 custom-scrollbar" aria-live="polite">
                                    <div style={{ height: virt.getTotalSize(), width: '100%', position: 'relative' }}>
                                        {virt.getVirtualItems().map(vi => {
                                            const a = activity[vi.index];
                                            const t = new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            return (
                                                <div 
                                                    key={vi.key} 
                                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: vi.size, transform: `translateY(${vi.start}px)` }}
                                                    className="flex items-center gap-5 border-b border-[oklch(100%_0_0/0.03)] last:border-0 hover:bg-[oklch(100%_0_0/0.02)] transition-colors rounded-xl px-2"
                                                >
                                                    <div className="relative flex-shrink-0">
                                                        <div className="w-11 h-11 rounded-[1.125rem] bg-[oklch(100%_0_0/0.05)] border border-[oklch(100%_0_0/0.1)] flex items-center justify-center font-black text-sm text-gray-300 shadow-inner">
                                                            {a.user?.name?.charAt(0)}
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0 pr-4 flex-1 py-3 border-r border-[oklch(100%_0_0/0.03)]">
                                                        <p className="text-sm text-gray-300 font-medium truncate leading-tight">
                                                            <span className="font-black text-cyan-400 mr-2">{a.user?.name}</span>
                                                            <span className="text-gray-500">{a.action}</span>
                                                            {a.details?.title && <span className="ml-2 text-white">"{a.details.title}"</span>}
                                                        </p>
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 mt-1.5">{t}</p>
                                                    </div>
                                                    <ChevronRight className="ml-3 w-4 h-4 text-gray-700 shrink-0" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Right Column (Widgets) - M2M Adaptive Space */}
                    <aside className="space-y-8 h-full flex flex-col">
                        <ApodWidget />
                        
                        <Card className="flex-1 bg-gradient-to-br from-indigo-500/10 to-[oklch(100%_0_0/0.02)] border-indigo-500/20 overflow-hidden relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" padding="p-8">
                            <div className="absolute -top-10 -right-10 p-4 transform-gpu rotate-12 scale-150 opacity-20 filter blur-sm">
                                <Trophy className="w-32 h-32 text-indigo-400 mix-blend-overlay" />
                            </div>
                            <div className="relative z-10 flex flex-col h-full justify-center">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-8 border-b border-indigo-500/20 pb-4 inline-block">Adaptive Goal Tracker</h4>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-lg font-black tracking-tight text-white">Phase 5 Delta</span>
                                        <span className="text-base font-black text-indigo-400">92%</span>
                                    </div>
                                    <div className="h-1.5 bg-[oklch(100%_0_0/0.05)] rounded-full overflow-hidden shadow-inner">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: '92%' }}
                                            transition={{ ...LIQUID_SPRING, delay: 0.5 }}
                                            className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 shadow-[0_0_15px_rgba(99,102,241,0.6)]"
                                        />
                                    </div>
                                    <p className="text-xs text-indigo-300/50 font-medium">Trajectory indicates target acquisition within 2 cycles.</p>
                                </div>
                            </div>
                        </Card>
                    </aside>
                </section>
            </DashboardErrorBoundary>
        </article>
    );
};

export default Home;
