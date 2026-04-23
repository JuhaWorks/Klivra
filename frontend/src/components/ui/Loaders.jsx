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

// ─── LOGO COMPONENTS ────────────────────────────────────────────────────────
export const KlivraLogo = memo(({ size = 64, color = 'var(--accent-500)', pulse = true }) => {
    const s = size;
    return (
        <motion.div 
            animate={pulse ? { 
                opacity: [0.6, 1, 0.6],
                scale: [0.97, 1, 0.97]
            } : {}} 
            transition={{ 
                repeat: Infinity, 
                duration: 2.5, 
                ease: "easeInOut" 
            }}
            className="relative flex items-center justify-center"
            style={{ width: s, height: s }}
        >
            {/* Glow Background */}
            <div className="absolute inset-0 bg-theme/10 blur-2xl rounded-full" />
            
            {/* Outer Ring */}
            <div className="absolute inset-0 rounded-2xl border border-theme/20 bg-gradient-to-br from-theme/5 to-transparent backdrop-blur-sm shadow-2xl" />
            
            {/* The 'K' */}
            <span 
                className="relative font-black text-theme tracking-tighter"
                style={{ fontSize: s * 0.45, lineHeight: 1 }}
            >
                K
            </span>

            {/* Subtle Orbiting Dots (optional, for extra "working" feel) */}
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="absolute inset-[-4px] pointer-events-none"
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-theme/40" />
            </motion.div>
        </motion.div>
    );
});

// ─── SCREENS ───────────────────────────────────────────────────────────────
export const GlobalLoadingScreen = memo(({ statusText = 'INITIALIZING' }) => {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
            style={{ minHeight: '100vh', background: tokens.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${tokens.border} 1px, transparent 1px), linear-gradient(90deg, ${tokens.border} 1px, transparent 1px)`, backgroundSize: '48px 48px', maskImage: 'radial-gradient(ellipse 55% 55% at 50% 50%, black 0%, transparent 100%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>
                <KlivraLogo size={80} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <StatusLabel text={statusText} />
                </div>
            </div>
        </motion.div>
    );
});

export const PageLoader = memo(() => {
    return (
        <div className="w-full h-full min-h-[400px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-8">
                <KlivraLogo size={72} />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-theme/40 animate-pulse">Initializing Interface</span>
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
