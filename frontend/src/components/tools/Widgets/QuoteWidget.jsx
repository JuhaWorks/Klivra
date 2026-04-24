import React, { useState, useEffect } from 'react';
import { Quote, RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../store/useAuthStore';

const FALLBACK_QUOTES = [
    { text: "Execution is everything.", author: "Jeff Bezos" },
    { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
    { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
    { text: "The best way to predict the future is to invent it.", author: "Alan Kay" }
];

const QuoteWidget = () => {
    const [quote, setQuote] = useState(FALLBACK_QUOTES[0]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchQuote = async (isManual = false) => {
        if (isManual) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const res = await api.get('/tools/quotes');
            if (res.data && res.data.data) {
                setQuote({
                    text: res.data.data.body,
                    author: res.data.data.author
                });
            } else {
                throw new Error('Malformed response');
            }
        } catch (error) {
            console.error('Quote API Error:', error);
            const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
            setQuote(FALLBACK_QUOTES[dayOfYear % FALLBACK_QUOTES.length]);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchQuote();
    }, []);

    return (
        <div className="relative group overflow-hidden rounded-[2rem] bg-transparent p-5 min-h-[140px]">
            {/* Background Accent */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-theme/10 rounded-full blur-[40px] pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Quote className="w-3.5 h-3.5 text-theme" />
                    <span className="text-[10px] font-black text-tertiary uppercase tracking-widest opacity-60 flex items-center gap-1.5">
                        Daily Inspiration
                    </span>
                </div>
                <button 
                    onClick={() => fetchQuote(true)}
                    disabled={isLoading || isRefreshing}
                    className="p-1.5 rounded-lg bg-surface/10 text-tertiary hover:text-theme transition-all disabled:opacity-30"
                >
                    {isRefreshing ? <Loader2 className="w-3 h-3 animate-spin text-theme" /> : <RefreshCw className="w-3 h-3" />}
                </button>
            </div>

            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                        <div className="space-y-2">
                            <div className="h-3 w-full bg-white/5 animate-pulse rounded-full" />
                            <div className="h-3 w-[85%] bg-white/5 animate-pulse rounded-full" />
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <div className="h-px flex-1 bg-white/5" />
                            <div className="h-2 w-16 bg-white/5 animate-pulse rounded-full" />
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key={quote.text}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-4"
                    >
                        <p className="text-sm font-bold text-primary italic leading-relaxed tracking-tight break-words">
                            "{quote.text}"
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-gradient-to-r from-theme/30 to-transparent" />
                            <span className="text-[9px] font-black text-theme uppercase tracking-widest shrink-0">
                                — {quote.author}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default QuoteWidget;
