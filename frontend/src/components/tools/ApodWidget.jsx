import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Rocket, Info, Calendar } from 'lucide-react';
import Card from '../ui/Card';
import { Skeleton } from '../ui/Loading';

/**
 * Modern 2026 APOD Widget
 * Glassmorphism 2.0, Performance-first, 24h caching
 */

const FALLBACK = {
    title: 'The Pillars of Creation',
    explanation: 'The cosmos is within us. We are made of star-stuff. We are a way for the universe to know itself.',
    url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&auto=format&fit=crop&q=80',
    media_type: 'image',
};

const ApodWidget = () => {
    const { data: apod, isLoading: apodLoading, isError } = useQuery({
        queryKey: ['apod'],
        queryFn: async () => {
            const apiKey = import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY';
            const res = await axios.get('https://api.nasa.gov/planetary/apod', {
                params: { api_key: apiKey, thumbs: true },
                timeout: 10000,
            });
            return res.data;
        },
        staleTime: 1000 * 60 * 60 * 24,
        retry: 2,
    });

    const display = isError || !apod ? FALLBACK : apod;
    // Prioritize HD URL for "full image" experience
    const rawSrc = display.hdurl || display.url || (display.media_type === 'video' ? display.thumbnail_url : null);
    const imgSrc = rawSrc || FALLBACK.url;

    return (
        <Card className="group h-full min-h-[450px] overflow-hidden flex flex-col" padding="p-0">
            {/* Header Badge */}
            <div className="absolute top-4 left-4 z-30">
                <div className="px-3 py-1.5 rounded-xl glass-2 bg-black/40 backdrop-blur-md border-white/10 flex items-center gap-2">
                    <Rocket className="w-3 h-3 text-cyan-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Inspiration</span>
                </div>
            </div>

            {apodLoading ? (
                <Skeleton className="w-full h-full flex-1" />
            ) : (
                <>
                    {/* Image Section */}
                    <div className="relative h-[220px] shrink-0 overflow-hidden">
                        <img
                            src={imgSrc}
                            alt={display.title}
                            loading="eager"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            onError={(e) => { 
                                if (e.target.src !== FALLBACK.url) e.target.src = FALLBACK.url;
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <h3 className="absolute bottom-4 left-6 right-6 text-lg font-black text-white tracking-tight leading-tight drop-shadow-md">
                            {display.title}
                        </h3>
                    </div>

                    {/* Content Section - High Contrast / Traditional Layout */}
                    <div className="flex-1 p-6 flex flex-col gap-3 overflow-hidden bg-[var(--bg-surface)]">
                        <div className="flex items-center gap-2 text-zinc-500">
                            <Calendar className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Temporal Log: {new Date().toLocaleDateString()}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                            <div>
                                <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest block mb-1">Explanation</span>
                                <p className="text-xs font-medium text-[var(--text-secondary)] leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all duration-500">
                                    {display.explanation}
                                </p>
                                <button 
                                    className="text-[10px] font-bold text-cyan-500/80 hover:text-cyan-400 mt-1 transition-colors flex items-center gap-1 group/btn"
                                    onClick={() => window.open(display.url, '_blank')}
                                >
                                    <span>Full Discovery</span>
                                    <Rocket className="w-2.5 h-2.5 transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1" />
                                </button>
                            </div>

                            {display.copyright && (
                                <div>
                                    <p className="text-[10px] font-bold text-[var(--text-tertiary)] flex items-center gap-1">
                                        <Info className="w-3 h-3" />
                                        Image Credit & Copyright: <span className="text-[var(--text-primary)]">{display.copyright}</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="pt-2 flex items-center gap-4">
                            <div className="h-px flex-1 bg-[var(--border-subtle)]" />
                            <span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest shrink-0">NASA Segment</span>
                        </div>
                    </div>
                </>
            )}
        </Card>
    );
};

export default ApodWidget;
