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
        <div className="space-y-4 p-1">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 text-theme/60" />
                    <span className="text-[9px] font-black text-tertiary/60 uppercase tracking-[0.3em]">Execution Flow</span>
                </div>
                <div className="flex items-center gap-1.5">
                    {blockedBy.length > 0 && blockedBy.every(id => availableTasks.find(t => t._id === id)?.status === 'Completed') && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span className="text-[7px] font-black uppercase tracking-widest">Pathway Clear</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex px-1">
                <div className="flex items-center gap-2 w-full">
                    {[
                        { id: 'blockedBy', label: 'Blocked By', count: blockedBy.length, icon: AlertCircle, color: 'text-rose-400' },
                        { id: 'blocking', label: 'Blocking', count: blocking.length, icon: Link2, color: 'text-amber-400' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => { setDepTab(tab.id); setDepSearchQuery(''); }}
                            className={twMerge(clsx(
                                'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border',
                                depTab === tab.id ? 'bg-theme/10 border-theme/30 text-primary' : 'bg-transparent border-glass text-tertiary/40 hover:text-tertiary'
                            ))}
                        >
                            <tab.icon className={twMerge(clsx('w-3 h-3', depTab === tab.id ? tab.color : ''))} />
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={twMerge(clsx(
                                    'px-1.5 py-0.5 rounded-full text-[7px] font-black border',
                                    depTab === tab.id ? 'bg-theme text-white border-theme shadow-md' : 'bg-sunken text-tertiary border-glass'
                                ))}>{tab.count}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-1">
                <div className="relative group border-b border-glass transition-all focus-within:border-theme/40">
                    <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tertiary group-focus-within:text-theme transition-colors" />
                    <input
                        type="text"
                        value={depSearchQuery}
                        onChange={(e) => setDepSearchQuery(e.target.value)}
                        placeholder={`Find ${depTab === 'blockedBy' ? 'blockers' : 'dependents'}...`}
                        className="w-full bg-transparent pl-6 pr-8 py-2 text-[10px] font-black text-primary uppercase tracking-widest outline-none placeholder:text-tertiary/20 transition-all"
                    />
                    {depSearchQuery && (
                        <button type="button" onClick={() => setDepSearchQuery('')} className="absolute right-0 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary transition-colors">
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>

                <AnimatePresence>
                    {depSearchQuery.trim().length > 0 && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute z-50 w-full left-0 mt-2 border border-glass rounded-[2rem] bg-base/95 shadow-elevation-heavy overflow-hidden backdrop-blur-3xl max-h-[150px] overflow-y-auto custom-scrollbar">
                            {filteredAvailable.length === 0 ? (
                                <p className="text-[8px] font-black text-tertiary/40 uppercase text-center py-6 tracking-widest italic">No match found</p>
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
                                        className="w-full flex items-center gap-4 px-5 py-3 hover:bg-theme/5 transition-all border-b border-glass last:border-0 text-left group/res"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-primary group-hover/res:text-theme truncate uppercase">{t.title}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[7px] font-black uppercase text-tertiary/40">{t.status}</span>
                                            </div>
                                        </div>
                                        <Plus className="w-4 h-4 text-theme opacity-0 group-hover/res:opacity-100 shrink-0" />
                                    </button>
                                ))
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="px-1 pb-2 space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                {(depTab === 'blockedBy' ? blockedBy : blocking).map(id => {
                    const t = availableTasks.find(x => x._id === id);
                    const isResolved = t?.status === 'Completed';
                    return (
                        <motion.div key={id} layout className="flex items-center gap-4 py-2 px-1 group/dep transition-all">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${isResolved ? 'bg-emerald-500' : 'bg-theme animate-pulse shadow-theme-glow'}`} />
                            <div className="flex-1 min-w-0">
                                <p className={twMerge(clsx('text-[11px] font-black uppercase tracking-tight truncate', isResolved ? 'text-tertiary/40 line-through' : 'text-primary'))}>
                                    {t?.title || `Task ${id.slice(-6)}`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => depTab === 'blockedBy' ? setBlockedBy(prev => prev.filter(x => x !== id)) : setBlocking(prev => prev.filter(x => x !== id))}
                                className="p-1.5 rounded-lg text-tertiary/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover/dep:opacity-100 shrink-0"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default TaskDependencies;
