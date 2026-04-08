import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Rocket, Info, Calendar } from 'lucide-react';
import Card from '../ui/Card';
import { Skeleton } from '../ui/PremiumLoaders';

/**
 * Modern 2026 APOD Widget
 * Glassmorphism 2.0, Performance-first, 24h caching
 */

const ApodWidget = () => {
    const { data: apodData, isLoading, isError } = useQuery({
        queryKey: ['apod'],
        queryFn: async () => {
            try {
                // Fetch NASA APOD using a custom key if available, otherwise DEMO_KEY
                const apiKey = import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY';
                const res = await axios.get(`https://api.nasa.gov/planetary/apod?api_key=${apiKey}&thumbs=true`);
                return {
                    title: res.data.title,
                    explanation: res.data.explanation,
                    author: res.data.copyright || 'NASA',
                    url: res.data.media_type === 'video' ? res.data.thumbnail_url : res.data.url,
                    date: res.data.date,
                };
            } catch (err) {
                console.warn('Failed to fetch APOD.');
                return {
                    title: 'System Insight',
                    explanation: 'Waiting for NASA telemetry...',
                    author: 'System',
                    url: `https://picsum.photos/seed/system/600/400`,
                    date: new Date().toISOString().split('T')[0],
                };
            }
        },
        staleTime: 1000 * 60 * 60 * 24, // cache for 24h
        retry: 1,
    });

    const display = isError || !apodData ? {
                    title: 'System Insight',
                    explanation: 'Waiting for NASA telemetry...',
                    author: 'System',
                    url: `https://picsum.photos/seed/system/600/400`,
                    date: new Date().toISOString().split('T')[0],
                } : apodData;

    return (
        <Card className="group h-full min-h-[450px] overflow-hidden flex flex-col" padding="p-0">
            {/* Header Badge */}
            <div className="absolute top-4 left-4 z-30">
                <div className="px-3 py-1.5 rounded-xl glass-2 bg-black/40 backdrop-blur-md border-white/10 flex items-center gap-2">
                    <Rocket className="w-3 h-3 text-cyan-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">NASA APOD</span>
                </div>
            </div>

            {isLoading ? (
                <Skeleton className="w-full h-full flex-1" />
            ) : (
                <>
                    {/* Image Section */}
                    <div className="relative h-[220px] shrink-0 overflow-hidden bg-sunken">
                        <img
                            src={display.url}
                            alt={display.title}
                            width={600}
                            height={220}
                            fetchPriority="high"
                            decoding="async"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <h3 className="absolute bottom-4 left-6 right-6 text-lg font-black text-white tracking-tight leading-tight drop-shadow-md">
                            {display.title}
                        </h3>
                    </div>

                    {/* Content Section - High Contrast / Traditional Layout */}
                    <div className="flex-1 p-6 flex flex-col gap-3 overflow-hidden bg-[var(--bg-surface)]">
                        <div className="flex items-center gap-2 text-zinc-500">
                            <Calendar className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Date: {display.date}</span>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                            <div className="pt-2">
                                <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest block mb-2">Explanation</span>
                                <p className="text-[13px] font-medium text-[var(--text-secondary)] leading-relaxed border-l-2 border-cyan-500/30 pl-3 group-hover:border-cyan-500 transition-colors">
                                    {display.explanation}
                                </p>
                            </div>

                            {display.author && (
                                <div className="mt-4">
                                    <div className="text-[10px] font-bold text-[var(--text-tertiary)] flex items-center gap-1.5 uppercase tracking-widest">
                                        <div className="w-4 h-px bg-[var(--border-subtle)]" />
                                        <span className="text-[var(--text-primary)]">{display.author}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-2 flex items-center gap-4">
                            <div className="h-px flex-1 bg-[var(--border-subtle)]" />
                            <span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest shrink-0">Data Source: NASA API</span>
                        </div>
                    </div>
                </>
            )}
        </Card>
    );
};

export default ApodWidget;
