import React from 'react';
import { useTheme, THEMES } from '../../store/useTheme';

export default function ThemeSelector() {
    const { theme, setTheme } = useTheme();

    const themes = [
        {
            id: THEMES.EMERALD,
            name: 'Emerald Core',
            description: 'Muted sage green. The default Klivra look.',
            color: '#2db38a',
            bg: 'bg-emerald-500/15',
            border: 'border-emerald-500/20'
        },
        {
            id: THEMES.NEON_PURPLE,
            name: 'Lavender Fields',
            description: 'Soft, dusty purple for deep work.',
            color: '#9b87f5',
            bg: 'bg-violet-500/15',
            border: 'border-violet-500/20'
        },
        {
            id: THEMES.CYBER_YELLOW,
            name: 'Amber Gold',
            description: 'Warm, honeyed amber. Comfortable on the eyes.',
            color: '#f5be50',
            bg: 'bg-amber-500/15',
            border: 'border-amber-500/20'
        },
        {
            id: THEMES.CRIMSON_RED,
            name: 'Dusty Rose',
            description: 'Soft coral-rose. Warm and subtle.',
            color: '#f06473',
            bg: 'bg-rose-500/15',
            border: 'border-rose-500/20'
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-white mb-1">Platform Aesthetic</h3>
                <p className="text-gray-400 text-sm">Customize the global accent color across your workspace.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {themes.map((t) => {
                    const isActive = theme === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={`flex items-start gap-4 p-4 rounded-2xl border text-left transition-all duration-300 ${
                                isActive 
                                ? `border-white/20 bg-white/[0.04] shadow-lg` 
                                : 'border-white/5 bg-transparent hover:bg-white/[0.02] hover:border-white/10'
                            }`}
                        >
                            {/* Color Swatch */}
                            <div className="relative flex-shrink-0 mt-1">
                                <div className={`w-8 h-8 rounded-full border ${t.border} ${t.bg} flex items-center justify-center`}>
                                    <div 
                                        className="w-4 h-4 rounded-full shadow-[0_0_15px_currentColor]"
                                        style={{ backgroundColor: t.color, color: t.color }}
                                    />
                                </div>
                                {isActive && (
                                    <div className="absolute -inset-1 border-2 border-white/20 rounded-full animate-spin-slow opacity-50" style={{ animationDuration: '4s' }} />
                                )}
                            </div>

                            {/* Label */}
                            <div>
                                <h4 className={`font-bold text-sm tracking-wide ${isActive ? 'text-white' : 'text-gray-300'}`}>
                                    {t.name}
                                </h4>
                                <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
