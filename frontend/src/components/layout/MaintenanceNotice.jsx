import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Calendar, Clock } from 'lucide-react';
import { api, useAuthStore } from '../../store/useAuthStore';
import { useSocketStore } from '../../store/useSocketStore';

/**
 * Hook: Fetches and tracks system maintenance state with server clock correction.
 *
 * Expected API shape (response.data):
 *   isUnderMaintenance  boolean
 *   scheduledEndTime    ISO 8601 string | null
 *   startedAt           ISO 8601 string | null
 *   message             string | null   ← admin-authored notice shown to users
 *   incidentId          string | null
 */
export const useMaintenanceStatus = () => {
    const queryClient = useQueryClient();
    const { socket } = useSocketStore();
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [serverClockOffset, setServerClockOffset] = useState(0);

    const { data: statusResponse } = useQuery({
        queryKey: ['system.maintenance'],
        queryFn: async () => {
            const requestTime = Date.now();
            const response = (await api.get('/admin/system/status')).data;
            const serverTime = new Date(response.timestamp ?? Date.now()).getTime();
            const rtt = Date.now() - requestTime;
            setServerClockOffset(serverTime - (requestTime + rtt / 2));
            return response;
        },
        refetchInterval: (query) =>
            query.state.data?.data?.isUnderMaintenance ? 15_000 : 60_000,
        staleTime: 5_000,
    });

    const status = statusResponse?.data ?? {};
    const isUnderMaintenance = !!status.isUnderMaintenance;
    const scheduledEndTime = status.scheduledEndTime ? new Date(status.scheduledEndTime).getTime() : null;
    const startedAt = status.startedAt ? new Date(status.startedAt) : null;
    const adminMessage = status.message ?? null;
    const incidentId = status.incidentId ?? null;

    useEffect(() => {
        if (!socket) return;
        const invalidate = () => queryClient.invalidateQueries({ queryKey: ['system.maintenance'] });
        const onEnd = () => { invalidate(); setTimeout(() => window.location.reload(), 2_000); };
        socket.on('maintenance:started', invalidate);
        socket.on('maintenance:updated', invalidate);
        socket.on('maintenance:ended', onEnd);
        return () => {
            socket.off('maintenance:started', invalidate);
            socket.off('maintenance:updated', invalidate);
            socket.off('maintenance:ended', onEnd);
        };
    }, [socket, queryClient]);

    useEffect(() => {
        if (!scheduledEndTime || !isUnderMaintenance) return;
        const tick = () => {
            const delta = scheduledEndTime - (Date.now() + serverClockOffset);
            setTimeRemaining(delta > 0 ? delta : 0);
            if (delta <= 0) queryClient.invalidateQueries({ queryKey: ['system.maintenance'] });
        };
        const id = setInterval(tick, 1_000);
        tick();
        return () => clearInterval(id);
    }, [scheduledEndTime, isUnderMaintenance, serverClockOffset, queryClient]);

    return { isUnderMaintenance, timeRemaining, startedAt, scheduledEndTime, adminMessage, incidentId };
};

const pad = (n) => String(Math.max(0, n)).padStart(2, '0');

const formatCountdown = (ms) => {
    if (ms <= 0) return null;
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1_000);
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const formatCountdownUnit = (ms) => {
    if (ms <= 0) return null;
    return Math.floor(ms / 3_600_000) > 0 ? 'hr  ·  min  ·  sec' : 'min  ·  sec';
};

const formatEndTime = (ts) => {
    if (!ts) return null;
    return new Date(ts).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
    });
};

/**
 * MaintenanceBanner
 *
 * Admin  → slim top banner: live countdown, scheduled end time, admin message.
 * User   → full-screen overlay: admin message, large countdown, scheduled end time.
 * Exempt paths (login, register, verify-email) are never affected.
 */
const MaintenanceNotice = () => {
    const { user } = useAuthStore();
    const location = useLocation();
    const {
        isUnderMaintenance,
        timeRemaining,
        scheduledEndTime,
        adminMessage,
        incidentId,
    } = useMaintenanceStatus();

    const isAdmin = user?.role === 'Admin';
    const isExemptPath = useMemo(
        () => ['/login', '/register', '/verify-email'].some((p) => location.pathname.startsWith(p)),
        [location.pathname]
    );

    useEffect(() => {
        const lock = isUnderMaintenance && !isAdmin && !isExemptPath;
        document.body.style.overflow = lock ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isUnderMaintenance, isAdmin, isExemptPath]);

    if (!isUnderMaintenance || isExemptPath) return null;

    const countdown = formatCountdown(timeRemaining);
    const countdownUnit = formatCountdownUnit(timeRemaining);
    const endTimeStr = formatEndTime(scheduledEndTime);
    const displayMsg = adminMessage ?? 'Scheduled system maintenance is currently underway.';

    return (
        <AnimatePresence>
            {isAdmin ? (
                /* ── Admin slim banner ───────────────────────────── */
                <motion.div
                    key="admin-banner"
                    initial={{ y: -52, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -52, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="fixed top-0 left-0 right-0 z-[10001] h-11
                               flex items-center px-6
                               bg-black/75 backdrop-blur-xl
                               border-b border-white/[0.06]"
                >
                    <div className="flex items-center gap-4 w-full">
                        {/* Pulse dot */}
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="relative flex h-[7px] w-[7px]">
                                <span className="animate-ping absolute inset-0 rounded-full bg-emerald-400/50" />
                                <span className="relative block w-[7px] h-[7px] rounded-full bg-emerald-500" />
                            </span>
                            <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/80">
                                Maintenance active
                            </span>
                        </div>

                        <div className="w-px h-4 bg-white/[0.08] shrink-0" />

                        {/* Admin message */}
                        <span className="text-[12px] text-white/35 truncate flex-1 min-w-0">
                            {displayMsg}
                        </span>

                        {/* Right */}
                        <div className="flex items-center gap-3 ml-auto shrink-0">
                            {endTimeStr && (
                                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-white/28">
                                    <Calendar className="w-[11px] h-[11px]" />
                                    <span>Ends {endTimeStr}</span>
                                </div>
                            )}

                            <div className="w-px h-4 bg-white/[0.07]" />

                            {countdown && (
                                <div className="flex items-center gap-1.5 px-3 py-[3px] rounded-full
                                                font-mono text-[12px] font-semibold text-emerald-400
                                                bg-emerald-500/[0.08] border border-emerald-500/[0.15]">
                                    <Clock className="w-[10px] h-[10px] opacity-60" />
                                    {countdown}
                                </div>
                            )}

                            <div className="flex items-center gap-[5px] px-2.5 py-[3px] rounded-full
                                            bg-white/[0.04] border border-white/[0.08]
                                            text-white/30 text-[10px] font-semibold uppercase tracking-[0.08em]">
                                <Lock className="w-[9px] h-[9px]" />
                                Admin
                            </div>
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-px
                                    bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent" />
                </motion.div>

            ) : (
                /* ── User full-screen overlay ───────────────────── */
                <motion.div
                    key="user-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="fixed inset-0 z-[10000] bg-[#080808]
                               flex flex-col items-center justify-center
                               p-6 sm:p-12 overflow-hidden"
                >
                    {/* Fine grid texture */}
                    <div
                        className="absolute inset-0 opacity-[0.12]"
                        style={{
                            backgroundImage:
                                'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px),' +
                                'linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
                            backgroundSize: '48px 48px',
                            maskImage:
                                'radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 100%)',
                            WebkitMaskImage:
                                'radial-gradient(ellipse 70% 60% at 50% 50%, black 20%, transparent 100%)',
                        }}
                    />

                    <div className="relative z-10 w-full max-w-[520px] flex flex-col items-center gap-y-10 sm:gap-y-12">
                        
                        <div className="flex flex-col items-center">
                            {/* Icon */}
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                                className="mb-6 sm:mb-8"
                            >
                                <div className="w-16 h-16 rounded-[22px]
                                                bg-emerald-500/[0.07] border border-emerald-500/[0.13]
                                                flex items-center justify-center">
                                    <ShieldCheck className="w-8 h-8 text-emerald-500" strokeWidth={1.5} />
                                </div>
                            </motion.div>

                            {/* Heading */}
                            <motion.h1
                                initial={{ y: 16, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.16, duration: 0.45 }}
                                className="text-center font-extrabold text-white tracking-[-0.04em] leading-[1.05] mb-4"
                                style={{ fontSize: 'clamp(32px, 8vw, 56px)' }}
                            >
                                System Maintenance
                            </motion.h1>

                            {/* Admin message */}
                            <motion.p
                                initial={{ y: 12, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.22, duration: 0.4 }}
                                className="text-[14px] sm:text-[16px] text-center leading-[1.7] text-white/40
                                           max-w-[400px]"
                            >
                                {displayMsg}
                            </motion.p>
                        </div>

                        {/* Middle Section: Countdown + Divider */}
                        <div className="w-full flex flex-col items-center">
                            {/* Hairline */}
                            <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ delay: 0.28, duration: 0.55 }}
                                className="w-full h-px bg-white/[0.06] mb-10 sm:mb-12"
                            />

                            {/* Countdown */}
                            {countdown && (
                                <motion.div
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.32, duration: 0.4 }}
                                    className="flex flex-col items-center gap-y-2 mb-10 sm:mb-12"
                                >
                                    <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-500/40">
                                        Estimated time remaining
                                    </span>
                                    <span
                                        className="font-mono font-bold text-white leading-none tracking-[-0.025em] tabular-nums"
                                        style={{ fontSize: 'clamp(52px, 15vw, 84px)' }}
                                    >
                                        {countdown}
                                    </span>
                                    {countdownUnit && (
                                        <span className="font-mono text-[9px] sm:text-[10px] text-white/12 tracking-[0.28em] uppercase">
                                            {countdownUnit}
                                        </span>
                                    )}
                                </motion.div>
                            )}

                            {/* Scheduled end time pill */}
                            {endTimeStr && (
                                <motion.div
                                    initial={{ y: 8, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.38, duration: 0.4 }}
                                    className="flex items-center gap-x-2.5 px-6 py-3 rounded-2xl
                                               bg-white/[0.03] border border-white/[0.08]"
                                >
                                    <Calendar className="w-4 h-4 text-emerald-500/50 shrink-0" />
                                    <span className="text-sm text-white/35">
                                        Scheduled to resume
                                    </span>
                                    <span className="text-sm text-white/75 font-semibold">
                                        {endTimeStr}
                                    </span>
                                </motion.div>
                            )}
                        </div>

                        {/* Footer Section: Incident ID */}
                        {incidentId && (
                            <div className="w-full flex flex-col items-center pt-8">
                                <div className="w-20 h-px bg-white/[0.05] mb-6" />
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="font-mono text-[11px] text-white/14 tracking-[0.08em] uppercase"
                                >
                                    Incident Reference · {incidentId}
                                </motion.p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MaintenanceNotice;