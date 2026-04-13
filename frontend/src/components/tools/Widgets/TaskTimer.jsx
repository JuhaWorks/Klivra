import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Square, ChevronRight, Zap } from 'lucide-react';
import { useTimerStore } from '../../../store/useTimerStore';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Floating Mini-Player Timer
 * Stays visible across all pages while a task timer is running.
 * Position: bottom-right, above toasts.
 */
const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function TaskTimer() {
    const { isRunning, activeTaskTitle, activeProjectId, startedAt, elapsedSeconds, stopTimer, tick } = useTimerStore();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const intervalRef = useRef(null);

    // Live ticker
    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => tick(), 1000);
        } else {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [isRunning, tick]);

    // Calculate display time accounting for startedAt offset (handles page refresh)
    const displaySeconds = (() => {
        if (!isRunning || !startedAt) return elapsedSeconds;
        const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
        return elapsed;
    })();

    const handleStop = useCallback(async () => {
        await stopTimer();
        if (activeProjectId) {
            queryClient.invalidateQueries({ queryKey: ['tasks', activeProjectId] });
        }
    }, [stopTimer, queryClient, activeProjectId]);

    const handleNavigate = useCallback(() => {
        if (activeProjectId) navigate(`/tasks?project=${activeProjectId}`);
    }, [navigate, activeProjectId]);

    return (
        <AnimatePresence>
            {isRunning && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="fixed bottom-6 right-6 z-[150] select-none"
                >
                    <div className="relative flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#0d0d10]/95 border border-theme/30 shadow-2xl shadow-black/60 backdrop-blur-3xl">
                        {/* Theme glow */}
                        <div className="absolute inset-0 rounded-2xl bg-theme/5 pointer-events-none" />
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-theme/50 to-transparent" />

                        {/* Pulsing indicator */}
                        <div className="relative w-8 h-8 rounded-xl bg-theme/10 border border-theme/20 flex items-center justify-center shrink-0">
                            <Timer className="w-4 h-4 text-theme" />
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-theme shadow-[0_0_6px_rgba(var(--theme-rgb),0.8)] animate-pulse" />
                        </div>

                        {/* Info */}
                        <div className="flex flex-col min-w-0">
                            <span className="text-[8px] font-black text-tertiary uppercase tracking-widest leading-none">Recording Session</span>
                            <span className="text-[11px] font-black text-primary truncate max-w-[140px] mt-0.5 leading-tight">
                                {activeTaskTitle}
                            </span>
                        </div>

                        {/* Timer display */}
                        <div className="font-mono text-lg font-black text-theme tabular-nums tracking-tight leading-none">
                            {formatTime(displaySeconds)}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                onClick={handleNavigate}
                                title="Go to task"
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-tertiary hover:text-primary hover:bg-white/8 transition-all"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleStop}
                                title="Stop timer"
                                className="w-7 h-7 rounded-lg flex items-center justify-center bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20 transition-all"
                            >
                                <Square className="w-3 h-3 fill-current" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
