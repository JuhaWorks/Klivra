import React, { useState, useEffect } from 'react';
import { Globe, Clock, Sun, Moon, RefreshCcw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, api } from '../../../store/useAuthStore';
import { cn } from '../../../utils/cn';
import { getOptimizedAvatar } from '../../../utils/avatar';

const Skeleton = ({ className = '' }) => (
    <div className={`bg-black/[0.04] dark:bg-white/[0.05] rounded-lg animate-pulse ${className}`} />
);

const GlobalClockWidget = () => {
    const { user, updateProfile } = useAuthStore();
    const queryClient = useQueryClient();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isLocating, setIsLocating] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState('global');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch projects for the selector
    const { data: projectsRes } = useQuery({
        queryKey: ['projects', 'minimal'],
        queryFn: async () => (await api.get('/projects')).data,
        staleTime: 1000 * 60 * 5,
    });
    const projects = projectsRes?.data || [];

    const { data: teamTimes, isLoading, refetch, isFetching, isError, error: queryError } = useQuery({
        queryKey: ['team-times', selectedProjectId],
        queryFn: async () => {
            const params = selectedProjectId !== 'global' ? { projectId: selectedProjectId } : {};
            const res = await api.get('/tools/team-times', { params });
            if (!res.data?.data) throw new Error('Malformed API response');
            return res.data.data;
        },
        refetchInterval: 1000 * 60 * 5,
        retry: 2
    });

    useEffect(() => {
        const autoDetect = async () => {
            const needsSync = user && !user.location && !isLocating;
            if (needsSync) {
                setIsLocating(true);
                const geoOptions = { timeout: 4000, enableHighAccuracy: false };
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        try {
                            const { latitude: lat, longitude: lon } = pos.coords;
                            const geoRes = await api.get('/tools/reverse-geocode', { params: { lat, lon } });
                            if (geoRes.data?.data?.name) {
                                await updateProfile({ 
                                    location: geoRes.data.data.name,
                                    lat,
                                    lon 
                                });
                                queryClient.invalidateQueries({ queryKey: ['team-times'] });
                            }
                        } catch (err) {
                            console.error('[CLOCK] Sync error:', err.message);
                        } finally {
                            setIsLocating(false);
                        }
                    },
                    (err) => {
                        console.warn('[CLOCK] Geolocation denied or failed:', err.message);
                        setIsLocating(false);
                    },
                    geoOptions
                );
            }
        };
        autoDetect();
    }, [user?.location, user?.timezoneOffset, queryClient, updateProfile, isLocating]);

    const getLocalTime = (offsetInSeconds) => {
        const utc = currentTime.getTime() + (currentTime.getTimezoneOffset() * 60000);
        return new Date(utc + (offsetInSeconds * 1000));
    };

    const getRelativeOffset = (offsetInSeconds) => {
        const myOffset = -new Date().getTimezoneOffset() * 60;
        const diff = (offsetInSeconds - myOffset) / 3600;
        if (diff === 0) return 'Your time';
        return diff > 0 ? `+${diff}h` : `${diff}h`;
    };

    const formatTime = (date) =>
        date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    const formatDay = (date) =>
        date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

    const cardBase = "bg-surface border border-glass rounded-2xl overflow-hidden transition-all duration-300";

    const getUserStatusColor = (status) => {
        switch (status) {
            case 'Online': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
            case 'Away': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]';
            case 'Do Not Disturb': return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]';
            default: return 'bg-tertiary opacity-40';
        }
    };

    if (isLoading || isLocating) {
        return (
            <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-tertiary opacity-60" strokeWidth={1.8} />
                        <span className="text-[11px] text-tertiary uppercase tracking-widest font-black">Team Pulse</span>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className={cardBase}>
                            <div className="p-5 flex flex-col gap-5">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <Skeleton className="w-20 h-3" />
                                        <Skeleton className="w-12 h-3" />
                                    </div>
                                    <Skeleton className="w-7 h-7 rounded-lg" />
                                </div>
                                <div className="h-8 w-2/3 bg-sunken animate-pulse rounded-lg" />
                                <div className="flex justify-between items-center pt-3 border-t border-glass">
                                    <Skeleton className="w-16 h-3" />
                                    <div className="flex -space-x-1.5">
                                        {[...Array(3)].map((_, j) => <Skeleton key={j} className="w-5 h-5 rounded-full" />)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section className="mb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-theme/10 border border-theme/20 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-theme" />
                    </div>
                    <div>
                        <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.3em]">Team Intelligence</h3>
                        <p className="text-[9px] text-tertiary font-bold uppercase tracking-widest opacity-40">Temporal Sync Network</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Project Selector */}
                    <div className="relative group">
                        <select 
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="appearance-none bg-sunken border border-glass rounded-xl px-4 py-2 pr-10 text-[10px] font-black uppercase tracking-widest text-secondary hover:text-primary hover:border-theme/30 transition-all outline-none cursor-pointer min-w-[160px]"
                        >
                            <option value="global">Global Workspace</option>
                            {projects.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                            <Clock className="w-3 h-3 text-tertiary" />
                        </div>
                    </div>

                    <button
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className={cn(
                            "w-9 h-9 flex items-center justify-center rounded-xl bg-sunken border border-glass hover:bg-theme/5 hover:border-theme/20 transition-all group active:scale-90",
                            isFetching && "opacity-50"
                        )}
                    >
                        <RefreshCcw
                            className={cn("w-4 h-4 text-tertiary group-hover:text-theme transition-colors", isFetching && "animate-spin")}
                            strokeWidth={2}
                        />
                    </button>
                </div>
            </div>

            {isError || !teamTimes || teamTimes.length === 0 ? (
                <div className={cn(cardBase, "p-12 flex flex-col items-center justify-center text-center bg-sunken/30")}>
                    <Globe className="w-12 h-12 text-tertiary mb-6 opacity-20" />
                    <p className="text-sm font-black text-primary uppercase tracking-widest uppercase">No temporal signals detected</p>
                    <p className="text-[10px] text-tertiary mt-3 max-w-xs leading-relaxed uppercase tracking-widest opacity-60">
                        {isError ? `Sync Error: ${queryError.message}` : "Ensure teammates have joined a project and shared their location data."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {teamTimes.map((location, idx) => {
                        const localTime = getLocalTime(location.offset);
                        const hours = localTime.getHours();
                        const isWorkingHours = hours >= 9 && hours < 18;
                        const isDay = hours >= 6 && hours < 18;
                        const relativeOffset = getRelativeOffset(location.offset);
                        const [timePart, meridiem] = formatTime(localTime).split(' ');

                        return (
                            <div key={`${location.city}-${idx}`} className={cn(cardBase, "hover:shadow-2xl hover:shadow-theme/5 group")}>
                                <div className="p-6 flex flex-col gap-6">

                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h4 className="text-[13px] font-black text-primary truncate tracking-tight uppercase">
                                                {location.city}
                                            </h4>
                                            <span className="text-[9px] font-black text-tertiary uppercase tracking-widest opacity-40">
                                                {relativeOffset} • {location.timezoneName}
                                            </span>
                                        </div>
                                        <div className="w-9 h-9 rounded-xl bg-sunken border border-glass flex items-center justify-center shrink-0 shadow-inner group-hover:border-theme/20 transition-colors">
                                            {isDay
                                                ? <Sun className="w-4 h-4 text-amber-500 animate-pulse" strokeWidth={2} />
                                                : <Moon className="w-4 h-4 text-indigo-400" strokeWidth={2} />
                                            }
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-baseline gap-2 leading-none">
                                            <span className="text-4xl font-black text-primary tabular-nums tracking-tighter">
                                                {timePart}
                                            </span>
                                            <span className="text-xs text-tertiary font-black uppercase tracking-widest pb-1 opacity-60">
                                                {meridiem}
                                            </span>
                                        </div>
                                        <div className="text-[10px] font-black text-tertiary uppercase tracking-[0.2em] mt-2 opacity-30">
                                            {formatDay(localTime)}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-glass flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full transition-all duration-500",
                                                isWorkingHours ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-tertiary opacity-30"
                                            )} />
                                            <span className="text-[10px] font-black text-tertiary uppercase tracking-widest opacity-60">
                                                {isWorkingHours ? 'Working' : 'After hours'}
                                            </span>
                                        </div>

                                        {location.teammates?.length > 0 && (
                                            <div className="flex -space-x-2 shrink-0">
                                                {location.teammates.slice(0, 3).map((tm, i) => (
                                                    <div
                                                        key={i}
                                                        title={`${tm.name} (${tm.status})`}
                                                        className="relative"
                                                    >
                                                        <div className="w-7 h-7 rounded-xl overflow-hidden border-2 border-base shadow-lg transition-transform hover:-translate-y-1 hover:z-10">
                                                            <img src={getOptimizedAvatar(tm.avatar)} alt={tm.name} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className={cn(
                                                            "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-base",
                                                            getUserStatusColor(tm.status)
                                                        )} />
                                                    </div>
                                                ))}
                                                {location.teammates.length > 3 && (
                                                    <div className="w-7 h-7 rounded-xl bg-sunken border border-glass flex items-center justify-center text-[9px] font-black text-tertiary shadow-lg">
                                                        +{location.teammates.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default GlobalClockWidget;