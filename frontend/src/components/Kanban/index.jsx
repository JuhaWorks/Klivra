import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { api, useAuthStore } from '../../store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocketSync } from '../../hooks/useSocketSync';
import { useSocketStore } from '../../store/useSocketStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    Plus,
    BarChart3,
    ShieldCheck,
    Layers,
    Activity,
    Filter,
    WifiOff,
    Grid2x2,
    GitBranch,
    Calendar,
    AlignLeft,
    LayoutGrid,
    ChevronDown,
    X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Skeleton } from '../ui/PremiumLoaders';
import { toast } from 'react-hot-toast';

import TaskCard from './TaskCard';
import TaskDetailModal from './TaskDetailModal';
import CalendarView from './CalendarView';
import TimelineView from './TimelineView';
import MatrixView from './MatrixView';
import DependencyMapView from './DependencyMapView';

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const VIEW_MODES = [
    { id: 'Board', label: 'Board', Icon: LayoutGrid },
    { id: 'Calendar', label: 'Calendar', Icon: Calendar },
    { id: 'Timeline', label: 'Timeline', Icon: AlignLeft },
    { id: 'Matrix', label: 'Matrix', Icon: Grid2x2 },
    { id: 'DependencyMap', label: 'Map', Icon: GitBranch },
];

const PRIORITY_ORDER = { Urgent: 4, High: 3, Medium: 2, Low: 1 };

const DEFAULT_COLUMNS = [
    { id: 'Pending', title: 'Backlog', color: '#64748b', wipLimit: 0 },
    { id: 'In Progress', title: 'In Progress', color: '#3b82f6', wipLimit: 5 },
    { id: 'Completed', title: 'Done', color: '#10b981', wipLimit: 0 },
    { id: 'Canceled', title: 'Canceled', color: '#ef4444', wipLimit: 0 },
];

/* ─────────────────────────────────────────────
   Stat card
───────────────────────────────────────────── */
const StatCard = React.memo(({ label, value, accent, isFirst }) => {
    return (
        <div className={twMerge(clsx(
            'relative flex items-center gap-3.5 px-5 py-3.5 rounded-2xl',
            'bg-[#0f0f11] border border-white/[0.06]',
            'transition-colors duration-200 hover:border-white/10',
            'overflow-hidden flex-1 min-w-[130px]',
        ))}>
            {/* Left accent bar */}
            <div
                className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r-full opacity-80"
                style={{ backgroundColor: accent }}
            />
            <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${accent}14`, border: `1px solid ${accent}28` }}
            >
                {isFirst
                    ? <BarChart3 className="w-3.5 h-3.5" style={{ color: accent }} />
                    : <Activity className="w-3.5 h-3.5" style={{ color: accent }} />
                }
            </div>
            <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.16em] leading-none mb-1.5">
                    {label}
                </span>
                <span className="text-[22px] font-bold text-white leading-none tabular-nums font-mono tracking-tight">
                    {value}
                </span>
            </div>
        </div>
    );
});

/* ─────────────────────────────────────────────
   Column header
───────────────────────────────────────────── */
const ColumnHeader = React.memo(({ col, onQuickAdd, isCompact, onToggleCompact }) => {
    return (
        <div className="flex items-center justify-between px-1 mb-2 shrink-0">
            <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.color }} />
                <h3 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.16em]">
                    {col.title}
                </h3>
                <span className={twMerge(clsx(
                    'px-1.5 py-0.5 rounded-md text-[9px] font-semibold tabular-nums',
                    'bg-white/[0.04] border border-white/[0.06] text-zinc-500',
                    col.isOverLimit && 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'
                ))}>
                    {col.taskCount}{col.wipLimit > 0 ? `\u00a0/\u00a0${col.wipLimit}` : ''}
                </span>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onToggleCompact(col.id)}
                    title={isCompact ? 'Expand column' : 'Stack column'}
                    className={twMerge(clsx(
                        'p-1 rounded-lg transition-all',
                        isCompact 
                            ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20' 
                            : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04]'
                    ))}
                >
                    <Layers className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => onQuickAdd(col.id)}
                    className="p-1 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.04] transition-all"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
});

/* ─────────────────────────────────────────────
   Quick-add form
───────────────────────────────────────────── */
const QuickAddForm = React.memo(({ onSubmit, onCancel, value, onChange, type, onTypeChange }) => {
    const types = [
        { id: 'Task', color: 'text-slate-500' },
        { id: 'Story', color: 'text-indigo-500' },
        { id: 'Bug', color: 'text-rose-500' },
        { id: 'Security', color: 'text-rose-600' }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="rounded-xl bg-[#1a1a1e] border border-white/10 shadow-lg overflow-hidden mb-2 shadow-2xl"
        >
            <form onSubmit={onSubmit} className="p-2.5 flex flex-col gap-2.5">
                <input
                    autoFocus
                    value={value}
                    onChange={onChange}
                    placeholder="Task title…"
                    className="w-full bg-transparent text-[11px] font-bold text-white placeholder-zinc-600 focus:outline-none px-1 uppercase tracking-tight"
                />
                <div className="flex items-center justify-between gap-1.5 px-0.5">
                    <div className="flex items-center gap-1.5">
                        {types.map(t => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => onTypeChange(t.id)}
                                className={twMerge(clsx(
                                    "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all",
                                    type === t.id ? `bg-theme/20 ${t.color}` : "text-zinc-600 hover:text-zinc-400"
                                ))}
                            >
                                {t.id}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="p-1 rounded-lg text-zinc-600 hover:text-zinc-400 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </form>
        </motion.div>
    );
});

/* ─────────────────────────────────────────────
   Column drop zone
───────────────────────────────────────────── */
const KanbanColumn = React.memo(({
    col, tasks, isCompact, isDragOver,
    onDragOver, onDragLeave, onDrop,
    onDragStart, onOpenTask, onSelectTask,
    onToggleSubtask, blockedTaskIds, selectedTaskIds,
    quickAddCol, quickAddTitle, onQuickAddTitle,
    quickAddType, onQuickAddType,
    onQuickAddSubmit, onQuickAddOpen, onQuickAddCancel,
    onToggleCompact,
}) => {
    return (
        <div className="flex flex-col h-full" style={{ minWidth: 280, flex: 1 }}>
            <ColumnHeader 
                col={col} 
                onQuickAdd={onQuickAddOpen} 
                isCompact={isCompact}
                onToggleCompact={onToggleCompact}
            />

            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={twMerge(clsx(
                    'flex-1 min-h-[200px] rounded-2xl border transition-all duration-200 overflow-hidden',
                    'flex flex-col',
                    isDragOver
                        ? 'border-blue-500/30 bg-blue-500/[0.03]'
                        : 'border-white/[0.04] bg-white/[0.015]',
                    col.isOverLimit && !isDragOver && 'border-red-500/15 bg-red-500/[0.015]',
                ))}
            >
                {/* Stacking container */}
                <div
                    className={twMerge(clsx(
                        'flex-1 p-2.5 overflow-y-auto',
                        isCompact ? 'flex flex-col pt-4' : 'flex flex-col gap-2.5',
                    ))}
                >
                    {/* Quick-add form moved to TOP as requested */}
                    <AnimatePresence>
                        {quickAddCol && (
                            <QuickAddForm
                                value={quickAddTitle}
                                onChange={(e) => onQuickAddTitle(e.target.value)}
                                type={quickAddType}
                                onTypeChange={onQuickAddType}
                                onSubmit={onQuickAddSubmit}
                                onCancel={onQuickAddCancel}
                            />
                        )}
                    </AnimatePresence>

                    <AnimatePresence mode="popLayout">
                        {tasks.map((task, idx) => (
                            <div
                                key={task._id}
                                style={isCompact ? {
                                    marginTop: idx > 0 ? '-108px' : 0,
                                    zIndex: idx + 1,
                                    position: 'relative',
                                } : undefined}
                            >
                                <TaskCard
                                    task={task}
                                    isSelected={selectedTaskIds.includes(task._id)}
                                    isBlocked={blockedTaskIds.has(task._id)}
                                    onDragStart={onDragStart}
                                    onOpen={onOpenTask}
                                    onSelect={onSelectTask}
                                    onToggleSubtask={onToggleSubtask}
                                    isCompact={isCompact}
                                />
                            </div>
                        ))}
                    </AnimatePresence>

                    {/* Empty state */}
                    {tasks.length === 0 && !quickAddCol && (
                        <div className="flex-1 flex items-center justify-center py-8">
                            <span className="text-[10px] font-medium text-zinc-700 tracking-wide">
                                Drop tasks here
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

/* ─────────────────────────────────────────────
   SelectControl — inline styled select
───────────────────────────────────────────── */
function SelectControl({ icon: Icon, label, value, onChange, options }) {
    return (
        <label className={clsx(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl',
            'bg-white/[0.03] border border-white/[0.06]',
            'hover:border-white/10 transition-colors cursor-pointer',
        )}>
            {Icon && <Icon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
            {label && <span className="text-[9px] font-semibold text-zinc-600 uppercase tracking-widest shrink-0">{label}</span>}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="bg-transparent text-[10px] font-semibold text-zinc-300 uppercase tracking-wide outline-none cursor-pointer"
            >
                {options.map(o => (
                    <option key={o.value} value={o.value} className="bg-[#0c0c0e] normal-case font-normal text-sm">
                        {o.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

/* ─────────────────────────────────────────────
   KanbanBoard
───────────────────────────────────────────── */
const KanbanBoard = ({ projectId, searchQuery = '', triggerQuickAdd, quickFilter = 'All' }) => {
    const { user } = useAuthStore();
    const { socket } = useSocketStore();
    const queryClient = useQueryClient();

    const [selectedTask, setSelectedTask] = useState(null);
    const [viewMode, setViewMode] = useState('Board');
    const [celebrationActive, setCelebrationActive] = useState(false);
    const [dragOverCol, setDragOverCol] = useState(null);
    const [quickAddCol, setQuickAddCol] = useState(null);
    const [quickAddTitle, setQuickAddTitle] = useState('');
    const [quickAddType, setQuickAddType] = useState('Task');
    const [selectedTaskIds, setSelectedTaskIds] = useState([]);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [filterPriority, setFilterPriority] = useState('All');
    const [filterAssignee, setFilterAssignee] = useState('All');
    const [filterDeadline, setFilterDeadline] = useState('All');
    const [swimlane, setSwimlane] = useState('None');
    const [compactColumns, setCompactColumns] = useState([]); // List of col IDs that are stacked
    const boardRef = useRef(null);

    useSocketSync(projectId);

    useEffect(() => {
        const on = () => setIsOffline(false);
        const off = () => setIsOffline(true);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }, []);

    const handleInitCreate = useCallback(() => {
        setSelectedTask({ _id: undefined, title: '', description: '', status: 'Pending', priority: 'Medium', type: 'Task', assignee: null, subtasks: [] });
    }, []);

    useEffect(() => {
        if (triggerQuickAdd > 0) handleInitCreate();
    }, [triggerQuickAdd, handleInitCreate]);
    
    /* ─── Compact/Stacking Handlers ─── */
    const toggleColumnCompact = (colId) => {
        setCompactColumns(prev => 
            prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
        );
    };

    const toggleAllCompact = (shouldStack) => {
        if (shouldStack) {
            setCompactColumns(allColumns.map(c => c.id));
        } else {
            setCompactColumns([]);
        }
    };

    /* ── Data ── */
    const { data: project } = useQuery({
        queryKey: ['project', projectId],
        queryFn: async () => (await api.get(`/projects/${projectId}`)).data.data,
        enabled: !!projectId,
    });
    const members = useMemo(() => project?.members || [], [project]);

    const { data: rawTasks = [], isLoading, isFetching } = useQuery({
        queryKey: ['tasks', projectId],
        queryFn: async () => {
            const url = projectId ? `/projects/${projectId}/tasks` : '/tasks';
            return (await api.get(url)).data.data;
        },
        placeholderData: (previousData) => previousData,
    });

    const blockedTaskIds = useMemo(() => {
        const set = new Set();
        // O(N) lookup optimization
        const taskMap = new Map(rawTasks.map(t => [t._id.toString(), t]));
        
        rawTasks.forEach(task => {
            const blocked = task.dependencies?.blockedBy?.some(depId => {
                const idStr = (depId._id || depId).toString();
                const dep = taskMap.get(idStr);
                return dep && dep.status !== 'Completed';
            });
            if (blocked) set.add(task._id);
        });
        return set;
    }, [rawTasks]);

    /* ── Mutations ── */
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
        queryClient.invalidateQueries({ queryKey: ['project-analytics', projectId] });
        queryClient.invalidateQueries({ queryKey: ['workspace-analytics'] });
        queryClient.invalidateQueries({ queryKey: ['workspace-stats'] });
    };

    const createTaskMutation = useMutation({
        mutationFn: async (data) => (await api.post(`/projects/${projectId}/tasks`, data)).data,
        onSuccess: () => { invalidate(); toast.success('Task created'); },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to create task'),
    });

    const updateTaskMutation = useMutation({
        mutationFn: async ({ id, updates }) => (await api.put(`/tasks/${id}`, updates)).data,
        onMutate: async ({ id, updates }) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });

            // Snapshot the previous value
            const snapshot = queryClient.getQueryData(['tasks', projectId]);

            // Optimistically update to the new value
            queryClient.setQueryData(['tasks', projectId], (old = []) =>
                old.map(t => (t._id === id || t.id === id) ? { ...t, ...updates } : t)
            );

            return { snapshot };
        },
        onSuccess: (res, { id }) => {
            const updatedTask = res.data;
            // Manually update the cache with the server response to avoid another "skeleton" flash from full invalidation
            queryClient.setQueryData(['tasks', projectId], (old = []) =>
                old.map(t => (t._id === id || t.id === id) ? updatedTask : t)
            );
            // We still invalidate other stats in the background, but tasks are now "handled"
            queryClient.invalidateQueries({ queryKey: ['project-analytics', projectId] });
            queryClient.invalidateQueries({ queryKey: ['workspace-stats'] });
        },
        onError: (_e, _v, ctx) => { 
            if (ctx?.snapshot) {
                queryClient.setQueryData(['tasks', projectId], ctx.snapshot); 
            }
            toast.error('Failed to update task');
        },
    });

    const bulkUpdateTaskMutation = useMutation({
        mutationFn: async ({ taskIds, updates }) => (await api.patch('/tasks/bulk-update', { taskIds, updates })).data,
        onSuccess: (res) => { invalidate(); setSelectedTaskIds([]); toast.success(`Moved ${res.count} tasks`); },
    });

    const deleteTaskMutation = useMutation({
        mutationFn: async (taskId) => api.delete(`/tasks/${taskId}`),
        onSuccess: () => { invalidate(); setSelectedTask(null); toast.success('Task removed'); },
        onError: () => toast.error('Failed to remove task'),
    });

    /* ── Board config ── */
    const allColumns = useMemo(() => {
        const custom = project?.kanbanConfig?.columns;
        return (custom?.length > 0 ? custom : DEFAULT_COLUMNS);
    }, [project]);

    /* ── Filtering & grouping ── */
    const filteredTasksByView = useMemo(() => {
        let tasks = [...rawTasks];

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            tasks = tasks.filter(t => t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
        }
        if (quickFilter === 'Active') {
            tasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Canceled');
        } else if (quickFilter === 'Risk') {
            tasks = tasks.filter(t =>
                t.status !== 'Completed' && t.status !== 'Canceled' &&
                (t.priority === 'Urgent' || t.priority === 'High' ||
                    (t.dueDate && new Date(t.dueDate) < new Date()) ||
                    t.dependencies?.blockedBy?.length > 0)
            );
        }
        if (filterPriority !== 'All') tasks = tasks.filter(t => t.priority === filterPriority);
        if (filterAssignee !== 'All') tasks = tasks.filter(t =>
            t.assignees?.some(a => a._id === filterAssignee) || t.assignee?._id === filterAssignee
        );
        if (filterDeadline !== 'All') {
            const now = new Date();
            if (filterDeadline === 'Overdue') {
                tasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== 'Completed');
            } else if (filterDeadline === 'Due Soon') {
                const soon = new Date(now.getTime() + 48 * 3600000);
                tasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= soon);
            }
        }

        tasks.sort((a, b) => (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0));

        const colIds = allColumns.map(c => c.id || c._id?.toString());

        const group = (arr) => {
            const g = Object.fromEntries(colIds.map(id => [id, []]));
            arr.forEach(task => {
                const norm = task.status?.toLowerCase().trim();
                const matchId = colIds.find(id => {
                    const il = String(id).toLowerCase().trim();
                    return il === norm || (il === 'pending' && norm === 'backlog') || (il === 'backlog' && norm === 'pending');
                });
                const target = matchId || colIds[0];
                if (target && g[target]) g[target].push(task);
            });
            return g;
        };

        const grouped = group(tasks);

        if (swimlane !== 'None') {
            const lanes = {};
            const empty = () => Object.fromEntries(colIds.map(id => [id, []]));

            if (swimlane === 'Assignee') {
                project?.members?.forEach(m => {
                    lanes[m.userId?._id] = { label: m.userId?.name, tasks: empty() };
                });
                lanes['Unassigned'] = { label: 'Unassigned', tasks: empty() };
                colIds.forEach(sid => {
                    grouped[sid].forEach(task => {
                        if (task.assignees?.length > 0) {
                            task.assignees.forEach(a => { if (lanes[a._id]) lanes[a._id].tasks[sid].push(task); });
                        } else if (task.assignee?._id && lanes[task.assignee._id]) {
                            lanes[task.assignee._id].tasks[sid].push(task);
                        } else {
                            lanes['Unassigned'].tasks[sid].push(task);
                        }
                    });
                });
            } else if (swimlane === 'Priority') {
                ['Urgent', 'High', 'Medium', 'Low'].forEach(p => { lanes[p] = { label: p, tasks: empty() }; });
                colIds.forEach(sid => {
                    grouped[sid].forEach(task => {
                        if (lanes[task.priority]) lanes[task.priority].tasks[sid].push(task);
                    });
                });
            }
            return { type: 'swimlane', grouped: lanes, allFiltered: tasks };
        }

        return { type: 'standard', grouped, allFiltered: tasks };
    }, [rawTasks, searchQuery, quickFilter, filterPriority, filterAssignee, filterDeadline, swimlane, project, allColumns]);

    const boardColumns = useMemo(() => allColumns.map(col => ({
        ...col,
        taskCount: (filteredTasksByView.type === 'standard' ? filteredTasksByView.grouped[col.id] : [])?.length || 0,
        isOverLimit: col.wipLimit > 0 && ((filteredTasksByView.type === 'standard' ? filteredTasksByView.grouped[col.id] : [])?.length || 0) > col.wipLimit,
    })), [allColumns, filteredTasksByView]);

    const completionRate = useMemo(() => {
        if (!rawTasks.length) return 0;
        return Math.round((rawTasks.filter(t => t.status === 'Completed').length / rawTasks.length) * 100);
    }, [rawTasks]);

    /* ── Drag handlers ── */
    const handleDragStart = (e, taskId, currentStatus) => {
        const ids = selectedTaskIds.includes(taskId) ? selectedTaskIds : [taskId];
        e.dataTransfer.setData('taskIds', ids.join(','));
        e.dataTransfer.setData('currentStatus', currentStatus);
    };

    const handleDrop = async (e, targetStatus) => {
        const taskIds = e.dataTransfer.getData('taskIds').split(',').filter(Boolean);
        const sourceStatus = e.dataTransfer.getData('currentStatus');
        setDragOverCol(null);
        if (sourceStatus === targetStatus || !taskIds.length) return;

        const movingBlocked = taskIds.filter(id => blockedTaskIds.has(id));
        if (movingBlocked.length && (targetStatus === 'In Progress' || targetStatus === 'Completed')) {
            toast.error('Cannot move: task has unresolved dependencies.', { duration: 4000 });
            return;
        }

        if (taskIds.length === 1) {
            updateTaskMutation.mutate({ id: taskIds[0], updates: { status: targetStatus } });
        } else {
            bulkUpdateTaskMutation.mutate({ taskIds, updates: { status: targetStatus } });
        }

        if (targetStatus === 'Completed') {
            setCelebrationActive(true);
            setTimeout(() => setCelebrationActive(false), 3000);
        }
    };

    const handleTaskSelect = useCallback((e, taskId) => {
        if (e.ctrlKey || e.metaKey) {
            setSelectedTaskIds(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]);
        } else {
            setSelectedTaskIds([taskId]);
        }
    }, []);

    const toggleSubtask = (taskId, subtaskId) => {
        const task = rawTasks.find(t => t._id === taskId);
        if (!task) return;
        updateTaskMutation.mutate({
            id: taskId,
            updates: { subtasks: task.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s) },
        });
    };

    const handleQuickAdd = async (e) => {
        if (e) e.preventDefault();
        if (!projectId) { toast.error('Select a project first'); return; }
        if (project?.endDate && new Date() > new Date(project.endDate)) { toast.error('Project deadline has passed'); return; }
        if (!quickAddTitle.trim()) return;
        
        await createTaskMutation.mutateAsync({ 
            title: quickAddTitle, 
            status: quickAddCol, 
            type: quickAddType 
        });
        
        setQuickAddTitle('');
        setQuickAddCol(null);
    };

    /* ── Loading skeleton ── */
    if (isLoading && rawTasks.length === 0) {
        return (
            <div className="flex-1 flex flex-col gap-5 h-full p-1 animate-pulse">
                <div className="h-12 rounded-2xl bg-white/[0.03] border border-white/[0.04]" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-2xl" opacity={0.06} />)}
                </div>
                <div className="flex-1 flex gap-4 overflow-hidden">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex flex-col flex-1 min-w-[280px] gap-3">
                            <Skeleton className="h-6 rounded-lg" opacity={0.08} noBorder />
                            <Skeleton className="flex-1 rounded-2xl" opacity={0.04} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    /* ─── RENDER ─── */
    return (
        <div className="flex-1 flex flex-col min-h-0 gap-4 h-full">

            {/* ── Offline banner ── */}
            <AnimatePresence>
                {isOffline && (
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20"
                    >
                        <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-[10px] font-semibold text-amber-400 tracking-wide">
                            You're offline — changes will sync when reconnected
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Task completed overlay ── */}
            <AnimatePresence>
                {celebrationActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: [1, 1.1, 1], opacity: [0, 1, 0] }}
                            transition={{ duration: 1.8 }}
                            className="absolute w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[100px]"
                        />
                        <motion.div
                            initial={{ y: 16, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -16, opacity: 0 }}
                            className="relative flex items-center gap-4 px-8 py-5 rounded-2xl bg-[#0f0f11]/90 border border-emerald-500/20 backdrop-blur-xl shadow-2xl"
                        >
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                            <span className="text-sm font-semibold text-white tracking-tight">Task completed</span>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Toolbar ── */}
            <div className={clsx(
                'flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3',
                'px-4 py-3 rounded-2xl',
                'bg-[#0c0c0e] border border-white/[0.05]',
            )}>
                {/* View switcher */}
                <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.05] p-1 rounded-xl overflow-x-auto max-w-full no-scrollbar">
                    {VIEW_MODES.map(({ id, label, Icon }) => {
                        const active = viewMode === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setViewMode(id)}
                                className={twMerge(clsx(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest transition-all duration-150 shrink-0',
                                    active
                                        ? 'bg-white/[0.08] text-white shadow-sm'
                                        : 'text-zinc-600 hover:text-zinc-300',
                                ))}
                            >
                                <Icon className="w-3 h-3" />
                                <span className="whitespace-nowrap">{label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                    <SelectControl
                        icon={Layers}
                        label="Group"
                        value={swimlane}
                        onChange={setSwimlane}
                        options={[
                            { value: 'None', label: 'Columns' },
                            { value: 'Assignee', label: 'Assignee' },
                            { value: 'Priority', label: 'Priority' },
                        ]}
                    />
                    <SelectControl
                        icon={Filter}
                        value={filterPriority}
                        onChange={setFilterPriority}
                        options={[
                            { value: 'All', label: 'All priorities' },
                            { value: 'Urgent', label: 'Urgent' },
                            { value: 'High', label: 'High' },
                            { value: 'Medium', label: 'Medium' },
                            { value: 'Low', label: 'Low' },
                        ]}
                    />
                    <SelectControl
                        icon={Activity}
                        value={filterDeadline}
                        onChange={setFilterDeadline}
                        options={[
                            { value: 'All', label: 'All deadlines' },
                            { value: 'Overdue', label: 'Overdue' },
                            { value: 'Due Soon', label: 'Due soon' },
                        ]}
                    />
                    <button
                        onClick={() => toggleAllCompact(compactColumns.length < allColumns.length)}
                        className={twMerge(clsx(
                            'flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[10px] font-semibold uppercase tracking-widest transition-all',
                            compactColumns.length === allColumns.length
                                ? 'bg-blue-500/10 border-blue-500/25 text-blue-400'
                                : 'bg-white/[0.03] border-white/[0.06] text-zinc-600 hover:text-zinc-300 hover:border-white/10',
                        ))}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        {compactColumns.length === allColumns.length ? 'Stacked All' : 'Standard'}
                    </button>
                </div>
            </div>

            {/* ── Board view ── */}
            {viewMode === 'Board' && (
                <div className="flex flex-col flex-1 min-h-0 gap-4">

                    {/* Stats row */}
                    <div className="flex flex-wrap gap-3 shrink-0">
                        <StatCard label="Progress" value={`${completionRate}%`} accent="#3b82f6" isFirst />
                        {boardColumns.map(col => (
                            <StatCard key={col.id} label={col.title} value={col.taskCount} accent={col.color} />
                        ))}
                    </div>

                    {/* Columns */}
                    <div className="flex-1 flex flex-col min-h-0" ref={boardRef}>
                        {filteredTasksByView.type === 'standard' ? (
                            <div className="flex flex-1 gap-4 overflow-x-auto pb-4 items-stretch h-full px-1">
                                {boardColumns.map(col => (
                                    <KanbanColumn
                                        key={col.id}
                                        col={col}
                                        tasks={filteredTasksByView.grouped[col.id] || []}
                                        isCompact={compactColumns.includes(col.id)}
                                        isDragOver={dragOverCol === col.id}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
                                        onDragLeave={() => setDragOverCol(null)}
                                        onDrop={(e) => handleDrop(e, col.id)}
                                        onDragStart={handleDragStart}
                                        onOpenTask={setSelectedTask}
                                        onSelectTask={handleTaskSelect}
                                        onToggleSubtask={toggleSubtask}
                                        blockedTaskIds={blockedTaskIds}
                                        selectedTaskIds={selectedTaskIds}
                                        quickAddCol={quickAddCol === col.id ? col.id : null}
                                        quickAddTitle={quickAddTitle}
                                        onQuickAddTitle={setQuickAddTitle}
                                        onQuickAddSubmit={(e) => handleQuickAdd(e, col.id)}
                                        onQuickAddOpen={(id) => setQuickAddCol(id)}
                                        onQuickAddCancel={() => { setQuickAddCol(null); setQuickAddTitle(''); }}
                                        onToggleCompact={toggleColumnCompact}
                                    />
                                ))}
                            </div>
                        ) : (
                            /* Swimlane view */
                            <div className="space-y-10 overflow-y-auto">
                                {Object.entries(filteredTasksByView.grouped).map(([id, row]) => (
                                    <div key={id} className="space-y-3">
                                        <div className="flex items-center gap-4">
                                            <div className="h-px flex-1 bg-white/[0.04]" />
                                            <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.22em] px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.03]">
                                                {row.label}
                                            </span>
                                            <div className="h-px flex-1 bg-white/[0.04]" />
                                        </div>
                                        <div className="flex gap-4 overflow-x-auto pb-2">
                                            {boardColumns.map(col => (
                                                <div
                                                    key={`${id}-${col.id}`}
                                                    style={{ minWidth: 280, flex: 1 }}
                                                    onDragOver={(e) => { e.preventDefault(); setDragOverCol(`${id}-${col.id}`); }}
                                                    onDragLeave={() => setDragOverCol(null)}
                                                    onDrop={(e) => handleDrop(e, col.id)}
                                                >
                                                    <div className={twMerge(clsx(
                                                        'rounded-xl border p-2 flex flex-col transition-all',
                                                        dragOverCol === `${id}-${col.id}`
                                                            ? 'border-blue-500/30 bg-blue-500/[0.03]'
                                                            : 'border-white/[0.04] bg-white/[0.01]',
                                                        compactColumns.includes(col.id) ? 'gap-0 pt-4' : 'gap-2',
                                                    ))}>
                                                        <AnimatePresence mode="popLayout">
                                                            {row.tasks[col.id]?.map((task, idx) => (
                                                                <div
                                                                    key={task._id}
                                                                    style={compactColumns.includes(col.id) ? {
                                                                        marginTop: idx > 0 ? '-108px' : 0,
                                                                        zIndex: idx + 1,
                                                                        position: 'relative',
                                                                    } : undefined}
                                                                >
                                                                    <TaskCard
                                                                        task={task}
                                                                        isSelected={selectedTaskIds.includes(task._id)}
                                                                        isBlocked={blockedTaskIds.has(task._id)}
                                                                        onDragStart={handleDragStart}
                                                                        onOpen={setSelectedTask}
                                                                        onSelect={handleTaskSelect}
                                                                        onToggleSubtask={toggleSubtask}
                                                                        isCompact={compactColumns.includes(col.id)}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </AnimatePresence>
                                                        {(!row.tasks[col.id] || row.tasks[col.id].length === 0) && (
                                                            <div className="py-5 flex justify-center">
                                                                <span className="text-[9px] text-zinc-700">Empty</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {viewMode === 'Calendar' && (
                <CalendarView tasks={filteredTasksByView.allFiltered} onOpenTask={setSelectedTask} />
            )}
            {viewMode === 'Timeline' && (
                <TimelineView tasks={filteredTasksByView.allFiltered} onOpenTask={setSelectedTask} />
            )}
            {viewMode === 'Matrix' && (
                <MatrixView
                    tasks={filteredTasksByView.allFiltered}
                    project={project}
                    onOpenTask={setSelectedTask}
                    onUpdateTask={(id, updates) => updateTaskMutation.mutate({ id, updates })}
                />
            )}
            {viewMode === 'DependencyMap' && (
                <DependencyMapView tasks={filteredTasksByView.allFiltered} onOpenTask={setSelectedTask} />
            )}

            {/* Task detail modal */}
            <AnimatePresence>
                {selectedTask && (
                    <TaskDetailModal
                        key={selectedTask._id || 'new-task'}
                        task={selectedTask}
                        projectId={projectId}
                        project={project}
                        availableTasks={rawTasks}
                        projectMembers={members}
                        onClose={() => setSelectedTask(null)}
                        onUpdate={(id, updates) =>
                            id ? updateTaskMutation.mutate({ id, updates }) : createTaskMutation.mutate(updates)
                        }
                        onDelete={(id) => deleteTaskMutation.mutate(id)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default KanbanBoard;