import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

/**
 * GlobalLoadingScreen
 * Full-page loader for initial auth checks
 */
export const GlobalLoadingScreen = () => (
    <div className="fixed inset-0 z-[9999] bg-[#09090b] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-theme/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative mb-10">
            {/* Spinning ring */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-24 h-24 rounded-full border-[1px] border-theme/10 border-t-theme/40"
            />
            {/* Static Inner Logo */}
            <div className="absolute inset-0 flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-theme opacity-80">
                    <path d="M20 5L35 30H5L20 5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <circle cx="20" cy="20" r="6" fill="currentColor" fillOpacity="0.2" />
                </svg>
            </div>
        </div>
        
        <div className="space-y-3 relative z-10">
            <h2 className="text-xl font-bold text-white tracking-tight">Loading <span className="text-theme">Klivra</span></h2>
            <div className="flex items-center justify-center gap-3">
                <div className="flex gap-1">
                    {[0, 0.2, 0.4].map(d => (
                        <motion.div 
                            key={d}
                            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                            transition={{ duration: 1.2, repeat: Infinity, delay: d }}
                            className="w-1.5 h-1.5 rounded-full bg-theme"
                        />
                    ))}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Securing Session</span>
            </div>
        </div>
        
        {/* Progress simulator */}
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-48">
            <div className="h-[2px] bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 3, ease: 'easeInOut' }}
                    className="h-full bg-theme/50"
                />
            </div>
        </div>
    </div>
);

/**
 * PageLoader
 * Subtle loader for route transitions
 */
export const PageLoader = () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-3xl bg-theme/5 border border-theme/10">
                <RefreshCw className="w-6 h-6 text-theme animate-spin" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-tertiary opacity-50">Loading</span>
        </div>
    </div>
);
