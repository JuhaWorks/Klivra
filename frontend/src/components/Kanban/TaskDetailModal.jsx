import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckSquare,
    Trash2,
    ShieldCheck,
    Clock,
    Plus,
    X,
    AlertCircle,
    Save,
    Activity
} from 'lucide-react';
import { api } from '../../store/useAuthStore';
import { toast } from 'react-hot-toast';
import { useSocketStore } from '../../store/useSocketStore';

// Sub-components
import TaskSubtasks from './components/TaskSubtasks';
import TaskDependencies from './components/TaskDependencies';
import TaskComments from './components/TaskComments';
import TaskAssignees from './components/TaskAssignees';
import TaskMetadata from './components/TaskMetadata';
import TaskActivity from './components/TaskActivity';

/**
 * High-fidelity TaskDetailModal - Refactored for Modularity & Portal usage
 */
const TaskDetailModal = ({ task, projectId, project, projectMembers, availableTasks: parentAvailableTasks, onClose, onUpdate, onDelete }) => {
    const isNew = !task._id;
    const isAuthorized = true; // Should ideally come from RBAC
    const { socket } = useSocketStore();

    // State
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
        return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
    });
    const [startDate, setStartDate] = useState(() => {
        if (!task.startDate) return '';
        const d = new Date(task.startDate);
        return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16);
    });

    const [subtasks, setSubtasks] = useState(task.subtasks || []);
    const [commentContent, setCommentContent] = useState('');
    const [mentionedIds, setMentionedIds] = useState([]);
    const [comments, setComments] = useState([]);

    // Dependencies State
    const [blockedBy, setBlockedBy] = useState(task.dependencies?.blockedBy || []);
    const [blocking, setBlocking] = useState(task.dependencies?.blocking || []);
    const availableTasks = useMemo(() => parentAvailableTasks || [], [parentAvailableTasks]);

    const isActuallyBlocked = useMemo(() => {
        return blockedBy.some(id => {
            const t = availableTasks.find(x => x._id === id);
            return t && t.status !== 'Completed';
        });
    }, [blockedBy, availableTasks]);

    const maxDueDate = project?.endDate ? new Date(project.endDate).toISOString().split('T')[0] : undefined;

    // Data Fetching
    const fetchContext = useCallback(async () => {
        if (!task._id) return;
        try {
            const cRes = await api.get(`/tasks/${task._id}/comments`);
            setComments(cRes.data.data || []);
        } catch (err) {
            console.error("Failed to fetch modal context", err);
        }
    }, [task._id]);

    useEffect(() => {
        fetchContext();
    }, [fetchContext]);

    // Socket Listener for real-time comments
    useEffect(() => {
        if (!socket || !task._id) return;

        const handleNewComment = (payload) => {
            if (payload.taskId === task._id) {
                setComments(prev => {
                    // Avoid duplicates if the current user posted and socket also arrived
                    if (prev.some(c => c._id === payload.comment._id)) return prev;
                    return [payload.comment, ...prev];
                });
            }
        };

        socket.on('commentAdded', handleNewComment);
        return () => socket.off('commentAdded', handleNewComment);
    }, [socket, task._id]);

    const projectStart = useMemo(() => project?.startDate ? new Date(project.startDate).toISOString().slice(0, 16) : undefined, [project?.startDate]);
    const projectEnd = useMemo(() => project?.endDate ? new Date(project.endDate).toISOString().slice(0, 16) : undefined, [project?.endDate]);

    // Handlers
    const handleSave = () => {
        if (!title.trim()) {
            toast.error("Please provide a task title", { icon: '✍️' });
            return;
        }

        // Temporal Validation
        if (projectStart && startDate && startDate < projectStart) {
            toast.error(`Start date cannot be before project start (${new Date(projectStart).toLocaleDateString()})`, { icon: '📅' });
            return;
        }
        if (projectEnd && dueDate && dueDate > projectEnd) {
            toast.error(`Due date cannot exceed project deadline (${new Date(projectEnd).toLocaleDateString()})`, { icon: '🚫' });
            return;
        }
        if (startDate && dueDate && startDate > dueDate) {
            toast.error("Start date cannot be later than the due date", { icon: '⏳' });
            return;
        }

        if (isActuallyBlocked && (status === 'In Progress' || status === 'Completed')) {
            toast.error("Cannot start/complete a task while it is blocked.", { icon: '🚫' });
            return;
        }

        onUpdate(isNew ? null : task._id, {
            title, description, status, priority, type,
            assignees: assigneeIds,
            labels,
            dueDate: dueDate || null,
            startDate: startDate || null,
            subtasks,
            dependencies: { blockedBy, blocking }
        });
        onClose();
    };

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!commentContent.trim()) return;
        try {
            const res = await api.post(`/tasks/${task._id}/comments`, {
                content: commentContent,
                mentions: mentionedIds
            });

            // Immediate optimistic UI update resolves the 'instantaneous' issue
            if (res.data && res.data.data) {
                setComments(prev => [res.data.data, ...prev]);
            }

            if (mentionedIds.length > 0 && socket) {
                socket.emit('mentionUsers', { mentionedUserIds: mentionedIds, taskId: task._id, taskTitle: title });
            }
            setCommentContent('');
            setMentionedIds([]);
            toast.success("Comment posted");
        } catch (err) {
            toast.error("Failed to post comment");
        }
    };

    const handleReaction = async (commentId, emoji) => {
        try {
            await api.patch(`/tasks/${task._id}/comments/${commentId}/react`, { emoji });
            fetchContext();
        } catch (err) {
            toast.error('Failed to react');
        }
    };

    const modalContent = (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex justify-center items-start overflow-y-auto bg-black/40 backdrop-blur-md p-2 sm:p-6 custom-scrollbar"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-3xl bg-base border border-glass rounded-2xl sm:rounded-[2rem] shadow-2xl relative"
            >
                <div className="p-4 lg:p-6 space-y-4">
                    <header className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-theme/10 border border-theme/20 flex items-center justify-center">
                                <CheckSquare className="w-5 h-5 text-theme" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-primary tracking-tight uppercase">
                                    {isNew ? "New Task" : "Task Details"}
                                </h3>
                                <p className="text-[8px] font-black text-tertiary uppercase tracking-[0.4em] mt-1">
                                    {isNew ? "Create a new task" : `ID: ${task._id}`}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-glass rounded-full transition-all group active:scale-90">
                            <X className="w-5 h-5 text-tertiary group-hover:text-primary transition-transform group-hover:rotate-90" />
                        </button>
                    </header>
                    <div className="h-px bg-glass/10 my-4" />

                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
                        <div className="lg:col-span-4 space-y-4">
                            {/* Basic Info */}
                            <div className="space-y-5">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-tertiary/60 uppercase tracking-[0.3em] ml-0.5">Title</label>
                                    <input
                                        value={title} onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Enter task title..."
                                        className="w-full bg-transparent border-none focus:ring-0 px-0 py-1 text-xl font-black text-primary transition-all outline-none placeholder:text-tertiary/20 selection:bg-theme/30"
                                    />
                                </div>
                                <div className="h-px bg-glass/5 my-2" />
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-tertiary/60 uppercase tracking-[0.3em] ml-0.5">Description</label>
                                    <textarea
                                        value={description} onChange={(e) => setDescription(e.target.value)}
                                        rows={3}
                                        className="w-full bg-transparent border-none focus:ring-0 px-0 py-1 text-primary font-medium text-[13px] transition-all outline-none resize-none leading-relaxed placeholder:text-tertiary/20"
                                        placeholder="Enter task description..."
                                    />
                                </div>
                            </div>
                            <div className="h-px bg-glass/10 my-6" />

                            <TaskSubtasks
                                subtasks={subtasks}
                                setSubtasks={setSubtasks}
                                isAuthorized={isAuthorized}
                            />
                            <div className="h-px bg-glass/10 my-6" />

                            <TaskDependencies
                                blockedBy={blockedBy} setBlockedBy={setBlockedBy}
                                blocking={blocking} setBlocking={setBlocking}
                                availableTasks={availableTasks}
                                currentTaskId={task._id}
                                isNew={isNew}
                            />
                            <div className="h-px bg-glass/10 my-6" />

                            <div className="pt-8 border-t border-glass space-y-6">
                                <div className="flex items-center gap-3 ml-1">
                                    <Activity className="w-4 h-4 text-theme" />
                                    <h4 className="text-[10px] font-black text-tertiary uppercase tracking-[0.3em]">Activity</h4>
                                </div>
                                <TaskActivity taskId={task._id} projectId={projectId} />
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-5">
                            {isActuallyBlocked && (
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-rose-400">
                                        <AlertCircle className="w-5 h-5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Dependencies Blocked</span>
                                    </div>
                                </motion.div>
                            )}

                            <TaskMetadata
                                status={status} setStatus={setStatus}
                                priority={priority} setPriority={setPriority}
                                type={type} setType={setType}
                                isAuthorized={isAuthorized}
                            />

                            <TaskAssignees
                                assigneeIds={assigneeIds} setAssigneeIds={setAssigneeIds}
                                projectMembers={projectMembers}
                                isAuthorized={isAuthorized}
                            />

                            <div className="p-0 space-y-5">
                                <div className="space-y-4">
                                    <label className="text-[9px] font-black text-tertiary/60 uppercase tracking-[0.3em] ml-0.5">Schedule</label>
                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="flex flex-col gap-2 relative">
                                            <span className="text-[8px] font-black text-tertiary/40 uppercase ml-0.5 tracking-widest">Start Date</span>
                                            <input
                                                type="datetime-local"
                                                min={projectStart}
                                                max={projectEnd}
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full bg-sunken/40 border-glass rounded-xl px-4 py-3 text-primary font-black text-[10px] uppercase outline-none focus:border-theme/30 backdrop-blur-sm transition-all"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2 relative">
                                            <span className="text-[8px] font-black text-tertiary/40 uppercase ml-0.5 tracking-widest">Due Date</span>
                                            <input
                                                type="datetime-local"
                                                min={projectStart}
                                                max={projectEnd}
                                                value={dueDate}
                                                onChange={(e) => setDueDate(e.target.value)}
                                                className="w-full bg-sunken/40 border-glass rounded-xl px-4 py-3 text-primary font-black text-[10px] uppercase outline-none focus:border-theme/30 backdrop-blur-sm transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 pt-6">
                                <button
                                    onClick={handleSave}
                                    className="w-full py-4 bg-theme hover:bg-theme-highlight rounded-2xl text-[11px] font-black uppercase tracking-widest text-white flex items-center justify-center gap-3 shadow-theme-slight transition-all active:scale-95"
                                >
                                    <Save className="w-5 h-5" />
                                    {isNew ? 'Create Task' : 'Update Task'}
                                </button>
                                {!isNew && (
                                    <button
                                        onClick={() => onDelete(task._id)}
                                        className="w-full py-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-2xl text-[11px] font-black uppercase tracking-widest text-rose-500 flex items-center justify-center gap-3 transition-all"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                        Delete Task
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <TaskComments
                        comments={comments}
                        members={projectMembers}
                        commentContent={commentContent} setCommentContent={setCommentContent}
                        mentionedIds={mentionedIds} setMentionedIds={setMentionedIds}
                        handlePostComment={handlePostComment}
                        handleReaction={handleReaction}
                        isNew={isNew}
                    />
                </div>
            </motion.div>
        </motion.div>
    );

    return createPortal(modalContent, document.body);
};

export default TaskDetailModal;
