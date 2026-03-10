import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const FALLBACK = {
    title: 'Carl Sagan',
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
        staleTime: 1000 * 60 * 60 * 24, // 24 hours cache
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    });

    // Use APOD data if available, otherwise fallback gracefully
    const display = isError || !apod ? FALLBACK : apod;
    const imgSrc = display.media_type === 'video'
        ? (display.thumbnail_url || FALLBACK.url)
        : (display.url || FALLBACK.url);

    return (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col h-full min-h-[250px]">
            <div className="p-6 pb-0">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[15px] font-bold text-white">INSPIRATION</h2>
                    <span className="text-gray-600 text-xs">🚀</span>
                </div>
            </div>
            <div className="relative flex-1 min-h-[200px]">
                {apodLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
                    </div>
                ) : (
                    <>
                        <img
                            src={imgSrc}
                            alt={display.title || 'Deep space nebula'}
                            className="w-full h-full object-cover absolute inset-0"
                            fetchPriority="high"
                            loading="eager"
                            onError={(e) => { e.target.src = FALLBACK.url; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a12] via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-5">
                            <p className="text-[13px] font-medium text-gray-200 leading-relaxed line-clamp-2" title={display.explanation}>
                                "{display.explanation}"
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1">— {display.title}</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ApodWidget;
