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
import { MiniProgressMap, AnalyticsSidebar } from './KanbanAnalytics';
import { api } from '../../store/useAuthStore';

/* ─────────────────────────────────────────────
   Constants & Config
   ───────────────────────────────────────────── */
const MATRIX_CONFIG = {
    quadrants: [
        { id: 'q1', title: 'High Urgency • High Value', focus: 'Immediate Action / Strike Teams', accent: '#ef4444', icon: Zap },
        { id: 'q2', title: 'Low Urgency • High Value', focus: 'Strategic Planning / Quality', accent: '#3b82f6', icon: Target },
        { id: 'q3', title: 'High Urgency • Low Value', focus: 'Rapid Resolution / Hygiene', accent: '#f59e0b', icon: Activity },
        { id: 'q4', title: 'Low Urgency • Low Value', focus: 'Deferred / Backlog Maintenance', accent: '#6366f1', icon: Database },
    ]
};

/* ─────────────────────────────────────────────
   Optimized Sub-components
   ───────────────────────────────────────────── */

const MatrixTaskCard = React.memo(({ task, onOpen, isSelected, onSelect, isBatchMode }) => {
    const hoursRemaining = task.dueDate ? (new Date(task.dueDate) - new Date()) / (1000 * 3600) : null;
    const isOverdue = hoursRemaining !== null && hoursRemaining < 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={() => isBatchMode ? onSelect(task._id) : onOpen(task)}
            className={twMerge(clsx(
                "group relative p-4 mb-3 rounded-2xl border transition-all cursor-pointer",
                "bg-glass-heavy backdrop-blur-xl",
                isSelected ? "border-theme bg-theme/10 ring-1 ring-theme/20 shadow-theme-slight" : "border-glass hover:border-glass-hover hover:bg-glass-hover shadow-lg"
            ))}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 pr-4">
                    <h4 className="text-[11px] font-black text-primary uppercase tracking-tight truncate leading-tight group-hover:text-theme transition-colors">{task.title}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[8px] font-black text-tertiary/40 uppercase tracking-widest">{task.type || 'Task'}</span>
                    </div>
                </div>
                {isBatchMode && (
                    <div className={twMerge(clsx("w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all", isSelected ? "bg-theme border-theme text-white" : "border-glass text-transparent"))}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between mt-auto">
                <div className="flex -space-x-1.5">
                   {task.assignees?.slice(0, 3).map((a, i) => (
                        <div key={i} className="w-5 h-5 rounded-lg border border-base bg-sunken overflow-hidden">
                            <div className="w-full h-full flex items-center justify-center text-[7px] font-black uppercase text-tertiary">
                                {a.name?.charAt(0) || '?'}
                            </div>
                        </div>
                    ))}
                </div>
                {hoursRemaining !== null && (
                    <div className={twMerge(clsx("flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black font-mono tracking-tighter", isOverdue ? "text-danger bg-danger/10" : "text-tertiary/60 bg-sunken"))}>
                        <Clock className="w-3 h-3" />
                        {isOverdue ? `LATE` : `${Math.ceil(hoursRemaining)}H`}
                    </div>
                )}
            </div>
        </motion.div>
    );
});

const MatrixQuadrant = React.memo(({ quadrant, tasks = [], onOpen, onDrop, isBatchMode, selectedIds, onSelect, page, onPageChange }) => {
    const ITEMS_PER_PAGE = 30;
    const totalPages = Math.ceil(tasks.length / ITEMS_PER_PAGE);
    const paginatedTasks = tasks.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    return (
        <div 
            onDragOver={e => e.preventDefault()}
            onDrop={e => onDrop(e, quadrant.id)}
            className="flex flex-col h-full min-h-[340px] bg-sunken/30 border border-glass rounded-[2rem] p-6 lg:p-8 transition-all hover:bg-glass/5 group/quad"
        >
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-[1.25rem] flex items-center justify-center border transition-transform group-hover/quad:scale-110" style={{ background: `${quadrant.accent}15`, borderColor: `${quadrant.accent}30` }}>
                        <quadrant.icon className="w-5 h-5" style={{ color: quadrant.accent }} />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-[10px] lg:text-[12px] font-black text-primary uppercase tracking-widest">{quadrant.title}</h3>
                        <span className="text-[8px] font-black text-tertiary/30 uppercase tracking-[0.2em]">{quadrant.focus}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-glass border border-glass rounded-full text-[9px] font-black text-tertiary/60 font-mono tracking-tighter">{tasks.length} ENTS</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
                <AnimatePresence mode="popLayout">
                    {paginatedTasks.length > 0 ? (
                        paginatedTasks.map(task => (
                            <MatrixTaskCard key={task._id} task={task} onOpen={onOpen} isBatchMode={isBatchMode} isSelected={selectedIds.includes(task._id)} onSelect={onSelect} />
                        ))
                    ) : (
                        <div className="h-full flex items-center justify-center opacity-20 border-2 border-dashed border-glass rounded-[1.5rem]">
                            <span className="text-[10px] font-black uppercase tracking-widest">Zone Neutral</span>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {totalPages > 1 && (
                <div className="mt-6 pt-6 border-t border-glass flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }).map((_, i) => (
                            <div key={i} className={`w-1 h-1 rounded-full ${page === i + 1 ? 'bg-theme' : 'bg-glass'}`} />
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => onPageChange(Math.max(1, page - 1))} className="p-2 lg:p-3 bg-glass border border-glass rounded-xl text-tertiary hover:text-primary transition-all">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} className="p-2 lg:p-3 bg-glass border border-glass rounded-xl text-tertiary hover:text-primary transition-all">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

/* ─────────────────────────────────────────────
   Main View Component
   ───────────────────────────────────────────── */

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
        
        const priorityBreakdown = { Urgent: 0, High: 0, Medium: 0, Low: 0 };
        tasks.filter(t => t.status !== 'Completed' && t.status !== 'Canceled').forEach(t => {
            if (priorityBreakdown[t.priority] !== undefined) priorityBreakdown[t.priority]++;
        });
        
        const memberMap = {};
        if (project?.members) {
            project.members.forEach(m => {
                const u = m.userId;
                if (u && u._id) {
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
            const mainAssignee = t.assignee?._id || (typeof t.assignee === 'string' ? t.assignee : null);
            if (mainAssignee) participantIds.add(mainAssignee.toString());
            
            if (t.assignees?.length) {
                t.assignees.forEach(a => {
                    const id = a?._id || (typeof a === 'string' ? a : null);
                    if (id) participantIds.add(id.toString());
                });
            }

            participantIds.forEach(pid => {
                if (memberMap[pid]) {
                    if (t.status === 'Completed') memberMap[pid].completed++;
                    else if (t.status !== 'Canceled') memberMap[pid].active++;
                    if (isOverdue) memberMap[pid].overdue++;
                }
            });
        });

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
            velocityMetrics,
            totalRisks: tasks.filter(t => 
                t.status !== 'Completed' && t.status !== 'Canceled' && 
                ((t.dueDate && new Date(t.dueDate) < now) || t.priority === 'Urgent')
            ).length
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
                        className="fixed bottom-0 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-[600px] h-auto min-h-20 bg-glass-heavy backdrop-blur-3xl border border-glass rounded-[2rem] shadow-evolution flex flex-col sm:flex-row items-center justify-between px-6 py-4 gap-4"
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
                            <div className="flex flex-col">
                                <h1 className="text-xl lg:text-3xl font-black text-primary tracking-tighter uppercase leading-none">Priority Alignment Matrix</h1>
                                <p className="text-[8px] lg:text-[10px] font-black text-tertiary/40 tracking-[0.2em] lg:tracking-[0.6em] uppercase mt-2">Strategic Oversight Interface</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:flex sm:items-center justify-between lg:justify-end gap-3 sm:gap-4 w-full sm:w-auto">
                             <div className="col-span-2 flex items-center gap-4 lg:gap-8 px-4 lg:px-8 py-3 bg-sunken border border-glass rounded-[1.5rem] overflow-x-auto">
                                {[
                                    { label: 'Total Tasks', value: filteredTasks.length, unit: 'Units' },
                                    { label: 'Capacity', value: project?.members?.length || 0, unit: 'Members' },
                                    { label: 'Active Risks', value: metrics.totalRisks || 0, unit: 'High Stake', color: (metrics.totalRisks > 0 ? 'text-danger' : 'text-success') }
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

                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-2 bg-sunken border border-glass rounded-[1.5rem] sm:rounded-[2rem]">
                        <div className="flex items-center gap-4 flex-1 px-4 lg:px-6 w-full">
                            <MousePointer2 className="w-4 h-4 text-tertiary/30" />
                            <input type="text" placeholder="FILTER STRATEGIC SCOPE..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-transparent border-none text-[10px] lg:text-[11px] font-black text-primary placeholder:text-tertiary/30 w-full focus:ring-0 uppercase tracking-widest shadow-none" />
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-3 pr-2 w-full md:w-auto">
                             <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)} className="bg-transparent border-none text-[9px] lg:text-[10px] font-black text-tertiary uppercase tracking-widest focus:ring-0 cursor-pointer min-w-[120px]">
                                <option value="ALL">ALL MEMBERS</option>
                                {project?.members?.filter(m => m && m.userId).map(m => {
                                    const u = m.userId;
                                    const uid = u?._id || (typeof u === 'string' ? u : null);
                                    if (!uid) return null;
                                    return (
                                        <option key={uid.toString()} value={uid.toString()}>
                                            {u?.name || 'Unknown Member'}
                                        </option>
                                    );
                                }).filter(Boolean)}
                            </select>
                            <div className="h-6 w-px bg-glass md:mx-2" />
                            <button onClick={() => { setIsBatchMode(!isBatchMode); setSelectedIds([]); }} className={`px-4 lg:px-6 py-2.5 rounded-[1rem] lg:rounded-[1.25rem] border text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all ${isBatchMode ? 'bg-theme border-theme text-white shadow-theme-slight' : 'bg-sunken border-glass text-tertiary hover:text-primary'}`}>
                                {isBatchMode ? 'Cancel' : 'Bulk'}
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 min-h-0 lg:overflow-hidden relative">
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
