import React, { useState, useEffect, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Globe, Clock, Search, RefreshCcw, X, 
    ChevronRight, MapPin, Sun, Moon, Zap, 
    ArrowUpRight, Users
} from 'lucide-react';
import { useAuthStore, api } from '../../../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { cn } from '../../../utils/cn';
import GlassSurface from '../../ui/GlassSurface';
import { getOptimizedAvatar } from '../../../utils/avatar';

/**
 * Modern 2026 Team Widget - Quick View Edition
 * Optimized for Sidebar | Portal-based Floating Card | High Density
 */

const Skeleton = ({ className = '' }) => (
    <div className={`bg-black/[0.04] dark:bg-white/[0.05] rounded-lg animate-pulse ${className}`} />
);

const GlobalClockWidget = () => {
    const { user } = useAuthStore();
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedProjectId, setSelectedProjectId] = useState('global');

    // 1. Fetch team location data
    const { data: queryData, isFetching } = useQuery({
        queryKey: ['team-times', selectedProjectId],
        queryFn: () => api.get(`/tools/team-times${selectedProjectId !== 'global' ? `?projectId=${selectedProjectId}` : ''}`).then(res => res.data),
        staleTime: 1000 * 60 * 15, // 15min stale
        refetchOnWindowFocus: false,
    });

    // 2. Fetch accessible projects for filtering
    const { data: projectsData } = useQuery({
        queryKey: ['projects-minimal'],
        queryFn: () => api.get('/projects?limit=50&activeOnly=true').then(res => res.data),
        staleTime: 1000 * 60 * 30,
    });

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const teamTimes = queryData?.data || [];
    const projects = projectsData?.data || [];

    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const getLocalTime = (offsetInSeconds) => {
        const utc = currentTime.getTime() + (currentTime.getTimezoneOffset() * 60000);
        return new Date(utc + (offsetInSeconds * 1000));
    };

    const getRelativeOffset = (offset) => {
        const userOffset = user?.timezoneOffset || 0;
        const diff = (offset - userOffset) / 3600;
        if (diff === 0) return 'Local';
        return `${diff > 0 ? '+' : ''}${diff}h`;
    };

    const popoverContent = (
        <AnimatePresence>
            {isPopoverOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 sm:justify-end sm:items-start sm:pt-24 sm:pr-24">
                    {/* Subtle Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        onClick={() => setIsPopoverOpen(false)}
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm sm:backdrop-blur-none"
                    />

                    {/* Floating Quick View Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95, x: 20 }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10, x: 10 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                        className="relative z-10 w-full max-w-[340px] max-h-[500px] overflow-hidden rounded-[2rem] border border-white/10 bg-elevated shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col"
                    >
                        <div className="absolute inset-0 z-0">
                            <GlassSurface width="100%" height="100%" borderRadius={32} backgroundOpacity={0.3} blur={40} />
                        </div>

                        <div className="relative z-10 flex flex-col h-full overflow-hidden">
                            {/* Compact Header */}
                            <div className="p-5 pb-3 flex items-center justify-between border-b border-glass">
                                <div className="flex items-center gap-3">
                                    <Globe className="w-4 h-4 text-theme" />
                                    <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Team Nodes</h3>
                                </div>
                                <button 
                                    onClick={() => setIsPopoverOpen(false)}
                                    className="p-1.5 rounded-lg bg-sunken border border-glass hover:text-rose-500 transition-all"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Filters - Ultra Compact */}
                            <div className="px-5 py-3 space-y-3 bg-sunken/30">
                                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                                    <button onClick={() => setSelectedProjectId('global')}
                                        className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                                            selectedProjectId === 'global' ? "bg-theme text-primary shadow-lg" : "bg-sunken border border-glass text-tertiary")}>
                                        Global
                                    </button>
                                    {projects.slice(0, 3).map(p => (
                                        <button key={p._id} onClick={() => setSelectedProjectId(p._id)}
                                            className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                                                selectedProjectId === p._id ? "bg-theme text-primary shadow-lg" : "bg-sunken border border-glass text-tertiary")}>
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-disabled" />
                                    <input 
                                        type="text"
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-sunken/50 border border-glass rounded-xl pl-8 pr-3 py-1.5 text-[10px] text-primary outline-none focus:border-theme/40 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Location Feed - Compressed */}
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
                                {isFetching ? (
                                    <div className="space-y-2">
                                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
                                    </div>
                                ) : teamTimes.length === 0 ? (
                                    <p className="text-[9px] font-bold text-tertiary/40 uppercase text-center py-10 tracking-widest">No Signals</p>
                                ) : (
                                    teamTimes.map((loc, idx) => {
                                        const localTime = getLocalTime(loc.offset);
                                        const hours = localTime.getHours();
                                        const isDay = hours >= 6 && hours < 18;
                                        const [timePart, meridiem] = formatTime(localTime).split(' ');

                                        return (
                                            <div key={`${loc.city}-${idx}`} className="p-3 rounded-2xl bg-sunken/40 border border-glass flex items-center justify-between group">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {isDay ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-indigo-400" />}
                                                    <div className="truncate">
                                                        <p className="text-[11px] font-black text-primary uppercase leading-tight truncate">{loc.city}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[8px] font-bold text-tertiary uppercase tracking-widest opacity-60">
                                                                {getRelativeOffset(loc.offset)}
                                                            </span>
                                                            <div className="flex -space-x-1.5">
                                                                {loc.teammates?.slice(0, 3).map(tm => (
                                                                    <div key={tm._id} className="w-4 h-4 rounded-full border border-base bg-sunken overflow-hidden">
                                                                        <img src={getOptimizedAvatar(tm.avatar)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                                    </div>
                                                                ))}
                                                                {(loc.teammates?.length || 0) > 3 && (
                                                                    <div className="w-4 h-4 rounded-full border border-base bg-surface flex items-center justify-center text-[5px] font-black">
                                                                        +{loc.teammates.length - 3}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <div className="flex items-baseline gap-0.5">
                                                        <span className="text-[13px] font-black text-primary tabular-nums">{timePart}</span>
                                                        <span className="text-[8px] font-bold text-tertiary uppercase">{meridiem}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
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
                    isPopoverOpen 
                        ? "text-theme" 
                        : "text-tertiary hover:text-primary"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-all bg-theme/5">
                        <Globe className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-left">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] leading-none">World</p>
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

export default memo(GlobalClockWidget);