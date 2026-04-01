import React, { useRef, useState, useEffect, useMemo, memo } from 'react';
import { useAuthStore, api } from '../store/useAuthStore';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FolderKanban, CheckSquare, Users, Plus, ChevronRight,
    Activity, Lock, RefreshCw, ArrowUpRight, TrendingUp
} from 'lucide-react';
import ApodWidget from '../components/tools/ApodWidget';
import { useSocketStore } from '../store/useSocketStore';
import Button from '../components/ui/Button';
import DeadlinePopup from '../components/projects/DeadlinePopup';
import Card from '../components/ui/Card';
import Counter from '../components/ui/Counter';
import { cn } from '../utils/cn';

const EASE = { duration: 0.4, ease: [0.22, 1, 0.36, 1] };

/* ─── Error Boundary ─────────────────────────────────────────── */
class DashboardErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError() { return { hasError: true }; }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-12 rounded-2xl border border-danger/15 bg-danger/5 text-center gap-3">
                    <RefreshCw className="w-5 h-5 text-danger" />
                    <p className="text-sm text-danger">Something went wrong. Please refresh the page.</p>
                </div>
            );
        }
        return this.props.children;
    }
}

/* ─── Skeleton ───────────────────────────────────────────────── */
const ActivitySkeleton = ({ delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }}
        className="flex items-center gap-3 py-3 border-b border-default"
    >
        <div className="w-8 h-8 rounded-lg bg-surface shrink-0 animate-pulse" />
        <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-2/3 rounded bg-surface animate-pulse" />
            <div className="h-2 w-1/4 rounded bg-surface-lighter animate-pulse" />
        </div>
    </motion.div>
);


/* ─── Status Dot ─────────────────────────────────────────────── */
const StatusDot = ({ active }) => (
    <span className="relative inline-flex w-1.5 h-1.5">
        {active && <span className="absolute inset-0 rounded-full bg-theme opacity-30 animate-pulse" />}
        <span className={`relative rounded-full w-1.5 h-1.5 ${active ? 'bg-theme' : 'bg-disabled'}`} />
    </span>
);

const Home = () => {
    const { user } = useAuthStore();
    const { onlineUsers } = useSocketStore();
    const queryClient = useQueryClient();
    const canViewActivity = !!(user && ['Admin', 'Manager'].includes(user.role));
    const parentRef = useRef(null);

    const [greeting, setGreeting] = useState('');
    useEffect(() => {
        const h = new Date().getHours();
        if (h < 5) setGreeting('Good Evening');
        else if (h < 12) setGreeting('Good Morning');
        else if (h < 17) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    const firstName = user?.name?.split(' ')[0] || 'there';
    const roleLabel = user?.role === 'Admin' ? 'Administrator' : user?.role === 'Manager' ? 'Manager' : 'Developer';
    const dateString = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    /* ── Queries ── */
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

    const { data: projRes } = useQuery({
        queryKey: ['projects'],
        queryFn: async ({ signal }) => (await api.get('/projects', { signal })).data,
        staleTime: 1000 * 60 * 5,
    });
    const projects = projRes?.data || [];

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
            totalProjects: platformStatsRes?.data?.projects.total || 0,
        }
        : statsRes?.data || { activeProjects: 0, totalTasks: 0, completedTasks: 0, pendingTasks: 0, completionPct: 0 };

    const STATS = useMemo(() => [
        { label: 'Active Projects', value: statsData.activeProjects, sub: `${statsData.totalProjects || 0} total`, icon: FolderKanban, accent: 'var(--accent-500)', glow: 'var(--accent-bg)' },
        { label: 'Total Tasks', value: statsData.totalTasks, sub: `${statsData.pendingTasks} pending`, icon: CheckSquare, accent: 'oklch(0.70 0.15 240)', glow: 'oklch(0.70 0.15 240 / 0.10)' },
        { label: 'Completed Tasks', value: statsData.completedTasks, sub: `${statsData.completionPct}% completion`, icon: TrendingUp, accent: 'oklch(0.72 0.18 142)', glow: 'oklch(0.72 0.18 142 / 0.10)' },
        { label: 'Online Now', value: onlineUsers.filter(u => u.status !== 'Offline').length, sub: 'Active members', icon: Users, accent: 'var(--accent-500)', glow: 'var(--accent-bg)' },
    ], [statsData, onlineUsers]);

    const virt = useVirtualizer({
        count: activity.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 60,
        overscan: 6,
    });

    const actionLabel = (action) => {
        const map = { 'created': 'created', 'updated': 'updated', 'deleted': 'deleted', 'assigned': 'assigned', 'completed': 'completed' };
        for (const [k, v] of Object.entries(map)) { if (action?.toLowerCase().includes(k)) return v; }
        return action;
    };

    const [isAuditExpanded, setIsAuditExpanded] = useState(false);

    return (
        <div className="h-root min-h-[calc(100vh-120px)] flex flex-col pb-6 relative max-w-[2000px] mx-auto w-full">
            <DeadlinePopup projects={projects} user={user} />
            <style>{`
                .h-root { font-family: 'Sora', system-ui, sans-serif; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}</style>

            <header className="mb-10 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <StatusDot active />
                            <span className="text-[11px] text-tertiary uppercase tracking-widest font-mono">{dateString}</span>
                        </div>
                        <h1 className="text-4xl sm:text-6xl font-bold text-primary tracking-tight m-0">
                            {greeting}, <span className="text-theme">{firstName}</span>
                        </h1>
                        <p className="text-secondary max-w-xl opacity-80">
                            {user?.role === 'Admin' ? 'Platform oversight is live.' : 'Your creative workspace is operational.'}
                        </p>
                    </div>
                    <Button variant="primary" size="lg" leftIcon={Plus} as={Link} to="/projects" className="rounded-3xl shadow-xl shadow-theme/10 h-14">
                        New Project
                    </Button>
                </div>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 relative z-10">
                {STATS.map((s, i) => (
                    <Card key={s.label} variant="glass" performance="premium" hideBorder padding="p-8" className="rounded-[3.15rem]"
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...EASE, delay: i * 0.05 }}>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-8" style={{ background: s.glow, border: `1px solid ${s.accent}20` }}>
                            <s.icon className="w-5 h-5" style={{ color: s.accent }} />
                        </div>
                        <div className="text-4xl font-bold tracking-tighter text-primary mb-2 tabular-nums">
                            <Counter value={s.value} delay={i * 60} />
                        </div>
                        <div className="text-[11px] font-bold tracking-widest text-tertiary uppercase font-mono mb-6">{s.label}</div>
                        <div className="h-1 bg-sunken rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: '70%' }} transition={{ duration: 1, delay: i * 0.05 + 0.4 }}
                                style={{ height: '100%', background: s.accent, opacity: 0.7 }} />
                        </div>
                    </Card>
                ))}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start relative z-10">
                <Card variant="glass" performance="premium" padding="p-0" hideBorder className="rounded-[3.15rem] overflow-hidden"
                    style={{ height: isAuditExpanded ? 700 : 440, transition: 'height 0.4s cubic-bezier(0.22, 1, 0.36, 1)' }}>
                    <div className="p-8 border-b border-subtle flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-theme/5 border border-theme/10 flex items-center justify-center">
                                <Activity className="w-5 h-5 text-theme" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-primary m-0">Recent Activity</h3>
                                <p className="text-[10px] text-tertiary font-mono m-0 uppercase tracking-widest text-neutral-500">Neural Operational Log</p>
                            </div>
                        </div>
                        <button onClick={() => setIsAuditExpanded(!isAuditExpanded)} className="flex items-center gap-2 text-xs font-bold text-tertiary hover:text-primary outline-none">
                            {isAuditExpanded ? 'Show less' : 'View all'}
                            <ArrowUpRight className={cn("w-3.5 h-3.5 transition-transform", isAuditExpanded && "rotate-180")} />
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        {!canViewActivity ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-12">
                                <Lock className="w-8 h-8 text-tertiary" />
                                <p className="text-sm font-bold text-primary">Access Restricted</p>
                            </div>
                        ) : actLoading ? (
                            <div className="p-8 space-y-4">{[0, .1, .2].map(d => <ActivitySkeleton key={d} delay={d} />)}</div>
                        ) : (
                            <div ref={parentRef} className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
                                <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
                                    {virt.getVirtualItems().map(vi => {
                                        const a = activity[vi.index];
                                        return (
                                            <div key={vi.key} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-sunken/50 transition-all"
                                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: vi.size, transform: `translateY(${vi.start}px)` }}>
                                                <div className="w-10 h-10 rounded-xl bg-sunken flex items-center justify-center text-xs font-bold text-tertiary">{a.user?.name?.charAt(0)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="m-0 text-sm text-secondary truncate">
                                                        <span className="font-bold text-primary">{a.user?.name}</span> {actionLabel(a.action)} <span className="text-theme">{a.details?.title}</span>
                                                    </p>
                                                    <p className="m-0 text-[10px] text-tertiary uppercase font-mono">{new Date(a.createdAt).toLocaleTimeString()}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                <div className="flex flex-col gap-8">
                    <ApodWidget />
                    <Card variant="glass" padding="p-8" className="rounded-[3.15rem]">
                        <p className="text-[10px] font-bold tracking-widest text-tertiary uppercase font-mono mb-6">Milestones</p>
                        <div className="space-y-6">
                            <div className="flex justify-between items-baseline mb-2">
                                <span className="text-sm font-bold text-secondary">Overall Progress</span>
                                <span className="text-sm font-black text-theme">92%</span>
                            </div>
                            <div className="h-2 bg-sunken rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: '92%' }} transition={{ duration: 1 }} className="h-full bg-theme" />
                            </div>
                        </div>
                    </Card>
                </div>
            </section>

            <footer className="mt-12 pt-12 flex items-center gap-6 border-t border-subtle relative z-10">
                <div className="flex items-center gap-2">
                    <StatusDot active />
                    <span className="text-[10px] font-mono text-tertiary uppercase tracking-widest">Operational</span>
                </div>
                <span className="text-[10px] font-mono text-tertiary uppercase tracking-widest opacity-50">{roleLabel} ACCESS</span>
            </footer>
        </div>
    );
};

export default Home;