import { create } from 'zustand';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';
import { useAuthStore } from './useAuthStore';
import { useChatStore } from './useChatStore';
import { startTransition } from 'react';
import { getOptimizedAvatar } from '../utils/avatar';
import { Bell } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_SOCKET_URL || 
                    import.meta.env.VITE_BACKEND_URL || 
                    import.meta.env.VITE_API_URL || 
                    (import.meta.env.PROD ? 'https://syncforge-io.onrender.com' : 'http://127.0.0.1:5000');

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
        if (get().socket) return;

        // 1. Create the socket instance with polling fallback for Safari compatibility
        const socket = io(BACKEND_URL, {
            auth: { token },
            transports: ['polling', 'websocket'], // Safari Fix: Allow polling fallback
            reconnectionAttempts: 10,
            reconnectionDelay: 500,
            reconnectionDelayMax: 3000,
            timeout: 5000,
        });

        // 2. Immediate state update to prevent race conditions during connection
        set({ socket });

        // Heartbeat interval reference — cleared on disconnect
        let syncInterval = null;

        const startHeartbeat = () => {
            if (syncInterval) clearInterval(syncInterval);
            syncInterval = setInterval(() => {
                if (socket.connected && !document.hidden) {
                    socket.emit('requestPresenceSync');
                }
            }, 20000);
        };

        const joinAllChats = () => {
            const chats = useChatStore.getState().chats || [];
            chats.forEach(chat => socket.emit('join_chat', chat._id));
        };

        // --- Event Listeners ---
        socket.on('connect', () => {
            const user = useAuthStore.getState().user;
            set({ isConnected: true });
            socket.emit('requestPresenceSync');
            if (user?._id) socket.emit('join_chat', `user_${user._id}`);
            joinAllChats();
            startHeartbeat();
            console.log('🚀 Socket connected');
        });

        socket.on('reconnect', () => {
            const { currentProjectId } = get();
            if (currentProjectId) socket.emit('joinProject', currentProjectId);
            socket.emit('requestPresenceSync');
            joinAllChats();
        });

        socket.on('disconnect', (reason) => {
            set({ isConnected: false, activeViewers: [] });
            if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
            console.log('🔌 Socket disconnected:', reason);
        });

        socket.on('locksUpdated', (locks) => set({ fieldLocks: locks }));
        
        socket.on('presenceUpdate', (viewers) => {
            startTransition(() => set({ activeViewers: viewers }));
        });

        socket.on('globalPresenceUpdate', (users) => {
            startTransition(() => set({ onlineUsers: users }));
        });

        socket.on('project_activity', (populated) => {
            const me = useAuthStore.getState().user;
            // 3. De-duplication Fix: Don't show toasts for your own actions
            if (populated.user?._id === me?._id) return;

            // NEW: Skip specific activity types that trigger dedicated "newNotification" events
            // to prevent "Double Toast" syndrome for the recipient.
            const redundantActions = ['AssignmentChanged', 'StatusChanged', 'MetadataUpdated', 'Assignment'];
            if (redundantActions.includes(populated.action)) return;

            const queryClient = get().queryClient;
            if (queryClient) {
                queryClient.invalidateQueries({ queryKey: ['projectActivity', populated.entityId] });
                queryClient.invalidateQueries({ queryKey: ['taskActivity', populated.entityId] });
            }

            const actionMap = {
                'CommentAdded': 'added a comment',
                'TaskCreated': 'created a task',
                'TaskUpdated': 'updated a task',
                'DeadlineUpdated': 'changed a deadline',
                'EntityCreate': 'created a record',
                'EntityDelete': 'deleted a record'
            };

            const actionLabel = actionMap[populated.action] || populated.action.toLowerCase();
            const userName = populated.user?.name || 'Teammate';

            toast(`${userName} ${actionLabel}`, {
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


        socket.on('commentAdded', ({ taskId }) => {
            const queryClient = get().queryClient;
            if (queryClient) {
                queryClient.invalidateQueries({ queryKey: ['taskComments', taskId] });
                queryClient.invalidateQueries({ queryKey: ['taskActivity', taskId] });
            }
        });

        // 4. Unified Typing Handler (Removed duplicate)
        socket.on('typing', ({ chat, userId, isTyping }) => {
            useChatStore.getState().setTyping(chat, userId, isTyping);
        });

        socket.on('statusUpdated', (newStatus) => {
            const { user } = useAuthStore.getState();
            if (user && user.status !== newStatus) {
                useAuthStore.setState((state) => ({
                    user: state.user ? { ...state.user, status: newStatus } : null
                }));
            }
        });

        socket.on('taskUpdated', (task) => {
            const queryClient = get().queryClient;
            if (queryClient) {
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
                if (task?._id) queryClient.invalidateQueries({ queryKey: ['task', task._id] });
            }
        });

        socket.on('taskDeleted', () => {
            const queryClient = get().queryClient;
            if (queryClient) queryClient.invalidateQueries({ queryKey: ['tasks'] });
        });

        socket.on('projectUpdated', () => {
            const queryClient = get().queryClient;
            if (queryClient) {
                queryClient.invalidateQueries({ queryKey: ['projects'] });
                queryClient.invalidateQueries({ queryKey: ['project-detail'] });
            }
        });

        socket.on('whiteboard:noteMoved', ({ noteId, projectId, x, y }) => {
            const queryClient = get().queryClient;
            if (!queryClient) return;
            queryClient.setQueryData(['whiteboard-notes', projectId], (old) => {
                if (!old) return [];
                return old.map(n => n._id === noteId ? { ...n, x, y } : n);
            });
        });

        socket.on('whiteboard:noteCreated', (newNote) => {
            const queryClient = get().queryClient;
            if (!queryClient) return;
            queryClient.setQueryData(['whiteboard-notes', newNote.projectId], (old) => {
                if (!old || old.some(n => n._id === newNote._id)) return old || [newNote];
                return [...old, newNote];
            });
        });

        socket.on('newMessage', ({ chat, message }) => {
            const chatStore = useChatStore.getState();
            const user = useAuthStore.getState().user;
            chatStore.addIncomingMessage(chat, message);

            const isFromMe = message.sender?._id === user?._id || message.sender === user?._id;
            const isCurrentChatOpen = chatStore.activeChat?._id === chat && chatStore.isDrawerOpen;

            if (!isFromMe && !isCurrentChatOpen) {
                const chatObj = chatStore.chats.find(c => c._id === chat);
                const chatName = chatObj?.type === 'group' ? chatObj.name : (message.sender?.name || 'Someone');
                const preview = (message.content || '').slice(0, 50);

                toast(`${chatName}: ${preview}`, {
                    icon: '💬',
                    style: { borderRadius: '16px', background: '#09090b', color: '#fff', border: '1px solid rgba(34,211,238,0.2)', fontSize: '13px' },
                    position: 'bottom-right'
                });
            }
        });

        socket.on('newNotification', (notification) => {
            // Deduplication Fix: Skip 'Chat' and 'Mention' notifications as they are handled by 'newMessage'
            if (notification.type === 'Chat' || notification.type === 'Mention') return;

            const queryClient = get().queryClient;
            if (queryClient) {
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
                queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
            }
            toast(notification.message, {
                icon: notification.priority === 'High' ? '🔥' : '🔔',
                style: { borderRadius: '16px', background: '#09090b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px' },
                position: 'top-right',
                duration: 5000
            });
        });

        socket.on('connection:received', () => {
            get().queryClient?.invalidateQueries({ queryKey: ['pending-connections'] });
        });
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
