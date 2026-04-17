import React, { useState, useEffect, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Activity, ShieldAlert, Clock, X, 
    ChevronRight, Filter, Zap, Layout
} from 'lucide-react';
import { useAuthStore, api } from '../../../store/useAuthStore';
import { useSocketStore } from '../../../store/useSocketStore';
import { useQuery } from '@tanstack/react-query';
import { cn } from '../../../utils/cn';
import Card from '../../ui/Card';
import { renderActivityNarrative } from '../../../utils/activityNarrative';

/**
 * Tactical Intelligence Center - Modular Edition
 * Phase 1: Modularize logic and support Dual-Mode (Fixed / Popover)
 */

const ActivitySkeleton = ({ delay = 0 }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }} className="flex items-center gap-4 p-3 rounded-2xl">
        <div className="w-10 h-10 rounded-xl bg-shimmer animate-pulse" />
        <div className="flex-1 space-y-2">
            <div className="h-3 bg-shimmer rounded-full animate-pulse w-3/4" />
            <div className="h-2 bg-shimmer rounded-full animate-pulse w-1/2" />
        </div>
    </motion.div>
);

const IntelligenceWidget = ({ fixed = false }) => {
    const { user } = useAuthStore();
    const { socket } = useSocketStore();
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    
    // Internalized Intelligence States
    const [liveActivity, setLiveActivity] = useState([]);
    const [feedFilter, setFeedFilter] = useState('All');
    const [intelMode, setIntelMode] = useState('workspace');

    // Socket Listener
    useEffect(() => {
        if (!socket) return;
        const handleRealTimeActivity = (event) => setLiveActivity(prev => [event, ...prev].slice(0, 50));
        socket.on('workspace_activity', handleRealTimeActivity);
        return () => socket.off('workspace_activity', handleRealTimeActivity);
    }, [socket]);

    // Data Fetching
    const { data: actRes, isLoading: actLoading } = useQuery({
        queryKey: ['activityFeed'],
        queryFn: async ({ signal }) => (await api.get('/audit?limit=50', { signal })).data,
        staleTime: 1000 * 60 * 5,
        enabled: !!user,
    });

    const initialActivity = actRes?.data || [];
    const activity = useMemo(() => {
        const combined = [...liveActivity, ...initialActivity];
        const unique = Array.from(new Map(combined.map(item => [item._id, item])).values());
        let filtered = unique.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (intelMode === 'personal' && user?._id) {
            filtered = filtered.filter(a => (a.user?._id || a.user) === user._id);
        }

        if (feedFilter === 'Tasks') {
            filtered = filtered.filter(a => a.entityType === 'Task' || a.action?.startsWith('TASK_'));
        } else if (feedFilter === 'Security') {
            filtered = filtered.filter(a => 
                a.entityType === 'Security' || 
                a.action?.includes('BANNED') || 
                a.action?.includes('LOGIN') || 
                a.action?.includes('ROLE') ||
                a.action?.includes('MAINTENANCE') ||
                a.action?.includes('IP_')
            );
        } else if (feedFilter === 'Projects') {
            filtered = filtered.filter(a => a.entityType === 'Project' || a.action?.startsWith('PROJECT_'));
        }
        
        return filtered;
    }, [liveActivity, initialActivity, feedFilter, intelMode, user?._id]);

    const FeedContent = (
        <div className="flex flex-col h-full bg-surface/5 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden border border-glass/5 shadow-panel">
            {/* Header Area */}
            <div className="px-5 py-4 flex flex-col gap-4 bg-surface/5 border-b border-glass/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-theme" />
                        <h3 className="text-[11px] font-black text-primary tracking-tight uppercase">Intelligence</h3>
                    </div>
                    {/* Mode Toggle */}
                    <div className="flex border border-glass/10 rounded-lg p-0.5 bg-sunken/40">
                        {['WORKSPACE', 'PERSONAL'].map(m => (
                            <button key={m} onClick={() => setIntelMode(m.toLowerCase())}
                                className={cn("px-2 py-1 rounded text-[7px] font-black uppercase transition-all",
                                    intelMode === m.toLowerCase() ? "bg-theme text-primary" : "text-tertiary")}>
                                {m.charAt(0)}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Category Filters */}
                <div className="flex items-center gap-1 justify-between">
                    {['All', 'Tasks', 'Security'].map(f => (
                        <button key={f} onClick={() => setFeedFilter(f)}
                            className={cn("px-2 py-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all",
                                feedFilter === f ? "bg-theme/10 text-theme" : "text-tertiary hover:text-primary whitespace-nowrap")}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* List Area */}
            <div className={cn("overflow-y-auto custom-scrollbar p-3 space-y-1.5", fixed ? "h-[480px]" : "flex-1")}>
                {actLoading ? (
                    <div className="space-y-1.5">{[...Array(6)].map((_, i) => <ActivitySkeleton key={i} delay={i * 0.1} />)}</div>
                ) : activity.length > 0 ? (
                    <div className="space-y-1.5">
                        {activity.map((a, i) => (
                            <motion.div key={a._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.01 }}
                                className="group flex flex-col p-2 rounded-xl bg-surface/10 hover:bg-surface/20 transition-all cursor-default border border-transparent hover:border-glass/5">
                                <div className="flex items-center gap-2 mb-1.5">
                                    {a.details?.projectName && (
                                        <span className="shrink-0 px-1 py-0.5 rounded bg-theme/10 text-theme font-black text-[6px] uppercase border border-theme/20">
                                            {a.details.projectName.slice(0, 8)}
                                        </span>
                                    )}
                                    <p className="text-[7px] font-bold text-tertiary uppercase opacity-30 truncate">
                                        {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div className="flex items-start gap-2 min-w-0">
                                    <div className="w-5 h-5 rounded bg-sunken border border-glass/10 flex items-center justify-center font-black text-[7px] text-theme shrink-0">
                                        {a.user?.name?.charAt(0) || 'S'}
                                    </div>
                                    <p className="text-[10px] text-secondary font-medium leading-tight line-clamp-2">
                                        {renderActivityNarrative(a)}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                        <Activity size={30} className="mb-2" />
                        <p className="text-[8px] font-black uppercase tracking-widest">No Signals</p>
                    </div>
                )}
            </div>
            
            {!fixed && (
                <div className="p-4 border-t border-glass/5 bg-sunken/20">
                    <button onClick={() => setIsPopoverOpen(false)} className="w-full py-2 rounded-xl bg-surface/10 hover:bg-theme text-primary text-[8px] font-black uppercase tracking-widest transition-all">
                        Close Tactical Interface
                    </button>
                </div>
            )}
        </div>
    );

    if (fixed) return <div className="w-full h-full">{FeedContent}</div>;

    const popoverContent = (
        <AnimatePresence>
            {isPopoverOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 sm:justify-end sm:items-start sm:pt-24 sm:pr-24">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setIsPopoverOpen(false)}
                        className="absolute inset-0 bg-black/40 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95, x: 20 }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10, x: 10 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                        className="relative z-10 w-full max-w-[360px] h-[600px] shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                    >
                        {FeedContent}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return (
        <div className="relative w-full">
            <motion.button
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                className={cn(
                    "relative flex items-center justify-between px-2 py-3 transition-all duration-500 w-full group",
                    isPopoverOpen ? "text-theme" : "text-tertiary hover:text-primary"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-all bg-theme/5">
                        <Activity className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-left">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] leading-none">Intelligence</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <ChevronRight className={cn("w-4 h-4 transition-transform duration-500", isPopoverOpen ? "rotate-90" : "opacity-40 group-hover:translate-x-1 group-hover:opacity-100")} />
                </div>
            </motion.button>
            {createPortal(popoverContent, document.body)}
        </div>
    );
};

export default memo(IntelligenceWidget);
