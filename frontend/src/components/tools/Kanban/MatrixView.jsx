import React, { useMemo, useState } from 'react';
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
    PieChart, Pie, Cell, ResponsiveContainer, 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    RadialBarChart, RadialBar, Tooltip as RechartsTooltip,
    AreaChart, Area
} from 'recharts';
import { getOptimizedAvatar } from '../../../utils/avatar';
const quadrants = [
    {
        id: 'q1', label: 'Critical Action', sublabel: 'High Urgency · High Value',
        urgency: 'high', value: 'high',
        color: '#ef4444', bg: 'from-danger/10 to-danger/5',
        border: 'border-danger/30', textColor: 'text-danger',
        badge: 'bg-danger/10 border-danger/20 text-danger',
        priority: 'Urgent',
    },
    {
        id: 'q2', label: 'Strategic Planning', sublabel: 'Low Urgency · High Value',
        urgency: 'low', value: 'high',
        color: '#1B73E8', bg: 'from-blue-500/10 to-blue-500/5',
        border: 'border-blue-500/30', textColor: 'text-blue-400',
        badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        priority: 'High',
    },
    {
        id: 'q3', label: 'Resource Management', sublabel: 'High Urgency · Operational',
        urgency: 'high', value: 'low',
        color: '#f59e0b', bg: 'from-warning/10 to-warning/5',
        border: 'border-warning/30', textColor: 'text-warning',
        badge: 'bg-warning/10 border-warning/20 text-warning',
        priority: 'Medium',
    },
    {
        id: 'q4', label: 'Backlog Maintenance', sublabel: 'Low Urgency · Operational',
        urgency: 'low', value: 'low',
        color: '#6b7280', bg: 'from-white/6 to-white/3',
        border: 'border-white/10', textColor: 'text-tertiary',
        badge: 'bg-white/5 border-white/10 text-tertiary',
        priority: 'Low',
    },
];

const MatrixTaskCard = ({ task, onOpen, isSelected, onSelect, isBatchMode }) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';
    const isBlocked = task.dependencies?.blockedBy?.length > 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -2, scale: 1.01 }}
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
                e.dataTransfer.setData('currentStatus', task.status);
            }}
            className={twMerge(clsx(
                "group relative p-3 bg-black/40 border transition-all duration-200 rounded-2xl cursor-pointer",
                isSelected ? "border-theme ring-1 ring-theme" : "border-white/[0.06] hover:border-white/15",
                isBlocked && !isSelected && "border-amber-500/20"
            ))}
        >
            {isBatchMode && (
                <div className={twMerge(clsx(
                    "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full border border-black flex items-center justify-center transition-colors",
                    isSelected ? "bg-theme" : "bg-white/10"
                ))}>
                    {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
            )}
            {!isBatchMode && isBlocked && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            )}
            <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-primary group-hover:text-theme truncate transition-colors leading-tight">
                        {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                        {task.dueDate && (
                            <div className={clsx("flex items-center gap-1", isOverdue ? "text-danger" : "text-tertiary")}>
                                <Calendar className="w-2.5 h-2.5" />
                                <span className="text-[8px] font-black uppercase">
                                    {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                        )}
                        {task.priority === 'Urgent' && <Activity className="w-2.5 h-2.5 text-danger" />}
                    </div>
                </div>
                <div className="flex items-center -space-x-1 shrink-0">
                    {(() => {
                        const assignees = (task.assignees?.length > 0 ? task.assignees : (task.assignee ? [task.assignee] : []));
                        return assignees.slice(0, 2).map((a, i) => {
                            const id = a?._id || (typeof a === 'string' ? a : i);
                            return (
                                <div key={id} className="w-5 h-5 rounded-lg overflow-hidden border border-black bg-theme/10">
                                    {a?.avatar
                                        ? <img src={getOptimizedAvatar(a.avatar, 'xs')} alt="" className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center text-[7px] font-black text-theme">{a?.name?.charAt(0) || '?'}</div>
                                    }
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>
        </motion.div>
    );
};

const AnalyticsSidebar = ({ metrics }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-[320px] shrink-0 border-l border-white/[0.04] bg-black/20 backdrop-blur-3xl p-6 flex flex-col gap-8 overflow-y-auto custom-scrollbar"
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-theme/10 border border-theme/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-theme" />
                </div>
                <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tighter">Project Analytics</h3>
                    <p className="text-[9px] font-black text-theme tracking-widest uppercase opacity-60">Strategic Overview</p>
                </div>
            </div>

            {/* Project Health Score */}
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-[2rem] p-5 relative overflow-hidden group">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-black text-tertiary uppercase tracking-widest">Project Health Score</span>
                    <ShieldAlert className={clsx("w-4 h-4", metrics.phi < 50 ? "text-danger" : "text-success")} />
                </div>
                <div className="h-[120px] w-full flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart innerRadius="80%" outerRadius="100%" data={[{ value: metrics.phi, fill: metrics.phi < 50 ? '#ef4444' : '#10b981' }]} startAngle={180} endAngle={0}>
                            <RadialBar dataKey="value" cornerRadius={10} />
                        </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                        <span className="text-3xl font-black text-white font-mono">{Math.round(metrics.phi)}%</span>
                        <span className="text-[8px] font-black text-tertiary uppercase tracking-widest">{metrics.phi > 70 ? 'Optimal' : (metrics.phi > 40 ? 'Stable' : 'Critical')}</span>
                    </div>
                </div>
            </div>

            {/* Performance Trend */}
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-[2rem] p-5">
                <span className="text-[9px] font-black text-tertiary uppercase tracking-widest block mb-4">7-Day Performance Trend</span>
                <div className="h-[100px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics.velocityTrend}>
                            <defs>
                                <linearGradient id="colorVel" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#1B73E8" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#1B73E8" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="completed" stroke="#1B73E8" strokeWidth={2} fillOpacity={1} fill="url(#colorVel)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Team Allocation Radar */}
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-[2rem] p-5">
                <span className="text-[9px] font-black text-tertiary uppercase tracking-widest block mb-4">Team Workload Radar</span>
                <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={metrics.radarData}>
                            <PolarGrid stroke="#ffffff10" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 7, fontWeight: 900 }} />
                            <Radar name="Count" dataKey="A" stroke="#1B73E8" fill="#1B73E8" fillOpacity={0.3} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Critical Path Alerts */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-danger" />
                    <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Priority Overdue</span>
                </div>
                {metrics.bottlenecks.length === 0 ? (
                    <div className="p-4 rounded-2xl border border-dashed border-white/5 text-center">
                        <p className="text-[8px] font-black text-tertiary/40 uppercase">Safe Operational Status</p>
                    </div>
                ) : (
                    metrics.bottlenecks.slice(0, 3).map(task => (
                        <div key={task._id} className="p-3 rounded-2xl bg-danger/5 border border-danger/20 flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse shrink-0" />
                            <p className="text-[10px] font-black text-primary truncate">{task.title}</p>
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    );
};

const MatrixQuadrant = ({ quadrant, tasks, onOpen, onDrop, isBatchMode, selectedIds, onSelect }) => {
    const [isDragOver, setIsDragOver] = React.useState(false);
    const overloadIntensity = Math.min(tasks.length / 8, 1); 

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); onDrop(e, quadrant.priority); }}
            className={twMerge(clsx(
                "relative flex flex-col rounded-[2.5rem] border transition-all duration-300 overflow-hidden",
                quadrant.border,
                `bg-gradient-to-br ${quadrant.bg}`,
                isDragOver && "scale-[1.01] shadow-[0_0_50px_rgba(var(--theme-rgb),0.2)]"
            ))}
        >
            <div className="p-6 pb-2">
                <div className="flex items-center justify-between mb-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest ${quadrant.badge}`}>
                        {quadrant.urgency === 'high' ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {quadrant.label}
                    </div>
                    {overloadIntensity > 0.8 && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-danger/10 text-danger border border-danger/20 animate-pulse">
                            <Zap className="w-3 h-3" />
                            <span className="text-[8px] font-black uppercase">Max Capacity</span>
                        </div>
                    )}
                </div>
                <div className="flex items-baseline justify-between">
                    <div className={`text-4xl font-black tabular-nums ${quadrant.textColor} font-mono`}>{tasks.length}</div>
                    <p className="text-[9px] font-black text-tertiary/50 uppercase tracking-widest">{quadrant.sublabel}</p>
                </div>
            </div>

            <div className={`mx-6 h-px ${quadrant.border} opacity-50 mb-4 mt-2`} />

            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-6 space-y-3 min-h-[160px]">
                <AnimatePresence mode="popLayout">
                    {tasks.map(task => (
                        <MatrixTaskCard 
                            key={task._id} 
                            task={task} 
                            onOpen={onOpen} 
                            isBatchMode={isBatchMode}
                            isSelected={selectedIds.includes(task._id)}
                            onSelect={onSelect}
                        />
                    ))}
                </AnimatePresence>
                {tasks.length === 0 && (
                    <div className={twMerge(clsx(
                        "flex flex-col items-center justify-center h-28 border-2 border-dashed rounded-[2rem] transition-all",
                        isDragOver ? "border-theme/40 bg-theme/5" : "border-white/[0.03]"
                    ))}>
                        <LayoutDashboard className="w-6 h-6 text-tertiary/20 mb-2" />
                        <p className="text-[9px] font-black text-tertiary/30 uppercase tracking-[0.3em]">
                            Available Space
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

const MatrixView = ({ tasks = [], project = null, onOpenTask, onUpdateTask }) => {
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'focus'
    const [selectedIds, setSelectedIds] = useState([]);
    const [isBatchMode, setIsBatchMode] = useState(false);

    const metrics = useMemo(() => {
        const now = new Date();
        const active = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Canceled');
        const overdue = active.filter(t => t.dueDate && new Date(t.dueDate) < now);
        const criticalBlocked = active.filter(t => t.priority === 'Urgent' && (t.dueDate && new Date(t.dueDate) < now));
        
        // 7-Day Performance Trend
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const velocityTrend = last7Days.map(date => ({
            date,
            completed: tasks.filter(t => t.status === 'Completed' && (t.updatedAt || t.createdAt)?.split('T')[0] === date).length
        }));

        // Health Score (Dynamic Heuristic)
        let phi = 100;
        if (active.length > 0) {
            phi -= (overdue.length / active.length) * 40;
            phi -= (criticalBlocked.length / active.length) * 30;
        }
        phi = Math.max(10, Math.min(100, phi));

        // Member Workload Distribution
        const memberStats = {};
        active.forEach(t => {
            const assignees = t.assignees?.length > 0 ? t.assignees : (t.assignee ? [t.assignee] : []);
            assignees.forEach(a => {
                if (!a) return;
                const name = (typeof a === 'string' ? 'Member' : a.name?.split(' ')[0]) || 'Member';
                memberStats[name] = (memberStats[name] || 0) + 1;
            });
        });

        const radarData = Object.entries(memberStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([subject, A]) => ({ subject, A, fullMark: active.length }));

        return { phi, velocityTrend, bottlenecks: criticalBlocked, radarData };
    }, [tasks]);

    const categorized = useMemo(() => {
        const now = new Date();
        const soon = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        const q = { q1: [], q2: [], q3: [], q4: [] };
        
        tasks.filter(t => t.status !== 'Completed' && t.status !== 'Canceled').forEach(t => {
            const isNear = t.dueDate && (new Date(t.dueDate) < now || new Date(t.dueDate) <= soon);
            if (t.priority === 'Urgent' || (t.priority === 'High' && isNear)) q.q1.push(t);
            else if (t.priority === 'High') q.q2.push(t);
            else if (t.priority === 'Medium' || (t.priority === 'Low' && isNear)) q.q3.push(t);
            else q.q4.push(t);
        });
        return q;
    }, [tasks]);

    const handleDrop = (e, newPriority) => {
        const taskIds = e.dataTransfer.getData('taskIds')?.split(',').filter(Boolean);
        if (!taskIds?.length) return;
        taskIds.forEach(id => onUpdateTask?.(id, { priority: newPriority }));
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleBatchMove = (priority) => {
        selectedIds.forEach(id => onUpdateTask?.(id, { priority }));
        setSelectedIds([]);
        setIsBatchMode(false);
    };

    return (
        <div className="flex-1 flex min-h-0">
            {/* Main Center Area */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                <header className="flex items-center justify-between mb-8 px-2 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">Decision Matrix</h2>
                            <p className="text-[10px] font-black text-tertiary tracking-[0.4em] uppercase opacity-40 mt-1">Operational Priority View</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {isBatchMode && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-theme/10 border border-theme/20 rounded-xl mr-2">
                                <span className="text-[10px] font-black text-theme uppercase tracking-widest">{selectedIds.length} Selected</span>
                                <div className="h-4 w-px bg-theme/20 mx-1" />
                                <div className="flex gap-1">
                                    {['Urgent', 'High', 'Medium', 'Low'].map(p => (
                                        <button 
                                            key={p} 
                                            onClick={() => handleBatchMove(p)}
                                            className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[8px] font-black text-white uppercase"
                                        >
                                            To {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <button 
                            onClick={() => { setIsBatchMode(!isBatchMode); setSelectedIds([]); }}
                            className={twMerge(clsx(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                                isBatchMode ? "bg-theme border-theme text-white" : "bg-white/5 border-white/10 text-tertiary hover:text-white"
                            ))}
                        >
                            <MousePointer2 className="w-4 h-4" />
                            <span>Batch Mode</span>
                        </button>
                        <button 
                            onClick={() => setViewMode(viewMode === 'grid' ? 'focus' : 'grid')}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-tertiary hover:text-white transition-all"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setSidebarOpen(!isSidebarOpen)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                            {isSidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                            <span>Analytics</span>
                        </button>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {viewMode === 'grid' ? (
                        <motion.div 
                            key="grid"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="flex-1 grid grid-cols-2 gap-8 min-h-0 overflow-hidden p-2"
                        >
                            {quadrants.map(q => (
                                <MatrixQuadrant
                                    key={q.id}
                                    quadrant={q}
                                    tasks={categorized[q.id]}
                                    onOpen={onOpenTask}
                                    onDrop={handleDrop}
                                    isBatchMode={isBatchMode}
                                    selectedIds={selectedIds}
                                    onSelect={toggleSelect}
                                />
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="list"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="flex-1 space-y-12 overflow-y-auto custom-scrollbar p-2 pb-20"
                        >
                            {quadrants.map(q => categorized[q.id].length > 0 && (
                                <div key={q.id} className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${q.badge}`}>
                                            {q.label}
                                        </div>
                                        <div className="h-px flex-1 bg-white/[0.05]" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {categorized[q.id].map(task => (
                                            <MatrixTaskCard 
                                                key={task._id} 
                                                task={task} 
                                                onOpen={onOpenTask} 
                                                isBatchMode={isBatchMode}
                                                isSelected={selectedIds.includes(task._id)}
                                                onSelect={toggleSelect}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Strategic Sidebar */}
            {isSidebarOpen && <AnalyticsSidebar metrics={metrics} />}
        </div>
    );
};

export default MatrixView;

