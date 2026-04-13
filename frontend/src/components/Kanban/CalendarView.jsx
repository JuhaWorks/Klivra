import React, { useState, useMemo } from 'react';
import { CalendarCheck2, ChevronLeft, ChevronRight, BellRing } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Premium Upgrade: Infinite Calendar View
 * Featuring Ghost Days, Framer Motion animations, and High-Fidelity Glassmorphism.
 */
const CalendarView = ({ tasks, onOpenTask }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [direction, setDirection] = useState(0); // For transition animation

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const nextMonth = () => {
        setDirection(1);
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setDirection(-1);
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToToday = () => {
        const now = new Date();
        if (now.getMonth() === currentDate.getMonth() && now.getFullYear() === currentDate.getFullYear()) return;
        setDirection(now > currentDate ? 1 : -1);
        setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    };

    // Advanced Matrix Calculation (Ghost Days)
    const calendarMatrix = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        
        const matrix = [];

        // Previous month days (Ghost)
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            matrix.push({
                day: daysInPrevMonth - i,
                month: month === 0 ? 11 : month - 1,
                year: month === 0 ? year - 1 : year,
                isGhost: true
            });
        }

        // Current month days
        for (let i = 1; i <= daysInCurrentMonth; i++) {
            matrix.push({
                day: i,
                month,
                year,
                isGhost: false
            });
        }

        // Next month days (Ghost)
        const remainingSlots = 42 - matrix.length; // Always show 6 rows
        for (let i = 1; i <= remainingSlots; i++) {
            matrix.push({
                day: i,
                month: month === 11 ? 0 : month + 1,
                year: month === 11 ? year + 1 : year,
                isGhost: true
            });
        }

        return matrix;
    }, [currentDate]);

    // Pre-calculate tasks by date string for O(1) loop lookup (O(N) total)
    const tasksByDate = useMemo(() => {
        const map = {};
        tasks.forEach(task => {
            if (!task.dueDate) return;
            const d = new Date(task.dueDate);
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (!map[key]) map[key] = [];
            map[key].push(task);
        });
        return map;
    }, [tasks]);

    const getTasksForDate = (d, m, y) => {
        return tasksByDate[`${y}-${m}-${d}`] || [];
    };

    const isToday = (d, m, y) => {
        const now = new Date();
        return now.getDate() === d && now.getMonth() === m && now.getFullYear() === y;
    };

    // Animation Variants
    const variants = {
        enter: (direction) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0,
            filter: 'blur(10px)'
        }),
        center: {
            x: 0,
            opacity: 1,
            filter: 'blur(0px)'
        },
        exit: (direction) => ({
            x: direction < 0 ? 50 : -50,
            opacity: 0,
            filter: 'blur(10px)'
        })
    };

    return (
        <div className="relative bg-sunken/10 border border-white/[0.03] rounded-[3.5rem] p-10 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] backdrop-blur-3xl overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-theme/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-theme/5 rounded-full blur-[100px] pointer-events-none" />

            <header className="relative z-10 flex items-center justify-between mb-12">
                <div className="flex items-center gap-6">
                    <motion.div 
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-theme/20 to-transparent border border-theme/30 flex items-center justify-center shadow-2xl shadow-theme/10"
                    >
                        <CalendarCheck2 className="w-8 h-8 text-theme" />
                    </motion.div>
                    <div>
                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.h2 
                                key={currentDate.getMonth()}
                                custom={direction}
                                variants={variants}
                                initial="enter"
                                animate="center"
                                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                                className="text-4xl font-black text-white tracking-tighter uppercase mb-0.5"
                            >
                                {monthNames[currentDate.getMonth()]}
                            </motion.h2>
                        </AnimatePresence>
                        <div className="flex items-center gap-3">
                            <span className="text-[12px] font-black text-theme tracking-[0.4em] uppercase opacity-70">
                                {currentDate.getFullYear()}
                            </span>
                            <div className="h-0.5 w-12 bg-white/5 rounded-full" />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-black/40 p-2 rounded-[2rem] border border-white/5 backdrop-blur-md">
                    <button 
                        onClick={prevMonth} 
                        className="p-3 hover:bg-white/5 rounded-2xl transition-all text-gray-500 hover:text-white border border-transparent hover:border-white/10"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button 
                        onClick={goToToday} 
                        className="px-6 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all bg-white/[0.02] hover:bg-white/[0.06] rounded-xl border border-white/5"
                    >
                        Today
                    </button>
                    <button 
                        onClick={nextMonth} 
                        className="p-3 hover:bg-white/5 rounded-2xl transition-all text-gray-500 hover:text-white border border-transparent hover:border-white/10"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </header>

            <div className="relative z-10">
                <div className="grid grid-cols-7 gap-4 mb-6">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, index) => (
                        <div key={d} className="text-center">
                            <span className="text-[10px] font-black text-tertiary uppercase tracking-[0.3em] opacity-40">{d}</span>
                        </div>
                    ))}
                </div>

                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div 
                        key={currentDate.getTime()}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                        className="grid grid-cols-7 gap-4"
                    >
                        {calendarMatrix.map((item, idx) => {
                            const dateTasks = getTasksForDate(item.day, item.month, item.year);
                            const today = isToday(item.day, item.month, item.year);
                            
                            return (
                                <div 
                                    key={idx} 
                                    className={twMerge(clsx(
                                        "min-h-[160px] p-4 rounded-[2.5rem] border transition-all duration-500 group relative overflow-hidden",
                                        item.isGhost ? "bg-white/[0.01] border-transparent opacity-20 grayscale" : "bg-white/[0.03] border-white/5 hover:border-theme/40 hover:bg-white/[0.06] shadow-xl",
                                        today && "border-theme bg-theme/[0.08] shadow-[inset_0_0_40px_rgba(var(--theme-rgb),0.1)] outline outline-1 outline-theme/20"
                                    ))}
                                >
                                    {/* Glass Highlight */}
                                    <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none" />

                                    <div className="relative z-10 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className={clsx(
                                                "text-2xl font-black font-mono tracking-tighter transition-all duration-500",
                                                today ? "text-theme scale-110" : "text-gray-600 group-hover:text-white group-hover:translate-x-1"
                                            )}>
                                                {item.day}
                                            </span>
                                            {dateTasks.length > 0 && (
                                                <div className="flex -space-x-1">
                                                    {dateTasks.slice(0, 3).map((t, i) => (
                                                        <div 
                                                            key={i} 
                                                            className={clsx(
                                                                "w-2 h-2 rounded-full border border-black shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                                                                t.priority === 'Urgent' ? 'bg-danger shadow-danger/50' : (t.priority === 'High' ? 'bg-warning shadow-warning/50' : 'bg-theme shadow-theme/50')
                                                            )} 
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            {dateTasks.slice(0, 3).map(task => (
                                                <motion.button 
                                                    key={task._id} 
                                                    whileHover={{ x: 4, scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => onOpenTask(task)}
                                                    className="w-full text-left p-2.5 rounded-2xl bg-black/40 border border-white/5 hover:border-theme/30 transition-all flex flex-col gap-1 backdrop-blur-xl group/card shadow-lg"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">{task.type}</span>
                                                        {task.priority === 'Urgent' && <BellRing className="w-2 h-2 text-danger animate-pulse" />}
                                                    </div>
                                                    <p className="text-[10px] font-bold text-white leading-tight line-clamp-2 group-hover/card:text-theme transition-colors">{task.title}</p>
                                                </motion.button>
                                            ))}
                                            {dateTasks.length > 3 && (
                                                <div className="text-center py-1.5 bg-theme/5 rounded-xl border border-theme/10 group-hover:bg-theme group-hover:border-theme transition-all duration-500">
                                                    <span className="text-[8px] font-black text-theme group-hover:text-white uppercase tracking-widest">+ {dateTasks.length - 3} Tasks</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Today Indicator Glow */}
                                    {today && (
                                        <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-theme/20 blur-2xl rounded-full" />
                                    )}
                                </div>
                            );
                        })}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default CalendarView;
