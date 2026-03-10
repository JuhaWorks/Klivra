import { useTheme, MODES } from '../../store/useTheme';

export default function ModeSelector() {
    const { mode, setMode } = useTheme();

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-bold text-main mb-1">Display Mode</h3>
                <p className="text-text-muted text-sm">Choose how the interface looks across your workspace.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Dark Mode */}
                <button
                    onClick={() => setMode(MODES.DARK)}
                    className={`relative overflow-hidden flex flex-col items-start gap-3 p-4 rounded-2xl border text-left transition-all duration-300 ${
                        mode === MODES.DARK
                            ? 'border-white/20 bg-white/[0.06] shadow-lg'
                            : 'border-white/5 bg-transparent hover:bg-white/[0.02] hover:border-white/10'
                    }`}
                >
                    {/* Dark Preview */}
                    <div className="w-full h-16 rounded-xl bg-[#0a0a0c] border border-white/10 flex items-center gap-2 px-3 overflow-hidden">
                        <div className="w-5 h-10 rounded bg-white/5 flex-shrink-0"></div>
                        <div className="flex flex-col gap-1.5 flex-1">
                            <div className="h-1.5 rounded-full bg-white/10 w-3/4"></div>
                            <div className="h-1.5 rounded-full bg-emerald-500/40 w-1/2"></div>
                            <div className="h-1.5 rounded-full bg-white/5 w-2/3"></div>
                        </div>
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm tracking-wide ${mode === MODES.DARK ? 'text-white' : 'text-gray-300'}`}>
                            Dark Mode
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">Easy on the eyes at night.</p>
                    </div>
                    {mode === MODES.DARK && (
                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    )}
                </button>

                {/* Light Mode */}
                <button
                    onClick={() => setMode(MODES.LIGHT)}
                    className={`relative overflow-hidden flex flex-col items-start gap-3 p-4 rounded-2xl border text-left transition-all duration-300 ${
                        mode === MODES.LIGHT
                            ? 'border-black/10 bg-black/[0.04] shadow-lg'
                            : 'border-white/5 bg-transparent hover:bg-white/[0.02] hover:border-white/10'
                    }`}
                >
                    {/* Light Preview */}
                    <div className="w-full h-16 rounded-xl bg-white border border-black/10 flex items-center gap-2 px-3 overflow-hidden shadow-sm">
                        <div className="w-5 h-10 rounded bg-black/5 flex-shrink-0"></div>
                        <div className="flex flex-col gap-1.5 flex-1">
                            <div className="h-1.5 rounded-full bg-black/10 w-3/4"></div>
                            <div className="h-1.5 rounded-full bg-emerald-400/60 w-1/2"></div>
                            <div className="h-1.5 rounded-full bg-black/5 w-2/3"></div>
                        </div>
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm tracking-wide ${mode === MODES.LIGHT ? 'text-gray-900' : 'text-gray-300'}`}>
                            Light Mode
                        </h4>
                        <p className="text-xs text-gray-500 mt-0.5">Clear and airy in bright environments.</p>
                    </div>
                    {mode === MODES.LIGHT && (
                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    )}
                </button>
            </div>
        </div>
    );
}
