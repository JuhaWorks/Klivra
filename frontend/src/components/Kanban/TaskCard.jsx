import React, { useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
    Layers,
    Calendar,
    MessageSquare,
    CheckSquare,
    AlertCircle,
    ChevronDown,
    CheckCircle2,
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { getOptimizedAvatar } from '../../utils/avatar';

/* ─────────────────────────────────────────────
   Priority system — dark-mode native
───────────────────────────────────────────── */
const PRIORITY = {
    Urgent: {
        dot: '#ef4444',
        stripe: 'linear-gradient(90deg, #ef4444, #f87171)',
        badge: 'bg-red-500/10 border-red-500/20 text-red-400',
        glow: 'rgba(239,68,68,0.12)',
    },
    High: {
        dot: '#f59e0b',
        stripe: 'linear-gradient(90deg, #f59e0b, #fcd34d)',
        badge: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        glow: 'rgba(245,158,11,0.08)',
    },
    Medium: {
        dot: '#3b82f6',
        stripe: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
        badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        glow: 'rgba(59,130,246,0.08)',
    },
    Low: {
        dot: '#3f3f46',
        stripe: '#27272a',
        badge: 'bg-white/[0.03] border-white/[0.07] text-zinc-500',
        glow: 'transparent',
    },
};

/* ─────────────────────────────────────────────
   Pill badge
───────────────────────────────────────────── */
function Pill({ icon: Icon, children, className }) {
    return (
        <span className={twMerge(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-medium tracking-wide whitespace-nowrap',
            className
        )}>
            {Icon && <Icon className="w-2.5 h-2.5 shrink-0" />}
            {children}
        </span>
    );
}

/* ─────────────────────────────────────────────
   Avatar stack
───────────────────────────────────────────── */
function AvatarStack({ assignees = [], compact = false }) {
    const shown = assignees.slice(0, compact ? 2 : 4);
    const extra = assignees.length - shown.length;
    const size = compact ? 'w-5 h-5 text-[6px]' : 'w-6 h-6 text-[8px]';

    return (
        <div className="flex items-center -space-x-1.5">
            {shown.map((a, i) => (
                <div
                    key={a._id || i}
                    style={{ zIndex: shown.length - i }}
                    className={twMerge(
                        'relative rounded-full ring-[1.5px] ring-[#141416] overflow-hidden shrink-0 bg-zinc-800',
                        size
                    )}
                >
                    {a.avatar
                        ? <img src={getOptimizedAvatar(a.avatar, 'xs')} alt={a.name} className="w-full h-full object-cover" />
                        : <span className={twMerge('w-full h-full flex items-center justify-center font-semibold text-zinc-400', size)}>
                            {a.name?.charAt(0)?.toUpperCase()}
                        </span>
                    }
                </div>
            ))}
            {extra > 0 && (
                <div className={twMerge(
                    'rounded-full ring-[1.5px] ring-[#141416] bg-zinc-800 flex items-center justify-center font-semibold text-zinc-500 shrink-0',
                    size
                )}>
                    +{extra}
                </div>
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────
   Subtask row
───────────────────────────────────────────── */
function SubtaskRow({ sub, taskId, onToggle }) {
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onToggle?.(taskId, sub.id); }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/[0.03] transition-colors group/sub"
        >
            <div className={twMerge(
                'w-3.5 h-3.5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all duration-150',
                sub.completed
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-zinc-700 group-hover/sub:border-zinc-500'
            )}>
                {sub.completed && <CheckCircle2 className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />}
            </div>
            <span className={twMerge(
                'text-[10px] font-medium text-left flex-1 truncate transition-colors',
                sub.completed ? 'text-zinc-600 line-through' : 'text-zinc-400 group-hover/sub:text-zinc-200'
            )}>
                {sub.title}
            </span>
        </button>
    );
}

/* ─────────────────────────────────────────────
   TaskCard
───────────────────────────────────────────── */
const TaskCard = React.memo(({
    task,
    isSelected,
    isBlocked,
    onDragStart,
    onOpen,
    onSelect,
    onToggleSubtask,
    isCompact = false,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const lastX = useRef(0);
    const velX = useMotionValue(0);
    const dragY = useMotionValue(0);

    const rotY = useTransform(velX, [-600, 0, 600], [-12, 0, 12]);
    const rotX = useTransform(dragY, [-200, 0, 200], [5, 0, -5]);
    const rotYS = useSpring(rotY, { stiffness: 300, damping: 30 });

    const P = PRIORITY[task.priority] || PRIORITY.Low;

    const isDueToday = task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString();
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed';

    const completedSubs = task.subtasks?.filter(s => s.completed).length ?? 0;
    const totalSubs = task.subtasks?.length ?? 0;
    const subtaskPct = totalSubs > 0 ? (completedSubs / totalSubs) * 100 : 0;

    const assignees = task.assignees?.length ? task.assignees : task.assignee ? [task.assignee] : [];
    const dateLabel = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })
        : null;

    const handleDragStart = (e) => {
        lastX.current = e.clientX;
        onDragStart?.(e, task._id, task.status);
    };
    const handleDrag = (e) => {
        if (!e.clientX) return;
        velX.set((e.clientX - lastX.current) * 14);
        lastX.current = e.clientX;
        dragY.set(e.clientY);
    };
    const handleDragEnd = () => { velX.set(0); dragY.set(0); };

    const handleClick = (e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) onSelect?.(e, task._id);
        else onOpen?.(task);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, zIndex: isSelected ? 30 : 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -6, filter: 'blur(1px)' }}
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            whileHover={{
                y: isCompact ? -5 : -4,
                scale: isCompact ? 1.02 : 1.012,
                zIndex: 100,
                transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
            }}
            whileTap={{ scale: 0.975, transition: { duration: 0.08 } }}
            style={{ rotateY: rotYS, rotateX: rotX, perspective: 1200, transformStyle: 'preserve-3d' }}
            draggable
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            className={twMerge(clsx(
                'group relative cursor-pointer select-none w-full',
                isSelected && 'z-20'
            ))}
        >
            {/* Hover glow */}
            <div
                aria-hidden
                className="absolute -inset-px rounded-[17px] opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                style={{ boxShadow: `0 0 24px 4px ${P.glow}` }}
            />

            {/* Card shell */}
            <div className={twMerge(clsx(
                'relative overflow-hidden',
                'bg-[#141416] border',
                'transition-all duration-200',
                isSelected
                    ? 'border-blue-500/40 shadow-[0_0_0_1px_rgba(59,130,246,0.2)]'
                    : 'border-white/[0.07] group-hover:border-white/[0.13]',
                isBlocked && 'opacity-50 grayscale-[0.4]',
                isCompact ? 'rounded-2xl max-h-[160px] min-h-[160px]' : 'rounded-[17px]',
            ))}>

                {/* Priority stripe */}
                <div className="h-[1.5px] w-full" style={{ background: P.stripe }} />

                <div className={twMerge(clsx(
                    'flex flex-col',
                    isCompact ? 'gap-2 p-2.5' : 'gap-3 p-3.5'
                ))}>

                    {/* Title row */}
                    <div className="flex items-start gap-2.5">
                        <div
                            className="mt-[5px] w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: P.dot }}
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={twMerge(clsx(
                                    'font-semibold leading-snug text-zinc-100 tracking-[-0.01em]',
                                    'group-hover:text-white transition-colors duration-150',
                                    isCompact ? 'text-[11.5px]' : 'text-[13px]'
                                ))}>
                                    {task.title}
                                </h4>
                                {isBlocked && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[8px] font-semibold text-red-400 tracking-wide shrink-0">
                                        <AlertCircle className="w-2.5 h-2.5" />
                                        blocked
                                    </span>
                                )}
                            </div>
                            {task.description && !isCompact && (
                                <p className="mt-1 text-[10px] text-zinc-600 leading-relaxed line-clamp-2">
                                    {task.description}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Badges */}
                    <div className={twMerge(clsx('flex flex-wrap items-center gap-1.5', isCompact && 'gap-1'))}>
                        {task.priority && (
                            <Pill icon={Layers} className={P.badge}>{task.priority}</Pill>
                        )}
                        {task.type && task.type !== 'Task' && (
                            <Pill className="bg-white/[0.03] border-white/[0.07] text-zinc-500">{task.type}</Pill>
                        )}
                        {dateLabel && (
                            <Pill
                                icon={Calendar}
                                className={clsx(
                                    isDueToday ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                        isOverdue ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                            'bg-white/[0.03] border-white/[0.07] text-zinc-500'
                                )}
                            >
                                {dateLabel}
                            </Pill>
                        )}
                        {task.labels?.slice(0, 2).map(id => (
                            <Pill key={id} className="bg-indigo-500/10 border-indigo-500/20 text-indigo-400">{id}</Pill>
                        ))}
                        {(task.labels?.length ?? 0) > 2 && (
                            <Pill className="bg-white/[0.03] border-white/[0.07] text-zinc-600">+{task.labels.length - 2}</Pill>
                        )}
                    </div>

                    {/* Subtasks */}
                    {totalSubs > 0 && !isCompact && (
                        <div className="space-y-1.5">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(v => !v); }}
                                className="w-full flex items-center justify-between group/hd"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-semibold text-zinc-600 uppercase tracking-[0.12em]">
                                        Subtasks
                                    </span>
                                    <span className="text-[9px] font-semibold text-zinc-500 tabular-nums">
                                        {completedSubs}/{totalSubs}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[9px] text-zinc-600 tabular-nums">{Math.round(subtaskPct)}%</span>
                                    <ChevronDown className={twMerge(clsx(
                                        'w-3 h-3 text-zinc-600 transition-transform duration-200 group-hover/hd:text-zinc-400',
                                        isExpanded && 'rotate-180'
                                    ))} />
                                </div>
                            </button>

                            <div className="h-[2px] w-full bg-white/[0.05] rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${subtaskPct}%` }}
                                    transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.05 }}
                                    className={subtaskPct === 100
                                        ? 'h-full bg-emerald-500 rounded-full'
                                        : 'h-full bg-blue-500 rounded-full'}
                                />
                            </div>

                            <AnimatePresence initial={false}>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-1 rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden divide-y divide-white/[0.04]">
                                            {task.subtasks.map(sub => (
                                                <SubtaskRow key={sub.id} sub={sub} taskId={task._id} onToggle={onToggleSubtask} />
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Compact progress strip */}
                    {totalSubs > 0 && isCompact && subtaskPct > 0 && (
                        <div className="h-[2px] w-full bg-white/[0.05] rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${subtaskPct}%` }}
                                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                                className={subtaskPct === 100
                                    ? 'h-full bg-emerald-500 rounded-full'
                                    : 'h-full bg-blue-500 rounded-full'}
                            />
                        </div>
                    )}

                    {/* Footer */}
                    <footer className="flex items-center justify-between pt-2.5 border-t border-white/[0.05]">
                        <AvatarStack assignees={assignees} compact={isCompact} />

                        <div className="flex items-center gap-3 text-zinc-700">
                            {!isCompact && (task.commentsCount ?? 0) > 0 && (
                                <span className="flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" strokeWidth={1.5} />
                                    <span className="text-[9px] font-medium tabular-nums">{task.commentsCount}</span>
                                </span>
                            )}
                            {!isCompact && totalSubs > 0 && (
                                <span className="flex items-center gap-1">
                                    <CheckSquare className="w-3 h-3" strokeWidth={1.5} />
                                    <span className="text-[9px] font-medium tabular-nums">{completedSubs}/{totalSubs}</span>
                                </span>
                            )}
                            {isCompact && subtaskPct > 0 && (
                                <span className="text-[8px] font-semibold tabular-nums">{Math.round(subtaskPct)}%</span>
                            )}
                        </div>
                    </footer>
                </div>
            </div>
        </motion.div>
    );
});

TaskCard.displayName = 'TaskCard';
export default TaskCard;