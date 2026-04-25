import React, { useEffect, useCallback, useMemo, useState, useRef, lazy, Suspense } from 'react';
import { api, useAuthStore } from '../../store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocketSync } from '../../hooks/useSocketSync';
import { useSocketStore } from '../../store/useSocketStore';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, Plus, BarChart3, Layers, Activity, Filter, WifiOff,
    Grid2x2, GitBranch, Calendar, AlignLeft, LayoutGrid, X, Pin
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'react-hot-toast';

import TaskCard from './TaskCard';
import TaskDetailModal from './TaskDetailModal';
import { StatCard, KanbanColumn, SelectControl } from './KanbanLayout';

const CalendarView = lazy(() => import('./KanbanSpecializedViews').then(module => ({ default: module.CalendarView })));
const TimelineView = lazy(() => import('./KanbanSpecializedViews').then(module => ({ default: module.TimelineView })));
const DependencyMapView = lazy(() => import('./KanbanSpecializedViews').then(module => ({ default: module.DependencyMapView })));
const MatrixView = lazy(() => import('./MatrixView'));

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
   KanbanBoard
   ───────────────────────────────────────────── */
const KanbanBoard = ({ projectId, searchQuery = '', triggerQuickAdd, quickFilter = 'All' }) => {
    const { user } = useAuthStore();
    const { socket } = useSocketStore();
    const queryClient = useQueryClient();
    const isMobile = useMediaQuery('(max-width: 768px)');

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
    const [compactColumns, setCompactColumns] = useState([]); 
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
        setSelectedTask({ _id: undefined, title: '', description: '', status: 'Pending', priority: 'Medium', type: 'Task', assignee: null, subtasks: [], isPinned: false });
    }, []);

    useEffect(() => {
        if (triggerQuickAdd > 0) handleInitCreate();
    }, [triggerQuickAdd, handleInitCreate]);
    
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

    const { data: project } = useQuery({
        queryKey: ['project', projectId],
        queryFn: async () => (await api.get(`/projects/${projectId}`)).data.data,
        enabled: !!projectId,
    });

    const { data: rawTasks = [], isLoading } = useQuery({
        queryKey: ['tasks', projectId],
        queryFn: async () => {
            if (!projectId) return [];
            const url = `/projects/${projectId}/tasks`;
            return (await api.get(url)).data.data;
        },
        enabled: !!projectId
    });

    const blockedTaskIds = useMemo(() => {
        const set = new Set();
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
            await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });
            const snapshot = queryClient.getQueryData(['tasks', projectId]);
            queryClient.setQueryData(['tasks', projectId], (old = []) =>
                old.map(t => (String(t._id) === String(id) || String(t.id) === String(id)) ? { ...t, ...updates } : t)
            );
            return { snapshot };
        },
        onSuccess: (res, { id }) => {
            const updatedTask = res.data;
            queryClient.setQueryData(['tasks', projectId], (old = []) =>
                old.map(t => (String(t._id) === String(id) || String(t.id) === String(id)) ? updatedTask : t)
            );
            queryClient.invalidateQueries({ queryKey: ['project-analytics', projectId] });
            queryClient.invalidateQueries({ queryKey: ['workspace-stats'] });
        },
        onError: (_e, _v, ctx) => { 
            if (ctx?.snapshot) { queryClient.setQueryData(['tasks', projectId], ctx.snapshot); }
            toast.error('Failed to update task');
        },
    });

    const deleteTaskMutation = useMutation({
        mutationFn: async (id) => (await api.delete(`/tasks/${id}`)).data,
        onSuccess: () => { invalidate(); toast.success('Task deleted'); },
        onError: () => toast.error('Failed to delete task')
    });

    const togglePinMutation = useMutation({
        mutationFn: async (id) => (await api.post(`/tasks/${id}/toggle-pin`)).data,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });
            const snapshot = queryClient.getQueryData(['tasks', projectId]);
            queryClient.setQueryData(['tasks', projectId], (old = []) =>
                old.map(t => (String(t._id) === String(id) || String(t.id) === String(id)) ? { ...t, isPinned: !t.isPinned } : t)
            );
            return { snapshot };
        },
        onSuccess: (res, id) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
        },
        onError: (_e, _v, ctx) => {
            if (ctx?.snapshot) { queryClient.setQueryData(['tasks', projectId], ctx.snapshot); }
            toast.error('Failed to toggle pin');
        },
    });

    const handleUpdateTask = useCallback((id, updates) => {
        if (!id) {
            createTaskMutation.mutate(updates);
        } else {
            updateTaskMutation.mutate({ id, updates });
        }
    }, [createTaskMutation, updateTaskMutation]);

    const handleDeleteTask = useCallback((id) => {
        if (id) deleteTaskMutation.mutate(id);
        setSelectedTask(null);
    }, [deleteTaskMutation]);

    const bulkUpdateTaskMutation = useMutation({
        mutationFn: async ({ taskIds, updates }) => (await api.patch('/tasks/bulk-update', { taskIds, updates })).data,
        onSuccess: (res) => { invalidate(); setSelectedTaskIds([]); toast.success(`Moved ${res.count} tasks`); },
    });

    const allColumns = useMemo(() => {
        const custom = project?.kanbanConfig?.columns;
        return (custom?.length > 0 ? custom : DEFAULT_COLUMNS);
    }, [project]);

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
        
        tasks.sort((a, b) => {
            if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
            return (PRIORITY_ORDER[b.priority] || 0) - (PRIORITY_ORDER[a.priority] || 0);
        });
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
                project?.members?.forEach(m => { lanes[m.userId?._id] = { label: m.userId?.name, tasks: empty() }; });
                lanes['Unassigned'] = { label: 'Unassigned', tasks: empty() };
                colIds.forEach(sid => {
                    grouped[sid].forEach(task => {
                        if (task.assignees?.length > 0) { task.assignees.forEach(a => { if (lanes[a._id]) lanes[a._id].tasks[sid].push(task); }); }
                        else if (task.assignee?._id && lanes[task.assignee._id]) { lanes[task.assignee._id].tasks[sid].push(task); }
                        else { lanes['Unassigned'].tasks[sid].push(task); }
                    });
                });
            } else if (swimlane === 'Priority') {
                ['Urgent', 'High', 'Medium', 'Low'].forEach(p => { lanes[p] = { label: p, tasks: empty() }; });
                lanes['Unspecified'] = { label: 'Unspecified', tasks: empty() };
                colIds.forEach(sid => {
                    grouped[sid].forEach(task => {
                        const target = task.priority || 'Unspecified';
                        if (lanes[target]) lanes[target].tasks[sid].push(task);
                        else lanes['Unspecified'].tasks[sid].push(task);
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

        if (taskIds.length === 1) { updateTaskMutation.mutate({ id: taskIds[0], updates: { status: targetStatus } }); }
        else { bulkUpdateTaskMutation.mutate({ taskIds, updates: { status: targetStatus } }); }

        if (targetStatus === 'Completed') {
            setCelebrationActive(true);
            setTimeout(() => setCelebrationActive(false), 3000);
        }
    };

    const handleTaskSelect = useCallback((e, taskId) => {
        if (e.ctrlKey || e.metaKey) { setSelectedTaskIds(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]); }
        else { setSelectedTaskIds([taskId]); }
    }, [selectedTaskIds]);

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
        await createTaskMutation.mutateAsync({ title: quickAddTitle, status: quickAddCol, type: quickAddType });
        setQuickAddTitle('');
        setQuickAddCol(null);
    };

    if (isLoading && rawTasks.length === 0) {
        return (
            <div className="flex-1 flex flex-col gap-5 h-full p-1 animate-pulse">
                <div className="h-12 rounded-2xl bg-white/[0.03] border border-white/[0.04]" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-2xl bg-white/5" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 gap-4 h-full">
            <AnimatePresence>
                {isOffline && (
                    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20">
                        <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-[10px] font-semibold text-amber-400 tracking-wide">You're offline — changes will sync when reconnected</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {celebrationActive && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: [1, 1.1, 1], opacity: [0, 1, 0] }} transition={{ duration: 1.8 }} className="absolute w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[100px]" />
                        <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }} className="relative flex items-center gap-4 px-8 py-5 rounded-2xl bg-[#0f0f11]/90 border border-emerald-500/20 backdrop-blur-xl shadow-2xl">
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                            <span className="text-sm font-semibold text-white tracking-tight">Task completed</span>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-2">
                <div className="flex items-center gap-1.5 p-1 bg-sunken/30 rounded-xl border border-subtle/30 overflow-x-auto no-scrollbar">
                    {VIEW_MODES.map(({ id, label, Icon }) => (
                        <button 
                            key={id} 
                            onClick={() => setViewMode(id)} 
                            className={twMerge(clsx(
                                'flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-250',
                                viewMode === id ? 'bg-theme/10 text-theme shadow-sm' : 'text-tertiary hover:text-secondary'
                            ))}
                        >
                            <Icon className="w-3 h-3" />
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                    <SelectControl icon={Layers} label="GROUP" value={swimlane} onChange={setSwimlane} options={[{ value: 'None', label: 'COLUMNS' }, { value: 'Assignee', label: 'ASSIGNEE' }, { value: 'Priority', label: 'PRIORITY' }]} />
                    <SelectControl icon={Filter} label="FILTER" value={filterPriority} onChange={setFilterPriority} options={[{ value: 'All', label: 'ALL PRIORITY' }, { value: 'Urgent', label: 'URGENT' }, { value: 'High', label: 'HIGH' }, { value: 'Medium', label: 'MEDIUM' }, { value: 'Low', label: 'LOW' }]} />
                    <SelectControl icon={Activity} label="DUE" value={filterDeadline} onChange={setFilterDeadline} options={[{ value: 'All', label: 'ALL TIME' }, { value: 'Overdue', label: 'OVERDUE' }, { value: 'Due Soon', label: 'DUE SOON' }]} />
                    <button onClick={() => toggleAllCompact(compactColumns.length < allColumns.length)} className={twMerge(clsx('p-1.5 h-full rounded-xl border transition-all', compactColumns.length === allColumns.length ? 'bg-theme/10 border-theme/30 text-theme' : 'bg-sunken/40 border-subtle text-tertiary hover:text-secondary'))}>
                        <Layers className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {viewMode === 'Board' && (
                <div className="flex flex-col flex-1 min-h-0 gap-4">
                    <div className="flex flex-wrap gap-0 shrink-0 border-b border-subtle/20 pb-2">
                        <StatCard label="Progress" value={`${completionRate}%`} accent="#3b82f6" isFirst />
                        {boardColumns.map(col => <StatCard key={col.id} label={col.title} value={col.taskCount} accent={col.color} />)}
                    </div>
                    <div className="flex-1 flex flex-col min-h-0" ref={boardRef}>
                        {filteredTasksByView.type === 'standard' ? (
                            <div className="flex flex-col md:flex-row flex-1 gap-6 md:gap-4 md:overflow-x-auto pb-4 items-stretch h-full px-1">
                                {boardColumns.map(col => (
                                    <KanbanColumn
                                        key={col.id} col={col} tasks={filteredTasksByView.grouped[col.id] || []}
                                        isCompact={compactColumns.includes(col.id)} isDragOver={dragOverCol === col.id}
                                        onDragOver={(e) => { e.preventDefault(); setDragOverCol(col.id); }}
                                        onDragLeave={() => setDragOverCol(null)} onDrop={(e) => handleDrop(e, col.id)}
                                        onDragStart={handleDragStart} onOpenTask={setSelectedTask}
                                        onSelectTask={handleTaskSelect} onToggleSubtask={toggleSubtask}
                                        blockedTaskIds={blockedTaskIds} selectedTaskIds={selectedTaskIds}
                                        quickAddCol={quickAddCol === col.id ? col.id : null} quickAddTitle={quickAddTitle}
                                        onQuickAddTitle={setQuickAddTitle} onQuickAddType={setQuickAddType} quickAddType={quickAddType}
                                        onQuickAddSubmit={handleQuickAdd} onQuickAddOpen={setQuickAddCol}
                                        onQuickAddCancel={() => { setQuickAddCol(null); setQuickAddTitle(''); }}
                                        onToggleCompact={toggleColumnCompact} isMobile={isMobile}
                                        onTogglePin={(id) => togglePinMutation.mutate(id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-10 overflow-y-auto">
                                {Object.entries(filteredTasksByView.grouped).map(([id, row]) => (
                                    <div key={id} className="space-y-3">
                                        <div className="flex items-center gap-4">
                                            <div className="h-px flex-1 bg-white/[0.04]" />
                                            <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-[0.22em] px-3 py-1 rounded-full border border-white/[0.06] bg-white/[0.03]">{row.label}</span>
                                            <div className="h-px flex-1 bg-white/[0.04]" />
                                        </div>
                                        <div className="flex gap-4 overflow-x-auto pb-2">
                                            {boardColumns.map(col => (
                                                <div key={`${id}-${col.id}`} style={{ minWidth: 280, flex: 1 }} onDragOver={(e) => { e.preventDefault(); setDragOverCol(`${id}-${col.id}`); }} onDragLeave={() => setDragOverCol(null)} onDrop={(e) => handleDrop(e, col.id)} className={twMerge(clsx('flex-1 min-h-[200px] transition-all duration-300', 'flex flex-col', dragOverCol === `${id}-${col.id}` && 'bg-theme/5 rounded-2xl ring-1 ring-theme/20', col.isOverLimit && dragOverCol !== `${id}-${col.id}` && 'bg-danger/[0.02] rounded-2xl ring-1 ring-danger/10'))}>
                                                        <AnimatePresence mode="popLayout">
                                                            {row.tasks[col.id]?.map((task, idx) => (
                                                                <div key={task._id} style={compactColumns.includes(col.id) ? { marginTop: idx > 0 ? '-108px' : 0, zIndex: idx + 1, position: 'relative' } : undefined}>
                                                                    <TaskCard task={task} isSelected={selectedTaskIds.includes(task._id)} isBlocked={blockedTaskIds.has(task._id)} onDragStart={handleDragStart} onOpen={setSelectedTask} onSelect={handleTaskSelect} onToggleSubtask={toggleSubtask} onTogglePin={(id) => togglePinMutation.mutate(id)} isCompact={compactColumns.includes(col.id)} />
                                                                </div>
                                                            ))}
                                                        </AnimatePresence>
                                                        {(!row.tasks[col.id] || row.tasks[col.id].length === 0) && <div className="py-5 flex justify-center"><span className="text-[9px] text-zinc-700">Empty</span></div>}
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

            <Suspense fallback={<div className="flex-1 flex items-center justify-center py-20 bg-sunken/10 rounded-[2rem] border border-dashed border-glass"><span className="text-[10px] font-black uppercase tracking-widest opacity-40">Loading Strategic View...</span></div>}>
                {viewMode === 'Calendar' && <CalendarView tasks={rawTasks} onOpenTask={setSelectedTask} />}
                {viewMode === 'Timeline' && <TimelineView tasks={rawTasks} onOpenTask={setSelectedTask} />}
                {viewMode === 'Matrix' && <MatrixView tasks={rawTasks} onOpenTask={setSelectedTask} project={project} />}
                {viewMode === 'DependencyMap' && <DependencyMapView tasks={rawTasks} onOpenTask={setSelectedTask} />}
            </Suspense>

            <AnimatePresence>
                {selectedTask && (
                    <TaskDetailModal
                        task={selectedTask}
                        project={project}
                        onClose={() => setSelectedTask(null)}
                         onUpdate={handleUpdateTask}
                        onDelete={handleDeleteTask}
                        onTogglePin={(id) => togglePinMutation.mutate(id)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default KanbanBoard;