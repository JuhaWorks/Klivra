import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import AsciiWave from './AsciiWave';


/**
 * Modern 2026 Vite-Optimized Loading States
 * Skeleton Evolution, Glassmorphism 2.0, Performance-First
 */

export const PageLoader = () => (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-8 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative flex items-center justify-center">
            {/* 2026 Orbiting Rings */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="absolute w-20 h-20 border-[3px] border-transparent border-t-cyan-500/40 rounded-full"
            />
            <motion.div 
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="absolute w-14 h-14 border-[2px] border-transparent border-t-blue-500/30 rounded-full"
            />
            
            {/* Central Core */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_30px_rgba(6,182,212,0.4)] animate-pulse" />
        </div>
        
        <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Loading</span>
            <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                    <motion.div
                        key={i}
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                        className="w-1.5 h-1.5 rounded-full bg-cyan-500"
                    />
                ))}
            </div>
        </div>
    </div>
);

export const GlobalLoadingScreen = () => (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-10 relative overflow-hidden">
        {/* Background ASCII Animation */}
        <div className="absolute inset-x-0 bottom-0 h-64 opacity-20 pointer-events-none">
            <AsciiWave speed={0.5} />
        </div>
        
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10"
        >
            <div className="absolute inset-0 w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 blur-2xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/25">
                <span className="text-white font-black text-3xl">K</span>
            </div>
        </motion.div>
        
        <div className="flex flex-col items-center gap-4 relative z-10">
            <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="h-full w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.4em] text-gray-500">Loading application</p>
        </div>

        {/* Standard footer removed for professional simplicity */}
    </div>
);

export const Skeleton = ({ className }) => (
    <div className={twMerge(clsx(
        "bg-white/5 rounded-xl animate-pulse relative overflow-hidden",
        "after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/[0.03] after:to-transparent after:animate-[shimmer_2s_infinite]",
        className
    ))} />
);
