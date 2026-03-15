import React, { useState, useRef, useEffect } from 'react';
import { useTheme, THEMES } from '../../store/useTheme';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';

const THEME_OPTIONS = [
    { id: THEMES.VIOLET, name: 'Violet', stops: ['#4c1d95', '#7c3aed', '#a78bfa', '#c4b5fd'] },
    { id: THEMES.EMERALD, name: 'Emerald', stops: ['#064e3b', '#059669', '#34d399', '#6ee7b7'] },
    { id: THEMES.SKY, name: 'Sky', stops: ['#0c4a6e', '#0284c7', '#38bdf8', '#7dd3fc'] },
    { id: THEMES.AMBER, name: 'Amber', stops: ['#78350f', '#d97706', '#fbbf24', '#fde68a'] },
    { id: THEMES.ROSE, name: 'Rose', stops: ['#881337', '#e11d48', '#fb7185', '#fda4af'] },
    { id: THEMES.INDIGO, name: 'Indigo', stops: ['#312e81', '#4f46e5', '#818cf8', '#a5b4fc'] },
    { id: THEMES.TEAL, name: 'Teal', stops: ['#134e4a', '#0d9488', '#2dd4bf', '#99f6e4'] },
    { id: THEMES.ORANGE, name: 'Orange', stops: ['#7c2d12', '#ea580c', '#fb923c', '#fdba74'] },
    { id: THEMES.PINK, name: 'Pink', stops: ['#831843', '#db2777', '#f472b6', '#f9a8d4'] },
    { id: THEMES.SLATE, name: 'Slate', stops: ['#1e293b', '#475569', '#94a3b8', '#cbd5e1'] },
];

function makeGradient(stops, deg = 135) {
    return `linear-gradient(${deg}deg, ${stops[0]} 0%, ${stops[1]} 35%, ${stops[2]} 70%, ${stops[3]} 100%)`;
}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
}

export default function ThemeSelector() {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const activeTheme = THEME_OPTIONS.find(t => t.id === theme) || THEME_OPTIONS[0];
    const activeGrad = makeGradient(activeTheme.stops);
    const activeGlow = `rgba(${hexToRgb(activeTheme.stops[2])}, 0.12)`;

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div
            className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500 relative overflow-hidden rounded-2xl p-7 bg-zinc-950 border border-white/[0.07]"
            style={{ '--panel-glow': activeGlow }}
        >
            {/* Ambient glow */}
            <div
                className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${activeGlow} 0%, transparent 70%)`, transition: 'background 0.6s' }}
            />

            {/* Header */}
            <div className="flex items-center justify-between relative z-10">
                <div>
                    <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-[0.2em] font-mono mb-1">
                        Workspace · Appearance
                    </p>
                    <h3 className="text-[18px] font-black leading-none tracking-tight text-zinc-100">
                        Color{' '}
                        <span
                            className="bg-clip-text text-transparent"
                            style={{ backgroundImage: activeGrad, transition: 'background-image 0.5s' }}
                        >
                            Atmosphere
                        </span>
                    </h3>
                </div>

                {/* Active pill */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-white/[0.07] rounded-full">
                    <div
                        className="w-4 h-4 rounded-[5px] border border-white/10 flex-shrink-0 overflow-hidden"
                        style={{ background: activeGrad, transition: 'background 0.4s' }}
                    />
                    <span className="text-[10px] font-bold text-zinc-100 uppercase tracking-[0.1em] font-mono">
                        {activeTheme.name}
                    </span>
                </div>
            </div>

            {/* Preview strip */}
            <div className="flex gap-1.5 h-[5px] relative z-10">
                {THEME_OPTIONS.map(t => {
                    const active = theme === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className="rounded-full transition-all duration-300 flex-1"
                            style={{
                                background: makeGradient(t.stops, 90),
                                opacity: active ? 1 : 0.28,
                                flex: active ? 3 : 1,
                                boxShadow: active ? `0 0 10px rgba(${hexToRgb(t.stops[2])}, 0.55)` : 'none',
                            }}
                        />
                    );
                })}
            </div>

            {/* Swatch grid */}
            <div className="grid grid-cols-5 gap-2.5 relative z-10">
                {THEME_OPTIONS.map(t => {
                    const active = theme === t.id;
                    const grad = makeGradient(t.stops);
                    const glow = `rgba(${hexToRgb(t.stops[2])}, 0.4)`;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className="group transition-transform duration-200"
                            style={{ transform: active ? 'translateY(-3px)' : undefined }}
                        >
                            <div
                                className="w-full h-[72px] rounded-xl relative overflow-hidden transition-all duration-300"
                                style={{
                                    border: active ? '1.5px solid rgba(255,255,255,0.3)' : '1.5px solid rgba(255,255,255,0.06)',
                                    boxShadow: active ? `0 0 0 2.5px ${glow}` : 'none',
                                }}
                            >
                                {/* Gradient fill */}
                                <div className="absolute inset-0" style={{ background: grad }} />
                                {/* Gloss shine */}
                                <div className="absolute top-0 left-0 right-0 h-[45%] pointer-events-none"
                                    style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)' }}
                                />
                                {/* Name label */}
                                <span className="absolute bottom-[7px] left-0 right-0 text-center text-[8px] font-medium font-mono uppercase tracking-[0.12em] text-white/70"
                                    style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                                    {t.name}
                                </span>
                                {/* Check tick */}
                                {active && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="absolute top-1.5 right-1.5 w-[17px] h-[17px] bg-white/90 rounded-full flex items-center justify-center"
                                    >
                                        <Check className="w-2.5 h-2.5 text-black" strokeWidth={2.5} />
                                    </motion.div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Dropdown */}
            <div className="relative z-10" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full h-[46px] flex items-center justify-between px-3.5 bg-zinc-900 border rounded-[13px] transition-all ${isOpen ? 'border-white/13' : 'border-white/[0.07]'} hover:border-white/13 hover:bg-[#1c1c25]`}
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-[7px] overflow-hidden border border-white/10 flex-shrink-0 relative">
                            <div className="absolute inset-0" style={{ background: activeGrad }} />
                        </div>
                        <span className="text-[12px] font-bold uppercase tracking-[0.05em] text-zinc-100">
                            {activeTheme.name}
                        </span>
                    </div>
                    <ChevronDown
                        className={`w-3.5 h-3.5 text-zinc-600 transition-transform duration-250 ${isOpen ? 'rotate-180 !text-zinc-100' : ''}`}
                    />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.98 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className="absolute top-[calc(100%+6px)] left-0 right-0 bg-[#13131a] border border-white/10 rounded-[14px] p-1.5 shadow-2xl overflow-hidden max-h-[310px] overflow-y-auto"
                            style={{ zIndex: 100 }}
                        >
                            {THEME_OPTIONS.map(t => {
                                const active = theme === t.id;
                                const grad = makeGradient(t.stops);
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => { setTheme(t.id); setIsOpen(false); }}
                                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] transition-colors ${active ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}
                                    >
                                        <div className="w-[30px] h-[30px] rounded-[8px] overflow-hidden border border-white/[0.07] flex-shrink-0 relative">
                                            <div className="absolute inset-0" style={{ background: grad }} />
                                            <div className="absolute top-0 left-0 right-0 h-1/2"
                                                style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.18), transparent)' }} />
                                        </div>
                                        <span className="flex-1 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-zinc-100">
                                            {t.name}
                                        </span>
                                        {active && (
                                            <div
                                                className="w-[15px] h-[15px] rounded-full flex items-center justify-center flex-shrink-0"
                                                style={{ background: grad }}
                                            >
                                                <Check className="w-2 h-2 text-white/90" strokeWidth={2.5} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Status bar */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white/[0.025] border border-white/[0.05] rounded-[9px] relative z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="text-[9px] font-medium font-mono text-zinc-600 uppercase tracking-[0.12em]">
                    Theme · <em className="not-italic text-zinc-500">{activeTheme.name}</em> · Applied
                </span>
            </div>
        </div>
    );
}