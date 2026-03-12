import { useTheme, MODES } from '../../store/useTheme';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Sparkles, Zap, Layout, Monitor } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


/**
 * Modern 2026 ModeSelector
 * Luminance orchestration with High-Fidelity glass previews
 */
export default function ModeSelector() {
    const { mode, setMode } = useTheme();

    const variants = {
        [MODES.DARK]: {
            id: MODES.DARK,
            name: 'Dark Mode',
            description: 'A dark interface for focused work in low-light environments.',
            icon: Moon,
            accent: 'text-indigo-400',
            bg: 'bg-[#09090b]',
            preview: (
                <div className="w-full h-24 rounded-2xl bg-[#09090b] border border-white/5 flex items-center gap-3 px-4 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent" />
                    <div className="w-8 h-12 rounded-lg bg-white/5 flex-shrink-0 animate-pulse"></div>
                    <div className="flex flex-col gap-2 flex-1 relative z-10">
                        <div className="h-2 rounded-full bg-white/10 w-3/4"></div>
                        <div className="h-2 rounded-full bg-cyan-500/30 w-1/2"></div>
                        <div className="h-2 rounded-full bg-white/5 w-2/3"></div>
                    </div>
                </div>
            )
        },
        [MODES.LIGHT]: {
            id: MODES.LIGHT,
            name: 'Light Mode',
            description: 'A clean, high-contrast interface for bright spaces.',
            icon: Sun,
            accent: 'text-emerald-600',
            bg: 'bg-white',
            preview: (
                <div className="w-full h-24 rounded-2xl bg-white border border-black/5 flex items-center gap-3 px-4 overflow-hidden relative shadow-sm">
                    <div className="w-8 h-12 rounded-lg bg-black/5 flex-shrink-0"></div>
                    <div className="flex flex-col gap-2 flex-1">
                        <div className="h-2 rounded-full bg-black/10 w-3/4"></div>
                        <div className="h-2 rounded-full bg-emerald-500/30 w-1/2"></div>
                        <div className="h-2 rounded-full bg-black/5 w-2/3"></div>
                    </div>
                </div>
            )
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                        Appearance <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 uppercase">Settings.</span>
                    </h3>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Choose your visual experience</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/5 rounded-2xl shadow-xl">
                    <Layout className="w-4 h-4 text-amber-400" />
                    <span className="text-[9px] font-black text-white uppercase tracking-widest">Global Sync</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.values(variants).map((variant) => {
                    const isActive = mode === variant.id;
                    return (
                        <button
                            key={variant.id}
                            onClick={() => setMode(variant.id)}
                            className={twMerge(clsx(
                                "group relative flex flex-col items-start gap-4 p-6 rounded-[2.5rem] border text-left transition-all duration-500",
                                isActive 
                                    ? "bg-white/5 border-white/20 shadow-[0_20px_40px_rgba(0,0,0,0.5)] scale-[1.02]" 
                                    : "bg-transparent border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                            ))}
                        >
                            {/* Visual Preview Segment */}
                            {variant.preview}

                            {/* Label Segment */}
                            <div className="space-y-2 w-full">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <variant.icon className={twMerge(clsx("w-4 h-4 transition-colors", isActive ? variant.accent : "text-secondary"))} />
                                        <h4 className={twMerge(clsx(
                                            "font-black text-sm uppercase tracking-widest",
                                            isActive ? "text-white" : "text-secondary group-hover:text-primary"
                                        ))}>
                                            {variant.name}
                                        </h4>
                                    </div>
                                    {isActive && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Active Link</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[11px] text-secondary font-medium leading-relaxed">
                                    {variant.description}
                                </p>
                            </div>

                            {/* State Decoration */}
                            {isActive && (
                                <motion.div 
                                    layoutId="active-mode-glint"
                                    className="absolute inset-x-10 bottom-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-sm rounded-full"
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Sub-directives */}
            <div className="flex items-center gap-4 p-5 glass-2 bg-white/[0.02] border border-white/5 rounded-[2rem] opacity-50">
                <Monitor className="w-5 h-5 text-tertiary" />
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-secondary uppercase tracking-widest leading-none">Ambient Sync</span>
                    <span className="text-[9px] text-tertiary font-medium">Follow system light-level protocols and ambient sensors.</span>
                </div>
                <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span className="text-[8px] font-black text-white uppercase tracking-widest">Beta Protocol</span>
                </div>
            </div>
        </div>
    );
}
