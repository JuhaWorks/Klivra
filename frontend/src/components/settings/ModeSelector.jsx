import { useState, useEffect } from 'react';
import { useTheme, MODES } from '../../store/useTheme';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

/**
 * ModeSelector
 * Theme switcher with live previews, system sync, contrast readout,
 * animated selection states, and gradient glow card accents.
 */
export default function ModeSelector() {
    const { mode, setMode } = useTheme();
    const [systemSync, setSystemSync] = useState(false);
    const [lastChanged, setLastChanged] = useState(null);

    useEffect(() => {
        if (!systemSync) return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => setMode(e.matches ? MODES.DARK : MODES.LIGHT);
        handler(mq);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [systemSync, setMode]);

    const handleSelect = (m) => {
        setSystemSync(false);
        setMode(m);
        setLastChanged(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };

    const handleSystemSync = () => {
        const next = !systemSync;
        setSystemSync(next);
        if (next) setLastChanged(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };

    const contrast = mode === MODES.DARK ? '14.7:1' : '11.2:1';

    const themes = [
        {
            id: MODES.DARK,
            name: 'Dark',
            description: 'Reduced-brightness surface for focused work in low-light environments.',
            icon: Moon,
            glowColor: 'rgba(99, 102, 241, 0.15)',
            preview: <DarkPreview />,
        },
        {
            id: MODES.LIGHT,
            name: 'Light',
            description: 'High-contrast surface optimised for bright environments and daytime use.',
            icon: Sun,
            glowColor: 'rgba(234, 179, 8, 0.12)',
            preview: <LightPreview />,
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div>
                    <h3 style={{ fontSize: 15, fontWeight: 900, margin: 0, marginBottom: 3, color: 'var(--text-primary)' }}>Appearance</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                        Select the interface theme applied across your workspace.
                    </p>
                </div>
                <button
                    onClick={handleSystemSync}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px',
                        border: systemSync
                            ? '0.5px solid rgba(29,158,117,0.4)'
                            : '0.5px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-xl)',
                        background: systemSync ? 'rgba(29,158,117,0.08)' : 'var(--bg-sunken)',
                        cursor: 'pointer', flexShrink: 0, transition: 'all .2s'
                    }}
                >
                    <motion.span
                        animate={{ scale: systemSync ? [1, 1.4, 1] : 1 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            width: 7, height: 7, borderRadius: '50%', flexShrink: 0, display: 'block',
                            background: systemSync ? 'var(--accent-500)' : 'var(--border-default)',
                            boxShadow: systemSync ? '0 0 6px var(--accent-glow)' : 'none',
                            transition: 'background .2s, box-shadow .2s'
                        }}
                    />
                    <span style={{
                        fontSize: 11, fontWeight: 500,
                        color: systemSync ? 'var(--accent-500)' : 'var(--text-secondary)',
                        transition: 'color .2s'
                    }}>
                        Sync with system
                    </span>
                </button>
            </div>

            {/* Theme cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {themes.map((t) => {
                    const isActive = mode === t.id;
                    const Icon = t.icon;
                    return (
                        <motion.button
                            key={t.id}
                            onClick={() => handleSelect(t.id)}
                            animate={{
                                scale: isActive ? 1.02 : 1,
                                boxShadow: isActive
                                    ? `0 8px 32px ${t.glowColor}, 0 2px 8px rgba(0,0,0,0.08)`
                                    : '0 0px 0px rgba(0,0,0,0)',
                            }}
                            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                            style={{
                                display: 'flex', flexDirection: 'column', textAlign: 'left',
                                background: 'var(--bg-surface)',
                                border: isActive
                                    ? '2px solid var(--border-strong)'
                                    : '0.5px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-xl)',
                                overflow: 'hidden', cursor: 'pointer',
                                transition: 'border-color .2s',
                                position: 'relative',
                            }}
                        >
                            {/* Radial glow overlay */}
                            <AnimatePresence>
                                {isActive && (
                                    <motion.div
                                        key={`glow-${t.id}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        style={{
                                            position: 'absolute', inset: 0, pointerEvents: 'none',
                                            background: `radial-gradient(ellipse at 50% 110%, ${t.glowColor} 0%, transparent 70%)`,
                                            zIndex: 0,
                                        }}
                                    />
                                )}
                            </AnimatePresence>

                            {/* Preview */}
                            <div style={{ width: '100%', height: 100, flexShrink: 0, position: 'relative', zIndex: 1 }}>
                                {t.preview}
                            </div>

                            {/* Label */}
                            <div style={{ padding: '14px 16px 16px', position: 'relative', zIndex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Icon style={{ width: 15, height: 15, color: 'var(--text-secondary)' }} />
                                        <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)' }}>{t.name}</span>
                                    </div>
                                    <AnimatePresence>
                                        {isActive && (
                                            <motion.div
                                                key="check"
                                                initial={{ opacity: 0, scale: 0.5 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.5 }}
                                                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                                style={{
                                                    width: 18, height: 18, borderRadius: '50%',
                                                    background: 'var(--accent-500)',
                                                    boxShadow: '0 0 8px var(--accent-glow)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                }}
                                            >
                                                <svg width="9" height="9" viewBox="0 0 10 10" fill="none"
                                                    stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="2,5 4,7 8,3" />
                                                </svg>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                    {t.description}
                                </p>
                            </div>

                            {/* Active bottom glint */}
                            <AnimatePresence>
                                {isActive && (
                                    <motion.div
                                        layoutId="active-glint"
                                        initial={{ scaleX: 0, opacity: 0 }}
                                        animate={{ scaleX: 1, opacity: 1 }}
                                        exit={{ scaleX: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                        style={{
                                            position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 2,
                                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                                            borderRadius: 2, zIndex: 2,
                                        }}
                                    />
                                )}
                            </AnimatePresence>
                        </motion.button>
                    );
                })}
            </div>

            {/* Detail stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                    {
                        label: 'Current theme',
                        value: mode === MODES.DARK ? 'Dark' : 'Light',
                        sub: systemSync ? 'System sync' : 'Manual selection'
                    },
                    { label: 'Contrast ratio', value: contrast, sub: 'WCAG AAA' },
                    { label: 'Last changed', value: lastChanged ?? '—', sub: 'This session' },
                ].map((s, i) => (
                    <motion.div
                        key={i}
                        layout
                        style={{
                            padding: 12,
                            background: 'var(--bg-sunken)',
                            borderRadius: 'var(--radius-md)'
                        }}
                    >
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 5 }}>
                            {s.label}
                        </div>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={s.value}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.2 }}
                                style={{ fontSize: 13, fontWeight: 500 }}
                            >
                                {s.value}
                            </motion.div>
                        </AnimatePresence>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{s.sub}</div>
                    </motion.div>
                ))}
            </div>

        </div>
    );
}

function DarkPreview() {
    return (
        <div style={{ width: '100%', height: '100%', background: '#0d0d10', position: 'relative', overflow: 'hidden' }}>
            <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 44,
                background: '#111114', borderRight: '0.5px solid rgba(128,128,128,.1)',
                display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 10px'
            }}>
                {['rgba(29,158,117,.7)', 'rgba(255,255,255,.08)', 'rgba(255,255,255,.08)', 'rgba(255,255,255,.08)'].map((bg, i) => (
                    <div key={i} style={{ width: 18, height: 18, borderRadius: 4, background: bg }} />
                ))}
            </div>
            <div style={{ position: 'absolute', left: 56, right: 0, top: 14, display: 'flex', flexDirection: 'column', gap: 8, padding: '0 12px' }}>
                <div style={{ height: 7, borderRadius: 3, background: 'rgba(255,255,255,.12)', width: '68%' }} />
                <div style={{ height: 7, borderRadius: 3, background: 'rgba(99,179,237,.22)', width: '44%' }} />
                <div style={{ height: 7, borderRadius: 3, background: 'rgba(255,255,255,.06)', width: '55%' }} />
            </div>
            <div style={{
                position: 'absolute', right: 12, bottom: 12, width: 52, height: 34,
                borderRadius: 6, background: 'rgba(255,255,255,.05)',
                border: '0.5px solid rgba(255,255,255,.08)',
                display: 'flex', flexDirection: 'column', gap: 5, padding: '7px 8px'
            }}>
                <div style={{ height: 5, borderRadius: 2, background: 'rgba(255,255,255,.12)', width: '80%' }} />
                <div style={{ height: 5, borderRadius: 2, background: 'rgba(99,179,237,.3)', width: '55%' }} />
            </div>
        </div>
    );
}

function LightPreview() {
    return (
        <div style={{
            width: '100%', height: '100%', background: '#f8f8f6', position: 'relative', overflow: 'hidden',
            borderBottom: '0.5px solid var(--border-subtle)'
        }}>
            <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 44,
                background: '#f0f0ee', borderRight: '0.5px solid rgba(0,0,0,.07)',
                display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 10px'
            }}>
                {['rgba(29,158,117,.7)', 'rgba(0,0,0,.08)', 'rgba(0,0,0,.08)', 'rgba(0,0,0,.08)'].map((bg, i) => (
                    <div key={i} style={{ width: 18, height: 18, borderRadius: 4, background: bg }} />
                ))}
            </div>
            <div style={{ position: 'absolute', left: 56, right: 0, top: 14, display: 'flex', flexDirection: 'column', gap: 8, padding: '0 12px' }}>
                <div style={{ height: 7, borderRadius: 3, background: 'rgba(0,0,0,.1)', width: '68%' }} />
                <div style={{ height: 7, borderRadius: 3, background: 'rgba(29,158,117,.22)', width: '44%' }} />
                <div style={{ height: 7, borderRadius: 3, background: 'rgba(0,0,0,.05)', width: '55%' }} />
            </div>
            <div style={{
                position: 'absolute', right: 12, bottom: 12, width: 52, height: 34,
                borderRadius: 6, background: '#fff', border: '0.5px solid rgba(0,0,0,.08)',
                display: 'flex', flexDirection: 'column', gap: 5, padding: '7px 8px'
            }}>
                <div style={{ height: 5, borderRadius: 2, background: 'rgba(0,0,0,.1)', width: '80%' }} />
                <div style={{ height: 5, borderRadius: 2, background: 'rgba(29,158,117,.25)', width: '55%' }} />
            </div>
        </div>
    );
}