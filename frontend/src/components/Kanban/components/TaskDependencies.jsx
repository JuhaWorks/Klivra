import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, AlertCircle, CheckCircle2, Search, X, Plus } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

const TaskDependencies = ({ 
    blockedBy, setBlockedBy, 
    blocking, setBlocking, 
    availableTasks, 
    currentTaskId,
    isNew 
}) => {
    const [depTab, setDepTab] = useState('blockedBy');
    const [depSearchQuery, setDepSearchQuery] = useState('');

    const filteredAvailable = availableTasks.filter(t => {
        const currentList = depTab === 'blockedBy' ? blockedBy : blocking;
        const otherList = depTab === 'blockedBy' ? blocking : blockedBy;
        
        return (
            t.title.toLowerCase().includes(depSearchQuery.toLowerCase()) &&
            !currentList.includes(t._id) &&
            t._id !== currentTaskId &&
            !otherList.includes(t._id)
        );
    });

    const isActuallyBlocked = blockedBy.some(id => {
        const t = availableTasks.find(x => x._id === id);
        return t && t.status !== 'Completed';
    });

    return (
        <div className="space-y-3 rounded-2xl overflow-hidden border border-white/5 bg-white/[0.01]">
            <div className="flex items-center justify-between px-4 pt-4">
                <div className="flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 text-theme/60" />
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em]">Dependencies</span>
                </div>
                <div className="flex items-center gap-1.5">
                    {blockedBy.length > 0 && blockedBy.every(id => availableTasks.find(t => t._id === id)?.status === 'Completed') && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span className="text-[7px] font-black uppercase tracking-widest">All Clear</span>
                        </div>
                    )}
                    {isActuallyBlocked && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 animate-pulse">
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span className="text-[7px] font-black uppercase tracking-widest">{blockedBy.length} Blocker{blockedBy.length > 1 ? 's' : ''}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex px-4">
                <div className="flex items-center gap-0.5 bg-black/30 p-0.5 rounded-lg border border-white/5 w-full">
                    {[
                        { id: 'blockedBy', label: 'Blocked By', count: blockedBy.length, icon: AlertCircle, color: 'text-rose-400' },
                        { id: 'blocking', label: 'Blocking', count: blocking.length, icon: Link2, color: 'text-amber-400' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => { setDepTab(tab.id); setDepSearchQuery(''); }}
                            className={twMerge(clsx(
                                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all',
                                depTab === tab.id ? 'bg-white/8 text-white shadow-sm' : 'text-gray-600 hover:text-gray-400'
                            ))}
                        >
                            <tab.icon className={twMerge(clsx('w-2.5 h-2.5', depTab === tab.id ? tab.color : ''))} />
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={twMerge(clsx(
                                    'px-1 py-0 rounded text-[7px] font-black',
                                    depTab === tab.id ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-600'
                                ))}>{tab.count}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600 group-focus-within:text-theme transition-colors" />
                    <input
                        type="text"
                        value={depSearchQuery}
                        onChange={(e) => setDepSearchQuery(e.target.value)}
                        placeholder={depTab === 'blockedBy' ? 'Search tasks that block this...' : 'Search tasks this blocks...'}
                        className="w-full bg-white/5 border border-white/5 focus:border-theme/40 rounded-xl pl-8 pr-8 py-2 text-[9px] font-bold text-white outline-none placeholder:text-gray-700 transition-all"
                    />
                    {depSearchQuery && (
                        <button type="button" onClick={() => setDepSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {depSearchQuery.trim().length > 0 && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="mt-1 border border-white/8 rounded-xl bg-black/70 shadow-2xl overflow-hidden backdrop-blur-xl max-h-[150px] overflow-y-auto custom-scrollbar z-50 relative">
                            {filteredAvailable.length === 0 ? (
                                <p className="text-[8px] font-black text-gray-700 uppercase text-center py-4 tracking-widest italic">No matching tasks</p>
                            ) : (
                                filteredAvailable.map(t => (
                                    <button
                                        key={t._id}
                                        type="button"
                                        onClick={() => {
                                            if (depTab === 'blockedBy') setBlockedBy(prev => [...prev, t._id]);
                                            else setBlocking(prev => [...prev, t._id]);
                                            setDepSearchQuery('');
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-theme/10 transition-all border-b border-white/5 last:border-0 text-left group/res"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-white/80 group-hover/res:text-white truncate">{t.title}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[7px] font-black uppercase text-gray-500">{t.status}</span>
                                            </div>
                                        </div>
                                        <Plus className="w-3 h-3 text-theme opacity-0 group-hover/res:opacity-100 shrink-0" />
                                    </button>
                                ))
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="px-4 pb-4 space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                {(depTab === 'blockedBy' ? blockedBy : blocking).map(id => {
                    const t = availableTasks.find(x => x._id === id);
                    const isResolved = t?.status === 'Completed';
                    return (
                        <motion.div key={id} layout className="flex items-center gap-3 p-3 rounded-xl border bg-white/3 border-white/8 group/dep">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${isResolved ? 'bg-emerald-500' : 'bg-theme animate-pulse'}`} />
                            <div className="flex-1 min-w-0">
                                <p className={twMerge(clsx('text-[10px] font-black truncate', isResolved ? 'text-emerald-400 line-through opacity-60' : 'text-white/90'))}>
                                    {t?.title || `Task ${id.slice(-6)}`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => depTab === 'blockedBy' ? setBlockedBy(prev => prev.filter(x => x !== id)) : setBlocking(prev => prev.filter(x => x !== id))}
                                className="p-1 rounded-lg text-gray-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover/dep:opacity-100 shrink-0"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default TaskDependencies;
