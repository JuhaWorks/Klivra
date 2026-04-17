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
    ChevronDown, CheckCircle2, MoreVertical, ShieldAlert,
    Zap, Globe, Briefcase
} from 'lucide-react';
import ApodWidget from '../components/tools/Widgets/ApodWidget';
import WeatherWidget from '../components/tools/Widgets/WeatherWidget';
import GlobalClockWidget from '../components/tools/Widgets/GlobalClockWidget';
import NotificationHistoryWidget from '../components/notifications/NotificationHistoryWidget';
import QuoteWidget from '../components/tools/Widgets/QuoteWidget';
import IntelligenceWidget from '../components/tools/Widgets/IntelligenceWidget';
import { useSocketStore } from '../store/useSocketStore';
import Button from '../components/ui/Button';
import { DeadlinePopup } from '../components/projects/ProjectShared';
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
    const { socket } = useSocketStore();
    const queryClient = useQueryClient();
    const canViewActivity = !!user;

    const [selectedTask, setSelectedTask] = useState(null);
    const [expandedTaskId, setExpandedTaskId] = useState(null);

    const [greeting, setGreeting] = useState('');
    useEffect(() => {
        const h = new Date().getHours();
        if (h < 12) setGreeting('Daily Briefing');
        else if (h < 17) setGreeting('Workspace Overview');
        else setGreeting('Executive Summary');
    }, []);

    const dateString = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

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

    const { data: wsAnalytics } = useQuery({
        queryKey: ['workspaceAnalytics'],
        queryFn: async () => (await api.get('/analytics/workspace')).data,
        staleTime: 1000 * 60 * 10
    });

    // Fallback logic for NaN safety
    const ws = useMemo(() => {
        const d = wsAnalytics?.data || {};
        return {
            phi: d.phi ?? 100,
            chaosIndex: d.chaosIndex ?? 0,
            completionPct: d.completionPct ?? 0,
            activeProjects: d.activeProjects ?? 0,
            completedTasks: d.completedTasks ?? 0,
            totalTasks: d.totalTasks ?? 0,
            bottlenecks: d.bottlenecks || []
        };
    }, [wsAnalytics]);


    const taskStats = useMemo(() => {
        const userId = user?._id;
        const myTasks = allTasks.filter(t => t.assignee?._id === userId || t.assignees?.some(a => a._id === userId));
        return {
            total: myTasks.length,
            pending: myTasks.filter(t => t.status === 'Pending').length,
            active: myTasks.filter(t => t.status === 'In Progress').length,
            urgent: myTasks.filter(t => (t.priority === 'Urgent' || (t.endDate && new Date(t.endDate) < new Date())) && t.status !== 'Completed').length
        };
    }, [allTasks, user]);

    const myFocusTasks = useMemo(() => {
        const userId = user?._id;
        return allTasks
            .filter(t => t.status !== 'Completed' && t.status !== 'Canceled' &&
                (t.assignee?._id === userId || t.assignees?.some(a => a._id === userId)))
            .sort((a, b) => {
                const pMap = { 'Urgent': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
                if (pMap[b.priority] !== pMap[a.priority]) return pMap[b.priority] - pMap[a.priority];
                return (a.dueDate && b.dueDate) ? new Date(a.dueDate) - new Date(b.dueDate) : 0;
            })
            .slice(0, 10);
    }, [allTasks, user]);

    const updateTaskMutation = useMutation({
        mutationFn: async ({ id, updates }) => (await api.put(`/tasks/${id}`, updates)).data,
        onSuccess: () => queryClient.invalidateQueries(['myTasks'])
    });

    const STATS = [
        { label: 'Health', value: ws.phi, icon: Target, accent: 'var(--accent-500)', sub: 'Workspace Maturity' },
        { label: 'Stability', value: 100 - ws.chaosIndex, icon: Activity, accent: '#60a5fa', sub: 'Project Cohesion' },
        { label: 'Units', value: ws.completedTasks, icon: Zap, accent: '#10b981', sub: 'Completed Work' },
        { label: 'Projects', value: ws.activeProjects, icon: Briefcase, accent: '#f59e0b', sub: 'Active Tracks' },
    ];

    return (
        <div className="min-h-screen flex flex-col pb-12 px-6 lg:px-12 max-w-[1800px] mx-auto w-full animate-in fade-in duration-1000">
            <DeadlinePopup projects={projects} user={user} />

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 10px; }
            `}</style>

            {/* HEADER & EXECUTIVE BAR */}
            <header className="py-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-theme/10 border border-theme/20 text-[9px] font-black text-theme uppercase tracking-widest">{greeting}</span>
                        <span className="text-[9px] font-bold text-tertiary uppercase tracking-widest opacity-40">{dateString}</span>
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-black text-primary tracking-tighter">
                        Welcome, <span className="text-theme">{user?.name?.split(' ')[0] || 'Member'}.</span>
                    </h1>
                </div>

                {/* Compact Stats Grid */}
                {/* Seamless Executive Status Bar */}
                <div className="flex flex-wrap items-center gap-6 bg-surface/5 backdrop-blur-2xl rounded-[2.5rem] px-8 py-3.5 shadow-panel overflow-x-auto no-scrollbar">
                    {STATS.map((s, i) => (
                        <div key={s.label} className="flex items-center gap-4 min-w-fit">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: `${s.accent}08` }}>
                                    <s.icon className="w-4 h-4" style={{ color: s.accent }} />
                                </div>
                                <div className="min-w-0 pr-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-black text-primary tracking-tighter truncate">
                                            <Counter value={s.value} delay={i * 50} />
                                        </span>
                                        {s.label !== 'Projects' && s.label !== 'Units' && <span className="text-[9px] font-black text-tertiary opacity-40">%</span>}
                                    </div>
                                    <p className="text-[8px] font-black text-tertiary uppercase tracking-[0.22em] truncate opacity-40">{s.label}</p>
                                </div>
                            </div>
                            {i < STATS.length - 1 && <div className="hidden md:block w-px h-6 bg-glass/5" />}
                        </div>
                    ))}
                    {user?.role !== 'Admin' && (
                        <div className="ml-auto flex items-center pl-6 border-l border-glass/10 h-10">
                            <Button variant="primary" leftIcon={Plus} as={Link} to="/projects" className="rounded-2xl h-11 px-8 shadow-glow-sm shadow-theme/10 font-black uppercase text-[10px] tracking-[0.2em] transition-all hover:scale-105 active:scale-95">
                                New Project
                            </Button>
                        </div>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* COLUMN 1: ACTIVITY FEED (ADMIN FIXED VIEW) */}
                {user?.role === 'Admin' && user?.interfacePrefs?.showIntelligence !== false && (
                    <div className="col-span-12 lg:col-span-3 space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-1 rounded-full bg-theme" />
                                <h2 className="text-[9px] font-black text-primary uppercase tracking-[0.4em]">Activity Feed</h2>
                            </div>
                        </div>
                        <IntelligenceWidget fixed />
                    </div>
                )}

                {/* COLUMN 2: ACTIVE TASKS (CENTER / CONCENTRATED) */}
                <div className={cn(
                    "col-span-12 space-y-6 lg:border-glass/10",
                    (user?.role === 'Admin' && user?.interfacePrefs?.showIntelligence !== false) 
                        ? "lg:col-span-5 lg:border-x px-6" 
                        : "lg:col-span-8"
                )}>
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-theme shadow-glow-sm" />
                            <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Active Tasks</h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-theme" />
                                <span className="text-[8px] font-black text-primary uppercase">{taskStats.active} In Play</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-danger animate-pulse" />
                                <span className="text-[8px] font-black text-danger uppercase">{taskStats.urgent} Critical</span>
                            </div>
                        </div>
                    </div>

                    <Card variant="glass" padding="p-0" hideBorder className="rounded-[2.5rem] overflow-hidden bg-surface/5 backdrop-blur-3xl shadow-panel border border-glass/5">
                        <div className="px-6 py-4 grid grid-cols-[1.5fr_2fr_1.2fr] gap-4 bg-sunken/40 border-b border-glass/5 text-[8px] font-black text-tertiary uppercase tracking-widest opacity-40">
                            <span>Task Identifier</span>
                            <span>Current Status</span>
                            <span className="text-right">Priority Level</span>
                        </div>

                        <div className="max-h-[580px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {myFocusTasks.length > 0 ? (
                                myFocusTasks.map((t, i) => (
                                    <motion.div key={t._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                        className="grid grid-cols-[1.5fr_2fr_1.2fr] gap-4 items-center p-3 rounded-2xl hover:bg-theme/5 transition-all group cursor-pointer border border-transparent hover:border-theme/10"
                                        onClick={() => setSelectedTask(t)}>
                                        <div className="min-w-0">
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[7px] font-black bg-theme/10 border border-theme/20 text-theme uppercase mb-1">
                                                {t.project?.name?.slice(0, 10) || 'GENERAL'}
                                            </span>
                                            <p className="text-[12px] font-black text-primary truncate tracking-tight group-hover:text-theme transition-colors">{t.title}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col gap-1">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest w-fit",
                                                    t.status === 'In Progress' ? "bg-theme/10 text-theme border border-theme/20" : "bg-sunken text-tertiary/60 border border-glass/10"
                                                )}>{t.status}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end gap-3 min-w-0">
                                            <div className={cn(
                                                "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                                                t.priority === 'Urgent' ? "text-danger bg-danger/10 border border-danger/20 shadow-glow-sm shadow-danger/10" : 
                                                t.priority === 'High' ? "text-theme bg-theme/10 border border-theme/20" : "text-tertiary bg-sunken/40"
                                            )}>
                                                {t.priority}
                                            </div>
                                            <ArrowUpRight size={12} className="text-theme opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 shrink-0" />
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-20">
                                    <CheckCircle2 className="w-10 h-10 text-theme" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">No Active Tasks</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* NASA APOD (Relocated below Matrix) */}
                    {user?.interfacePrefs?.showApod !== false && (
                        <div className="mt-8">
                            <ApodWidget />
                        </div>
                    )}

                    {/* Performance Stats (Relocated below APOD) */}
                    <div className="mt-8">
                        <Card variant="glass" padding="p-6" hideBorder className="rounded-[2.5rem] bg-surface/5 backdrop-blur-3xl shadow-panel border border-glass/5">
                            <div className="flex items-center justify-between gap-3 mb-6">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-3.5 h-3.5 text-theme" />
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-widest opacity-60">Completion Rate</h4>
                                </div>
                                <div className="text-2xl font-black text-primary tracking-tighter tabular-nums flex items-baseline gap-0.5">
                                    <Counter value={ws.completionPct} />
                                    <span className="text-[10px] text-theme">%</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-2xl bg-surface/5 border border-glass/5 flex flex-col gap-1">
                                    <span className="text-[8px] font-black text-tertiary uppercase tracking-widest opacity-40">Resolved</span>
                                    <span className="text-lg font-black text-primary leading-none">{ws.completedTasks || 0}</span>
                                </div>
                                <div className="p-3 rounded-2xl bg-surface/5 border border-glass/5 flex flex-col gap-1">
                                    <span className="text-[8px] font-black text-tertiary uppercase tracking-widest opacity-40">In Play</span>
                                    <span className="text-lg font-black text-primary leading-none">{(ws.totalTasks || 0) - (ws.completedTasks || 0)}</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* COLUMN 3: DASHBOARD UTILITIES (SIDEBAR) */}
                <div className="col-span-12 lg:col-span-4 space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <Activity size={14} className="text-theme opacity-50" />
                            <h2 className="text-[9px] font-black text-primary uppercase tracking-[0.4em] opacity-40">Dashboard Utilities</h2>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Daily Inspiration (Top of Sidebar) */}
                        {user?.interfacePrefs?.showQuote !== false && <QuoteWidget />}

                        {/* Global Sync (Minimalist) */}
                        {user?.role !== 'Admin' && user?.interfacePrefs?.showTeamClock !== false && (
                            <div className="px-2">
                                <GlobalClockWidget />
                            </div>
                        )}

                        {/* Real-time Activity (Minimalist) */}
                        {user?.role !== 'Admin' && user?.interfacePrefs?.showIntelligence !== false && (
                            <div className="px-2">
                                <IntelligenceWidget />
                            </div>
                        )}

                        {/* Urgent Tasks (Simplified Sidebar View) */}
                        <div className="px-2">
                            <div className="space-y-2.5">
                                {ws.bottlenecks?.slice(0, 3).map((task) => {
                                    const isUrgent = task.priority?.toLowerCase() === 'urgent';
                                    const isOverdue = task.endDate && new Date(task.endDate) < new Date();
                                    const isCritical = isUrgent || isOverdue;

                                    return (
                                        <div key={task._id} onClick={() => setSelectedTask(task)}
                                            className="group cursor-pointer flex items-center justify-between gap-3">
                                            <p className="text-[10px] font-bold text-secondary group-hover:text-danger transition-colors truncate flex-1">{task.title}</p>
                                            <span className={cn(
                                                "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0",
                                                isCritical ? "text-danger bg-danger/10" : "text-tertiary bg-glass/10"
                                            )}>
                                                {isUrgent ? 'URG' : isOverdue ? 'DUE' : 'RISK'}
                                            </span>
                                        </div>
                                    );
                                })}
                                {ws.bottlenecks?.length === 0 && <p className="text-[7px] font-black text-tertiary opacity-30 uppercase tracking-widest px-1">Clearance Confirmed</p>}
                            </div>
                        </div>

                        {/* Weather */}
                        {user?.interfacePrefs?.showWeather !== false && (
                            <div className="px-2 border-t border-glass/5 pt-6">
                                <WeatherWidget />
                            </div>
                        )}
                    </div>
                </div>
            </div>

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