import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const ApodWidget = () => {
    const { data: apod, isLoading: apodLoading } = useQuery({
        queryKey: ['apod'],
        queryFn: async () => {
            const res = await axios.get('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY&thumbs=true');
            return res.data;
        },
        staleTime: 1000 * 60 * 60 * 24, // 24 hours cache
    });

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
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
                    </div>
                ) : (
                    <>
                        {/* LCP Optimization: Removed loading="lazy", added fetchpriority="high" */}
                        <img
                            src={(apod?.media_type === 'video' ? apod?.thumbnail_url : apod?.url) || "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&auto=format&fit=crop&q=80"}
                            alt={apod?.title || "Deep space nebula"}
                            className="w-full h-full object-cover absolute inset-0"
                            fetchPriority="high"
                            loading="eager"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a12] via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-5">
                            <p className="text-[13px] font-medium text-gray-200 leading-relaxed line-clamp-2" title={apod?.explanation}>
                                {apod?.explanation ? `"${apod.explanation}"` : '"The cosmos is within us. We are made of star-stuff."'}
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1">— {apod?.title || "Carl Sagan"}</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ApodWidget;
