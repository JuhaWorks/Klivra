import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from './useAuthStore';

/**
 * Global floating timer store — persists across navigation.
 * Tracks the current active work session for a task.
 */
export const useTimerStore = create(
    persist(
        (set, get) => ({
            activeTaskId: null,
            activeTaskTitle: null,
            activeProjectId: null,
            startedAt: null,   // ISO string
            elapsedSeconds: 0, // accumulated seconds from past sessions
            isRunning: false,
            sessionId: null,

            startTimer: async (task, projectId) => {
                const { isRunning, stopTimer } = get();
                // Stop any existing timer first
                if (isRunning) await stopTimer();

                try {
                    const res = await api.post(`/tasks/${task._id}/timer/start`);
                    set({
                        activeTaskId: task._id,
                        activeTaskTitle: task.title,
                        activeProjectId: projectId,
                        startedAt: new Date().toISOString(),
                        elapsedSeconds: 0,
                        isRunning: true,
                        sessionId: res.data?.sessionId || null,
                    });
                } catch (err) {
                    console.error('Failed to start timer session:', err);
                }
            },

            stopTimer: async () => {
                const { activeTaskId, isRunning } = get();
                if (!isRunning || !activeTaskId) return;
                try {
                    await api.post(`/tasks/${activeTaskId}/timer/stop`);
                } catch (err) {
                    console.error('Failed to stop timer session:', err);
                } finally {
                    set({
                        activeTaskId: null,
                        activeTaskTitle: null,
                        activeProjectId: null,
                        startedAt: null,
                        elapsedSeconds: 0,
                        isRunning: false,
                        sessionId: null,
                    });
                }
            },

            tick: () => set(state => ({ elapsedSeconds: state.elapsedSeconds + 1 })),
        }),
        {
            name: 'klivra-timer-store',
            partialize: (state) => ({
                activeTaskId: state.activeTaskId,
                activeTaskTitle: state.activeTaskTitle,
                activeProjectId: state.activeProjectId,
                startedAt: state.startedAt,
                isRunning: state.isRunning,
            }),
        }
    )
);
