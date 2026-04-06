import React from 'react';
import { motion } from 'framer-motion';
import { Layers, Calendar as CalendarIcon, User as UserIcon, MessageSquare, CheckSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Card from '../../ui/Card';
import { getOptimizedAvatar } from '../../../utils/avatar';

/**
 * Professional TaskCard
 */
const TaskCard = React.memo(({ task, onDragStart, onOpen }) => {
    const priorityStyles = {
        Urgent: "bg-danger/10 text-danger border-danger/20 shadow-danger/5",
        High: "bg-warning/10 text-warning border-warning/20 shadow-warning/5",
        Medium: "bg-theme/10 text-theme border-theme/20 shadow-theme/5",
        Low: "bg-tertiary/10 text-tertiary border-subtle"
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            draggable
            onDragStart={(e) => onDragStart(e, task._id, task.status)}
            onClick={() => onOpen(task)}
            className="group relative cursor-pointer"
        >
            <Card className="overflow-hidden border-subtle hover:border-theme/30 transition-colors shadow-2xl bg-surface" padding="p-4">
                <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 overflow-hidden">
                             <h4 className="text-sm font-black text-primary tracking-tight truncate group-hover:text-theme transition-colors">
                                {task.title}
                            </h4>
                            <p className="text-[10px] text-tertiary font-medium line-clamp-2 leading-relaxed">
                                {task.description || "No description provided."}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {task.priority && (
                            <div className={twMerge(clsx(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all",
                                priorityStyles[task.priority] || priorityStyles.Low
                            ))}>
                                <Layers className="w-3 h-3" />
                                {task.priority}
                            </div>
                        )}
                        {task.dueDate && (
                            <div className={twMerge(clsx(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all",
                                new Date(task.dueDate) < new Date() && task.status !== 'Completed' 
                                    ? "bg-danger/10 text-danger border-danger/20 animate-pulse" 
                                    : "bg-sunken border-subtle text-tertiary"
                            ))}>
                                <CalendarIcon className="w-3 h-3" />
                                {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </div>
                        )}
                    </div>

                    {task.subtasks?.length > 0 && (
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-tertiary">
                                <span>Progress</span>
                                <span>{Math.round((task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100)}%</span>
                            </div>
                            <div className="h-1 w-full bg-sunken rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%` }}
                                    className="h-full bg-theme shadow-[0_0_8px_rgba(var(--theme-rgb),0.3)]"
                                />
                            </div>
                        </div>
                    )}

                    {task.labels?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {task.labels.map(labelId => (
                                <div key={labelId} className="px-1.5 py-0.5 rounded-md bg-theme/10 border border-theme/20 text-[7px] font-black uppercase text-theme">
                                    {labelId}
                                </div>
                            ))}
                        </div>
                    )}

                    <footer className="pt-2 flex items-center justify-between border-t border-subtle">
                        <div className="flex items-center -space-x-2 overflow-hidden">
                            {(task.assignees?.length > 0 ? task.assignees : (task.assignee ? [task.assignee] : [])).map((assignee, idx) => (
                                <div key={assignee._id || idx} className="relative group/avatar">
                                    <div className="w-6 h-6 rounded-lg overflow-hidden bg-sunken border-2 border-surface shadow-sm transition-transform group-hover/avatar:-translate-y-1">
                                        {assignee.avatar ? (
                                            <img 
                                                src={getOptimizedAvatar(assignee.avatar, 'xs')} 
                                                alt={assignee.name} 
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-theme">
                                                {assignee.name?.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-[8px] text-white rounded opacity-0 group-hover/avatar:opacity-100 pointer-events-none whitespace-nowrap z-20">
                                        {assignee.name}
                                    </div>
                                </div>
                            ))}
                            {(task.assignees?.length === 0 && !task.assignee) && (
                                <div className="flex items-center gap-2 opacity-30">
                                    <UserIcon className="w-3 h-3 text-tertiary" />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-tertiary opacity-40">
                             <div className="flex items-center gap-1">
                                <MessageSquare className="w-2.5 h-2.5" />
                                <span className="text-[8px] font-black">
                                    {task.commentsCount || 0}
                                </span>
                            </div>
                             <div className="flex items-center gap-1">
                                <CheckSquare className="w-2.5 h-2.5" />
                                <span className="text-[8px] font-black">
                                    {task.subtasks?.filter(s => s.completed).length || 0}/{task.subtasks?.length || 0}
                                </span>
                            </div>
                        </div>
                    </footer>
                </div>
            </Card>
        </motion.div>
    );
});

TaskCard.displayName = 'TaskCard';

export default TaskCard;
