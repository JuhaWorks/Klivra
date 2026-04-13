import React, { useRef, useState, useEffect, useMemo, memo } from 'react';
import { useAuthStore, api } from '../store/useAuthStore';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FolderKanban, CheckSquare, Users, Plus, ChevronRight,
    Activity, Lock, RefreshCw, ArrowUpRight, TrendingUp,
    Target, Clock, AlertCircle, LayoutDashboard, Search,
    ChevronDown, CheckCircle2, MoreVertical, ShieldAlert
} from 'lucide-react';
import ApodWidget from '../components/tools/Widgets/ApodWidget';
import WeatherWidget from '../components/tools/Widgets/WeatherWidget';
import GlobalClockWidget from '../components/tools/Widgets/GlobalClockWidget';
import { useSocketStore } from '../store/useSocketStore';
import Button from '../components/ui/Button';
import DeadlinePopup from '../components/projects/DeadlinePopup';
import Card from '../components/ui/Card';
import Counter from '../components/ui/Counter';
import { cn } from '../utils/cn';
import { renderActivityNarrative } from '../utils/activityNarrative';
import TaskDetailModal from '../components/Kanban/TaskDetailModal';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

const EASE = { duration: 0.4, ease: [0.22, 1, 0.36, 1] };

const ActivitySkeleton = ({ delay = 0 }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }} className="flex items-center gap-4 p-3 rounded-2xl">
        <div className="w-10 h-10 rounded-xl bg-shimmer animate-pulse" />
        <div className="flex-1 space-y-2">
            <div className="h-3 bg-shimmer rounded-full animate-pulse w-3/4" />
            <div className="h-2 bg-shimmer rounded-full animate-pulse w-1/2" />
        </div>
    </motion.div>
);

const Home = () => {
    const { user } = useAuthStore();
    const { onlineUsers, socket } = useSocketStore();
    const queryClient = useQueryClient();
    const canViewActivity = !!user;
    const parentRef = useRef(null);

    const [liveActivity, setLiveActivity] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);
    const [expandedTaskId, setExpandedTaskId] = useState(null);
    const [feedFilter, setFeedFilter] = useState('All');

    useEffect(() => {
        if (!socket) return;
        const handleRealTimeActivity = (event) => {
            setLiveActivity(prev => [event, ...prev].slice(0, 50));
        };
        socket.on('workspace_activity', handleRealTimeActivity);
        return () => socket.off('workspace_activity', handleRealTimeActivity);
    }, [socket]);

    const [greeting, setGreeting] = useState('');
    useEffect(() => {
        const h = new Date().getHours();
        if (h < 12) setGreeting('Daily Briefing');
        else if (h < 17) setGreeting('Workspace Overview');
        else setGreeting('Executive Summary');
    }, []);

    const dateString = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const { data: actRes, isLoading: actLoading } = useQuery({
        queryKey: ['activityFeed'],
        queryFn: async ({ signal }) => (await api.get('/audit?limit=50', { signal })).data,
        staleTime: 1000 * 60 * 5,
        enabled: canViewActivity,
    });
    const initialActivity = actRes?.data || [];
    const activity = useMemo(() => {
        const combined = [...liveActivity, ...initialActivity];
        const unique = Array.from(new Map(combined.map(item => [item._id, item])).values());
        let filtered = unique.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (feedFilter === 'Tasks') filtered = filtered.filter(a => a.action?.startsWith('TASK_'));
        else if (feedFilter === 'Security') filtered = filtered.filter(a => a.action?.includes('BANNED') || a.action?.includes('LOGIN') || a.action?.includes('ROLE'));
        else if (feedFilter === 'Projects') filtered = filtered.filter(a => a.action?.startsWith('PROJECT_'));

        return filtered;
    }, [liveActivity, initialActivity, feedFilter]);

    const { data: projRes } = useQuery({
        queryKey: ['projects'],
        queryFn: async ({ signal }) => (await api.get('/projects', { signal })).data,
        staleTime: 1000 * 60 * 5,
    });
    const projects = projRes?.data || [];

    const { data: taskRes } = useQuery({
        queryKey: ['myTasks'],
        queryFn: async ({ signal }) => (await api.get('/tasks', { signal })).data,
        staleTime: 1000 * 60 * 2,
    });
    const allTasks = taskRes?.data || [];
    
    const myFocusTasks = useMemo(() => {
        const userId = user?._id;
        return allTasks
            .filter(t => t.status !== 'Completed' && t.status !== 'Canceled' && 
                (t.assignee?._id === userId || t.assignees?.some(a => a._id === userId)))
            .sort((a, b) => {
                const pMap = { 'Urgent': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
                if (pMap[b.priority] !== pMap[a.priority]) return pMap[b.priority] - pMap[a.priority];
                if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
                return 0;
            })
            .slice(0, 10);
    }, [allTasks, user]);

    const updateTaskMutation = useMutation({
        mutationFn: async ({ id, updates }) => {
            const res = await api.put(`/tasks/${id}`, updates);
            return res.data;
        },
        onMutate: async ({ id, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['tasks'] });
            await queryClient.cancelQueries({ queryKey: ['myTasks'] });
            
            const prevTasks = queryClient.getQueryData(['tasks']);
            const prevMyTasks = queryClient.getQueryData(['myTasks']);

            queryClient.setQueryData(['myTasks'], (old) => {
                if (!old?.data) return old;
                return { ...old, data: old.data.map(t => t._id === id ? { ...t, ...updates } : t) };
            });

            return { prevTasks, prevMyTasks };
        },
        onError: (_err, _vars, context) => {
            queryClient.setQueryData(['tasks'], context.prevTasks);
            queryClient.setQueryData(['myTasks'], context.prevMyTasks);
            toast.error('Sync failed. Reverting changes.');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['myTasks'] });
            queryClient.invalidateQueries({ queryKey: ['workspace-stats'] });
        }
    });

    const toggleSubtask = (taskId, subtaskId) => {
        const task = allTasks.find(t => t._id === taskId);
        if (!task) return;
        const newSubtasks = task.subtasks.map(s => 
            s.id === subtaskId ? { ...s, completed: !s.completed } : s
        );
        updateTaskMutation.mutate({ id: taskId, updates: { subtasks: newSubtasks } });
    };

    const handleQuickComplete = (taskId) => {
        updateTaskMutation.mutate({ id: taskId, updates: { status: 'Completed' } });
        toast.success('Task marked as completed', { icon: '✅' });
    };

    const { data: wsAnalytics } = useQuery({
        queryKey: ['workspace-analytics'],
        queryFn: async ({ signal }) => (await api.get('/projects/workspace/analytics', { signal })).data,
        staleTime: 1000 * 30,
    });
    const ws = wsAnalytics?.data || { phi: 100, chaosIndex: 0, completionPct: 0, activeProjects: 0, bottlenecks: [] };

    const STATS = useMemo(() => [
        { label: 'Workspace Maturity', value: ws.phi, sub: 'Global Health Index', icon: Target, accent: 'var(--accent-500)', glow: 'var(--accent-bg)' },
        { label: 'Project Stability', value: 100 - ws.chaosIndex, sub: 'Stability Score', icon: Activity, accent: 'oklch(0.70 0.15 240)', glow: 'oklch(0.70 0.15 240 / 0.10)' },
        { label: 'Completion Rate', value: ws.completionPct, sub: `${ws.completedTasks || 0} units finished`, icon: TrendingUp, accent: 'oklch(0.72 0.18 142)', glow: 'oklch(0.72 0.18 142 / 0.10)' },
        { label: 'Active Projects', value: ws.activeProjects, sub: 'Total Workspaces', icon: FolderKanban, accent: 'oklch(0.60 0.15 30)', glow: 'oklch(0.60 0.15 30 / 0.10)' },
    ], [ws]);

    return (
        <div className="h-root min-h-[calc(100vh-120px)] flex flex-col pb-6 relative max-w-[2000px] mx-auto w-full px-4 sm:px-6 lg:px-10">
            <DeadlinePopup projects={projects} user={user} />
            <style>{`
                .h-root { font-family: 'Sora', system-ui, sans-serif; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 10px; }
            `}</style>

            <header className="mb-10 relative z-10 pt-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] font-black text-theme uppercase tracking-[0.3em] bg-theme/10 px-3 py-1 rounded-full border border-theme/20">
                                {greeting}
                            </span>
                            <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest opacity-40">{dateString}</span>
                        </div>
                        <h1 className="text-4xl font-black text-primary tracking-tighter">
                            Welcome, <span className="text-theme">{user?.name?.split(' ')[0] || 'Member'}.</span>
                        </h1>
                        <p className="text-sm text-tertiary font-medium mt-2">Strategic Command Center: Workspace health and forensic tracking.</p>
                    </div>
                    <Button variant="primary" size="lg" leftIcon={Plus} as={Link} to="/projects" className="rounded-3xl shadow-xl shadow-theme/10">
                        New Project
                    </Button>
                </div>
            </header>

            <GlobalClockWidget />

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 relative z-10">
                {STATS.map((s, i) => (
                    <Card key={s.label} variant="glass" padding="p-8" className="rounded-[2.5rem]"
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...EASE, delay: i * 0.05 }}>
                        <div className="flex items-start justify-between mb-8">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: s.glow, border: `1px solid ${s.accent}20` }}>
                                <s.icon className="w-5 h-5" style={{ color: s.accent }} />
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-bold tracking-tighter text-primary tabular-nums">
                                    <Counter value={s.value} delay={i * 60} />
                                    {s.label === 'Completion Rate' || s.label === 'Workspace Maturity' || s.label === 'Project Stability' ? '%' : ''}
                                </div>
                                <div className="text-[9px] font-black tracking-widest text-tertiary uppercase font-mono">{s.label}</div>
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mb-4 italic opacity-80">{s.sub}</p>
                        <div className="h-1 bg-sunken rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${s.value}%` }} transition={{ duration: 1, delay: i * 0.05 + 0.4 }}
                                style={{ height: '100%', background: s.accent, opacity: 0.7 }} />
                        </div>
                    </Card>
                ))}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start relative z-10">
                <div className="space-y-8">
                    <div className="space-y-4">
                        {myFocusTasks.length > 0 ? (
                            myFocusTasks.map((t, i) => {
                                const completedSubtasks = t.subtasks?.filter(s => s.completed).length || 0;
                                const totalSubtasks = t.subtasks?.length || 0;
                                const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
                                const isExpanded = expandedTaskId === t._id;

                                return (
                                    <motion.div key={t._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                                        className={cn(
                                            "p-1 rounded-[2rem] transition-all group relative",
                                            isExpanded ? "bg-surface border border-glass shadow-elevation" : "bg-transparent border border-transparent"
                                        )}>
                                        <div className="flex items-center justify-between p-4 rounded-3xl bg-surface border border-glass hover:bg-sunken transition-all cursor-pointer"
                                            onClick={() => setSelectedTask(t)}>
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className={cn("w-2 h-2 rounded-full", 
                                                    t.priority === 'Urgent' ? 'bg-danger animate-pulse' : (t.priority === 'High' ? 'bg-amber-500' : 'bg-blue-400'))} />
                                                <div className="truncate">
                                                    <p className="text-sm font-bold text-primary truncate leading-none mb-1.5">{t.title}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-black text-tertiary uppercase tracking-widest opacity-60">{t.project?.name}</span>
                                                        {totalSubtasks > 0 && (
                                                            <span className="text-[9px] font-black text-theme uppercase tracking-widest px-1.5 py-0.5 bg-theme/5 rounded-md border border-theme/10">
                                                                {completedSubtasks}/{totalSubtasks} Units
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 shrink-0">
                                                <div className="flex flex-col items-end gap-1.5">
                                                    {t.dueDate && (
                                                        <div className="flex items-center gap-1.5 text-tertiary">
                                                            <Clock className="w-3 h-3" />
                                                            <span className="text-[10px] font-black uppercase tracking-tight">{new Date(t.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                                        </div>
                                                    )}
                                                    <div className="w-16 h-1 bg-sunken rounded-full overflow-hidden">
                                                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full bg-theme opacity-60" />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); setExpandedTaskId(isExpanded ? null : t._id); }}
                                                        className={cn("p-2 rounded-xl hover:bg-sunken transition-transform", isExpanded && "rotate-180")}>
                                                        <ChevronDown className="w-4 h-4 text-tertiary" />
                                                    </button>
                                                    <div className="w-px h-4 bg-default mx-1" />
                                                    <button onClick={(e) => { e.stopPropagation(); handleQuickComplete(t._id); }}
                                                        className="p-2 rounded-xl hover:bg-theme/10 hover:text-theme text-tertiary transition-all" title="Mark as Complete">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && t.subtasks?.length > 0 && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                    className="px-6 pb-4 pt-2 overflow-hidden border-t border-glass mt-1">
                                                    <div className="space-y-1 mt-2 pl-6 relative">
                                                        <div className="absolute left-2 top-0 bottom-4 w-px bg-default" />
                                                        {t.subtasks.map((s) => (
                                                            <div key={s.id} className="flex items-center justify-between py-2 group/sub">
                                                                <div className="flex items-center gap-3">
                                                                    <button onClick={() => toggleSubtask(t._id, s.id)}
                                                                        className={cn(
                                                                            "w-4 h-4 rounded border transition-all flex items-center justify-center",
                                                                            s.completed ? "bg-theme border-theme text-primary" : "border-strong hover:border-theme/40"
                                                                        )}>
                                                                        {s.completed && <CheckCircle2 className="w-3 h-3" />}
                                                                    </button>
                                                                    <span className={cn("text-xs font-medium transition-colors", s.completed ? "text-tertiary line-through" : "text-secondary")}>
                                                                        {s.title}
                                                                    </span>
                                                                </div>
                                                                {s.priority === 'High' || s.priority === 'Urgent' && (
                                                                    <span className="text-[8px] font-black uppercase text-danger/60 px-1.5 py-0.5 bg-danger/5 rounded border border-danger/10">
                                                                        {s.priority}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="py-20 flex flex-col items-center justify-center text-center opacity-30">
                                <div className="w-20 h-20 rounded-[2.5rem] bg-sunken flex items-center justify-center mb-6">
                                    <CheckSquare className="w-10 h-10" />
                                </div>
                                <p className="text-sm font-black uppercase tracking-[0.3em]">No immediate actions required</p>
                                <p className="text-[10px] text-tertiary mt-2 uppercase tracking-widest">Enjoy the clear runway.</p>
                            </div>
                        )}
                    </div>

                    <Card variant="glass" padding="p-0" className="rounded-[2.5rem] overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-glass flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-theme/5 border border-theme/10 flex items-center justify-center">
                                    <Activity className="w-5 h-5 text-theme" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-primary tracking-tighter uppercase">Intelligence Feed</h3>
                                    <p className="text-[9px] font-black text-tertiary uppercase tracking-widest mt-1 opacity-60">Real-time telemetry</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 bg-sunken p-1 rounded-xl border border-glass">
                                {['All', 'Tasks', 'Projects', 'Security'].map(f => (
                                    <button key={f} onClick={() => setFeedFilter(f)}
                                        className={cn(
                                            "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                                            feedFilter === f ? "bg-theme text-primary shadow-lg shadow-theme/20" : "text-tertiary hover:text-primary"
                                        )}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[500px] overflow-y-auto custom-scrollbar p-6 space-y-8 relative">
                            <div className="absolute left-[44px] top-8 bottom-8 w-px bg-default opacity-20" />
                            {actLoading ? (
                                <div className="space-y-4">{[0, .1, .2].map(d => <ActivitySkeleton key={d} delay={d} />)}</div>
                            ) : activity.length > 0 ? (
                                activity.map((a, i) => {
                                    const isTask = a.action?.startsWith('TASK_');
                                    const isSecurity = a.action?.includes('BANNED') || a.action?.includes('LOGIN') || a.action?.includes('ROLE');
                                    const isSignificant = ws.bottlenecks?.some(b => b._id === a.details?._id);

                                    return (
                                        <motion.div key={a._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                                            className={cn("flex items-start gap-4 group cursor-pointer transition-all p-2 rounded-2xl", isSignificant ? "bg-danger/5 border border-danger/10" : "hover:bg-sunken")}
                                            onClick={() => {
                                                if (isTask && a.details?._id) {
                                                    const taskObj = allTasks.find(t => t._id === a.details._id);
                                                    if (taskObj) setSelectedTask(taskObj);
                                                }
                                            }}>
                                            <div className="relative z-10">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black border transition-all",
                                                    isSecurity ? "bg-danger/10 border-danger/20 text-danger" : 
                                                    (isSignificant ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-surface border-glass text-theme group-hover:border-theme/40")
                                                )}>
                                                    {a.user?.name?.charAt(0) || 'S'}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-base border border-glass flex items-center justify-center">
                                                    <div className={cn("w-1.5 h-1.5 rounded-full", isSecurity ? "bg-danger" : (isSignificant ? "bg-amber-500" : "bg-theme"))} />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 pt-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-tertiary uppercase tracking-widest opacity-40">
                                                        {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {isSignificant && <span className="text-[7px] text-danger bg-danger/10 px-1.5 py-0.5 rounded border border-danger/20 animate-pulse">Impact Alert</span>}
                                                    </div>
                                                </div>
                                                <p className={cn("text-[13px] leading-relaxed transition-colors", isSecurity ? "text-danger/80" : (isSignificant ? "text-amber-500/90" : "text-secondary group-hover:text-primary"))}>
                                                    {renderActivityNarrative(a)}
                                                </p>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                                    <Activity className="w-12 h-12 mb-4" />
                                    <p className="text-xs font-black uppercase tracking-widest">No activities</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <aside className="space-y-8">
                    <Card variant="glass" padding="p-8" className="rounded-[2.5rem] border-danger/10 bg-danger/5">
                        <div className="flex items-center gap-3 mb-6">
                            <ShieldAlert className="w-5 h-5 text-danger" />
                            <h4 className="text-xs font-black text-primary uppercase tracking-widest">Strategic Threats</h4>
                        </div>
                        <div className="space-y-4">
                            {ws.bottlenecks?.length > 0 ? ws.bottlenecks.map((task) => (
                                <div key={task._id} onClick={() => setSelectedTask(task)}
                                    className="p-3 rounded-2xl bg-sunken border border-glass hover:border-danger/30 transition-all cursor-pointer group">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[7px] font-black text-danger uppercase tracking-widest px-1.5 py-0.5 bg-danger/10 rounded">Risk</span>
                                        <span className="text-[7px] font-black text-tertiary uppercase tracking-widest">{task.project?.name}</span>
                                    </div>
                                    <p className="text-[11px] font-bold text-primary truncate group-hover:text-danger transition-colors">{task.title}</p>
                                </div>
                            )) : <p className="text-[10px] font-bold text-tertiary/40 uppercase text-center py-4 italic">No critical threats</p>}
                        </div>
                    </Card>

                    <WeatherWidget />
                    <ApodWidget />
                    
                    <Card variant="glass" padding="p-8" className="rounded-[2.5rem]">
                        <div className="flex items-center gap-3 mb-8">
                            <TrendingUp className="w-5 h-5 text-theme" />
                            <h4 className="text-xs font-black text-primary uppercase tracking-widest">Performance</h4>
                        </div>
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <div className="flex justify-between items-baseline text-[10px] font-black text-tertiary uppercase tracking-widest">
                                    <span>Delivery Rate</span>
                                    <span className="text-sm text-theme">{ws.completionPct}%</span>
                                </div>
                                <div className="h-2 bg-sunken rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${ws.completionPct}%` }} className="h-full bg-theme" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-3xl bg-surface border border-glass text-center">
                                    <p className="text-2xl font-black text-primary leading-none mb-1">{ws.completedTasks}</p>
                                    <p className="text-[8px] font-black text-tertiary uppercase tracking-widest">Done</p>
                                </div>
                                <div className="p-4 rounded-3xl bg-surface border border-glass text-center">
                                    <p className="text-2xl font-black text-primary leading-none mb-1">{ws.totalTasks - ws.completedTasks}</p>
                                    <p className="text-[8px] font-black text-tertiary uppercase tracking-widest">Pending</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card variant="glass" padding="p-8" className="rounded-[2.5rem] bg-theme/5 border-theme/10">
                        <div className="flex items-center gap-3 mb-4 text-theme">
                            <Activity className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Forensic Pulse</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-theme"></span>
                            </div>
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Liquid Calibration</span>
                        </div>
                    </Card>
                </aside>
            </section>

            <AnimatePresence>
                {selectedTask && (
                    <TaskDetailModal 
                        task={selectedTask}
                        projectId={selectedTask.project?._id || selectedTask.project}
                        onClose={() => setSelectedTask(null)}
                        onUpdate={(id, updates) => updateTaskMutation.mutate({ id, updates })}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default memo(Home);