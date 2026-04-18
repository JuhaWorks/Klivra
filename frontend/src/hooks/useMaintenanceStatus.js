import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../store/useAuthStore';
import { useSocketStore } from '../store/useSocketStore';

/**
 * Hook: Fetches and tracks system maintenance state with server clock correction.
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

/* --- Helpers --- */

const pad = (n) => String(Math.max(0, n)).padStart(2, '0');

export const formatCountdown = (ms) => {
    if (ms <= 0) return null;
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1_000);
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

export const formatCountdownUnit = (ms) => {
    if (ms <= 0) return null;
    return Math.floor(ms / 3_600_000) > 0 ? 'hr  ·  min  ·  sec' : 'min  ·  sec';
};

export const formatEndTime = (ts) => {
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
