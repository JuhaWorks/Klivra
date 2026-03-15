import React, { useRef, useState, useEffect } from 'react';
import { useAuthStore, api } from '../store/useAuthStore';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion } from 'framer-motion';
import {
    FolderKanban, CheckSquare, Users, Plus, ChevronRight,
    Activity, Lock, RefreshCw, ArrowUpRight, Shield, TrendingUp
} from 'lucide-react';
import ApodWidget from '../components/tools/ApodWidget';
import { useSocketStore } from '../store/useSocketStore';
import Button from '../components/ui/Button';
import DecryptedText from '../components/ui/DecryptedText';

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

/* ─── Animated Counter ───────────────────────────────────────── */
const Counter = ({ value, delay = 0 }) => {
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        let start = 0;
        const end = Number(value) || 0;
        if (end === 0) { setDisplay(0); return; }
        const step = end / (900 / 16);
        const timer = setTimeout(() => {
            const tick = () => {
                start = Math.min(start + step, end);
                setDisplay(Math.round(start));
                if (start < end) requestAnimationFrame(tick);
            };
            tick();
        }, delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return <span>{display.toLocaleString()}</span>;
};

/* ─── Status Dot ─────────────────────────────────────────────── */
const StatusDot = ({ active }) => (
    <span className="relative inline-flex w-1.5 h-1.5">
        {active && <span className="absolute inset-0 rounded-full bg-theme animate-ping opacity-50" />}
        <span className={`relative rounded-full w-1.5 h-1.5 ${active ? 'bg-theme' : 'bg-disabled'}`} />
    </span>
);

const Home = () => {
    const { user } = useAuthStore();
    const { onlineUsers } = useSocketStore();
    const canViewActivity = user && ['Admin', 'Manager'].includes(user.role);
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

    const STATS = [
        {
            label: 'Active Projects',
            value: statsData.activeProjects,
            sub: `${statsData.totalProjects || 0} total`,
            icon: FolderKanban,
            accent: 'var(--accent-500)',
            glow: 'var(--accent-bg)',
        },
        {
            label: 'Total Tasks',
            value: statsData.totalTasks,
            sub: `${statsData.pendingTasks} pending`,
            icon: CheckSquare,
            accent: 'oklch(0.70 0.15 240)',
            glow: 'oklch(0.70 0.15 240 / 0.10)',
        },
        {
            label: 'Completed Tasks',
            value: statsData.completedTasks,
            sub: `${statsData.completionPct}% completion rate`,
            icon: TrendingUp,
            accent: 'var(--color-success)',
            glow: 'oklch(0.72 0.18 142 / 0.10)',
        },
        {
            label: 'Online Now',
            value: onlineUsers.filter(u => u.status !== 'Offline').length,
            sub: 'Active members',
            icon: Users,
            accent: 'var(--accent-500)',
            glow: 'var(--accent-bg)',
        },
    ];

    const virt = useVirtualizer({
        count: activity.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 60,
        overscan: 6,
    });

    const actionLabel = (action) => {
        const map = {
            'created': 'created',
            'updated': 'updated',
            'deleted': 'deleted',
            'assigned': 'assigned',
            'completed': 'completed',
        };
        for (const [k, v] of Object.entries(map)) {
            if (action?.toLowerCase().includes(k)) return v;
        }
        return action;
    };

    const [isAuditExpanded, setIsAuditExpanded] = useState(false);

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

                .h-root { font-family: 'Sora', system-ui, sans-serif; --mono: 'JetBrains Mono', monospace; }
                .h-scroll::-webkit-scrollbar { width: 3px; }
                .h-scroll::-webkit-scrollbar-track { background: transparent; }
                .h-scroll::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 2px; }

                .stat-card {
                    border: 1px solid var(--border-subtle);
                    border-radius: 16px;
                    padding: 24px;
                    background: var(--bg-surface);
                    transition: border-color 0.2s, transform 0.2s;
                    cursor: default;
                }
                .stat-card:hover {
                    transform: translateY(-2px);
                    border-color: var(--border-strong);
                }

                .act-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 8px;
                    border-radius: 10px;
                    transition: background 0.12s;
                    cursor: default;
                }
                .act-row:hover { background: var(--bg-sunken); }

                .nav-link {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 9px 10px;
                    border-radius: 10px;
                    text-decoration: none;
                    transition: background 0.12s, color 0.12s;
                    color: var(--text-secondary);
                }
                .nav-link:hover {
                    background: var(--bg-sunken);
                    color: var(--text-primary);
                }
            `}</style>

            <article className="h-root min-h-full pb-16" style={{
                backgroundImage: 'linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)',
                backgroundSize: '44px 44px',
            }}>
                <div className="fixed top-[-180px] left-1/2 -translate-x-1/2 w-[700px] h-[380px] pointer-events-none z-0"
                    style={{ background: 'radial-gradient(ellipse, var(--accent-glow) 0%, transparent 70%)' }}
                />

                <div className="px-1 relative z-10">
                    <DashboardErrorBoundary>
                        <motion.header
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={EASE}
                            className="mb-8"
                        >
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <StatusDot active />
                                        <span className="text-[11px] text-tertiary" style={{ fontFamily: 'var(--mono)' }}>
                                            {dateString}
                                        </span>
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-semibold text-primary tracking-tight leading-tight m-0">
                                        {greeting}, <DecryptedText 
                                            text={firstName}
                                            animateOn="inViewHover"
                                            revealDirection="center"
                                            useOriginalCharsOnly={true}
                                            className="text-theme"
                                            encryptedClassName="text-theme opacity-50"
                                            speed={100}
                                            maxIterations={20}
                                            sequential={false}
                                        />
                                    </h1>
                                    <p className="mt-2 text-sm text-secondary max-w-md leading-relaxed">
                                        {user?.role === 'Admin'
                                            ? 'Here\'s an overview of platform activity and current project status.'
                                            : 'Your workspace is ready. Here\'s what\'s happening across your projects.'}
                                    </p>
                                </div>
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ...EASE, delay: 0.15 }}>
                                    <Button variant="primary" size="md" leftIcon={Plus} as={Link} to="/projects">New Project</Button>
                                </motion.div>
                            </div>
                        </motion.header>

                        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {STATS.map((s, i) => (
                                <motion.div
                                    key={s.label}
                                    className="stat-card"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ ...EASE, delay: i * 0.06 }}
                                >
                                    <div style={{
                                        width: 34, height: 34, borderRadius: 10,
                                        background: s.glow,
                                        border: `1px solid ${s.accent}20`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        marginBottom: 18
                                    }}>
                                        <s.icon style={{ width: 15, height: 15, color: s.accent }} />
                                    </div>
                                    <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-1px', color: 'var(--text-primary)', lineHeight: 1, marginBottom: 5 }}>
                                        <Counter value={s.value} delay={i * 60 + 180} />
                                    </div>
                                    <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--mono)', marginBottom: 14 }}>
                                        {s.label}
                                    </div>
                                    <div style={{ height: 2, background: 'var(--bg-sunken)', borderRadius: 2, overflow: 'hidden' }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (s.value / Math.max(statsData.totalProjects || 1, s.value)) * 100)}%` }}
                                            transition={{ duration: 1, delay: i * 0.06 + 0.35, ease: 'easeOut' }}
                                            style={{ height: '100%', background: s.accent, borderRadius: 2, opacity: 0.7 }}
                                        />
                                    </div>
                                    <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--mono)' }}>{s.sub}</div>
                                </motion.div>
                            ))}
                        </section>

                        <section className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ ...EASE, delay: 0.2 }}
                                style={{
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: 16,
                                    background: 'var(--bg-surface)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: isAuditExpanded ? 700 : 380,
                                    transition: 'height 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                                }}
                            >
                                <div style={{
                                    padding: '16px 20px',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: 9,
                                            background: 'var(--accent-bg)',
                                            border: '1px solid var(--accent-border)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Activity className="w-3.5 h-3.5 text-theme" />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Activity</h3>
                                            <p style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'var(--mono)', margin: '1px 0 0', textTransform: 'uppercase', letterSpacing: '.1em' }}>Audit log</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsAuditExpanded(!isAuditExpanded)}
                                        style={{
                                            background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 4,
                                            fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', cursor: 'pointer', outline: 'none', transition: 'color .15s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                                    >
                                        {isAuditExpanded ? 'Show less' : 'View all'}
                                        <ArrowUpRight style={{ width: 11, height: 11, transition: 'transform 0.3s', transform: isAuditExpanded ? 'rotate(180deg)' : 'none' }} />
                                    </button>
                                </div>

                                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} className="h-scroll">
                                    {!canViewActivity ? (
                                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32, textAlign: 'center' }}>
                                            <div style={{
                                                width: 38, height: 38, borderRadius: 11,
                                                background: 'var(--accent-bg)',
                                                border: '1px solid var(--accent-border)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <Lock style={{ width: 15, height: 15, color: 'var(--accent-500)' }} />
                                            </div>
                                            <div>
                                                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>Access Restricted</p>
                                                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0, maxWidth: 240, lineHeight: 1.6 }}>The audit log is available to Managers and Administrators only.</p>
                                            </div>
                                        </div>
                                    ) : actLoading ? (
                                        <div style={{ padding: '14px 20px' }}>{[0, .07, .14, .21, .28].map((d, i) => <ActivitySkeleton key={i} delay={d} />)}</div>
                                    ) : activity.length === 0 ? (
                                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--mono)' }}>No recent activity</p>
                                        </div>
                                    ) : (
                                        <div ref={parentRef} style={{ height: '100%', overflowY: 'auto', padding: '6px 12px' }} className="h-scroll">
                                            <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
                                                {virt.getVirtualItems().map(vi => {
                                                    const a = activity[vi.index];
                                                    const t = new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                    const initial = a.user?.name?.charAt(0)?.toUpperCase() || '?';
                                                    return (
                                                        <div
                                                            key={vi.key} className="act-row"
                                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: vi.size, transform: `translateY(${vi.start}px)` }}
                                                        >
                                                            <div style={{
                                                                width: 30, height: 30, borderRadius: 8, background: 'var(--bg-sunken)', border: '1px solid var(--border-subtle)',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', flexShrink: 0,
                                                            }}>{initial}</div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.user?.name}</span>
                                                                    {' '}<span>{actionLabel(a.action)}</span>
                                                                    {a.details?.title && (
                                                                        <> <span style={{ color: 'var(--text-primary)', opacity: 0.9 }}>"{a.details.title}"</span></>
                                                                    )}
                                                                </p>
                                                                <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--border-strong)', fontFamily: 'var(--mono)' }}>{t}</p>
                                                            </div>
                                                            <ChevronRight style={{ width: 12, height: 12, color: 'var(--border-strong)', flexShrink: 0 }} />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ ...EASE, delay: 0.28 }}>
                                    <ApodWidget />
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ ...EASE, delay: 0.34 }}
                                    style={{ border: '1px solid var(--accent-border)', borderRadius: 16, background: 'var(--accent-bg)', padding: '20px' }}
                                >
                                    <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--mono)', marginBottom: 14 }}>Milestones</p>
                                    <div style={{ marginBottom: 8 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>Overall Completion</span>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-500)', fontFamily: 'var(--mono)' }}>92%</span>
                                        </div>
                                        <div style={{ height: 3, background: 'var(--bg-sunken)', borderRadius: 2, overflow: 'hidden' }}>
                                            <motion.div
                                                initial={{ width: 0 }} animate={{ width: '92%' }}
                                                transition={{ duration: 1.1, delay: 0.55, ease: 'easeOut' }}
                                                style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent-400), var(--accent-600))', borderRadius: 2 }}
                                            />
                                        </div>
                                    </div>
                                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.55, margin: '10px 0 14px' }}>On track to reach the next milestone by end of week.</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {[
                                            { label: 'Design Review', pct: 100, done: true },
                                            { label: 'Backend API', pct: 88, done: false },
                                            { label: 'QA & Staging', pct: 45, done: false },
                                        ].map((m, i) => (
                                            <div key={i}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{m.label}</span>
                                                    <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: m.done ? 'var(--color-success)' : 'var(--text-tertiary)' }}>
                                                        {m.done ? '✓ Done' : `${m.pct}%`}
                                                    </span>
                                                </div>
                                                <div style={{ height: 2, background: 'var(--bg-sunken)', borderRadius: 1, overflow: 'hidden' }}>
                                                    <motion.div
                                                        initial={{ width: 0 }} animate={{ width: `${m.pct}%` }}
                                                        transition={{ duration: 0.9, delay: 0.65 + i * 0.1, ease: 'easeOut' }}
                                                        style={{ height: '100%', background: m.done ? 'var(--color-success)' : 'var(--accent-400)', borderRadius: 1 }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ ...EASE, delay: 0.42 }}
                                    style={{ border: '1px solid var(--border-subtle)', borderRadius: 16, background: 'var(--bg-surface)', padding: '16px 18px' }}
                                >
                                    <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--mono)', marginBottom: 10 }}>Quick Links</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {[
                                            { label: 'Projects', to: '/projects', icon: FolderKanban },
                                            { label: 'Tasks', to: '/tasks', icon: CheckSquare },
                                            ...(canViewActivity ? [{ label: 'Admin & Security', to: '/admin', icon: Shield }] : []),
                                        ].map((link, i) => (
                                            <Link key={i} to={link.to} className="nav-link">
                                                <link.icon style={{ width: 13, height: 13, flexShrink: 0 }} />
                                                <span style={{ fontSize: 13, fontWeight: 500 }}>{link.label}</span>
                                                <ChevronRight style={{ width: 11, height: 11, marginLeft: 'auto', opacity: 0.4 }} />
                                            </Link>
                                        ))}
                                    </div>
                                </motion.div>
                            </div>
                        </section>

                        <motion.footer
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
                            className="mt-8 flex flex-wrap items-center gap-3 pb-2"
                        >
                            <div className="flex items-center gap-1.5">
                                <StatusDot active />
                                <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-tertiary)' }}>All systems operational</span>
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', opacity: 0.4 }}>·</span>
                            <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{roleLabel}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', opacity: 0.4 }}>·</span>
                            <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-tertiary)' }}>{user?.email}</span>
                        </motion.footer>
                    </DashboardErrorBoundary>
                </div>
            </article>
        </>
    );
};

export default Home;