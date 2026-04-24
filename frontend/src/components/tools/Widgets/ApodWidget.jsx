import { useQuery } from '@tanstack/react-query';
import { api } from '../../../store/useAuthStore';
import { Calendar, Rocket } from 'lucide-react';
import { Card } from '../../ui/BaseUI';
import { Skeleton, KlivraLogo } from '../../ui/Loaders';
import { memo } from 'react';
import { motion } from 'framer-motion';

/**
 * Modern 2026 APOD Widget - Grand Editorial Edition
 * Fills dashboard whitespace gorgeously with NASA imagery.
 */

const ApodWidget = () => {

    const { data: apodData, isLoading, isError } = useQuery({
        queryKey: ['apod'],
        queryFn: async () => {
            const res = await api.get('/tools/apod');
            return res.data.data;
        },
        staleTime: 1000 * 60 * 60 * 6, // 6h cache to match backend
        retry: 1,
        refetchOnWindowFocus: false,
    });

    const display = isError || !apodData ? {
        title: 'System Insight',
        explanation: 'NASA telemetry is currently under maintenance or rate-limited. Serving local orbital archive.',
        author: 'Klivra Intelligence',
        url: `https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop`,
        date: new Date().toISOString().split('T')[0],
        mediaType: 'image'
    } : apodData;

    const isVideo = display.mediaType === 'video' && !display.url.includes('thumbnail');

    if (isLoading) {
        return (
            <Card variant="glass" compact padding="p-0" className="overflow-hidden min-h-[500px] flex items-center justify-center bg-[#080809]/40 backdrop-blur-xl border border-white/5">
                <KlivraLogo />
            </Card>
        );
    }

    return (
        <Card
            variant="glass"
            compact
            padding="p-0"
            className="relative group border-none overflow-hidden flex flex-col transition-all duration-500 bg-cyan-500/[0.02] shadow-2xl"
        >
            {/* Header Badge */}
            <div className="absolute top-4 left-4 z-30">
                <div className="px-3 py-1.5 rounded-xl glass-2 bg-black/60 backdrop-blur-xl border border-white/10 flex items-center gap-2">
                    <Rocket className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{display.mediaType === 'video' ? 'Deep Space Motion' : 'Astronomy Insight'}</span>
                </div>
            </div>

            {/* Media Aperture */}
            <div className="relative h-[300px] sm:h-[400px] lg:h-[500px] shrink-0 overflow-hidden bg-[#080809]">
                {isVideo ? (
                    <iframe
                        src={display.url}
                        title={display.title}
                        className="w-full h-full border-none"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                ) : (
                    <img
                        src={display.url}
                        alt={display.title}
                        width={1024}
                        height={676}
                        fetchPriority="high"
                        className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-[1.05]"
                    />
                )}
                
                {/* Visual Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#080809] via-transparent to-transparent pointer-events-none" />
                
                <div className="absolute bottom-8 left-8 right-8 pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tighter leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                            {display.title}
                        </h3>
                        <div className="flex items-center gap-3 text-white/50 mt-3">
                            <Calendar className="w-4 h-4" />
                            <span className="text-[11px] font-black uppercase tracking-[0.2em]">{display.date}</span>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Narrative Section */}
            <div className="px-8 py-7 flex flex-col gap-4 bg-[#080809]/40 backdrop-blur-md">
                <p className="text-[14px] sm:text-[15px] font-medium text-secondary leading-relaxed pl-5 border-l-2 border-cyan-500/40 relative">
                    <span className="absolute -left-[1px] top-0 bottom-0 w-[2px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                    {display.explanation}
                </p>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 pt-6 border-t border-white/5 gap-4">
                    <div className="flex flex-col gap-1">
                        {display.author && (
                            <p className="text-[10px] font-black text-tertiary uppercase tracking-widest italic opacity-60">
                                Intelligence Captured by: <span className="text-secondary not-italic">{display.author}</span>
                            </p>
                        )}
                        <div className="flex items-center gap-3 opacity-30">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em]">Operational Sync Complete</span>
                            <div className="w-16 h-px bg-white/10" />
                        </div>
                    </div>

                    <a 
                        href={display.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-secondary hover:bg-white/10 hover:text-white transition-all active:scale-95"
                    >
                        Direct Access
                    </a>
                </div>
            </div>
        </Card>
    );
};

export default memo(ApodWidget);
