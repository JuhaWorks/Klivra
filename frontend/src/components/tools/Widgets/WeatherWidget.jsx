import React, { useState, useEffect, useMemo, memo } from 'react';
import { useAuthStore, api } from '../../../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import {
    Cloud, Wind, Droplets, MapPin, RefreshCcw,
    AlertCircle, Navigation, Sunrise, Sunset, Gauge
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../ui/BaseUI';
import { cn } from '../../../utils/cn';
import { motion } from 'framer-motion';

const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse bg-black/[0.04] dark:bg-white/[0.06] rounded-lg ${className}`} />
);

const MiniMetric = ({ icon: Icon, label, value, unit }) => (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
        <Icon className="w-3 h-3 text-tertiary opacity-40" strokeWidth={2} />
        <div className="flex items-baseline gap-0.5 min-w-0">
            <span className="text-[11px] font-black text-primary tabular-nums tracking-tighter truncate">{value}</span>
            <span className="text-[7px] font-bold text-tertiary uppercase truncate">{unit}</span>
        </div>
    </div>
);

const WeatherWidget = () => {
    const { user } = useAuthStore();
    const [coords, setCoords] = useState(null);
    const [isLocating, setIsLocating] = useState(false);

    const manualLocation = user?.location;

    useEffect(() => {
        if (!manualLocation && !coords) {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                    setIsLocating(false);
                },
                () => setIsLocating(false),
                { timeout: 8000 }
            );
        }
    }, [manualLocation, coords]);

    const { data: weather, isLoading, isError, refetch, isFetching } = useQuery({
        queryKey: ['weather', manualLocation || coords],
        queryFn: async () => {
            const params = manualLocation
                ? { city: manualLocation }
                : { lat: coords.lat, lon: coords.lon };
            const res = await api.get('/tools/weather', { params });
            return res.data.data;
        },
        enabled: !!(manualLocation || coords),
        staleTime: 15 * 60 * 1000,
    });

    const rangeBarWidth = useMemo(() => {
        if (!weather) return 50;
        const range = (weather.tempMax - weather.tempMin) || 1;
        const pct = ((weather.temp - weather.tempMin) / range) * 100;
        return Math.min(100, Math.max(0, Math.round(pct)));
    }, [weather]);

    if (isLocating) {
        return (
            <Card variant="glass" compact className="flex flex-col items-center justify-center p-8 text-center min-h-[140px]">
                <Navigation className="w-4 h-4 text-theme animate-pulse mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-tertiary">Locating Node…</p>
            </Card>
        );
    }

    if (!manualLocation && !coords) {
        return (
            <Card variant="glass" compact className="flex flex-col items-center justify-center p-8 text-center min-h-[140px]">
                <MapPin className="w-4 h-4 text-tertiary opacity-30 mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Location Required</p>
                <Link to="/profile" className="text-[8px] font-black uppercase tracking-widest text-theme hover:underline">Configure Pulse</Link>
            </Card>
        );
    }

    if (isLoading || !weather) {
        return (
            <Card variant="glass" compact className="space-y-4 min-h-[180px]">
                <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-6">
                    <Skeleton className="h-12 w-16" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-2 w-full" />
                        <Skeleton className="h-2 w-2/3" />
                    </div>
                </div>
            </Card>
        );
    }

    if (isError) {
        return (
            <Card variant="glass" compact className="flex flex-col items-center justify-center p-8 text-center min-h-[140px] border-danger/20">
                <AlertCircle className="w-4 h-4 text-danger opacity-60 mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-danger">Signal Lost</p>
                <button onClick={() => refetch()} className="mt-2 text-[8px] font-black uppercase tracking-widest text-theme">Retry</button>
            </Card>
        );
    }

    return (
        <div className="flex flex-col w-full h-full">
            {/* Ultra-Compact Header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-glass">
                <div className="flex items-center gap-3">
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-[11px] font-black text-primary uppercase tracking-tight">{weather.city}</span>
                        <span className="text-[9px] font-bold text-tertiary uppercase tracking-widest opacity-40">{weather.country}</span>
                    </div>
                </div>
                <button onClick={() => refetch()} className="group">
                    <RefreshCcw className={cn("w-3 h-3 text-tertiary opacity-30 group-hover:opacity-100 transition-all", isFetching && "animate-spin text-theme opacity-100")} />
                </button>
            </div>

            {/* Core Temp Row */}
            <div className="px-5 py-6 flex items-center justify-between gap-6">
                <div className="flex-1">
                    <div className="flex items-baseline gap-1 leading-none mb-1">
                        <span className="text-4xl font-black text-primary tracking-tighter tabular-nums">{Math.round(weather.temp)}</span>
                        <span className="text-[10px] font-black text-tertiary uppercase opacity-40">°C</span>
                    </div>
                    <div className="flex items-center gap-2 max-w-[120px]">
                        <span className="text-[9px] font-black text-tertiary min-w-4 tabular-nums">{Math.round(weather.tempMin)}°</span>
                        <div className="flex-1 h-[3px] bg-sunken rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${rangeBarWidth}%` }} className="h-full bg-theme/40" />
                        </div>
                        <span className="text-[9px] font-black text-tertiary min-w-4 tabular-nums">{Math.round(weather.tempMax)}°</span>
                    </div>
                </div>
                
                <div className="flex flex-col items-end text-right shrink-0">
                    <img 
                        src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} 
                        alt="" 
                        width={48}
                        height={48}
                        className="w-12 h-12 object-contain drop-shadow-md"
                    />
                    <p className="text-[9px] font-black text-theme uppercase tracking-widest mt-[-8px]">{weather.description}</p>
                </div>
            </div>

            {/* Micro Metrics - Single Row */}
            <div className="px-5 py-4 border-t border-glass flex items-center justify-between gap-4">
                <MiniMetric icon={Wind} label="Wind" value={weather.windSpeed.toFixed(1)} unit="m/s" />
                <div className="w-px h-6 bg-glass" />
                <MiniMetric icon={Droplets} label="Humidity" value={weather.humidity} unit="%" />
                <div className="w-px h-6 bg-glass" />
                <MiniMetric icon={Gauge} label="Pressure" value={weather.pressure} unit="HPA" />
                <div className="w-px h-6 bg-glass" />
                <MiniMetric icon={Cloud} label="Cloud" value={weather.cloudiness} unit="%" />
            </div>

            {/* Footer - Minimalist Signals */}
            <div className="px-5 py-3 flex items-center justify-between text-[8px] font-black text-tertiary uppercase tracking-[0.2em] opacity-30">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <Sunrise size={10} strokeWidth={3} />
                        <span>{new Date(weather.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Sunset size={10} strokeWidth={3} />
                        <span>{new Date(weather.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                    </div>
                </div>
                <span>Forensic Pulse Sync</span>
            </div>
        </div>
    );
};

export default memo(WeatherWidget);