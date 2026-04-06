import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Minus, Plus, Maximize2, User as UserIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { getOptimizedAvatar } from '../../../utils/avatar';

/**
 * high-fidelity Timeline / Roadmap View
 */
const TimelineView = ({ tasks, onOpenTask }) => {
    const [zoom, setZoom] = useState(1); // Hours multiplier
    const roadmapTasks = useMemo(() => {
        return tasks.filter(t => t.startDate && t.dueDate).sort((a,b) => new Date(a.startDate) - new Date(b.startDate));
    }, [tasks]);

    const timelineRange = useMemo(() => {
        if (roadmapTasks.length === 0) return { start: new Date(), end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) };
        const start = new Date(roadmapTasks[0].startDate);
        const end = new Date(Math.max(...roadmapTasks.map(t => new Date(t.dueDate))));
        start.setDate(start.getDate() - 2);
        end.setDate(end.getDate() + 5);
        return { start, end };
    }, [roadmapTasks]);

    const totalDays = Math.ceil((timelineRange.end - timelineRange.start) / (24 * 60 * 60 * 1000));
    const dayWidth = 100 * zoom;

    return (
        <div className="bg-sunken/20 border border-white/[0.03] rounded-[3rem] p-8 shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col">
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-theme/10 border border-theme/20 flex items-center justify-center shadow-lg shadow-theme/5">
                        <Activity className="w-6 h-6 text-theme" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Roadmap Timeline</h2>
                        <p className="text-[10px] font-black text-theme tracking-[0.4em] uppercase opacity-60">Project Roadmap</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                        <button onClick={() => setZoom(Math.max(0.5, zoom - 0.2))} className="p-2 hover:bg-white/5 rounded-lg transition-all text-gray-500 hover:text-white"><Minus className="w-4 h-4" /></button>
                        <span className="text-[9px] font-black text-gray-500 uppercase px-2">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(Math.min(2, zoom + 0.2))} className="p-2 hover:bg-white/5 rounded-lg transition-all text-gray-500 hover:text-white"><Plus className="w-4 h-4" /></button>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-theme/10 border border-theme/20 rounded-xl text-[10px] font-black text-theme uppercase tracking-widest hover:bg-theme hover:text-white transition-all">
                        <Maximize2 className="w-4 h-4" />
                        <span>Center View</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-x-auto custom-scrollbar pb-6">
                <div style={{ width: totalDays * dayWidth }} className="relative min-h-[500px]">
                    {/* Header: Dates */}
                    <div className="flex border-b border-white/5 mb-8">
                        {Array.from({ length: totalDays }).map((_, i) => {
                            const date = new Date(timelineRange.start.getTime() + i * 24 * 60 * 60 * 1000);
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                            return (
                                <div key={i} style={{ width: dayWidth }} className={clsx("shrink-0 py-4 text-center border-r border-white/[0.02]", isWeekend && "bg-white/[0.01]")}>
                                    <span className="text-[8px] font-black text-tertiary uppercase tracking-widest block mb-1">{date.toLocaleDateString([], { weekday: 'short' })}</span>
                                    <span className="text-sm font-black text-primary font-mono">{date.getDate()}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Vertical Lines */}
                    <div className="absolute inset-0 pointer-events-none flex" style={{ top: 60 }}>
                        {Array.from({ length: totalDays }).map((_, i) => (
                            <div key={i} style={{ width: dayWidth }} className="shrink-0 h-full border-r border-white/[0.02]" />
                        ))}
                    </div>

                    {/* Today Line */}
                    {new Date() >= timelineRange.start && new Date() <= timelineRange.end && (
                        <div 
                            className="absolute top-0 bottom-0 w-px bg-theme shadow-[0_0_15px_rgba(var(--theme-rgb),1)] z-20"
                            style={{ left: ((new Date() - timelineRange.start) / (24 * 60 * 60 * 1000)) * dayWidth }}
                        >
                            <div className="bg-theme text-white text-[8px] font-black px-2 py-0.5 rounded-full absolute -top-2 -translate-x-1/2 uppercase tracking-widest">Today</div>
                        </div>
                    )}

                    {/* Tasks */}
                    <div className="space-y-4 pt-4 relative z-10">
                        {roadmapTasks.map((task, idx) => {
                            const startOffset = (new Date(task.startDate) - timelineRange.start) / (24 * 60 * 60 * 1000);
                            const duration = (new Date(task.dueDate) - new Date(task.startDate)) / (24 * 60 * 60 * 1000);
                            const priorityColor = task.priority === 'Urgent' ? 'rgba(239, 68, 68, 0.4)' : (task.priority === 'High' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(var(--theme-rgb), 0.4)');
                            
                            return (
                                <motion.div 
                                    key={task._id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    style={{ 
                                        left: startOffset * dayWidth, 
                                        width: Math.max(dayWidth * 0.5, duration * dayWidth),
                                        backgroundColor: priorityColor,
                                        borderColor: priorityColor.replace('0.4', '0.6')
                                    }}
                                    onClick={() => onOpenTask(task)}
                                    className="relative h-14 rounded-2xl border-2 p-3 group cursor-pointer hover:scale-[1.02] hover:z-20 transition-all flex flex-col justify-center shadow-2xl backdrop-blur-md overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/[0.05] to-transparent pointer-events-none" />
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center shrink-0 border border-white/10 group-hover:border-theme/40 transition-all">
                                            {task.assignees?.[0]?.avatar ? (
                                                <img src={getOptimizedAvatar(task.assignees[0].avatar, 'xs')} className="w-full h-full object-cover" alt="avatar" />
                                            ) : <UserIcon className="w-4 h-4 text-theme/60" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-white truncate leading-none mb-1">{task.title}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[7px] font-black text-white/40 uppercase tracking-widest">{task.status}</span>
                                                <span className="text-[7px] font-black text-theme uppercase tracking-widest font-mono">{Math.round(duration)} Days</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Subtasks Progress Bar inside Timeline Bar */}
                                    {task.subtasks?.length > 0 && (
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                                            <div 
                                                className="h-full bg-white/30" 
                                                style={{ width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%` }} 
                                            />
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimelineView;
