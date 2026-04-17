import React, { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Layers, Calendar, AlertCircle, CheckCircle2, Clock, 
    TrendingUp, Activity, BarChart3, Users, Zap, 
    ShieldAlert, ChevronRight, ChevronLeft, Maximize2, 
    Target, LayoutDashboard, Database, MousePointer2, 
    Trash2, UserPlus, ArrowRightLeft, Briefcase
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { 
    AreaChart, Area, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
    BarChart, Bar, ResponsiveContainer as RechartsResponsiveContainer, Tooltip as RechartsTooltip,
    Cell, PieChart, Pie, LineChart, Line, Legend
} from 'recharts';
import { api } from '../../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { getOptimizedAvatar } from '../../utils/avatar';
import SpecialtyRadar, { RADAR_SUBJECTS } from '../profile/SpecialtyRadar';

// --- Shared Internal Components ---

const MiniProgressMap = ({ tasks, memberId }) => {
    const data = useMemo(() => {
        const now = new Date();
        const days = 28; // 4 weeks
        const stats = new Array(days).fill(0).map((_, i) => {
            const d = new Date();
            d.setDate(now.getDate() - (days - 1 - i));
            d.setHours(0,0,0,0);
            return { date: d, count: 0 };
        });

        tasks.forEach(t => {
            if (t.assignee?._id === memberId || t.assignees?.some(a => a._id === memberId)) {
                const updatedDate = new Date(t.updatedAt || t.createdAt);
                updatedDate.setHours(0,0,0,0);
                const dayDiff = Math.floor((now - updatedDate) / (1000 * 3600 * 24));
                if (dayDiff >= 0 && dayDiff < days) {
                    stats[days - 1 - dayDiff].count++;
                }
            }
        });
        return stats;
    }, [tasks, memberId]);

    return (
        <div className="flex gap-[2px] mt-2">
            {data.map((d, i) => (
                <div 
                    key={i} 
                    className={twMerge(clsx(
                        "w-1.5 h-1.5 rounded-[1px] transition-all",
                        d.count === 0 ? "bg-sunken border border-glass/20" : 
                        (d.count < 2 ? "bg-theme/30" : (d.count < 4 ? "bg-theme/60" : "bg-theme"))
                    ))}
                    title={`${d.date.toLocaleDateString()}: ${d.count} activities`}
                />
            ))}
        </div>
    );
};

/**
 * Priority Alignment Matrix - Professional Production Edition
 * A high-performance, data-driven prioritization engine.
 */

const MATRIX_CONFIG = {
    thresholds: {
        Value: { HIGH: 15, MEDIUM: 8 },
        Urgency: { CRITICAL: 10, HIGH: 5 }
    },
    quadrants: [
        {
            id: 'q1', label: 'Critical & Urgent', sublabel: 'High ROI · Immediate Action Required',
            urgency: 'high', value: 'high',
            color: '#ef4444', bg: 'from-danger/10 to-danger/5',
            border: 'border-danger/30', textColor: 'text-danger',
            badge: 'bg-danger/10 border-danger/20 text-danger',
            priority: 'Urgent',
        },
        {
            id: 'q2', label: 'Strategic Initiatives', sublabel: 'High ROI · Planned Development',
            urgency: 'low', value: 'high',
            color: '#1B73E8', bg: 'from-blue-500/10 to-blue-500/5',
            border: 'border-blue-500/30', textColor: 'text-blue-400',
            badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
            priority: 'High',
        },
        {
            id: 'q3', label: 'Routine Operations', sublabel: 'Standard Priority · Immediate Need',
            urgency: 'high', value: 'low',
            color: '#f59e0b', bg: 'from-warning/10 to-warning/5',
            border: 'border-warning/30', textColor: 'text-warning',
            badge: 'bg-warning/10 border-warning/20 text-warning',
            priority: 'Medium',
        },
        {
            id: 'q4', label: 'Support & Backlog', sublabel: 'Routine Maintenance · Long-term',
            urgency: 'low', value: 'low',
            color: 'var(--text-tertiary)', bg: 'from-sunken to-transparent',
            border: 'border-glass', textColor: 'text-tertiary',
            badge: 'bg-sunken border-glass text-tertiary',
            priority: 'Low',
        },
    ]
};

// --- Optimized Sub-components ---

const MatrixTaskCard = React.memo(({ task, onOpen, isSelected, onSelect, isBatchMode, onHover }) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
    const hasDependencies = task.dependencies?.blockedBy?.length > 0 || task.dependencies?.blocking?.length > 0;
    const isUrgent = task.priority === 'Urgent';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onMouseEnter={() => onHover?.(task)}
            onMouseLeave={() => onHover?.(null)}
            onClick={(e) => {
                if (isBatchMode) {
                    e.stopPropagation();
                    onSelect(task._id);
                } else {
                    onOpen(task);
                }
            }}
            draggable={!isBatchMode}
            onDragStart={(e) => {
                e.dataTransfer.setData('taskIds', task._id);
            }}
            className={twMerge(clsx(
                "group relative p-3 bg-surface border transition-all duration-300 rounded-2xl cursor-pointer",
                isSelected ? "border-theme ring-1 ring-theme bg-theme/5" : 
                (isUrgent ? "border-danger/40 shadow-[0_0_15px_rgba(239,68,68,0.15)] bg-danger/[0.02]" : "border-glass hover:border-strong hover:bg-sunken"),
                task.status === 'Completed' && "opacity-60"
            ))}
        >
            <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className={clsx("text-[7px] font-black uppercase px-2 py-0.5 rounded-md border transition-colors", 
                            ['Epic', 'Feature', 'Story', 'Discovery', 'Research'].includes(task.type) ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : // Strategic
                            ['Refactor', 'DevOps', 'Technical Debt', 'QA', 'Performance', 'Engineering'].includes(task.type) ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : // Engineering
                            ['Maintenance', 'Hygiene', 'Task', 'Sustainability'].includes(task.type) ? 'bg-slate-500/10 border-slate-500/20 text-slate-400' : // Sustainability
                            'bg-rose-500/10 border-rose-500/20 text-rose-400' // Operations (Bug, Security, etc.)
                        )}>
                            {task.type || 'Task'}
                        </span>
                        <span className="text-[7px] font-black text-tertiary/40 uppercase tracking-widest">{task.status}</span>
                        {isOverdue && <span className="text-[7px] font-black text-danger uppercase tracking-widest">Late</span>}
                    </div>
                    <p className="text-xs font-black text-primary group-hover:text-theme truncate transition-colors leading-tight uppercase tracking-tight">
                        {task.title}
                    </p>
                </div>
                <div className="flex items-center -space-x-2 shrink-0">
                    {(task.assignees?.length > 0 ? task.assignees : (task.assignee ? [task.assignee] : [])).slice(0, 2).map((a, i) => (
                        <div key={a?._id || i} className="w-6 h-6 rounded-xl overflow-hidden border border-strong bg-theme/10 flex items-center justify-center">
                            {a?.avatar
                                ? <img src={getOptimizedAvatar(a.avatar, 'xs')} alt="" className="w-full h-full object-cover" />
                                : <span className="text-[7px] font-black text-theme uppercase">{a?.name?.charAt(0)}</span>
                            }
                        </div>
                    ))}
                    {hasDependencies && (
                        <div className="w-6 h-6 rounded-xl bg-sunken border border-glass flex items-center justify-center">
                            <ArrowRightLeft className="w-3 h-3 text-theme opacity-80" />
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
});

const MatrixQuadrant = React.memo(({ quadrant, tasks, onOpen, onDrop, isBatchMode, selectedIds, onSelect, onHoverTask, page, onPageChange }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const ITEMS_PER_PAGE = 8;
    const totalPages = Math.ceil(tasks.length / ITEMS_PER_PAGE);
    const pagedTasks = useMemo(() => tasks.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE), [tasks, page]);

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); onDrop(e, quadrant.priority); }}
            className={twMerge(clsx(
                "relative flex flex-col rounded-[2.5rem] border transition-all duration-500 overflow-hidden",
                quadrant.border, isDragOver ? "bg-surface scale-[1.01] shadow-elevation" : "bg-sunken/40"
            ))}
        >
            <div className="p-8 pb-4">
                <div className="flex items-center justify-between mb-2">
                    <div className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest ${quadrant.badge}`}>
                        {quadrant.urgency === 'high' ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {quadrant.label}
                    </div>
                </div>
                <div className="flex items-baseline gap-3 mt-4">
                    <div className={`text-5xl font-black tabular-nums ${quadrant.textColor} font-mono leading-none tracking-tighter`}>{tasks.length}</div>
                    <p className="text-[10px] font-black text-tertiary/40 uppercase tracking-widest">{quadrant.sublabel}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-8 space-y-3 min-h-[160px]">
                <AnimatePresence mode="popLayout">
                    {pagedTasks.map(task => (
                        <MatrixTaskCard key={task._id} task={task} onOpen={onOpen} isBatchMode={isBatchMode} isSelected={selectedIds.includes(task._id)} onSelect={onSelect} onHover={onHoverTask} />
                    ))}
                </AnimatePresence>
                {tasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-12 border border-dashed border-glass rounded-[2rem] opacity-30">
                        <p className="text-[10px] font-black text-tertiary uppercase tracking-widest">Available Capacity</p>
                    </div>
                )}
            </div>
            
            {totalPages > 1 && (
                <div className="px-8 py-4 border-t border-glass flex items-center justify-center gap-4">
                    <button onClick={() => onPageChange(page - 1)} disabled={page === 1} className="p-2 bg-glass rounded-xl disabled:opacity-20"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-[10px] font-black text-tertiary font-mono">{page} / {totalPages}</span>
                    <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} className="p-2 bg-glass rounded-xl disabled:opacity-20"><ChevronRight className="w-4 h-4" /></button>
                </div>
            )}
        </div>
    );
});

const AnalyticsSidebar = React.memo(({ metrics, onOpenTask, project, tasks, memberFilter, onMemberFilterChange }) => {
    const [activeTab, setActiveTab] = useState('ANALYTICS');

    // Strategic Taxonomy Mapping (Consolidated to Mature 4 Domains)
    const TYPE_TO_AXIS = useMemo(() => ({
        Epic: 'Strategic', Feature: 'Strategic', Story: 'Strategic', Discovery: 'Strategic', Research: 'Strategic',
        Refactor: 'Engineering', DevOps: 'Engineering', 'Technical Debt': 'Engineering', QA: 'Engineering', Performance: 'Engineering', Engineering: 'Engineering',
        Maintenance: 'Sustainability', Hygiene: 'Sustainability', Task: 'Sustainability', Sustainability: 'Sustainability',
        Bug: 'Operations', Security: 'Operations', Compliance: 'Operations', Meeting: 'Operations', Review: 'Operations', Support: 'Operations', Operations: 'Operations'
    }), []);

    // Project Strategic Footprint Calculator (Universal Normalization Mode)
    const { projectSpecialties, totalPoints } = useMemo(() => {
        const results = RADAR_SUBJECTS.reduce((acc, sub) => ({ ...acc, [sub]: 0 }), {});
        
        const filteredByMember = (tasks || []).filter(t => 
            memberFilter === 'ALL' || t.assignees?.some(a => a._id === memberFilter) || t.assignee?._id === memberFilter
        );

        filteredByMember.forEach(task => {
            if (task.status === 'Backlog' || task.status === 'Canceled') return;

            const axis = TYPE_TO_AXIS[task.type] || 'Sustainability';
            const weight = task.status === 'Completed' ? 100 : 40;
            results[axis] += weight;

            if (task.type === 'Technical Debt') results['Engineering'] += (weight * 0.4);
            if (task.type === 'Discovery') results['Strategic'] += (weight * 0.6);
        });

        // Absolute Strategic Maturity (Fixed Scale)
        const MATURITY_BENCHMARK = 1000;
        const normalized = {};
        RADAR_SUBJECTS.forEach(sub => {
            const points = results[sub] || 0;
            // Physical growth/shrinkage based on absolute benchmark
            const raw = Math.min(100, (points / MATURITY_BENCHMARK) * 100);
            normalized[sub] = points > 0 ? Math.max(5, Math.round(raw)) : 0;
        });

        const total = Object.values(results).reduce((a, b) => a + b, 0);
        return { projectSpecialties: normalized, totalPoints: Math.round(total) };
    }, [tasks, memberFilter, TYPE_TO_AXIS]);

    const tabs = [
        { id: 'ANALYTICS', icon: LayoutDashboard, label: 'Analytics' },
        { id: 'RISKS', icon: ShieldAlert, label: 'Risk Analysis' },
        { id: 'TIMELINE', icon: TrendingUp, label: 'History' },
        { id: 'TEAM', icon: Users, label: 'Squad Leaderboard' }
    ];

    // Gamification Leaderboard Data
    const { data: leaderboardRes } = useQuery({
        queryKey: ['projectLeaderboard', project?._id],
        queryFn: async () => (await api.get(`/projects/${project._id}/leaderboard`)).data,
        enabled: !!project?._id && activeTab === 'TEAM',
        staleTime: 1000 * 30
    });
    const leaderboard = leaderboardRes?.data || [];

    const overdueTasks = useMemo(() => {
        const now = new Date();
        return (tasks || []).filter(t => 
            t.dueDate && 
            new Date(t.dueDate) < now && 
            t.status !== 'Completed' && 
            t.status !== 'Canceled'
        ).map(t => {
            const breachMs = now - new Date(t.dueDate);
            const breachDays = Math.floor(breachMs / (1000 * 60 * 60 * 24));
            const breachHours = Math.floor((breachMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            return {
                ...t,
                breachText: breachDays > 0 ? `${breachDays}d ${breachHours}h` : `${breachHours}h`,
                breachValue: breachMs
            };
        }).sort((a, b) => b.breachValue - a.breachValue);
    }, [tasks]);

    const totalDriftDays = useMemo(() => {
        const totalMs = overdueTasks.reduce((sum, t) => sum + t.breachValue, 0);
        return (totalMs / (1000 * 60 * 60 * 24)).toFixed(1);
    }, [overdueTasks]);

    const priorityPieData = useMemo(() => [
        { name: 'Urgent', value: metrics.priorityBreakdown?.Urgent || 0, fill: '#ef4444' },
        { name: 'High', value: metrics.priorityBreakdown?.High || 0, fill: '#3b82f6' },
        { name: 'Medium', value: metrics.priorityBreakdown?.Medium || 0, fill: '#f59e0b' },
        { name: 'Low', value: metrics.priorityBreakdown?.Low || 0, fill: 'var(--text-tertiary)' }
    ].filter(d => d.value > 0), [metrics.priorityBreakdown]);

    const burnDownData = useMemo(() => {
        if (!metrics.timeline?.length) return [];
        return metrics.timeline.map(s => ({
            ...s,
            displayDate: new Date(s.date).toLocaleDateString([], { month: 'short', day: 'numeric' })
        }));
    }, [metrics.timeline]);

    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full lg:w-[360px] shrink-0 border-l lg:border-l border-glass bg-glass-heavy backdrop-blur-3xl p-4 lg:p-8 flex flex-col gap-8 overflow-hidden"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl bg-theme/10 border border-theme/20 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-theme" />
                    </div>
                    <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">Project Insights</h3>
                </div>
                <div className="flex items-center gap-1 bg-sunken p-1 rounded-xl border border-glass">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={twMerge(clsx(
                                "p-2 rounded-lg transition-all",
                                activeTab === tab.id ? "bg-theme text-primary shadow-lg" : "text-tertiary hover:text-primary"
                            ))}
                            title={tab.label}
                        >
                            <tab.icon className="w-4 h-4" />
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <AnimatePresence mode="wait">
                    {activeTab === 'ANALYTICS' && (
                        <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                            <div className="bg-surface border border-glass rounded-[2rem] p-6">
                                <span className="text-[9px] font-black text-tertiary uppercase tracking-widest block mb-1">Project Maturity</span>
                                <div className="text-4xl font-black text-primary font-mono mb-6">
                                    {metrics.projectProgress?.total > 0 
                                        ? Math.floor((metrics.projectProgress.finished / metrics.projectProgress.total) * 100) 
                                        : 0}%
                                </div>
                                <div className="h-2 w-full bg-sunken rounded-full overflow-hidden border border-glass">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${metrics.projectProgress?.total > 0 ? (metrics.projectProgress.finished / metrics.projectProgress.total) * 100 : 0}%` }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                                    />
                                </div>
                            </div>

                            <div className="bg-surface border border-glass rounded-[2rem] p-6">
                                <span className="text-[9px] font-black text-tertiary uppercase tracking-widest block mb-6">Active Risk Distribution</span>
                                <div className="h-[200px] w-full min-h-[200px] flex items-center justify-center relative">
                                    <RechartsResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={priorityPieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={75}
                                                paddingAngle={4}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {priorityPieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip 
                                                contentStyle={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-glass)', borderRadius: '16px', fontSize: '11px', fontWeight: 900 }}
                                            />
                                        </PieChart>
                                    </RechartsResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-3xl font-black text-primary font-mono">{metrics.projectProgress?.total - metrics.projectProgress?.finished || 0}</span>
                                        <span className="text-[8px] font-black text-tertiary uppercase tracking-widest">Active</span>
                                    </div>
                                </div>
                            </div>

                             <div className="bg-surface border border-glass rounded-[2rem] p-6">
                                <span className="text-[9px] font-black text-tertiary uppercase tracking-widest block mb-6">Completion Speed (Hours)</span>
                                <div className="h-[200px] w-full min-h-[200px]">
                                    <RechartsResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={metrics.velocityMetrics || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorDur" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
                                            <XAxis 
                                                dataKey="date" 
                                                tickFormatter={(tick) => new Date(tick).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                tick={{ fill: 'var(--text-tertiary)', fontSize: 8, fontWeight: 900 }}
                                                axisLine={{ stroke: 'var(--border-glass)' }}
                                                tickLine={{ stroke: 'var(--border-glass)' }}
                                                minTickGap={20}
                                            />
                                            <YAxis 
                                                tick={{ fill: 'var(--text-tertiary)', fontSize: 8, fontWeight: 900 }}
                                                axisLine={{ stroke: 'var(--border-glass)' }}
                                                tickLine={{ stroke: 'var(--border-glass)' }}
                                                width={25}
                                                tickFormatter={(val) => Math.round(val)}
                                            />
                                            <RechartsTooltip 
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const d = payload[0].payload;
                                                        return (
                                                            <div className="bg-base border border-glass p-3 rounded-xl shadow-2xl">
                                                                <p className="text-[8px] font-black text-primary uppercase mb-1 truncate max-w-[120px]">{d.title}</p>
                                                <p className="text-[9px] font-black text-[#10b981] font-mono">{d.duration} HOURS</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Area type="monotone" dataKey="duration" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorDur)" />
                                        </AreaChart>
                                    </RechartsResponsiveContainer>
                                </div>
                             </div>
                        </motion.div>
                    )}

                    {activeTab === 'TIMELINE' && (
                        <motion.div key="timeline" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            <div className="bg-surface border border-glass rounded-[2rem] p-6">
                                <span className="text-[9px] font-black text-tertiary uppercase tracking-widest block mb-6 px-1">Active Burn-down</span>
                                <div className="h-[200px] w-full min-h-[200px]">
                                    <RechartsResponsiveContainer width="100%" height="100%">
                                        <LineChart data={burnDownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" vertical={false} />
                                            <XAxis 
                                                dataKey="displayDate" 
                                                tick={{ fill: 'var(--text-tertiary)', fontSize: 8, fontWeight: 900 }}
                                                axisLine={{ stroke: 'var(--border-glass)' }}
                                                tickLine={{ stroke: 'var(--border-glass)' }}
                                                minTickGap={20}
                                            />
                                            <YAxis 
                                                tick={{ fill: 'var(--text-tertiary)', fontSize: 8, fontWeight: 900 }}
                                                axisLine={{ stroke: 'var(--border-glass)' }}
                                                tickLine={{ stroke: 'var(--border-glass)' }}
                                                width={25}
                                                allowDecimals={false}
                                            />
                                            <RechartsTooltip 
                                                contentStyle={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-glass)', borderRadius: '12px', fontSize: '10px' }}
                                            />
                                            <Line type="monotone" dataKey="ideal" stroke="var(--theme)" strokeWidth={2} strokeDasharray="5 5" dot={false} opacity={0.3} name="Ideal Path" />
                                            <Line type="monotone" dataKey="remaining" stroke="#ef4444" strokeWidth={4} dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} name="Work Remaining" />
                                        </LineChart>
                                    </RechartsResponsiveContainer>
                                </div>
                                <div className="mt-4 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-tertiary/60">
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-danger" /> Tasks Left</div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-0.5 bg-theme/30" /> Optimal Path</div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'RISKS' && (
                        <motion.div key="risks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            <div className="bg-surface border border-danger/20 rounded-[2rem] p-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <ShieldAlert className="w-16 h-16 text-danger" />
                                </div>
                                <span className="text-[9px] font-black text-danger uppercase tracking-widest block mb-1">Cumulative Project Drift</span>
                                <div className="flex items-baseline gap-2">
                                    <div className="text-4xl font-black text-primary font-mono leading-none tracking-tighter">{totalDriftDays}</div>
                                    <span className="text-sm font-black text-danger/60 uppercase">Days Late</span>
                                </div>
                                <p className="text-[8px] font-black text-tertiary/40 uppercase tracking-widest mt-4 leading-relaxed">
                                    Aggregated delay across {overdueTasks.length} active breaches.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <span className="text-[9px] font-black text-tertiary uppercase tracking-widest block px-1">Forensic Breach List</span>
                                {overdueTasks.length > 0 ? (
                                    overdueTasks.map(task => (
                                        <motion.div 
                                            key={task._id}
                                            onClick={() => onOpenTask?.(task)}
                                            whileHover={{ x: 4 }}
                                            className="group p-4 bg-sunken/40 border border-glass rounded-2xl hover:border-danger/30 hover:bg-danger/5 transition-all cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <h4 className="text-[10px] font-black text-primary group-hover:text-danger truncate uppercase tracking-tight">{task.title}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[7px] font-black text-tertiary/60 uppercase">{task.assignee?.name || 'Unassigned'}</span>
                                                        <span className={twMerge(clsx(
                                                            "text-[6px] font-black px-1 py-0.5 rounded border",
                                                            task.priority === 'Urgent' ? "bg-danger/10 border-danger/20 text-danger" : "bg-warning/10 border-warning/20 text-warning"
                                                        ))}>
                                                            {task.priority || 'Medium'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="text-[9px] font-black text-danger font-mono">+{task.breachText}</div>
                                                    <div className="text-[6px] font-black text-tertiary/40 uppercase tracking-widest">DRY BREACH</div>
                                                </div>
                                            </div>
                                            <div className="h-1 w-full bg-glass rounded-full overflow-hidden">
                                                <div 
                                                    className={clsx("h-full", task.priority === 'Urgent' ? 'bg-danger' : 'bg-warning')}
                                                    style={{ width: task.priority === 'Urgent' ? '100%' : '60%' }}
                                                />
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="p-8 border border-dashed border-glass rounded-2xl flex flex-col items-center justify-center opacity-30 text-center">
                                        <CheckCircle2 className="w-8 h-8 text-success mb-2" />
                                        <p className="text-[8px] font-black text-tertiary uppercase tracking-widest">Zero Active Risks</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'TEAM' && (
                        <motion.div key="team" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                            {/* Project Strategic Dynamics Radar */}
                            <div className="bg-surface border border-glass rounded-[2rem] p-6 relative overflow-hidden group/dynamics">
                                <div className="absolute inset-0 bg-gradient-to-br from-theme/5 to-transparent opacity-0 group-hover/dynamics:opacity-100 transition-opacity" />
                                
                                <div className="flex flex-col gap-5 mb-6 relative z-10">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black text-theme uppercase tracking-[0.2em]">{memberFilter === 'ALL' ? 'Squad Strategic Mix' : 'Member Tactical Mix'}</span>
                                        <TrendingUp className="w-3.5 h-3.5 text-theme/40" />
                                    </div>
                                    
                                    {/* Tactical Member Selection Integration */}
                                    <div className="relative group/search">
                                        <select 
                                            value={memberFilter} 
                                            onChange={(e) => onMemberFilterChange?.(e.target.value)}
                                            className="w-full bg-sunken/50 border border-glass rounded-xl px-4 py-2.5 text-[10px] font-black text-primary uppercase appearance-none focus:ring-0 focus:border-theme/40 transition-all cursor-pointer"
                                        >
                                            <option value="ALL">All Squad Members</option>
                                            {project?.members?.map(m => (
                                                <option key={m.userId?._id || m.userId} value={m.userId?._id || m.userId}>
                                                    {m.userId?.name || 'Unknown Member'}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-tertiary/40 rotate-90 pointer-events-none" />
                                    </div>
                                </div>

                                <SpecialtyRadar specialties={projectSpecialties} isProjectView height={240} manualFullMark={100} />
                                
                                <div className="mt-4 pt-4 border-t border-glass flex items-center justify-between text-[8px] font-black text-tertiary/60 uppercase tracking-widest relative z-10">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-primary/40">Visualizer Scale</span>
                                        <span>Normalized Mix (0-100%)</span>
                                    </div>
                                    <div className="text-right flex flex-col gap-0.5">
                                        <span className="text-theme">{totalPoints.toLocaleString()}</span>
                                        <span>Strategic Volume</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-surface border border-glass rounded-[2rem] p-6">
                                <span className="text-[9px] font-black text-tertiary uppercase tracking-widest block mb-8">Workload Distribution</span>
                                <div className="h-[300px] w-full min-h-[300px]">
                                    <RechartsResponsiveContainer width="100%" height="100%">
                                        <BarChart data={metrics.memberMetrics || []} layout="vertical" margin={{ left: -10, right: 30, bottom: 0, top: 10 }}>
                                            <XAxis 
                                                type="number" 
                                                tick={{ fill: 'var(--text-tertiary)', fontSize: 8, fontWeight: 900 }} 
                                                axisLine={{ stroke: 'var(--border-glass)' }} 
                                                tickLine={{ stroke: 'var(--border-glass)' }} 
                                                allowDecimals={false}
                                                height={20}
                                            />
                                            <YAxis 
                                                dataKey="name" 
                                                type="category" 
                                                tick={{ fill: 'var(--text-tertiary)', fontSize: 9, fontWeight: 900 }} 
                                                width={80} 
                                                axisLine={{ stroke: 'var(--border-glass)' }} 
                                                tickLine={false} 
                                            />
                                            <RechartsTooltip cursor={{ fill: 'var(--bg-sunken)', opacity: 0.1 }} contentStyle={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-glass)', borderRadius: '12px', fontSize: '10px', color: 'var(--text-primary)' }} />
                                            <Bar dataKey="active" name="Load" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={12} />
                                            <Bar dataKey="completed" name="Output" fill="#10b981" radius={[0, 6, 6, 0]} barSize={12} />
                                        </BarChart>
                                    </RechartsResponsiveContainer>
                                </div>
                                <div className="flex items-center gap-4 mt-6 text-[8px] font-black uppercase tracking-widest">
                                    <div className="flex items-center gap-2 text-[#3b82f6]"><div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" /> Load</div>
                                    <div className="flex items-center gap-2 text-[#10b981]"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Output</div>
                                </div>
                            </div>

                            {/* Squad Leaderboard */}
                            <div className="bg-surface border border-glass rounded-[2rem] p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Activity className="w-16 h-16 text-theme" />
                                </div>
                                <span className="text-[9px] font-black text-theme uppercase tracking-widest block mb-4 relative z-10">Squad Leaderboard</span>
                                
                                <div className="space-y-4 relative z-10">
                                    {leaderboard.length > 0 ? leaderboard.map((user, index) => {
                                        const mStats = metrics.memberMetrics.find(m => m.id === user._id) || { active: 0, completed: 0 };
                                        const total = mStats.active + mStats.completed;
                                        const progress = total > 0 ? Math.round((mStats.completed / total) * 100) : 0;

                                        return (
                                            <motion.div 
                                                key={user._id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="flex flex-col p-4 bg-sunken/40 border border-glass rounded-[1.5rem] hover:bg-theme/5 hover:border-theme/30 transition-all group"
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative">
                                                            <img src={getOptimizedAvatar(user.avatar)} alt={user.name} className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10" />
                                                            {index === 0 && (
                                                                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-black text-[8px] font-black shadow-lg">1</div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col text-left">
                                                            <span className="text-[12px] font-black text-primary truncate max-w-[120px]">{user.name}</span>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-[9px] font-black text-theme/80 uppercase tracking-widest">Lvl {user.level}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-[14px] font-black font-mono text-theme leading-none">{user.xp.toLocaleString()}</div>
                                                        <div className="text-[7px] font-black text-tertiary/60 uppercase tracking-widest mt-1">Total XP</div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[8px] font-black text-tertiary/40 uppercase tracking-widest">Project Progress</span>
                                                        <span className="text-[9px] font-black text-primary font-mono">{progress}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-glass rounded-full overflow-hidden">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${progress}%` }}
                                                            transition={{ duration: 1, ease: "easeOut" }}
                                                            className="h-full bg-gradient-to-r from-theme to-emerald-400"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mt-4 pt-3 border-t border-glass/40">
                                                    <span className="text-[8px] font-black text-tertiary/40 uppercase tracking-widest block mb-1">Momentum Map</span>
                                                    <MiniProgressMap tasks={tasks} memberId={user._id} />
                                                </div>
                                            </motion.div>
                                        );
                                    }) : (
                                        <div className="text-center p-4 border border-dashed border-glass rounded-xl opacity-50">
                                            <span className="text-[9px] font-black text-tertiary uppercase">No Data Yet</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
});

// --- Main View Component ---

const MatrixView = ({ tasks = [], project = null, onOpenTask, onUpdateTask }) => {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [memberFilter, setMemberFilter] = useState('ALL');
    const [selectedIds, setSelectedIds] = useState([]);
    const [isBatchMode, setIsBatchMode] = useState(false);
    const [quadrantPages, setQuadrantPages] = useState({ q1: 1, q2: 1, q3: 1, q4: 1 });

    const metrics = useMemo(() => {
        if (!tasks || tasks.length === 0) return { projectProgress: { total: 0, finished: 0 }, memberMetrics: [], velocityMetrics: [], priorityBreakdown: {}, timeline: [] };
        
        const now = new Date();
        const total = tasks.length;
        const finished = tasks.filter(t => t.status === 'Completed').length;
        
        // --- 1. Real-time Priority Breakdown ---
        const priorityBreakdown = { Urgent: 0, High: 0, Medium: 0, Low: 0 };
        tasks.filter(t => t.status !== 'Completed' && t.status !== 'Canceled').forEach(t => {
            if (priorityBreakdown[t.priority] !== undefined) priorityBreakdown[t.priority]++;
        });
        
        // --- 2. Real-time Member Workloads (Load vs Output) ---
        const memberMap = {};
        if (project?.members) {
            project.members.forEach(m => {
                const u = m.userId || m;
                if (u?._id) {
                    memberMap[u._id] = { 
                        name: u.name || 'Unknown', 
                        active: 0, 
                        completed: 0, 
                        overdue: 0, 
                        id: u._id 
                    };
                }
            });
        }
        
        tasks.forEach(t => {
            const isOverdue = t.dueDate && new Date(t.dueDate) < now && t.status !== 'Completed';
            const participantIds = new Set();
            if (t.assignee?._id) participantIds.add(t.assignee._id);
            if (t.assignees?.length) t.assignees.forEach(a => a?._id && participantIds.add(a._id));

            participantIds.forEach(pid => {
                if (memberMap[pid]) {
                    if (t.status === 'Completed') memberMap[pid].completed++;
                    else if (t.status !== 'Canceled') memberMap[pid].active++;
                    if (isOverdue) memberMap[pid].overdue++;
                }
            });
        });

        // --- 3. Dynamic Temporal Burn-down ---
        const timeline = [];
        const taskDates = tasks.map(t => new Date(t.createdAt).getTime()).filter(x => !isNaN(x));
        const earliestTime = taskDates.length > 0 ? Math.min(...taskDates) : now.getTime();
        
        const startDate = new Date(earliestTime);
        startDate.setHours(0,0,0,0);
        const nowTime = new Date(now);
        nowTime.setHours(23, 59, 59, 999);
        
        const daysDiff = Math.max(7, Math.min(30, Math.ceil((nowTime.getTime() - startDate.getTime()) / (1000 * 3600 * 24))));

        for (let i = 0; i <= daysDiff; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const checkPoint = new Date(date);
            checkPoint.setHours(23, 59, 59, 999);

            const totalAtDate = tasks.filter(t => new Date(t.createdAt) <= checkPoint).length;
            const finishedAtDate = tasks.filter(t => 
                t.status === 'Completed' && 
                new Date(t.updatedAt || t.createdAt) <= checkPoint
            ).length;

            const ideal = Math.max(0, totalAtDate - (i * (totalAtDate / daysDiff)));

            timeline.push({ 
                date: date.toISOString(), 
                remaining: Math.max(0, totalAtDate - finishedAtDate),
                ideal: parseFloat(ideal.toFixed(1))
            });
        }

        // --- 4. Authentic Velocity Metrics ---
        const velocityMetrics = tasks
            .filter(t => t.status === 'Completed')
            .sort((a,b) => new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0))
            .map(t => {
                const created = new Date(t.createdAt);
                const updated = new Date(t.updatedAt || new Date());
                let rawDuration = t.actualTime || (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
                
                return {
                    title: t.title,
                    date: updated.toISOString(),
                    duration: parseFloat(Math.max(0.1, rawDuration).toFixed(1))
                };
            }).slice(-15);

        return {
            projectProgress: { total, finished },
            priorityBreakdown,
            memberMetrics: Object.values(memberMap).sort((a, b) => b.completed - a.completed),
            timeline,
            velocityMetrics
        };
    }, [tasks, project]);

    const handleDrop = useCallback((e, newPriority) => {
        const id = e.dataTransfer.getData('taskIds');
        if (id) onUpdateTask?.(id, { priority: newPriority });
    }, [onUpdateTask]);

    const handleBulkUpdate = async (updates) => {
        if (selectedIds.length === 0) return;
        try {
            await api.patch(`/tasks/bulk-update`, { taskIds: selectedIds, updates });
            setIsBatchMode(false);
            setSelectedIds([]);
        } catch (err) { console.error('Bulk Update Failed:', err); }
    };

    const filteredTasks = useMemo(() => {
        return (tasks || []).filter(t => {
            const matchesSearch = t.title?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesMember = memberFilter === 'ALL' || t.assignees?.some(a => a._id === memberFilter) || t.assignee?._id === memberFilter;
            return matchesSearch && matchesMember && t.status !== 'Completed' && t.status !== 'Canceled';
        });
    }, [tasks, searchTerm, memberFilter]);

    const categorized = useMemo(() => {
        const q = { q1: [], q2: [], q3: [], q4: [] };
        const now = new Date();
        filteredTasks.forEach(t => {
            const priorityWeight = { 'Urgent': 20, 'High': 12, 'Medium': 6, 'Low': 2 };
            let valueScore = priorityWeight[t.priority] || 6;

            // Professional Strategic Weighting
            const type = t.type || 'Task';
            if (['Epic', 'Security'].includes(type)) valueScore += 8;
            else if (['Feature', 'Compliance'].includes(type)) valueScore += 5;
            else if (['Story', 'Bug', 'Research', 'Discovery', 'Refactor'].includes(type)) valueScore += 2;

            const hoursRemaining = t.dueDate ? (new Date(t.dueDate) - now) / (1000 * 60 * 60) : 1000;
            const urgencyScore = hoursRemaining < 0 ? 25 : (hoursRemaining < 24 ? 15 : (hoursRemaining < 72 ? 10 : 0));
            
            if (valueScore >= 12 && urgencyScore >= 10) q.q1.push(t);
            else if (valueScore >= 12) q.q2.push(t);
            else if (urgencyScore >= 10) q.q3.push(t);
            else q.q4.push(t);
        });
        return q;
    }, [filteredTasks]);

    return (
        <div className="flex flex-col lg:flex-row h-full w-full overflow-y-auto lg:overflow-hidden bg-base relative z-10 transition-all duration-300">
            <AnimatePresence>
                {isBatchMode && selectedIds.length > 0 && (
                    <motion.div initial={{ y: 100, x: '-50%', opacity: 0 }} animate={{ y: -40, x: '-50%', opacity: 1 }} exit={{ y: 100, x: '-50%', opacity: 0 }}
                        className="fixed bottom-0 left-1/2 z-[100] w-[600px] h-20 bg-glass-heavy backdrop-blur-3xl border border-glass rounded-[2rem] shadow-evolution flex items-center justify-between px-8"
                    >
                        <div className="flex items-center gap-4">
                            <Zap className="w-5 h-5 text-theme" />
                            <div className="text-[11px] font-black text-primary uppercase">{selectedIds.length} Tasks Selected</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => handleBulkUpdate({ status: 'Completed' })} className="px-5 py-2.5 bg-theme text-white rounded-xl text-[10px] font-black uppercase">Complete</button>
                            <button onClick={() => setIsBatchMode(false)} className="px-5 py-2.5 bg-glass text-tertiary rounded-xl text-[10px] font-black uppercase">Cancel</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 flex flex-col min-w-0 h-full lg:overflow-hidden p-4 lg:p-8">
                <header className="flex flex-col gap-6 mb-10 shrink-0">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-[1.25rem] bg-theme/10 border border-theme/20 flex items-center justify-center shadow-theme-slight">
                                <Target className="w-6 h-6 text-theme" />
                            </div>
                            <div>
                                <h1 className="text-2xl lg:text-3xl font-black text-primary tracking-tighter uppercase leading-none">Priority Alignment Matrix</h1>
                                <p className="text-[10px] font-black text-tertiary/40 tracking-[0.6em] uppercase mt-2">Strategic Oversight Interface</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between lg:justify-end gap-4">
                             <div className="flex items-center gap-4 lg:gap-8 px-4 lg:px-8 py-3 bg-sunken border border-glass rounded-[1.5rem] overflow-x-auto">
                                {[
                                    { label: 'Total Tasks', value: filteredTasks.length, unit: 'Units' },
                                    { label: 'Capacity', value: project?.members?.length || 0, unit: 'Members' },
                                    { label: 'Risk Drift', value: metrics.memberMetrics?.reduce((s, m) => s + (m.overdue || 0), 0) || 0, unit: 'Overdue', color: 'text-danger' }
                                ].map((item, i) => (
                                    <div key={i} className="flex flex-col shrink-0">
                                        <span className="text-[8px] font-black text-tertiary/40 uppercase tracking-widest mb-1">{item.label}</span>
                                        <span className={twMerge(clsx("text-base lg:text-lg font-black font-mono", item.color || "text-primary"))}>
                                            {item.value} <span className="text-[9px] text-tertiary/40">{item.unit}</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className={`p-4 rounded-[1.25rem] border transition-all ${isSidebarOpen ? 'bg-theme/10 border-theme/30 text-theme' : 'bg-sunken border-glass text-tertiary'}`}>
                                <BarChart3 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-6 p-2 bg-sunken border border-glass rounded-[2rem]">
                        <div className="flex items-center gap-4 flex-1 px-6">
                            <MousePointer2 className="w-4 h-4 text-tertiary/30" />
                            <input type="text" placeholder="FILTER STRATEGIC SCOPE..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-transparent border-none text-[11px] font-black text-primary placeholder:text-tertiary/30 w-full focus:ring-0 uppercase tracking-widest shadow-none" />
                        </div>
                        <div className="flex items-center gap-3 pr-2">
                             <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} className="bg-transparent border-none text-[10px] font-black text-tertiary uppercase tracking-widest focus:ring-0 cursor-pointer">
                                <option value="ALL">ALL MEMBERS</option>
                                {project?.members?.map(m => <option key={m.userId?._id} value={m.userId._id}>{m.userId.name}</option>)}
                            </select>
                            <div className="h-6 w-px bg-glass mx-2" />
                            <button onClick={() => { setIsBatchMode(!isBatchMode); setSelectedIds([]); }} className={`px-6 py-2.5 rounded-[1.25rem] border text-[10px] font-black uppercase tracking-widest transition-all ${isBatchMode ? 'bg-theme border-theme text-white shadow-theme-slight' : 'bg-sunken border-glass text-tertiary hover:text-primary'}`}>
                                {isBatchMode ? 'Cancel' : 'Bulk Action'}
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0 lg:overflow-hidden relative">
                    {MATRIX_CONFIG.quadrants.map(q => (
                        <MatrixQuadrant key={q.id} quadrant={q} tasks={categorized[q.id]} onOpen={onOpenTask} onDrop={handleDrop} isBatchMode={isBatchMode} selectedIds={selectedIds} onSelect={(id) => setSelectedIds(pv => pv.includes(id) ? pv.filter(x => x !== id) : [...pv, id])} page={quadrantPages[q.id]} onPageChange={(p) => setQuadrantPages(pv => ({ ...pv, [q.id]: p }))} />
                    ))}
                </div>
            </div>
            {isSidebarOpen && (
                <AnalyticsSidebar 
                    metrics={metrics} 
                    project={project} 
                    tasks={tasks} 
                    onOpenTask={onOpenTask} 
                    memberFilter={memberFilter} 
                    onMemberFilterChange={setMemberFilter}
                />
            )}
        </div>
    );
};

export default MatrixView;
