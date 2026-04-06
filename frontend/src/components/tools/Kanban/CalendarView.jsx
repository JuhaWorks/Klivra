import React, { useState, useMemo } from 'react';
import { CalendarCheck2, ChevronLeft, ChevronRight } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

/**
 * high-fidelity Calendar View
 */
const CalendarView = ({ tasks, onOpenTask }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const calendarDays = useMemo(() => {
        const days = [];
        const total = daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= total; i++) days.push(i);
        return days;
    }, [currentDate, firstDay]);

    const getTasksByDay = (day) => {
        if (!day) return [];
        return tasks.filter(t => {
            if (!t.dueDate) return false;
            const d = new Date(t.dueDate);
            return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
        });
    };

    return (
        <div className="bg-sunken/20 border border-white/[0.03] rounded-[3rem] p-8 shadow-2xl backdrop-blur-xl">
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-theme/10 border border-theme/20 flex items-center justify-center shadow-lg shadow-theme/5">
                        <CalendarCheck2 className="w-6 h-6 text-theme" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tighter uppercase">{monthNames[currentDate.getMonth()]}</h2>
                        <p className="text-[10px] font-black text-theme tracking-[0.4em] uppercase opacity-60">{currentDate.getFullYear()}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                    <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-500 hover:text-white">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-all">Today</button>
                    <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-500 hover:text-white">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-7 gap-3 mb-4">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                    <div key={d} className="text-center text-[10px] font-black text-tertiary uppercase tracking-widest py-2 bg-white/[0.02] rounded-lg border border-white/5">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-3">
                {calendarDays.map((day, idx) => {
                    const dayTasks = getTasksByDay(day);
                    const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
                    
                    return (
                        <div key={idx} className={twMerge(clsx(
                            "min-h-[140px] p-3 rounded-2xl border transition-all duration-300 group",
                            day ? "bg-black/20 border-white/5 hover:border-theme/40 hover:bg-black/30" : "bg-transparent border-transparent",
                            isToday && "border-theme bg-theme/[0.03] shadow-inner shadow-theme/10"
                        ))}>
                            {day && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className={clsx("text-lg font-black font-mono leading-none", isToday ? "text-theme" : "text-gray-700 group-hover:text-white/40 transition-colors")}>{day}</span>
                                        {dayTasks.length > 0 && <span className="w-2 h-2 rounded-full bg-theme shadow-lg shadow-theme animate-pulse" />}
                                    </div>
                                    <div className="space-y-1.5">
                                        {dayTasks.slice(0, 3).map(task => (
                                            <button 
                                                key={task._id} 
                                                onClick={() => onOpenTask(task)}
                                                className="w-full text-left p-2 rounded-lg bg-white/[0.03] border border-white/5 hover:border-theme/30 hover:bg-white/[0.06] transition-all"
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className={clsx("w-1.5 h-1.5 rounded-full", task.priority === 'Urgent' ? 'bg-danger' : (task.priority === 'High' ? 'bg-warning' : 'bg-theme'))} />
                                                    <span className="text-[8px] font-black text-white/50 uppercase tracking-widest">{task.type}</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-white truncate leading-tight">{task.title}</p>
                                            </button>
                                        ))}
                                        {dayTasks.length > 3 && (
                                            <p className="text-[8px] font-black text-theme uppercase tracking-widest text-center py-1 bg-theme/5 rounded border border-theme/10">+ {dayTasks.length - 3} More Tasks</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;
