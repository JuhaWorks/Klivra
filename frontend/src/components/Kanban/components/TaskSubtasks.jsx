import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

const TaskSubtasks = ({ subtasks, setSubtasks, isAuthorized }) => {
    const [newSubtask, setNewSubtask] = useState('');

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

    const progress = (subtasks && subtasks.length > 0) 
        ? Math.round((subtasks.filter(s => s.completed).length / subtasks.length) * 100) 
        : 0;

    return (
        <div className="space-y-4">
            <div className="space-y-1.5 px-1.5">
                <div className="flex justify-between items-end">
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.3em]">Subtasks</label>
                    <span className="text-[8px] font-black text-theme uppercase tracking-widest bg-theme/10 px-1.5 py-0.5 rounded-full">
                        {progress}% Complete
                    </span>
                </div>
                <div className="h-0.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
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
    );
};

export default TaskSubtasks;
