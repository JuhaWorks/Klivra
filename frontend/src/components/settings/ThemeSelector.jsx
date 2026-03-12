import React from 'react';
import { useTheme, THEMES } from '../../store/useTheme';
import { motion } from 'framer-motion';
import { Palette, Check, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


/**
 * Modern 2026 ThemeSelector
 * Spectral orchestration with Glassmorphism 2.0 aesthetics
 */
export default function ThemeSelector() {
    const { theme, setTheme } = useTheme();

    const themes = [
        {
            id: THEMES.EMERALD,
            name: 'Emerald',
            description: 'A professional green accent, clean and energetic.',
            color: '#10b981',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            glow: 'shadow-emerald-500/20'
        },
        {
            id: THEMES.VIOLET,
            name: 'Violet',
            description: 'A deep purple accent for a creative, focused feel.',
            color: '#8b5cf6',
            bg: 'bg-violet-500/10',
            border: 'border-violet-500/20',
            glow: 'shadow-violet-500/20'
        },
        {
            id: THEMES.AMBER,
            name: 'Amber',
            description: 'A warm, high-visibility amber for clarity.',
            color: '#f59e0b',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            glow: 'shadow-amber-500/20'
        },
        {
            id: THEMES.ROSE,
            name: 'Rose',
            description: 'A bold, sophisticated Red accent.',
            color: '#ef4444',
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/20',
            glow: 'shadow-rose-500/20'
        },
        {
            id: THEMES.SKY,
            name: 'Sky',
            description: 'A calm, technical blue for clear interfaces.',
            color: '#0ea5e9',
            bg: 'bg-sky-500/10',
            border: 'border-sky-500/20',
            glow: 'shadow-sky-500/20'
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-xl font-black text-primary tracking-tight flex items-center gap-3">
                        Theme <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500 uppercase">Colors.</span>
                    </h3>
                    <p className="text-[10px] font-black text-tertiary uppercase tracking-[0.3em]">Personalize your workspace palette</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-default rounded-2xl shadow-xl">
                    <Palette className="w-4 h-4 text-theme" />
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">OSIRIS v4.2</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {themes.map((t) => {
                    const isActive = theme === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={twMerge(clsx(
                                "group relative flex items-start gap-6 p-6 rounded-[2.5rem] border text-left transition-all duration-500",
                                isActive 
                                    ? "bg-surface border-accent shadow-elevation scale-[1.02]" 
                                    : "bg-transparent border-default hover:border-strong hover:bg-sunken"
                            ))}
                        >
                            {/* Color Core */}
                            <div className="relative shrink-0">
                                <div className={twMerge(clsx(
                                    "w-16 h-16 rounded-[1.5rem] border transition-all duration-500 flex items-center justify-center p-4",
                                    t.border, t.bg,
                                    isActive ? "scale-110 shadow-2xl" : "group-hover:scale-105"
                                ))}>
                                    <div 
                                        className={twMerge(clsx(
                                            "w-full h-full rounded-xl transition-transform duration-500",
                                            isActive ? "scale-100 rotate-0" : "scale-75 rotate-45 group-hover:rotate-0 group-hover:scale-100"
                                        ))}
                                        style={{ backgroundColor: t.color }}
                                    />
                                </div>
                                {isActive && (
                                    <motion.div 
                                        layoutId="active-spectra"
                                        className="absolute -inset-2 border-2 border-accent rounded-[2rem] animate-pulse" 
                                    />
                                )}
                            </div>

                            {/* Directive Label */}
                            <div className="space-y-2 flex-1">
                                <div className="flex items-center justify-between">
                                    <h4 className={twMerge(clsx(
                                        "font-black text-sm uppercase tracking-widest",
                                        isActive ? "text-primary" : "text-tertiary group-hover:text-secondary"
                                    ))}>
                                        {t.name}
                                    </h4>
                                    {isActive && (
                                        <div className="w-6 h-6 rounded-lg bg-success text-white flex items-center justify-center shadow-lg shadow-success/40">
                                            <Check className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-[11px] text-tertiary font-medium leading-relaxed">
                                    {t.description}
                                </p>
                                {isActive && (
                                    <div className="flex items-center gap-2 pt-2">
                                        <Zap className="w-3 h-3 text-theme" />
                                        <span className="text-[8px] font-black text-theme uppercase tracking-widest">Active Link</span>
                                    </div>
                                )}
                            </div>

                            {/* Premium Shadow Interaction */}
                            {isActive && (
                                <div className={twMerge(clsx(
                                    "absolute inset-0 rounded-[2.5rem] blur-3xl opacity-20 -z-10",
                                    t.bg
                                ))} />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
