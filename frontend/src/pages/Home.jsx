import { useRef, useState, useEffect } from 'react';
import { useAuthStore, api } from '../store/useAuthStore';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import ApodWidget from '../components/tools/ApodWidget';
import { useSocketStore } from '../store/useSocketStore';

// ─── Config ──────────────────────────────────────────────────────────────────

// ─── Shared primitives (Replaced by global index.css) ──────────────────────

const Ico = ({ d, size = 16, sw = 1.5, stroke = 'currentColor', fill = 'none' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
        strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d={d} />
    </svg>
);

const Tag = ({ children }) => (
    <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-500">
        {children}
    </span>
);

const SectionHead = ({ title, badge, action }) => (
    <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">{title}</h3>
            {badge !== undefined && (
                <span className="text-xs font-medium text-gray-600">({badge})</span>
            )}
        </div>
        {action}
    </div>
);

// ─── Home ─────────────────────────────────────────────────────────────────────

const Home = () => {
    const { user } = useAuthStore();
    const { onlineUsers } = useSocketStore();
    const canViewActivity = user && ['Admin', 'Manager'].includes(user.role);
    const parentRef = useRef();

    const { data: actRes, isLoading: actLoading } = useQuery({
        queryKey: ['activityFeed'],
        queryFn: async () => (await api.get('/audit?limit=100')).data,
        staleTime: 1000 * 60 * 5,
        enabled: canViewActivity,
    });

    const activity = actRes?.data || [];

    const { data: statsRes, isLoading: statsLoading } = useQuery({
        queryKey: ['workspaceStats'],
        queryFn: async () => (await api.get('/projects/workspace/stats')).data,
        staleTime: 1000 * 60 * 5,
    });

    const { data: platformStatsRes, isLoading: platformLoading } = useQuery({
        queryKey: ['platformStats'],
        queryFn: async () => (await api.get('/admin/stats')).data,
        enabled: user?.role === 'Admin',
        staleTime: 1000 * 60 * 5,
    });

    const statsData = user?.role === 'Admin'
        ? {
            activeProjects: platformStatsRes?.data?.projects.total || 0,
            totalTasks: platformStatsRes?.data?.tasks.total || 0,
            completedTasks: platformStatsRes?.data?.tasks.completed || 0,
            pendingTasks: platformStatsRes?.data?.tasks.pending || 0,
            inProgressTasks: 0, // Admin view doesn't need this granular split here
            completionPct: platformStatsRes?.data?.tasks.completionPct || 0,
            totalProjects: platformStatsRes?.data?.projects.total || 0
        }
        : statsRes?.data || {
            activeProjects: 0,
            totalTasks: 0,
            completedTasks: 0,
            pendingTasks: 0,
            inProgressTasks: 0,
            completionPct: 0
        };

    const STATS = [
        { label: 'Active Projects', value: statsData.activeProjects, sub: `${statsData.totalProjects || 0} total`, icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', g: ['rgb(var(--theme-600))', 'rgb(var(--theme-400))'], glow: 'rgba(var(--theme-500), 0.18)' },
        { label: 'Total Tasks', value: statsData.totalTasks, sub: `${statsData.pendingTasks} pending`, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', g: ['#374151', '#9ca3af'], glow: 'rgba(156,163,175,.18)' },
        { label: 'Completed', value: statsData.completedTasks, sub: `${statsData.completionPct}% complete`, icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', g: ['rgb(var(--theme-600))', 'rgb(var(--theme-500))'], glow: 'rgba(var(--theme-500), 0.18)' },
        { label: 'Team Members', value: onlineUsers.filter(u => u.status !== 'Offline').length, sub: '3 online now', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', g: ['#1f2937', '#6b7280'], glow: 'rgba(107,114,128,.18)' },
    ];

    const TASKS = [
        { status: 'Pending', count: statsData.pendingTasks, pct: statsData.totalTasks > 0 ? `${(statsData.pendingTasks / statsData.totalTasks) * 100}%` : '0%', color: '#4b5563' },
        { status: 'In Progress', count: statsData.inProgressTasks, pct: statsData.totalTasks > 0 ? `${(statsData.inProgressTasks / statsData.totalTasks) * 100}%` : '0%', color: '#9ca3af' },
        { status: 'Completed', count: statsData.completedTasks, pct: statsData.totalTasks > 0 ? `${(statsData.completedTasks / statsData.totalTasks) * 100}%` : '0%', color: 'rgb(var(--theme-400))' },
    ];

    const virt = useVirtualizer({
        count: activity.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 60,
        overscan: 5,
    });

    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const update = () => {
            const h = new Date().getHours();
            if (h < 5) setGreeting('Good night');
            else if (h < 12) setGreeting('Good morning');
            else if (h < 17) setGreeting('Good afternoon');
            else setGreeting('Good evening');
        };
        update();
        const t = setInterval(update, 60000);
        return () => clearInterval(t);
    }, []);

    const firstName = user?.name?.split(' ')[0] || 'there';

    return (
        <div className="p-8 max-w-[1400px] mx-auto flex flex-col gap-8">

            {/* ── Header ── */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="serif text-4xl tracking-tight text-white mb-2">
                        {greeting}, <span className="bg-gradient-to-r from-gray-400 to-emerald-400 bg-clip-text text-transparent italic">{firstName}</span> 👋
                    </h1>
                    <p className="text-sm font-medium text-gray-500">
                        {user?.role === 'Admin'
                            ? "Platform security and oversight control center."
                            : "Here's what's happening across your workspace."}
                    </p>
                </div>

                {user?.role !== 'Admin' && (
                    <Link to="/whiteboard/team-alpha" className="k-button-primary flex items-center gap-2 text-sm no-underline">
                        <Ico d="M12 4v16m8-8H4" size={16} sw={2.5} />
                        Open Whiteboard
                    </Link>
                )}
            </header>

            {/* ── Stats ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map((s, i) => (
                    <div key={i} className="k-card k-card-hover p-6 relative overflow-hidden group">
                        {/* subtle bg glow */}
                        <div className="absolute top-[-30px] right-[-30px] w-32 h-32 rounded-full opacity-30 pointer-events-none transition-opacity group-hover:opacity-60" style={{ background: `radial-gradient(circle, ${s.glow} 0%, transparent 70%)` }} />

                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 shadow-lg"
                            style={{ background: `linear-gradient(135deg, ${s.g[0]}, ${s.g[1]})`, boxShadow: `0 8px 16px -4px ${s.glow}` }}>
                            <Ico d={s.icon} size={18} stroke="white" sw={2} />
                        </div>

                        <div className="flex flex-col gap-1">
                            <span className="text-3xl font-bold text-white tracking-tight">
                                {s.label === 'Team Members' ? onlineUsers.filter(u => u.status !== 'Offline').length : s.value}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                {s.label}
                            </span>
                            <span className="text-[10px] font-medium text-gray-700 mt-2">
                                {s.label === 'Team Members' ? `${onlineUsers.filter(u => u.status !== 'Offline').length} node(s) active` : s.sub}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Widgets row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Task Overview */}
                <div className="k-card p-6 flex flex-col">
                    <SectionHead title="Task Overview" badge={null} action={<Tag>Sprint</Tag>} />

                    {/* Stacked progress bar */}
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-white/[0.04] mb-8 gap-0.5">
                        {TASKS.map((t, i) => (
                            <div key={i} style={{ width: t.pct, background: t.color }} className="transition-all duration-700 ease-out" />
                        ))}
                    </div>

                    <div className="flex flex-col gap-4">
                        {TASKS.map((t, i) => (
                            <div key={i} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ color: t.color, background: 'currentColor' }} />
                                    <span className="text-sm font-medium text-gray-500 group-hover:text-gray-300 transition-colors">{t.status}</span>
                                </div>
                                <span className="text-sm font-bold text-gray-300">{t.count}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto pt-6 border-t border-white/[0.04]">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-700">
                            Volume: <span className="text-gray-400">{statsData.totalTasks} nodes</span> / {statsData.totalProjects} segments
                        </p>
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="k-card p-6 flex flex-col h-[420px]">
                    <SectionHead
                        title="Neural Feed"
                        badge={canViewActivity ? activity.length : null}
                        action={
                            canViewActivity && (
                                <Link to="/admin/security" className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors">
                                    Analyze All
                                </Link>
                            )
                        }
                    />

                    {!canViewActivity ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                                <Ico d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" size={20} stroke="#4b5563" />
                            </div>
                            <p className="text-sm font-bold text-gray-400 mb-1">Encrypted Stream</p>
                            <p className="text-[11px] text-gray-600 leading-relaxed uppercase tracking-wider">Level 3 Clearance Required</p>
                        </div>
                    ) : actLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full border-2 border-transparent border-t-emerald-500 border-b-emerald-500 animate-spin" />
                        </div>
                    ) : (
                        <div ref={parentRef} className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <div style={{ height: virt.getTotalSize(), width: '100%', position: 'relative' }}>
                                {virt.getVirtualItems().map(vi => {
                                    const a = activity[vi.index];
                                    const date = new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    const initial = a.user?.name?.charAt(0) || '?';
                                    return (
                                        <div key={vi.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: vi.size, transform: `translateY(${vi.start}px)` }}
                                            className="flex gap-4 py-3 group">
                                            <div className="relative flex-shrink-0">
                                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-600/20 to-emerald-600/20 border border-white/10 flex items-center justify-center text-[11px] font-black text-emerald-400">
                                                    {initial}
                                                </div>
                                                {vi.index < activity.length - 1 && (
                                                    <div className="absolute top-9 left-1/2 -translate-x-1/2 w-px h-[calc(100%-10px)] bg-white/[0.03]" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[12px] leading-relaxed">
                                                    <span className="font-bold text-gray-300">{a.user?.name || 'Unknown'}</span>
                                                    <span className="text-gray-500 mx-1.5">{a.action}</span>
                                                    <span className="font-medium text-emerald-400/80">"{a.details?.title || a.entityType}"</span>
                                                </div>
                                                <div className="text-[9px] font-bold uppercase tracking-widest text-gray-700 mt-1">{date}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Space widget */}
                <ApodWidget />
            </div>

        </div>
    );
};

export default Home;
