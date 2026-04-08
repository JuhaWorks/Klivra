import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CheckSquare, 
    Plus, 
    Trash2, 
    History, 
    Maximize2, 
    ShieldCheck, 
    Clock, 
    Activity, 
    Tag, 
    Calendar as CalendarIcon, 
    Layers,
    MessageSquare,
    CheckCircle2,
    Search,
    Link2,
    X,
    AlertCircle
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { api } from '../../../store/useAuthStore';
import { toast } from 'react-hot-toast';
import { getOptimizedAvatar } from '../../../utils/avatar';

/**
 * High-fidelity TaskDetailModal
 */
const TaskDetailModal = ({ task, projectId, project, projectMembers, onClose, onUpdate, onDelete }) => {
    const isNew = !task._id;
    const isAuthorized = true; // Simplified for now, should come from auth store or props

    const [title, setTitle] = useState(task.title || '');
    const [description, setDescription] = useState(task.description || '');
    const [status, setStatus] = useState(task.status || 'Pending');
    const [priority, setPriority] = useState(task.priority || 'Medium');
    const [type, setType] = useState(task.type || 'Task');
    const [assigneeIds, setAssigneeIds] = useState(() => {
        if (task.assignees?.length > 0) return task.assignees.map(a => a._id || a);
        if (task.assignee) return [task.assignee._id || task.assignee];
        return [];
    });
    const [labels, setLabels] = useState(task.labels || []);
    const [dueDate, setDueDate] = useState(() => {
        if (!task.dueDate) return '';
        const d = new Date(task.dueDate);
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    });
    const [startDate, setStartDate] = useState(() => {
        if (!task.startDate) return '';
        const d = new Date(task.startDate);
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    });
    
    const [estimatedTime, setEstimatedTime] = useState(task.estimatedTime || 0);
    const [actualTime, setActualTime] = useState(task.actualTime || 0);
    const [isRecurring, setIsRecurring] = useState(task.isRecurring || { enabled: false, frequency: 'weekly' });
    const [isArchived, setIsArchived] = useState(task.isArchived || false);
    const [subtasks, setSubtasks] = useState(task.subtasks || []);
    const [newSubtask, setNewSubtask] = useState('');
    const [commentContent, setCommentContent] = useState('');
    const [comments, setComments] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [depSearchQuery, setDepSearchQuery] = useState('');
    const [blockedBy, setBlockedBy] = useState(task.dependencies?.blockedBy?.map(d => d._id || d) || []);
    const [blocking, setBlocking] = useState(task.dependencies?.blocking?.map(d => d._id || d) || []);
    const [availableTasks, setAvailableTasks] = useState([]);

    const maxDueDate = project?.endDate ? new Date(project.endDate).toISOString().split('T')[0] : undefined;

    // Fetch comments
    useEffect(() => {
        if (!isNew) {
            fetchComments();
        }
    }, [task._id]);

    const fetchComments = async () => {
        try {
            const [cRes, tRes] = await Promise.all([
                api.get(`/tasks/${task._id}/comments`),
                projectId ? api.get(`/projects/${projectId}/tasks`) : api.get('/tasks')
            ]);
            setComments(cRes.data.data);
            setAvailableTasks(tRes.data.data.filter(t => t._id !== task._id));
        } catch (err) {
            console.error("Failed to fetch modal context", err);
        }
    };

    const handleSave = () => {
        onUpdate(isNew ? null : task._id, { 
            title, 
            description, 
            status,
            priority, 
            type,
            assignees: assigneeIds,
            labels,
            dueDate: dueDate || null,
            startDate: startDate || null,
            estimatedTime,
            actualTime,
            isRecurring,
            isArchived,
            isArchived,
            subtasks,
            dependencies: { blockedBy, blocking }
        });
        onClose();
    };

    const handleArchive = () => {
        onUpdate(task._id, { isArchived: !isArchived });
        onClose();
        toast.success(isArchived ? "Task restored" : "Task archived");
    };

    const handleSaveTemplate = async () => {
        try {
            await api.post(`/projects/${projectId}/templates`, {
                name: `Template: ${title}`,
                taskData: { title, description, priority, type, labels, subtasks }
            });
            toast.success("Task saved as template");
        } catch (err) {
            toast.error("Failed to save template");
        }
    };

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!commentContent.trim()) return;
        try {
            await api.post(`/tasks/${task._id}/comments`, { content: commentContent });
            setCommentContent('');
            fetchComments();
            toast.success("Comment posted successfully");
        } catch (err) {
            toast.error("Failed to post comment");
        }
    };

    const addSubtask = (e) => {
        e.preventDefault();
        if (!newSubtask.trim()) return;
        const sub = { id: Math.random().toString(36).substr(2, 9), title: newSubtask, completed: false };
        setSubtasks([...subtasks, sub]);
        setNewSubtask('');
    };

    const toggleSubtask = (id) => {
        setSubtasks(subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
    };

    const removeSubtask = (id) => {
        setSubtasks(subtasks.filter(s => s.id !== id));
    };

    const addLabel = (e) => {
        e.preventDefault();
        const trimmed = newLabel.trim();
        if (trimmed && !labels.includes(trimmed)) {
            setLabels([...labels, trimmed]);
        }
        setNewLabel('');
    };

    const filteredMembers = React.useMemo(() => {
        if (!memberSearchQuery.trim()) return projectMembers;
        const q = memberSearchQuery.toLowerCase();
        return projectMembers.filter(m => 
            m.userId?.name?.toLowerCase().includes(q) || 
            m.userId?.email?.toLowerCase().includes(q)
        );
    }, [projectMembers, memberSearchQuery]);

    const toggleSubtask = (id) => {
        setSubtasks(subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
    };

    const removeSubtask = (id) => {
        setSubtasks(subtasks.filter(s => s.id !== id));
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl bg-[#0c0c0e] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden my-4"
            >
                <div className="p-4 lg:p-6 space-y-4">
                    <header className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-theme/10 border border-theme/20 flex items-center justify-center shadow-lg shadow-theme/5">
                                <CheckSquare className="w-4 h-4 text-theme" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white tracking-tight uppercase">
                                    {isNew ? "New Task" : "Task Details"}
                                </h3>
                                <p className="text-[7px] font-black text-gray-500 uppercase tracking-[0.3em] leading-none mt-1">
                                    {isNew ? "Create a new task record" : `Task ID: ${task._id?.slice(-8)}`}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full transition-all group active:scale-90">
                            <Plus className="w-5 h-5 text-gray-500 rotate-45 group-hover:text-white transition-colors" />
                        </button>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                        <div className="lg:col-span-4 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1.5">Task Title</label>
                                <input 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Enter task name..."
                                    readOnly={!isAuthorized}
                                    className="w-full bg-white/[0.02] border border-white/10 focus:border-theme/40 rounded-lg px-4 py-2 text-[13px] text-white font-black transition-all outline-none shadow-inner placeholder:text-gray-800"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1.5">Description</label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                    readOnly={!isAuthorized}
                                    className="w-full bg-white/[0.02] border border-white/10 focus:border-theme/40 rounded-xl px-4 py-2.5 text-white font-medium text-[11px] transition-all outline-none resize-none leading-relaxed shadow-inner placeholder:text-gray-800"
                                    placeholder="Outline the technical requirements and objectives..."
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5 px-1.5">
                                    <div className="flex justify-between items-end">
                                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em]">Subtasks</label>
                                        <span className="text-[8px] font-black text-theme uppercase tracking-widest bg-theme/10 px-1.5 py-0.5 rounded-full">
                                            {subtasks.length > 0 ? Math.round((subtasks.filter(s => s.completed).length / subtasks.length) * 100) : 0}% Complete
                                        </span>
                                    </div>
                                    <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${subtasks.length > 0 ? (subtasks.filter(s => s.completed).length / subtasks.length) * 100 : 0}%` }}
                                            className="h-full bg-theme shadow-[0_0_20px_rgba(var(--theme-rgb),0.5)]"
                                            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar px-0.5">
                                    <AnimatePresence mode="popLayout">
                                        {subtasks.map(sub => (
                                            <motion.div 
                                                key={sub.id} 
                                                layout
                                                className="flex items-center gap-2 p-2.5 bg-white/[0.01] border border-white/5 rounded-lg group hover:border-theme/30 transition-all shadow-sm"
                                            >
                                                <button 
                                                    onClick={() => isAuthorized && toggleSubtask(sub.id)}
                                                    className={twMerge(clsx(
                                                        "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                                                        sub.completed ? "bg-theme border-theme text-white shadow-lg shadow-theme/30 scale-105" : "border-white/10 hover:border-theme/40"
                                                    ))}
                                                >
                                                    {sub.completed && <CheckCircle2 className="w-2.5 h-2.5" />}
                                                </button>
                                                <span className={twMerge(clsx("flex-1 text-[11px] font-bold", sub.completed ? "text-gray-700 line-through" : "text-white/80"))}>
                                                    {sub.title}
                                                </span>
                                                {isAuthorized && (
                                                    <button onClick={() => removeSubtask(sub.id)} className="p-1.5 opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-500/10 rounded transition-all">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>

                                 {isAuthorized && (
                                    <form onSubmit={addSubtask} className="flex items-center gap-3 p-3 bg-white/[0.04] border border-theme/10 rounded-xl group focus-within:border-theme/40 transition-all mx-1 shadow-2xl">
                                        <Plus className="w-4 h-4 text-theme/60 group-focus-within:text-theme transition-transform group-focus-within:rotate-90" />
                                        <input 
                                            value={newSubtask}
                                            onChange={(e) => setNewSubtask(e.target.value)}
                                            placeholder="Add subtask..."
                                            className="flex-1 bg-transparent border-none text-sm font-bold text-white outline-none placeholder:text-gray-800"
                                        />
                                        <button type="submit" className="px-4 py-1.5 bg-theme hover:bg-theme-highlight rounded-full text-[8.5px] font-black uppercase tracking-widest text-white transition-all opacity-0 group-focus-within:opacity-100 shadow-lg shadow-theme/20 active:scale-95">
                                            Add
                                        </button>
                                    </form>
                                )}
                            </div>

                            <div className="space-y-4">
                                <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1.5 flex items-center justify-between">
                                    <span>Blockers & Dependencies</span>
                                    <Link2 className="w-2.5 h-2.5 text-theme/40" />
                                </label>
                                
                                <div className="space-y-3 bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                                    <div className="relative group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 group-focus-within:text-theme transition-colors" />
                                        <input 
                                            type="text"
                                            value={depSearchQuery}
                                            onChange={(e) => setDepSearchQuery(e.target.value)}
                                            placeholder="Link blocking tasks..."
                                            className="w-full bg-white/5 border border-white/5 focus:border-theme/40 rounded-xl pl-9 pr-3 py-2 text-[10px] font-bold text-white outline-none placeholder:text-gray-800 transition-all font-mono"
                                        />
                                    </div>

                                    {depSearchQuery.trim() && (
                                        <div className="max-h-[120px] overflow-y-auto custom-scrollbar border border-white/5 rounded-xl bg-black/40 shadow-2xl">
                                            {availableTasks.filter(t => t.title.toLowerCase().includes(depSearchQuery.toLowerCase())).map(t => (
                                                <button 
                                                    key={t._id}
                                                    onClick={() => !blockedBy.includes(t._id) && setBlockedBy([...blockedBy, t._id])}
                                                    className="w-full text-left px-4 py-2 text-[10px] font-bold text-tertiary hover:bg-theme/20 hover:text-white border-b border-white/5 last:border-0 transition-colors"
                                                >
                                                    {t.title}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        {blockedBy.map(id => {
                                            const t = availableTasks.find(x => x._id === id);
                                            return (
                                                <div key={id} className="flex items-center justify-between p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-xl group/dep hover:border-rose-500/30 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black text-rose-200 uppercase tracking-tight leading-none">{t?.title || "Unknown Task"}</span>
                                                            <span className="text-[7px] font-black text-gray-600 uppercase mt-1">Status: {t?.status}</span>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setBlockedBy(blockedBy.filter(x => x !== id))} className="p-1.5 hover:bg-rose-500/20 rounded-lg text-rose-500 transition-all opacity-0 group-hover/dep:opacity-100">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {blockedBy.length === 0 && <p className="text-[8px] font-black text-gray-700 uppercase text-center py-4 tracking-widest italic opacity-50">No blockers linked</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-4">
                             <div className="space-y-4 bg-white/[0.01] border border-white/5 p-4 rounded-2xl shadow-2xl">
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1.5">Status & Type</label>
                                    <div className="grid grid-cols-1 gap-1.5">
                                        <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!isAuthorized} className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white font-black text-[8px] uppercase outline-none appearance-none hover:bg-white/10 transition-all cursor-pointer">
                                            {['Pending', 'In Progress', 'Completed', 'Canceled'].map(s => <option key={s} value={s} className="bg-[#0c0c0e]">{s}</option>)}
                                        </select>
                                        <select value={type} onChange={(e) => setType(e.target.value)} disabled={!isAuthorized} className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white font-black text-[8px] uppercase outline-none appearance-none hover:bg-white/10 transition-all cursor-pointer">
                                            {['Task', 'Bug', 'Feature', 'Maintenance'].map(t => <option key={t} value={t} className="bg-[#0c0c0e]">{t}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1.5">Task Priority</label>
                                    <select value={priority} onChange={(e) => setPriority(e.target.value)} disabled={!isAuthorized} className="w-full bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-white font-black text-[8px] uppercase outline-none appearance-none hover:bg-white/10 transition-all cursor-pointer">
                                        {['Low', 'Medium', 'High', 'Urgent'].map(p => <option key={p} value={p} className="bg-[#0c0c0e]">{p}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1.5 flex items-center justify-between">
                                        <span>Assignees</span>
                                        <span className="text-theme/40 lowercase font-mono">{assigneeIds.length} members</span>
                                    </label>
                                    
                                    <div className="bg-white/[0.01] border border-white/5 rounded-xl flex flex-col focus-within:border-theme/40 transition-all overflow-hidden shadow-inner">
                                        {/* Search Input */}
                                        <div className="relative group shrink-0 border-b border-white/5 bg-white/[0.02]">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                                <Search className="w-3.5 h-3.5 text-gray-600 group-focus-within:text-theme transition-colors z-10" />
                                            </div>
                                            <input 
                                                type="text"
                                                value={memberSearchQuery}
                                                onChange={(e) => setMemberSearchQuery(e.target.value)}
                                                placeholder="Search members..."
                                                className="w-full bg-transparent border-none pl-9 pr-3 py-2.5 text-[10px] font-black text-white outline-none placeholder:text-gray-800 transition-all m-0 font-mono tracking-wide"
                                            />
                                        </div>

                                        <div className="max-h-[140px] overflow-y-auto custom-scrollbar">
                                            <div className="flex flex-wrap gap-2 p-3">
                                                {filteredMembers.length === 0 ? (
                                                    <div className="w-full py-4 text-center">
                                                        <p className="text-[8px] font-black text-gray-700 uppercase tracking-widest italic">No members found</p>
                                                    </div>
                                                ) : (
                                                    filteredMembers.map(m => {
                                                        const isSelected = assigneeIds.includes(m.userId?._id);
                                                        return (
                                                            <button 
                                                                key={m.userId?._id}
                                                                type="button"
                                                                onClick={() => {
                                                                    if (!isAuthorized) return;
                                                                    setAssigneeIds(prev => isSelected ? prev.filter(id => id !== m.userId?._id) : [...prev, m.userId?._id]);
                                                                }}
                                                                className={twMerge(clsx(
                                                                    "relative w-8 h-8 rounded-lg overflow-hidden border-2 transition-all group/m",
                                                                    isSelected ? "border-theme shadow-lg shadow-theme/20 scale-110 z-10" : "border-transparent opacity-40 hover:opacity-100 bg-white/5"
                                                                ))}
                                                                title={`${m.userId?.name} (${m.userId?.email || 'No email'})`}
                                                            >
                                                                {m.userId?.avatar ? (
                                                                    <img src={getOptimizedAvatar(m.userId.avatar, 'xs')} alt={m.userId.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-theme/10 flex items-center justify-center text-[10px] font-black text-theme">
                                                                        {m.userId?.name?.charAt(0)}
                                                                    </div>
                                                                )}
                                                                {isSelected && (
                                                                    <div className="absolute inset-0 bg-theme/20 flex items-center justify-center backdrop-blur-[1px]">
                                                                        <CheckCircle2 className="w-3.5 h-3.5 text-white drop-shadow-md" />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1.5 flex items-center justify-between">
                                        <span>Labels</span>
                                        <Tag className="w-2.5 h-2.5 text-theme/40" />
                                    </label>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {labels.map(l => (
                                            <span 
                                                key={l} 
                                                className="px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border bg-theme/20 border-theme text-theme flex items-center gap-1.5"
                                            >
                                                {l}
                                                {isAuthorized && (
                                                    <button type="button" onClick={() => setLabels(labels.filter(i => i !== l))} className="text-theme/50 hover:text-rose-400 transition-colors">
                                                        <Plus className="w-2.5 h-2.5 rotate-45" />
                                                    </button>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                    {isAuthorized && (
                                        <form onSubmit={addLabel} className="flex">
                                            <input 
                                                type="text" 
                                                value={newLabel} 
                                                onChange={e => setNewLabel(e.target.value)} 
                                                placeholder="Add custom label (press Enter)" 
                                                className="w-full bg-white/5 border border-white/5 focus:border-theme/30 rounded-lg px-3 py-1.5 text-white font-black text-[9px] uppercase tracking-widest outline-none placeholder:text-gray-700 transition-colors"
                                            />
                                        </form>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em] ml-1.5 flex items-center justify-between">
                                        <span>Schedule</span>
                                        <CalendarIcon className="w-2.5 h-2.5 text-theme/40" />
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="relative">
                                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={!isAuthorized} className="w-full bg-white/5 border border-white/5 rounded-lg px-2 py-2 text-white font-black text-[8px] uppercase outline-none cursor-pointer" />
                                        </div>
                                        <div className="relative">
                                            <input type="date" value={dueDate} max={maxDueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!isAuthorized} className="w-full bg-white/5 border border-white/5 rounded-lg px-2 py-2 text-white font-black text-[8px] uppercase outline-none cursor-pointer border-rose-500/10" />
                                            {maxDueDate && (
                                                <p className="text-[7px] font-black text-gray-600 uppercase mt-1 ml-1 tracking-widest">Max limit: Project deadline</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                             </div>

                        </div>
                    </div>

                    <div className="py-4 border-t border-white/5 space-y-4">
                        <div className="flex items-center justify-between px-1.5">
                             <label className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-theme" />
                                <span>Discussions</span>
                            </label>
                            {!isNew && comments.length > 0 && (
                                <span className="text-[8px] font-black text-theme/40 uppercase tracking-widest">{comments.length} comments</span>
                            )}
                        </div>

                        {!isNew && (
                            <div className="space-y-4">
                                <form onSubmit={handlePostComment} className="relative group">
                                    <textarea 
                                        value={commentContent}
                                        onChange={(e) => setCommentContent(e.target.value)}
                                        placeholder="Add a comment..."
                                        className="w-full bg-white/[0.03] border border-white/10 focus:border-theme/40 rounded-xl px-4 py-3 text-[11px] text-white font-medium outline-none transition-all resize-none min-h-[80px]"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!commentContent.trim()}
                                        className="absolute bottom-3 right-3 px-3 py-1.5 bg-theme/20 hover:bg-theme text-theme hover:text-white rounded-lg text-[9px] font-black uppercase transition-all disabled:opacity-0"
                                    >
                                        Post
                                    </button>
                                </form>

                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {comments.length === 0 ? (
                                        <div className="py-8 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                                            <p className="text-[9px] font-black text-gray-700 uppercase tracking-widest italic">No activity yet</p>
                                        </div>
                                    ) : (
                                        comments.map((comment) => (
                                            <div key={comment._id} className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-all group/comm">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-sunken shrink-0">
                                                        {comment.user?.avatar ? (
                                                            <img src={getOptimizedAvatar(comment.user.avatar, 'xs')} className="w-full h-full object-cover" alt="avatar" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-theme bg-theme/10">
                                                                {comment.user?.name?.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-black text-primary truncate">{comment.user?.name}</span>
                                                            <span className="text-[8px] font-black text-gray-600 uppercase">{new Date(comment.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                        <p className="text-[11px] text-gray-400 leading-relaxed font-medium">{comment.content}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <footer className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        {!isNew && isAuthorized && (
                            <div className="flex items-center gap-4">
                                <button onClick={handleArchive} title={isArchived ? "Restore Task" : "Archive Task"} className="p-2.5 rounded-lg bg-white/5 hover:bg-theme/20 text-gray-500 hover:text-theme transition-all">
                                    <History className="w-4 h-4" />
                                </button>
                                <button onClick={handleSaveTemplate} title="Save as Template" className="p-2.5 rounded-lg bg-white/5 hover:bg-theme/20 text-gray-500 hover:text-theme transition-all">
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                                <div className="w-px h-6 bg-white/5 ml-2" />
                                <button onClick={() => setIsDeleting(!isDeleting)} className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg hover:bg-white/5 transition-all group">
                                    <Trash2 className="w-4 h-4 text-gray-500 group-hover:text-rose-500 transition-colors" />
                                    <span className="text-[9px] font-black text-gray-500 group-hover:text-rose-500 uppercase tracking-[0.3em]">{isDeleting ? "Cancel" : "Remove"}</span>
                                </button>
                                {isDeleting && (
                                    <button onClick={() => onDelete(task._id)} className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg font-black uppercase text-[9px] tracking-[0.2em] shadow-lg shadow-rose-500/20 active:scale-95">
                                        Confirm
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="flex items-center gap-5 w-full sm:w-auto ml-auto">
                            <button onClick={onClose} className="flex-1 sm:flex-none text-[9px] font-black uppercase text-gray-600 hover:text-white transition-colors tracking-[0.4em]">
                                {isAuthorized ? "Discard" : "Exit"}
                            </button>
                            {isAuthorized && (
                                <button onClick={handleSave} className="flex items-center gap-2.5 px-6 py-2.5 bg-theme hover:brightness-125 text-white rounded-lg font-black uppercase text-[9px] tracking-[0.4em] shadow-2xl shadow-theme/40 transition-all active:scale-95 group">
                                    <span>{isNew ? "Create Task" : "Save Changes"}</span>
                                    {isNew ? <Plus className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5 transition-transform group-hover:rotate-12" />}
                                </button>
                            )}
                        </div>
                    </footer>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default TaskDetailModal;
