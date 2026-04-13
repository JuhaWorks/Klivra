import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore, api } from '../../../store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import {
    Cloud, Wind, Droplets, MapPin, RefreshCcw,
    AlertCircle, Navigation, Sunrise, Sunset, Gauge
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse bg-black/[0.04] dark:bg-white/[0.06] rounded-lg ${className}`} />
);

const MetricCard = ({ icon: Icon, label, value, unit }) => (
    <div className="bg-black/[0.03] dark:bg-white/[0.04] rounded-lg p-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
            <Icon className="w-[11px] h-[11px] text-black/30 dark:text-white/30 shrink-0" strokeWidth={1.8} />
            <span className="text-[11px] text-black/40 dark:text-white/40 tracking-wide truncate">{label}</span>
        </div>
        <div className="flex items-baseline gap-0.5">
            <span className="text-[15px] font-medium text-black dark:text-white tabular-nums leading-none">{value}</span>
            {unit && <span className="text-[11px] text-black/40 dark:text-white/40 ml-0.5">{unit}</span>}
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

    const formatTime = (ts) => {
        if (!ts) return '—';
        return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const cardBase = "bg-white dark:bg-black/80 border border-black/[0.08] dark:border-white/[0.08] rounded-2xl overflow-hidden max-w-sm";

    if (isLocating) {
        return (
            <div className={cardBase}>
                <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
                    <div className="w-10 h-10 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] flex items-center justify-center">
                        <Navigation className="w-[18px] h-[18px] text-black/30 dark:text-white/30 animate-pulse" strokeWidth={1.5} />
                    </div>
                    <p className="text-[13px] text-black/40 dark:text-white/40">Locating…</p>
                </div>
            </div>
        );
    }

    if (!manualLocation && !coords) {
        return (
            <div className={cardBase}>
                <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
                    <div className="w-10 h-10 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] flex items-center justify-center">
                        <MapPin className="w-[18px] h-[18px] text-black/30 dark:text-white/30" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[14px] font-medium text-black dark:text-white">Location unavailable</p>
                        <p className="text-[13px] text-black/40 dark:text-white/40 leading-relaxed max-w-[200px]">
                            Allow location access or add a city in your profile.
                        </p>
                    </div>
                    <Link
                        to="/profile"
                        className="mt-1 text-[13px] text-black dark:text-white border border-black/10 dark:border-white/10 rounded-lg px-4 py-1.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
                    >
                        Set location
                    </Link>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className={cardBase}>
                <div className="p-5 flex justify-between items-start">
                    <div className="space-y-2">
                        <Skeleton className="w-20 h-3" />
                        <Skeleton className="w-32 h-4" />
                    </div>
                    <Skeleton className="w-8 h-8 rounded-lg" />
                </div>
                <div className="px-5 pb-5 flex justify-between items-end">
                    <div className="space-y-2.5">
                        <Skeleton className="w-28 h-14" />
                        <Skeleton className="w-20 h-3" />
                        <Skeleton className="w-16 h-3" />
                    </div>
                    <Skeleton className="w-16 h-16 rounded-xl" />
                </div>
                <div className="h-px bg-black/[0.05] dark:bg-white/[0.05] mx-5" />
                <div className="p-5 grid grid-cols-4 gap-2">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14" />)}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className={`${cardBase} border-red-500/20`}>
                <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
                    <div className="w-10 h-10 rounded-xl bg-red-500/[0.06] flex items-center justify-center">
                        <AlertCircle className="w-[18px] h-[18px] text-red-500/60" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[14px] font-medium text-black dark:text-white">Unable to load weather</p>
                        <p className="text-[13px] text-black/40 dark:text-white/40">Check your connection and try again.</p>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="mt-1 text-[13px] text-black dark:text-white border border-black/10 dark:border-white/10 rounded-lg px-4 py-1.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={cardBase}>

            {/* Header */}
            <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-1.5 mb-1">
                        <span className="relative flex h-[5px] w-[5px]">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                            <span className="relative inline-flex rounded-full h-[5px] w-[5px] bg-emerald-500" />
                        </span>
                        <span className="text-[11px] text-black/40 dark:text-white/40 tracking-wide">Live conditions</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-[14px] font-medium text-black dark:text-white">{weather.city}</span>
                        <span className="text-black/20 dark:text-white/20">·</span>
                        <span className="text-[13px] text-black/40 dark:text-white/40">{weather.country}</span>
                    </div>
                </div>
                <button
                    onClick={() => refetch()}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors shrink-0"
                >
                    <RefreshCcw
                        className={`w-[13px] h-[13px] text-black/40 dark:text-white/40 ${isFetching ? 'animate-spin' : ''}`}
                        strokeWidth={1.8}
                    />
                </button>
            </div>

            {/* Temperature hero */}
            <div className="px-5 pb-5 flex items-end justify-between gap-3">
                <div>
                    <div className="flex items-start leading-none mb-2.5">
                        <span className="text-[64px] font-medium text-black dark:text-white tabular-nums tracking-tight leading-none">
                            {Math.round(weather.temp)}
                        </span>
                        <span className="text-[24px] font-normal text-black/40 dark:text-white/40 mt-2.5">°C</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[13px] text-black/50 dark:text-white/50 tabular-nums">{Math.round(weather.tempMin)}°</span>
                        <div className="flex-1 h-[2px] bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden min-w-[40px]">
                            <div
                                className="h-full bg-black/20 dark:bg-white/25 rounded-full"
                                style={{ width: `${rangeBarWidth}%` }}
                            />
                        </div>
                        <span className="text-[13px] text-black/50 dark:text-white/50 tabular-nums">{Math.round(weather.tempMax)}°</span>
                    </div>
                    <span className="text-[13px] text-black/40 dark:text-white/40 capitalize">{weather.description}</span>
                </div>
                <div className="w-[72px] h-[72px] shrink-0">
                    <img
                        src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                        alt={weather.description}
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>

            <div className="h-px bg-black/[0.05] dark:bg-white/[0.05] mx-5" />

            {/* Metrics grid */}
            <div className="p-5 grid grid-cols-4 gap-2">
                <MetricCard icon={Wind} label="Wind" value={weather.windSpeed.toFixed(1)} unit="m/s" />
                <MetricCard icon={Droplets} label="Humidity" value={weather.humidity} unit="%" />
                <MetricCard icon={Gauge} label="Pressure" value={weather.pressure} unit="hPa" />
                <MetricCard icon={Cloud} label="Cloud" value={weather.cloudiness} unit="%" />
            </div>

            <div className="h-px bg-black/[0.05] dark:bg-white/[0.05] mx-5" />

            {/* Footer */}
            <div className="px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <Sunrise className="w-[13px] h-[13px] text-black/30 dark:text-white/30 shrink-0" strokeWidth={1.8} />
                        <div>
                            <span className="block text-[11px] text-black/30 dark:text-white/30 mb-0.5">Sunrise</span>
                            <span className="text-[13px] font-medium text-black dark:text-white tabular-nums">{formatTime(weather.sunrise)}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Sunset className="w-[13px] h-[13px] text-black/30 dark:text-white/30 shrink-0" strokeWidth={1.8} />
                        <div>
                            <span className="block text-[11px] text-black/30 dark:text-white/30 mb-0.5">Sunset</span>
                            <span className="text-[13px] font-medium text-black dark:text-white tabular-nums">{formatTime(weather.sunset)}</span>
                        </div>
                    </div>
                </div>
                <span className="text-[11px] text-black/30 dark:text-white/30 text-right shrink-0">
                    Updated {new Date(weather.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
            </div>

        </div>
    );
};

export default WeatherWidget;