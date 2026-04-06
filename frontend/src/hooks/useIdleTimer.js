import { useEffect, useRef } from 'react';
import { useSocketStore } from '../store/useSocketStore';
import { useAuthStore } from '../store/useAuthStore';

const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const CHANNEL_NAME = 'klivra_presence_sync';

// DOM events that count as user activity
const events = [
    'mousemove',
    'mousedown',
    'keydown',
    'keypress',
    'touchstart',
    'touchmove',
    'scroll',
    'wheel',
    'click',
    'pointerdown',
];

/**
 * useIdleTimer
 * Used globally in Layout.jsx.
 * Tracks user activity across ALL tabs and transitions to "Away" after IDLE_TIMEOUT.
 */
export const useIdleTimer = () => {
    const { socket, isConnected } = useSocketStore();
    const timeoutRef = useRef(null);
    const lastEmittedStatus = useRef(null);
    const channelRef = useRef(null);

    useEffect(() => {
        if (!isConnected || !socket) return;

        // Create a BroadcastChannel to sync activity across tabs
        if (!channelRef.current) {
            channelRef.current = new BroadcastChannel(CHANNEL_NAME);
        }

        const updateStatus = (status, isRemote = false) => {
            if (lastEmittedStatus.current === status) return;

            const { user } = useAuthStore.getState();

            // Respect Manual Sticks (DND/Offline)
            if (user?.status === 'Do Not Disturb' || user?.status === 'Offline') {
                if (status === 'Online' || status === 'Away') {
                    lastEmittedStatus.current = status;
                    return;
                }
            }

            lastEmittedStatus.current = status;

            // Only the "active" tab (the one that triggered the update) should emit to socket
            // to avoid redundant O(N) emissions from every tab.
            if (!isRemote) {
                socket.emit('setStatus', { status });
            }
        };

        const resetTimer = (isRemote = false) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            updateStatus('Online', isRemote);

            // Notify other tabs that we are active
            if (!isRemote && channelRef.current) {
                channelRef.current.postMessage('activity');
            }

            timeoutRef.current = setTimeout(() => {
                updateStatus('Away', false);
            }, IDLE_TIMEOUT);
        };

        // Listen for activity from other tabs
        const handleMessage = (event) => {
            if (event.data === 'activity') {
                resetTimer(true); // Reset timer without re-broadcasting
            }
        };

        channelRef.current.onmessage = handleMessage;

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                resetTimer();
            }
        };

        // THROTTLE: Only reset timer once every 500ms for high-frequency events
        let lastEventTime = 0;
        const throttledReset = () => {
            const now = Date.now();
            if (now - lastEventTime > 500) {
                lastEventTime = now;
                resetTimer();
            }
        };

        // CRITICAL: passive:true tells the browser these listeners NEVER call preventDefault
        // Without this, the browser must wait for every mousemove/touchstart to finish
        // before it can paint — this is a major INP/scroll killer on mobile.
        const listenerOptions = { passive: true };
        events.forEach(event => document.addEventListener(event, throttledReset, listenerOptions));
        document.addEventListener('visibilitychange', handleVisibilityChange);

        resetTimer();

        return () => {
            events.forEach(event => {
                document.removeEventListener(event, throttledReset, listenerOptions);
            });
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (channelRef.current) {
                channelRef.current.close();
                channelRef.current = null;
            }
        };
    }, [socket, isConnected]);
};
