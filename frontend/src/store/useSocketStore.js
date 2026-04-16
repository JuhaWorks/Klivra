import { create } from 'zustand';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';
import { useAuthStore } from './useAuthStore';
import { useChatStore } from './useChatStore';
import { startTransition } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
                    import.meta.env.VITE_API_URL ||
                    (import.meta.env.DEV ? 'http://127.0.0.1:5000' : window.location.origin);

export const useSocketStore = create((set, get) => ({
    socket: null,
    isConnected: false,
    activeViewers: [], // [{ userId, name, avatar, status }]
    onlineUsers: [], // Global presence tracking
    fieldLocks: {}, // { fieldId: { userId, userName } }
    globalPresenceOpen: false,
    currentProjectId: null,
    presenceUsers: [], // Contextual users (e.g., project members)

    connect: (token) => {
        if (get().socket?.connected) return;
        // Don't create a second socket if one is already being set up
        if (get().socket) return;

        const socket = io(BACKEND_URL, {
            auth: { token },
            // WebSocket-only: skip HTTP long-polling entirely for instant connection
            transports: ['websocket'],
            reconnectionAttempts: 10,
            reconnectionDelay: 500,
            reconnectionDelayMax: 3000,
            timeout: 5000,
        });

        // Heartbeat interval reference — cleared on disconnect
        let syncInterval = null;

        const startHeartbeat = () => {
            if (syncInterval) clearInterval(syncInterval);
            // Re-request presence every 20s as a client-side safety net
            syncInterval = setInterval(() => {
                if (socket.connected) {
                    socket.emit('requestPresenceSync');
                }
            }, 20000);
        };

        socket.on('connect', () => {
            set({ isConnected: true });
            // Immediately request fresh presence on every (re)connect
            socket.emit('requestPresenceSync');
            startHeartbeat();
            console.log('🚀 Socket connected');
        });

        socket.on('reconnect', () => {
            const { currentProjectId } = get();
            if (currentProjectId) {
                socket.emit('joinProject', currentProjectId);
            }
            socket.emit('requestPresenceSync');
            console.log('🔄 Socket reconnected — presence synced');
        });

        socket.on('disconnect', (reason) => {
            set({ isConnected: false, activeViewers: [] });
            if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
            console.log('🔌 Socket disconnected:', reason);
        });

        socket.on('locksUpdated', (locks) => {
            set({ fieldLocks: locks });
        });

        socket.on('presenceUpdate', (viewers) => {
            // Non-urgent background update — defer if user is interacting
            startTransition(() => set({ activeViewers: viewers }));
        });

        socket.on('globalPresenceUpdate', (users) => {
            // Non-urgent background update — defer if user is interacting
            startTransition(() => set({ onlineUsers: users }));
        });

        socket.on('projectActivity', ({ userName, action }) => {
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

        socket.on('statusUpdated', (newStatus) => {
            const { user } = useAuthStore.getState();
            if (user && user.status !== newStatus) {
                useAuthStore.setState((state) => ({
                    user: state.user ? { ...state.user, status: newStatus } : null
                }));
            }
        });

        // ── GLOBAL DYNAMIC CACHE SYNCHRONIZATION ──
        // This eliminates the need for manual reloads by automatically refreshing 
        // relevant data when socket events arrive from teammates.
        
        socket.on('taskUpdated', (task) => {
            const queryClient = get().queryClient;
            if (queryClient) {
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
                queryClient.invalidateQueries({ queryKey: ['workspace-stats'] });
                if (task?._id) queryClient.invalidateQueries({ queryKey: ['task', task._id] });
            }
        });

        socket.on('taskDeleted', () => {
            const queryClient = get().queryClient;
            if (queryClient) {
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
                queryClient.invalidateQueries({ queryKey: ['workspace-stats'] });
            }
        });

        socket.on('projectUpdated', () => {
            const queryClient = get().queryClient;
            if (queryClient) {
                queryClient.invalidateQueries({ queryKey: ['projects'] });
                queryClient.invalidateQueries({ queryKey: ['project-detail'] });
                queryClient.invalidateQueries({ queryKey: ['workspace-stats'] });
            }
        });

        // ── WHITEBOARD GRANULAR SYNC ──
        // This surgical approach avoids full refetches, preventing flickering 
        // and cursor jumps while teammates are collaborating.
        
        socket.on('whiteboard:noteCreated', (newNote) => {
            const queryClient = get().queryClient;
            if (!queryClient) return;
            
            queryClient.setQueryData(['whiteboard-notes', newNote.projectId], (oldNotes) => {
                if (!oldNotes) return [newNote];
                // Avoid duplicates if we created it locally first
                if (oldNotes.some(n => n._id === newNote._id)) return oldNotes;
                return [...oldNotes, newNote];
            });
        });

        socket.on('whiteboard:noteUpdated', (updatedNote) => {
            const queryClient = get().queryClient;
            if (!queryClient) return;

            queryClient.setQueryData(['whiteboard-notes', updatedNote.projectId], (oldNotes) => {
                if (!oldNotes) return [updatedNote];
                return oldNotes.map(n => n._id === updatedNote._id ? updatedNote : n);
            });
        });

        socket.on('whiteboard:noteDeleted', (noteId) => {
            const queryClient = get().queryClient;
            if (!queryClient) return;

            // Note: noteDeleted event needs to know which project it belonged to, 
            // but we can look through all whiteboard caches or just rely on the fact 
            // that we have the projekt ID from the current navigation state
            // For now, we'll look for any cache that contains this note ID.
            const queryCache = queryClient.getQueryCache();
            const whiteboardQueries = queryCache.findAll({ queryKey: ['whiteboard-notes'] });
            
            whiteboardQueries.forEach(query => {
                queryClient.setQueryData(query.queryKey, (oldNotes) => {
                    if (!oldNotes) return [];
                    return oldNotes.filter(n => n._id !== noteId);
                });
            });
        });

        socket.on('typing', ({ chat, userId, isTyping }) => {
            useChatStore.getState().setTyping(chat, userId, isTyping);
        });

        socket.on('newNotification', (notification) => {
            const queryClient = get().queryClient;
            if (queryClient) {
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
                queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
            }
        });

        set({ socket });
    },

    setQueryClient: (queryClient) => set({ queryClient }),


    toggleGlobalPresence: (visible, context = null) => {
        const isCurrentlyVisible = get().globalPresenceOpen;
        const nextVisible = visible ?? !isCurrentlyVisible;

        // "context" can be an array of members or a projectId string
        const newState = { globalPresenceOpen: nextVisible };
        if (Array.isArray(context)) {
            newState.presenceUsers = context;
            newState.currentProjectId = null;
        } else if (typeof context === 'string') {
            newState.currentProjectId = context;
            newState.presenceUsers = [];
        } else if (!nextVisible) {
            // Reset context on close
            newState.currentProjectId = null;
            newState.presenceUsers = [];
        }

        set(newState);
    },

    joinProject: (projectId) => {
        const { socket } = get();
        if (socket) {
            socket.emit('joinProject', projectId);
            set({ currentProjectId: projectId });
        }
    },

    leaveProject: (projectId) => {
        const { socket } = get();
        if (socket) {
            socket.emit('leaveProject', projectId);
            set({ currentProjectId: null });
        }
    },

    disconnect: () => {
        get().socket?.disconnect();
        set({ socket: null, isConnected: false, activeViewers: [], onlineUsers: [], globalPresenceOpen: false, currentProjectId: null, presenceUsers: [] });
    }
}));
