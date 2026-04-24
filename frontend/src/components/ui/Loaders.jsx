import React, { useState, useRef, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const tokens = {
    bg: '#080809',
    bgSurface: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.06)',
    accent: '#22d3ee',
    accentDim: 'rgba(34,211,238,0.12)',
    accentGlow: 'rgba(34,211,238,0.25)',
    textMuted: 'rgba(255,255,255,0.28)',
    textDim: 'rgba(255,255,255,0.12)',
};

const ease = {
    out: [0.16, 1, 0.3, 1],
    inOut: [0.45, 0, 0.55, 1],
};

// ─── UTILITIES ─────────────────────────────────────────────────────────────
export const CrosshairCorners = memo(({ size = 10, thickness = 1, color = tokens.border, className }) => {
    const s = size;
    const t = thickness;
    const corner = (rotate) => (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ transform: `rotate(${rotate}deg)` }}>
            <path d={`M ${s} 1 L 1 1 L 1 ${s}`} fill="none" stroke={color} strokeWidth={t} strokeLinecap="square" />
        </svg>
    );
    return (
        <div className={cn('absolute inset-0 pointer-events-none', className)}>
            <div className="absolute top-0 left-0">{corner(0)}</div>
            <div className="absolute top-0 right-0">{corner(90)}</div>
            <div className="absolute bottom-0 right-0">{corner(180)}</div>
            <div className="absolute bottom-0 left-0">{corner(270)}</div>
        </div>
    );
});

export const StatusLabel = memo(({ text = 'INITIALIZING', showCursor = true }) => {
    return (
        <div className="flex items-center gap-1.5" style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.15em', color: tokens.textMuted, fontWeight: 500 }}>
            <span>{text}</span>
            {showCursor && (
                <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.9, ease: 'steps(1)' }} style={{ color: tokens.accent }}>▋</motion.span>
            )}
        </div>
    );
});

// ─── SPINNERS ──────────────────────────────────────────────────────────────
export const PrecisionSpinner = memo(({ diameter = 64 }) => {
    const d = diameter;
    const ThinRing = ({ size, duration, opacity = 1, reverse = false }) => (
        <motion.div animate={{ rotate: reverse ? -360 : 360 }} transition={{ repeat: Infinity, duration, ease: 'linear' }}
            style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', border: `1px solid transparent`, borderTopColor: `rgba(34,211,238,${opacity})`, borderRightColor: reverse ? `rgba(34,211,238,${opacity * 0.3})` : 'transparent' }} />
    );
    return (
        <div style={{ position: 'relative', width: d, height: d }}>
            <ThinRing size={d} duration={3.2} opacity={0.5} />
            <ThinRing size={d * 0.72} duration={2.1} opacity={0.35} reverse />
            <ThinRing size={d * 0.44} duration={1.6} opacity={0.6} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 5, height: 5, borderRadius: '50%', background: tokens.accent, boxShadow: `0 0 8px ${tokens.accentGlow}` }} />
        </div>
    );
});

export const KlivraLogo = memo(({ pulse = true }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-10"
        >
            {/* Branded Logo Container with Premium Glass Effect */}
            <div className="relative group">
                {/* Dynamic Ambient Glow */}
                <motion.div 
                    animate={pulse ? { 
                        opacity: [0.4, 0.7, 0.4],
                        scale: [1, 1.2, 1],
                    } : {}} 
                    transition={{ 
                        repeat: Infinity, 
                        duration: 4, 
                        ease: "easeInOut" 
                    }}
                    className="absolute inset-[-20px] bg-theme/20 blur-[40px] rounded-full pointer-events-none"
                />

                <motion.div 
                    animate={pulse ? { 
                        scale: [1, 1.05, 1],
                        borderColor: ["rgba(255,255,255,0.1)", "rgba(var(--theme-rgb),0.3)", "rgba(255,255,255,0.1)"]
                    } : {}} 
                    transition={{ 
                        repeat: Infinity, 
                        duration: 4, 
                        ease: "easeInOut" 
                    }}
                    className="relative shrink-0 w-24 h-24 rounded-[2.5rem] overflow-hidden border border-white/10 bg-neutral-950/80 flex items-center justify-center backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                >
                    {/* Interior Shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50" />
                    
                    <img 
                        src="/logo.png" 
                        alt="Klivra logo" 
                        width={56}
                        height={56}
                        className="w-14 h-14 object-contain relative z-10 invert brightness-200 contrast-125 transition-transform duration-700 group-hover:scale-110"
                    />

                </motion.div>
            </div>
            
            {/* Brand Wordmark with Precision Typography */}
            <div className="flex flex-col items-center gap-3">
                <motion.div 
                    animate={pulse ? {
                        opacity: [0.7, 1, 0.7]
                    } : {}}
                    transition={{
                        repeat: Infinity,
                        duration: 4,
                        ease: "easeInOut",
                        delay: 0.5
                    }}
                    className="flex flex-col items-center"
                >
                    <h1 className="text-5xl font-black tracking-tighter text-white leading-none uppercase select-none">
                        klivra
                    </h1>
                    <div className="h-px w-16 bg-gradient-to-r from-transparent via-theme/40 to-transparent mt-4 mb-2" />
                    <span className="text-[11px] font-black tracking-[0.5em] text-theme/60 uppercase select-none">
                        Core Intelligence
                    </span>
                </motion.div>
            </div>
        </motion.div>
    );
});

// ─── SCREENS ───────────────────────────────────────────────────────────────
export const GlobalLoadingScreen = memo(({ statusText = 'INITIALIZING' }) => {
    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.6 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-16 overflow-hidden bg-[#080809]"
        >
            {/* Architectural Grid Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black_0%,transparent_100%)]" />
                <div className="absolute inset-0 bg-gradient-to-tr from-theme/5 via-transparent to-theme/5 opacity-50" />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-12">
                <KlivraLogo />
                <div className="mt-4">
                    <StatusLabel text={statusText} />
                </div>
            </div>

            {/* Corner Decorative Elements */}
            <CrosshairCorners className="opacity-20 scale-95" size={40} />
        </motion.div>
    );
});

export const PageLoader = memo(() => {
    return (
        <div className="w-full h-full min-h-[500px] flex items-center justify-center relative overflow-hidden">
            <div className="flex flex-col items-center gap-12 relative z-10">
                <KlivraLogo />
                <motion.div 
                    animate={{ opacity: [0.4, 0.7, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex flex-col items-center gap-3"
                >
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-theme/40">
                        Initializing Interface
                    </span>
                    <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                            <motion.div
                                key={i}
                                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                className="w-1 h-1 rounded-full bg-theme"
                            />
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
});

export const Skeleton = memo(({ className, style, noBorder = false, opacity = 1, ...rest }) => {
    return (
        <div
            className={cn('relative overflow-hidden rounded-lg', className)}
            style={{
                background: tokens.bgSurface,
                border: noBorder ? 'none' : `1px solid ${tokens.border}`,
                opacity,
                ...style,
            }}
            {...rest}
        >
            <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '250%' }}
                transition={{ repeat: Infinity, duration: 2, ease: ease.inOut, repeatDelay: 0.5 }}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)`,
                }}
            />
        </div>
    );
});

Skeleton.displayName = 'Skeleton';
GlobalLoadingScreen.displayName = 'GlobalLoadingScreen';
PageLoader.displayName = 'PageLoader';
PrecisionSpinner.displayName = 'PrecisionSpinner';
StatusLabel.displayName = 'StatusLabel';
CrosshairCorners.displayName = 'CrosshairCorners';
