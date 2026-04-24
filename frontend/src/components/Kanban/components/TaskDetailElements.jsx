import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Activity, Clock, Search, CheckCircle2, MessageSquare, ShieldCheck, 
    Link2, AlertCircle, X, Plus, Trash2, ChevronDown, Target, Cpu, Briefcase, Zap 
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

// Project imports
import { api } from '../../../store/useAuthStore';
import { useSocketStore } from '../../../store/useSocketStore';
import { renderActivityNarrative } from '../../../utils/activityNarrative';
import { cn } from '../../../utils/cn';
import { getOptimizedAvatar } from '../../../utils/avatar';
import MentionInput from '../../ui/MentionInput';
import { TASK_STATUSES, TASK_PRIORITIES, TASK_COHORTS, UI_LABELS } from '../../../constants';

// --- TaskActivity Component ---
export const TaskActivity = ({ taskId, projectId }) => {
    const queryClient = useQueryClient();
    const { socket } = useSocketStore();

    const { data: actRes, isLoading } = useQuery({
        queryKey: ['taskActivity', taskId],
        queryFn: async () => (await api.get(`/tasks/${taskId}/activity`)).data,
        enabled: !!taskId,
        staleTime: 1000 * 60
    });

    useEffect(() => {
        if (!socket || !projectId || !taskId) return;

        const handleProjectActivity = (payload) => {
            if (payload.entityId === taskId || (typeof payload.entityId === 'object' && payload.entityId?._id === taskId)) {
                queryClient.invalidateQueries(['taskActivity', taskId]);
            }
        };

        socket.on('project_activity', handleProjectActivity);
        return () => socket.off('project_activity', handleProjectActivity);
    }, [socket, taskId, projectId, queryClient]);

    const activities = actRes?.data || [];

    if (isLoading) {
        return (
            <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5" />
                        <div className="flex-1 space-y-2 py-1">
                            <div className="h-2 bg-white/5 rounded w-1/2" />
                            <div className="h-2 bg-white/5 rounded w-full" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="py-12 flex flex-col items-center justify-center text-center opacity-20">
                <Activity className="w-8 h-8 mb-4 text-tertiary" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-tertiary">{UI_LABELS.CHRONICLE_EMPTY}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 relative px-1">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-glass" />
            {activities.map((a, i) => (
                <motion.div 
                    key={a._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-5 group relative z-10"
                >
                    <div className="w-8 h-8 rounded-xl bg-sunken border border-glass flex items-center justify-center shrink-0 group-hover:border-theme/30 transition-colors">
                        {a.user?.avatar ? (
                            <img src={a.user.avatar} className="w-full h-full rounded-xl object-cover" alt="" />
                        ) : (
                            <span className="text-[10px] font-black text-theme">
                                {a.user?.name?.charAt(0) || 'S'}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center justify-between gap-4 mb-1.5">
                            <span className="text-[8px] font-black text-tertiary/40 uppercase tracking-widest">
                                {new Date(a.createdAt).toLocaleString([], { 
                                    month: 'short', day: 'numeric', 
                                    hour: '2-digit', minute: '2-digit' 
                                })}
                            </span>
                        </div>
                        <div className="text-[11px] font-black uppercase tracking-tight text-primary/80 group-hover:text-primary transition-colors">
                            {renderActivityNarrative(a)}
                        </div>
                        {a.action === 'EntityUpdate' && a.details?.details && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {a.details.details?.map((change, idx) => (
                                    <span key={idx} className="text-[7px] font-black px-2 py-0.5 bg-theme/5 border border-theme/10 rounded-lg text-theme/60 uppercase">
                                        {change}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

// --- TaskAssignees Component ---
export const TaskAssignees = ({ assigneeIds = [], setAssigneeIds, projectMembers = [], isAuthorized }) => {
    const [memberSearchQuery, setMemberSearchQuery] = useState('');

    const filteredMembers = useMemo(() => {
        const members = projectMembers || [];
        if (!memberSearchQuery.trim()) return members;
        const q = memberSearchQuery.toLowerCase();
        return members.filter(m => 
            m.userId?.name?.toLowerCase().includes(q) || 
            m.userId?.email?.toLowerCase().includes(q)
        );
    }, [projectMembers, memberSearchQuery]);

    return (
        <div className="space-y-4 p-1">
            <div className="space-y-3">
                <label className="text-[9px] font-black text-tertiary/60 uppercase tracking-[0.3em] ml-0.5 flex items-center justify-between">
                    <span>Assignees</span>
                    <span className="text-theme/40 lowercase font-mono">{(assigneeIds || []).length} members</span>
                </label>
                <div className="flex flex-col gap-4 transition-all overflow-hidden">
                    <div className="relative group shrink-0 py-1 border-b border-glass">
                        <div className="absolute left-0 top-1/2 -translate-y-1/2">
                            <Search className="w-3.5 h-3.5 text-tertiary group-focus-within:text-theme transition-colors z-10" />
                        </div>
                        <input 
                            type="text"
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            placeholder="Find teammates..."
                            className="w-full bg-transparent border-none pl-6 pr-3 py-2 text-[10px] font-black text-primary outline-none placeholder:text-tertiary/20 transition-all uppercase tracking-widest"
                        />
                    </div>
                    <div className="max-h-[140px] overflow-y-auto custom-scrollbar">
                        <div className="flex flex-wrap gap-3">
                            {filteredMembers.length === 0 ? (
                                <div className="w-full py-4 text-left">
                                    <p className="text-[8px] font-black text-tertiary/40 uppercase tracking-widest italic">No match found</p>
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
                                                setAssigneeIds(prev => isSelected 
                                                    ? prev.filter(id => id !== m.userId?._id) 
                                                    : [...prev, m.userId?._id]
                                                );
                                            }}
                                            className={twMerge(clsx(
                                                "relative w-8 h-8 rounded-xl overflow-hidden border transition-all active:scale-95 group/m",
                                                isSelected ? "border-theme shadow-lg shadow-theme/30 scale-110 z-10" : "border-glass opacity-40 hover:opacity-100 hover:border-theme/40"
                                            ))}
                                            title={m.userId?.name}
                                        >
                                            {m.userId?.avatar ? (
                                                <img src={getOptimizedAvatar(m.userId.avatar, 'xs')} alt={m.userId.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-sunken flex items-center justify-center text-[10px] font-black text-theme">
                                                    {m.userId?.name?.charAt(0)}
                                                </div>
                                            )}
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-theme/10 flex items-center justify-center backdrop-blur-[1px]">
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
        </div>
    );
};

// --- TaskComments Component ---
export const TaskComments = ({ 
    comments, 
    members,
    commentContent, 
    setCommentContent, 
    mentionedIds, 
    setMentionedIds, 
    handlePostComment,
    handleReaction,
    isNew 
}) => {
    if (isNew) return null;

    return (
        <div className="py-6 border-t border-glass space-y-6">
            <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-primary uppercase tracking-[0.4em] flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-theme" />
                    <span>Intelligence Loop ({comments.length})</span>
                </label>
            </div>
            <div className="space-y-6">
                <form onSubmit={handlePostComment} className="relative group px-1">
                    <MentionInput
                        value={commentContent}
                        onChange={(text) => setCommentContent(text)}
                        onMentionChange={setMentionedIds}
                        members={members}
                        placeholder="Add to the collective intelligence..."
                        className="min-h-[100px] bg-transparent border-glass focus:border-theme/40 transition-all rounded-2xl"
                    />
                    <div className="flex justify-end mt-3">
                        <button type="submit" disabled={!commentContent.trim()} className="px-8 py-2.5 bg-theme hover:bg-theme-highlight disabled:opacity-20 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-theme-slight active:scale-95">
                            Post Intel
                        </button>
                    </div>
                </form>
                <div className="space-y-6 pt-4 max-h-[400px] overflow-y-auto pr-3 custom-scrollbar px-1">
                    {comments.length === 0 ? (
                        <div className="py-12 text-center opacity-20">
                            <Clock className="w-8 h-8 text-tertiary mx-auto mb-4" />
                            <p className="text-[10px] font-black text-tertiary uppercase tracking-[0.4em]">{UI_LABELS.DISCUSSION_PENDING}</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {comments.map((comment, idx) => (
                                <motion.div 
                                    key={comment._id || idx} 
                                    initial={{ opacity: 0, x: -10 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    className="flex gap-5 group/comment transition-all py-1"
                                >
                                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-glass shrink-0 transition-transform group-hover/comment:scale-105">
                                        <img src={getOptimizedAvatar(comment.user?.avatar, 'sm')} alt={comment.user?.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[11px] font-black text-primary uppercase tracking-tight">{comment.user?.name}</span>
                                                {comment.user?.role === 'Manager' && <ShieldCheck className="w-3.5 h-3.5 text-theme" />}
                                                <span className="text-[8px] font-black text-tertiary/40 uppercase tracking-widest">{new Date(comment.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                        </div>
                                        <div className="text-[12px] text-primary/80 leading-relaxed max-w-none font-medium">
                                            {comment.content}
                                        </div>
                                        {/* Reactions */}
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {comment.reactions?.map(r => (
                                                <button 
                                                    key={r.emoji} 
                                                    onClick={() => handleReaction(comment._id, r.emoji)}
                                                    className="px-2.5 py-1.5 bg-sunken border border-glass rounded-xl text-xs hover:border-theme/30 transition-all flex items-center gap-2"
                                                >
                                                    <span>{r.emoji}</span>
                                                    <span className="text-[9px] font-black text-tertiary">{r.count || r.users?.length}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- TaskDependencies Component ---
export const TaskDependencies = ({ 
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
                        <p className="text-[8px] font-black text-tertiary/40 uppercase text-center py-6 tracking-widest italic">{UI_LABELS.NO_MATCH_FOUND}</p>
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

const ExecutiveSelect = ({ label, value, options, onChange, disabled, icon: Icon, isCohort = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="space-y-1.5" ref={containerRef}>
            {label && <label className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em] ml-1">{label}</label>}
            <div className="relative">
                <button
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className={`
                        w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all
                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/[0.04] active:scale-[0.98]'}
                        ${isOpen ? 'bg-white/[0.06] border-white/20 shadow-lg' : 'bg-white/[0.02] border-white/5'}
                    `}
                >
                    <div className="flex items-center gap-2.5">
                        {Icon && <Icon className="w-3.5 h-3.5 text-theme/60" />}
                        <span className="text-[10px] font-black text-white uppercase tracking-wider">{value}</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 4, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute z-[100] min-w-full w-max mt-2 bg-[#0c0c0e] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl"
                        >
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                                {isCohort ? (
                                    TASK_COHORTS.map(cohort => {
                                        const CohortIcon = { Strategic: Target, Engineering: Cpu, Sustainability: ShieldCheck, Operations: Briefcase }[cohort.id] || Zap;
                                        const colorClass = { Strategic: 'text-indigo-400', Engineering: 'text-emerald-400', Sustainability: 'text-rose-400', Operations: 'text-slate-400' }[cohort.id] || 'text-theme';
                                        
                                        return (
                                            <div key={cohort.id} className="space-y-1">
                                                <div className="flex items-center gap-2 px-3 py-2 mt-2 first:mt-0">
                                                    <CohortIcon className={`w-3 h-3 ${colorClass}`} />
                                                    <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${colorClass}`}>{cohort.label}</span>
                                                </div>
                                                {cohort.types.map(t => (
                                                    <button
                                                        key={t}
                                                        onClick={() => { onChange(t); setIsOpen(false); }}
                                                        className={`
                                                            w-full text-left px-7 py-2 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap
                                                            ${value === t ? 'bg-theme/20 text-theme' : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                                                        `}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    })
                                ) : (
                                    options.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => { onChange(opt); setIsOpen(false); }}
                                            className={`
                                                w-full text-left px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all whitespace-nowrap
                                                ${value === opt ? 'bg-theme/20 text-theme' : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                                            `}
                                        >
                                            {opt}
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

// --- TaskMetadata Component ---
export const TaskMetadata = ({ 
    status, setStatus, 
    priority, setPriority, 
    type, setType, 
    isAuthorized 
}) => {
    return (
        <div className="grid grid-cols-1 gap-6 p-1 overflow-visible">
            <div className="grid grid-cols-2 gap-4">
                <ExecutiveSelect 
                    label="Status"
                    value={status}
                    options={TASK_STATUSES}
                    onChange={setStatus}
                    disabled={!isAuthorized}
                    icon={Activity}
                />
                <ExecutiveSelect 
                    label="Priority"
                    value={priority}
                    options={TASK_PRIORITIES}
                    onChange={setPriority}
                    disabled={!isAuthorized}
                    icon={Zap}
                />
            </div>
            <ExecutiveSelect 
                label="Classification"
                value={type}
                onChange={setType}
                disabled={!isAuthorized}
                isCohort={true}
                icon={Target}
            />
        </div>
    );
};

// --- TaskSubtasks Component ---
export const TaskSubtasks = ({ subtasks, setSubtasks, isAuthorized }) => {
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
            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar px-1">
                <AnimatePresence mode="popLayout">
                    {subtasks.map(sub => (
                        <motion.div 
                            key={sub.id} 
                            layout
                            className="flex items-center gap-3 p-1.5 rounded-lg group transition-all"
                        >
                            <button 
                                onClick={() => isAuthorized && toggleSubtask(sub.id)}
                                className={twMerge(clsx(
                                    "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                    sub.completed ? "bg-theme border-theme text-white shadow-lg shadow-theme/30 scale-105" : "border-white/10 hover:border-theme/40"
                                ))}
                            >
                                {sub.completed && <CheckCircle2 className="w-2.5 h-2.5" />}
                            </button>
                            <span className={twMerge(clsx("flex-1 text-[11px] font-black uppercase tracking-tight", sub.completed ? "text-tertiary/40 line-through" : "text-primary"))}>
                                {sub.title}
                            </span>
                            {isAuthorized && (
                                <button onClick={() => removeSubtask(sub.id)} className="p-1 opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-500/10 rounded transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            {isAuthorized && (
                <form onSubmit={addSubtask} className="flex items-center gap-3 py-2 px-1 group transition-all">
                    <Plus className="w-4 h-4 text-theme/40 group-focus-within:text-theme transition-transform group-focus-within:rotate-90" />
                    <input 
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        placeholder="Add subtask..."
                        className="flex-1 bg-transparent border-none text-[11px] font-black uppercase tracking-widest text-primary outline-none placeholder:text-tertiary/20"
                    />
                </form>
            )}
        </div>
    );
};
