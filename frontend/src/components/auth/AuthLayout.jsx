import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap, Layout as Kanban, Shapes, Check, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import InteractiveGridBackground from '../ui/InteractiveGridBackground';


const WORDS = ['high-quality software.', 'your team projects.', 'your workflow efficiently.'];
const FEATURES = [
    { icon: Zap, label: 'Real-time Sync' },
    { icon: Kanban, label: 'Kanban Boards' },
    { icon: Shapes, label: 'Whiteboards' },
    { icon: Shield, label: 'E2E Encrypted' }
];

/**
 * 2026 Modern Auth Layout
 * Organic Anti-Grid Layout, Glassmorphism 2.0, Framer Motion
 */

const Typewriter = () => {
    const [index, setIndex] = useState(0);
    const [subIndex, setSubIndex] = useState(0);
    const [reverse, setReverse] = useState(false);

    useEffect(() => {
        if (subIndex === WORDS[index].length + 1 && !reverse) {
            setTimeout(() => setReverse(true), 2000);
            return;
        }

        if (subIndex === 0 && reverse) {
            setReverse(false);
            setIndex((prev) => (prev + 1) % WORDS.length);
            return;
        }

        const timeout = setTimeout(() => {
            setSubIndex((prev) => prev + (reverse ? -1 : 1));
        }, Math.max(reverse ? 75 : 150, parseInt(Math.random() * 350)));

        return () => clearTimeout(timeout);
    }, [subIndex, index, reverse]);

    return (
        <span className="relative">
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent italic">
                {WORDS[index].substring(0, subIndex)}
            </span>
            <motion.span 
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="inline-block w-1.5 h-10 bg-emerald-400 ml-1 rounded-full align-middle"
            />
        </span>
    );
};

export const Brand = ({ rightSide }) => {
    return (
        <aside className={twMerge(clsx(
            "hidden lg:flex flex-col justify-between w-[42%] min-h-screen p-16 relative overflow-hidden",
            "bg-[#09090b] border-white/5",
            rightSide ? "border-l" : "border-r"
        ))}>
            {/* Organic Ambient Glows */}
            <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />

            <motion.header 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-4 relative z-10"
            >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-2xl shadow-emerald-500/20">
                    <span className="text-white font-bold text-2xl">K</span>
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tighter text-white">Klivra</h1>
                    <p className="text-[10px] uppercase tracking-widest font-medium text-gray-500">Enterprise Edition</p>
                </div>
            </motion.header>

            <div className="relative z-10">
                <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-400 mb-6"
                >
                    Team Workspace
                </motion.p>
                <h2 className="text-6xl font-bold leading-[0.9] tracking-tighter text-white mb-6">
                    Build great things,<br />
                    <Typewriter />
                </h2>
                <p className="text-lg text-gray-400 leading-relaxed max-w-sm mb-10">
                    A professional platform for high-performance teams. Streamlined collaboration and project management.
                </p>

                <div className="grid grid-cols-2 gap-4">
                    {FEATURES.map((feat, i) => (
                        <motion.div 
                            key={feat.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="group flex items-center gap-4 p-4 rounded-3xl glass-2 border-white/5"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20">
                                <feat.icon className="w-5 h-5 text-gray-400 group-hover:text-emerald-400" />
                            </div>
                            <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">
                                {feat.label}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </div>

            <footer className="relative z-10 flex items-center gap-4">
                <div className="flex -space-x-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-[#09090b] bg-gray-800 flex items-center justify-center overflow-hidden">
                             <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
                        </div>
                    ))}
                </div>
                <div className="text-sm font-bold text-gray-500">
                    Trusted by <span className="text-cyan-400">2,400+</span> teams worldwide
                </div>
            </footer>
        </aside>
    );
};

export const AuthLayout = ({ children, reverse = false }) => {
    return (
        <div className="min-h-screen bg-[#09090b] text-white selection:bg-cyan-500/30 overflow-hidden font-sans relative">
            {/* Technical Interactive Grid Background */}
            <div className="fixed inset-0 z-0">
                <InteractiveGridBackground 
                    className="w-full h-full"
                    gridSize={70}
                />
            </div>

            
            <div className="flex flex-col lg:flex-row min-h-screen relative z-10 pointer-events-none">
                {!reverse && <Brand rightSide={false} />}
                <main className="flex-1 flex items-center justify-center p-8 bg-transparent pointer-events-auto backdrop-blur-[2px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={reverse ? 'register' : 'login'}
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="w-full max-w-md"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
                {reverse && <Brand rightSide={true} />}
            </div>
        </div>
    );
};

export default AuthLayout;

// Re-exporting dynamic constants
export const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');
export const useCursor = () => {}; // No longer needed in 2026 design
