import { useAuthStore, api } from '../store/useAuthStore';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import ApodWidget from '../components/ApodWidget';

const Home = () => {
    const { user } = useAuthStore();
    const canViewActivity = user && ['Admin', 'Manager'].includes(user.role);

    // Fetch paginated Activity Logs via Audit endpoint
    const { data: activityResponse, isLoading: activityLoading } = useQuery({
        queryKey: ['activityFeed'],
        queryFn: async () => {
            const res = await api.get('/audit?limit=100'); // Fetch a large chunk for virtualization demo
            return res.data;
        },
        staleTime: 1000 * 60 * 5, // 5 min
        enabled: canViewActivity,
    });

    const activity = activityResponse?.data || [];
    const parentRef = useRef();

    // The virtualizer handles rendering ONLY the items currently visible on the screen
    const virtualizer = useVirtualizer({
        count: activity.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 60, // approximate height of one activity log item in pixels
        overscan: 5, // Render 5 extra items outside the viewport for smooth scrolling
    });

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    const stats = [
        { label: 'Active Projects', value: '4', sub: '+2 this week', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', gradient: 'from-violet-600 to-blue-600', glow: 'shadow-violet-500/15' },
        { label: 'Total Tasks', value: '28', sub: '6 due today', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', gradient: 'from-blue-600 to-cyan-600', glow: 'shadow-blue-500/15' },
        { label: 'Completed', value: '15', sub: '54% done', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', gradient: 'from-emerald-600 to-teal-600', glow: 'shadow-emerald-500/15' },
        { label: 'Team Members', value: '8', sub: '3 online', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', gradient: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/15' },
    ];

    const tasks = [
        { status: 'To Do', count: 8, color: 'bg-gray-600', w: '30%' },
        { status: 'In Progress', count: 5, color: 'bg-blue-500', w: '18%' },
        { status: 'Completed', count: 15, color: 'bg-emerald-500', w: '52%' },
    ];

    return (
        <div className="p-5 sm:p-7 lg:p-8 max-w-[1400px] mx-auto space-y-7">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">{user?.name?.split(' ')[0] || 'User'}</span> 👋
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Here's what's happening across your workspace.</p>
                </div>
                <Link to="/whiteboard/team-alpha" className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-[13px] font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/15 active:scale-[0.98]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    Open Whiteboard
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s, i) => (
                    <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.10] transition-all group">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shadow-lg ${s.glow} mb-4 group-hover:scale-105 transition-transform`}>
                            <svg className="w-[18px] h-[18px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d={s.icon} /></svg>
                        </div>
                        <h3 className="text-2xl font-bold text-white">{s.value}</h3>
                        <p className="text-[13px] text-gray-500 mt-0.5">{s.label}</p>
                        <p className="text-[11px] text-gray-600 mt-2">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Task Overview */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-[15px] font-bold text-white">Task Overview</h2>
                        <span className="text-[10px] text-gray-500 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06] uppercase tracking-wider font-medium">Sprint</span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-800/50 mb-5">
                        {tasks.map((t, i) => (<div key={i} className={`${t.color} transition-all duration-700`} style={{ width: t.w }} />))}
                    </div>
                    <div className="space-y-3.5">
                        {tasks.map((t, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5"><div className={`w-2.5 h-2.5 rounded-full ${t.color}`} /><span className="text-[13px] text-gray-400">{t.status}</span></div>
                                <span className="text-[13px] font-bold text-white">{t.count}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-5 pt-4 border-t border-white/[0.06]">
                        <p className="text-[11px] text-gray-600">Total: <span className="text-white font-semibold">28 tasks</span> across 4 projects</p>
                    </div>
                </div>

                {/* Activity Feed (Virtualized) */}
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 flex flex-col h-[400px]">
                    <div className="flex items-center justify-between mb-5 flex-shrink-0">
                        <h2 className="text-[15px] font-bold text-white">Recent Activity <span className="text-gray-500 text-xs ml-1 font-normal">({activity.length})</span></h2>
                        <button className="text-[11px] text-violet-400 hover:text-violet-300 font-semibold transition-colors">View all</button>
                    </div>

                    {!canViewActivity ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                            <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mb-3">
                                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            </div>
                            <p className="text-[13px] text-gray-400 font-medium">Activity logs are restricted</p>
                            <p className="text-[11px] text-gray-600 mt-1">You must be an Admin or Manager to view the workspace audit trail.</p>
                        </div>
                    ) : activityLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
                        </div>
                    ) : (
                        <div
                            ref={parentRef}
                            className="flex-1 overflow-y-auto pr-2 custom-scrollbar"
                            style={{ contain: 'strict' }}
                        >
                            <div
                                style={{
                                    height: `${virtualizer.getTotalSize()}px`,
                                    width: '100%',
                                    position: 'relative',
                                }}
                            >
                                {virtualizer.getVirtualItems().map((virtualItem) => {
                                    const a = activity[virtualItem.index];
                                    const dateStr = new Date(a.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                                    return (
                                        <div
                                            key={virtualItem.key}
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: `${virtualItem.size}px`,
                                                transform: `translateY(${virtualItem.start}px)`,
                                            }}
                                            className="flex gap-3 px-1 py-2"
                                        >
                                            <div className="relative mt-0.5">
                                                <div className={`w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
                                                    {a.user?.name ? a.user.name.charAt(0) : '?'}
                                                </div>
                                                {virtualItem.index < activity.length - 1 && <div className="absolute top-7 left-1/2 -translate-x-1/2 w-px h-[calc(100%+16px)] bg-white/[0.04]" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[13px] text-gray-400 leading-snug">
                                                    <span className="font-semibold text-gray-200">{a.user?.name || 'Unknown'}</span> {a.action} <span className="font-medium text-gray-300">"{a.details?.title || a.entityType}"</span>
                                                </p>
                                                <p className="text-[11px] text-gray-600 mt-0.5">{dateStr}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Space Widget */}
                <ApodWidget />
            </div>
        </div>
    );
};

export default Home;
