import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import AsciiWave from './AsciiWave';

// ---------------------------------------------------------------------------
// Design tokens — single source of truth
// ---------------------------------------------------------------------------

const tokens = {
    bg: '#080809',
    bgSurface: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.06)',
    accent: '#22d3ee',          // cyan-400
    accentDim: 'rgba(34,211,238,0.12)',
    accentGlow: 'rgba(34,211,238,0.25)',
    textMuted: 'rgba(255,255,255,0.28)',
    textDim: 'rgba(255,255,255,0.12)',
};

// Easing presets
const ease = {
    out: [0.16, 1, 0.3, 1],
    inOut: [0.45, 0, 0.55, 1],
};

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function CrosshairCorners({ size = 10, thickness = 1, color = tokens.border, className }) {
    const s = size;
    const t = thickness;

    const corner = (rotate) => (
        <svg
            width={s}
            height={s}
            viewBox={`0 0 ${s} ${s}`}
            style={{ transform: `rotate(${rotate}deg)` }}
        >
            <path
                d={`M ${s} 1 L 1 1 L 1 ${s}`}
                fill="none"
                stroke={color}
                strokeWidth={t}
                strokeLinecap="square"
            />
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
}

export function SegmentedBar({ segments = 12, filled = 0, className }) {
    return (
        <div className={cn('flex gap-px', className)}>
            {Array.from({ length: segments }, (_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0.08 }}
                    animate={{ opacity: i < filled ? 1 : 0.08 }}
                    transition={{ duration: 0.2, delay: i * 0.04 }}
                    style={{
                        width: 6,
                        height: 2,
                        background: i < filled ? tokens.accent : tokens.border,
                        borderRadius: 1,
                    }}
                />
            ))}
        </div>
    );
}

export function StatusLabel({ text = 'INITIALIZING', showCursor = true }) {
    return (
        <div
            className="flex items-center gap-1.5"
            style={{
                fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
                fontSize: 10,
                letterSpacing: '0.15em',
                color: tokens.textMuted,
                fontWeight: 500,
            }}
        >
            <span>{text}</span>
            {showCursor && (
                <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.9, ease: 'steps(1)' }}
                    style={{ color: tokens.accent }}
                >
                    ▋
                </motion.span>
            )}
        </div>
    );
}

function ThinRing({ size, duration, opacity = 1, reverse = false }) {
    return (
        <motion.div
            animate={{ rotate: reverse ? -360 : 360 }}
            transition={{ repeat: Infinity, duration, ease: 'linear' }}
            style={{
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: '50%',
                border: `1px solid transparent`,
                borderTopColor: `rgba(34,211,238,${opacity})`,
                borderRightColor: reverse ? `rgba(34,211,238,${opacity * 0.3})` : 'transparent',
            }}
        />
    );
}

export function PrecisionSpinner({ diameter = 64 }) {
    const d = diameter;

    return (
        <div style={{ position: 'relative', width: d, height: d }}>
            <ThinRing size={d} duration={3.2} opacity={0.5} />
            <ThinRing size={d * 0.72} duration={2.1} opacity={0.35} reverse />
            <ThinRing size={d * 0.44} duration={1.6} opacity={0.6} />

            {/* Static center dot */}
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: tokens.accent,
                    boxShadow: `0 0 8px ${tokens.accentGlow}`,
                }}
            />
        </div>
    );
}

export function BrandCore({ letter = 'K', size = 56 }) {
    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            {/* Ambient glow layer */}
            <motion.div
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                style={{
                    position: 'absolute',
                    inset: -16,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${tokens.accentGlow} 0%, transparent 70%)`,
                    filter: 'blur(8px)',
                }}
            />

            {/* Tile */}
            <div
                style={{
                    position: 'relative',
                    width: size,
                    height: size,
                    borderRadius: size * 0.22,
                    background: tokens.bgSurface,
                    border: `1px solid ${tokens.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(12px)',
                }}
            >
                {/* Accent top-edge line */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: '20%',
                        right: '20%',
                        height: 1,
                        background: `linear-gradient(90deg, transparent, ${tokens.accent}, transparent)`,
                        borderRadius: 1,
                    }}
                />

                <span
                    style={{
                        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                        fontSize: size * 0.36,
                        fontWeight: 700,
                        color: '#fff',
                        letterSpacing: '-0.02em',
                    }}
                >
                    {letter}
                </span>
            </div>
        </div>
    );
}

function ScanProgress({ width = 160 }) {
    return (
        <div
            style={{
                position: 'relative',
                width,
                height: 1,
                background: tokens.textDim,
                overflow: 'hidden',
            }}
        >
            <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 2, ease: ease.inOut }}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(90deg, transparent 0%, ${tokens.accent} 50%, transparent 100%)`,
                }}
            />
        </div>
    );
}

export function PageLoader() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
                minHeight: '100vh',
                background: tokens.bg,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 32,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Subtle vignette */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(ellipse 60% 60% at 50% 50%, transparent 0%, ${tokens.bg} 100%)`,
                    pointerEvents: 'none',
                }}
            />

            {/* Spinner */}
            <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: ease.out }}
            >
                <PrecisionSpinner diameter={56} />
            </motion.div>

            {/* Label */}
            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15, ease: ease.out }}
            >
                <StatusLabel text="LOADING" />
            </motion.div>
        </motion.div>
    );
}

export function GlobalLoadingScreen({ letter = 'K', statusText = 'INITIALIZING' }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
                minHeight: '100vh',
                background: tokens.bg,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 40,
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* ASCII wave — bottom, very dim */}
            <div
                style={{
                    position: 'absolute',
                    inset: '0 0 0 0',
                    bottom: 0,
                    height: '30%',
                    opacity: 0.07,
                    pointerEvents: 'none',
                }}
            >
                <AsciiWave speed={0.4} />
            </div>

            {/* Grid overlay — architectural feel */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `
            linear-gradient(${tokens.border} 1px, transparent 1px),
            linear-gradient(90deg, ${tokens.border} 1px, transparent 1px)
          `,
                    backgroundSize: '48px 48px',
                    maskImage: 'radial-gradient(ellipse 55% 55% at 50% 50%, black 0%, transparent 100%)',
                    pointerEvents: 'none',
                }}
            />

            {/* Content stack */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32 }}>

                {/* Brand + spinner in one cluster */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: ease.out }}
                    style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <BrandCore letter={letter} size={60} />

                    {/* Concentric rings behind brand tile */}
                    <div style={{ position: 'absolute', pointerEvents: 'none' }}>
                        {[100, 148, 196].map((d, i) => (
                            <div
                                key={d}
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%,-50%)',
                                    width: d,
                                    height: d,
                                    borderRadius: '50%',
                                    border: `1px solid ${tokens.border}`,
                                    opacity: 1 - i * 0.25,
                                }}
                            />
                        ))}
                    </div>
                </motion.div>

                {/* Progress row */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2, ease: ease.out }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
                >
                    {/* Framed progress bar */}
                    <div style={{ position: 'relative', padding: '6px 8px', border: `1px solid ${tokens.border}`, borderRadius: 3 }}>
                        <CrosshairCorners size={6} color={tokens.accentDim} />
                        <ScanProgress width={148} />
                    </div>

                    <StatusLabel text={statusText} />
                </motion.div>
            </div>
        </motion.div>
    );
}

export function Skeleton({ className, style, ...rest }) {
    return (
        <div
            className={cn('relative overflow-hidden rounded-lg', className)}
            style={{
                background: tokens.bgSurface,
                border: `1px solid ${tokens.border}`,
                ...style,
            }}
            {...rest}
        >
            {/* Shimmer sweep */}
            <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ repeat: Infinity, duration: 1.8, ease: ease.inOut, repeatDelay: 0.4 }}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.04) 50%, transparent 70%)`,
                }}
            />
        </div>
    );
}
