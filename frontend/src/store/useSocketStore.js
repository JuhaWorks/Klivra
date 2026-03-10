import { create } from 'zustand';
import { io } from 'socket.io-client';
import { useAuthStore } from './useAuthStore';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const useSocketStore = create((set, get) => ({
    socket: null,
    isConnected: false,
    activeViewers: [], // [{ userId, name, avatar, status }]
    onlineUsers: [], // Global presence tracking
    fieldLocks: {}, // { fieldId: { userId, userName } }
    isGlobalPresenceVisible: false,
    presenceUsers: [], // Contextual users (e.g., project members)

    connect: (token) => {
        if (get().socket?.connected) return;

        const socket = io(BACKEND_URL, {
            auth: { token },
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            set({ isConnected: true });
            console.log('🚀 Socket connected');
        });

        socket.on('disconnect', () => {
            set({ isConnected: false, activeViewers: [] });
            console.log('🔌 Socket disconnected');
        });

        socket.on('locksUpdated', (locks) => {
            set({ fieldLocks: locks });
        });

        socket.on('presenceUpdate', (viewers) => {
            set({ activeViewers: viewers });
        });

        socket.on('globalPresenceUpdate', (users) => {
            set({ onlineUsers: users });
        });

        socket.on('projectActivity', ({ userName, action }) => {
            import('react-hot-toast').then(({ toast }) => {
                toast(`${userName} ${action}`, {
                    icon: '🚀',
                    style: {
                        borderRadius: '16px',
                        background: '#09090b',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)',
                        fontSize: '13px',
                        fontWeight: '500'
                    },
                    position: 'bottom-right'
                });
            });
        });

        socket.on('statusUpdated', (newStatus) => {
            const { user, syncStatus } = useAuthStore.getState();
            if (user && user.status !== newStatus) {
                // We need a small helper in useAuthStore to just update status without a full API call
                useAuthStore.setState((state) => ({
                    user: state.user ? { ...state.user, status: newStatus } : null
                }));
            }
        });

        set({ socket });
    },

    toggleGlobalPresence: (visible, context = null) => {
        const isCurrentlyVisible = get().isGlobalPresenceVisible;
        const nextVisible = visible ?? !isCurrentlyVisible;

        // "context" can be an array of members or a projectId string
        const newState = { isGlobalPresenceVisible: nextVisible };
        if (Array.isArray(context)) {
            newState.presenceUsers = context;
        } else if (typeof context === 'string') {
            newState.projectSearchId = context;
        }

        set(newState);
    },

    disconnect: () => {
        get().socket?.disconnect();
        set({ socket: null, isConnected: false, activeViewers: [], onlineUsers: [] });
    }
}));
