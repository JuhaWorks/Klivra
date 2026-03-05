import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://klivra-backend.onrender.com' : 'http://localhost:5000');

export const useSocketSync = (projectId) => {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!projectId) return;

        const socket = io(SOCKET_URL, { transports: ['websocket'] });

        // Subscribe to this specific project room
        socket.emit('joinProject', projectId);

        // Listen for standard background MVC updates
        socket.on('taskUpdated', (updatedTask) => {
            queryClient.setQueryData(['tasks', projectId], (oldData) => {
                if (!oldData) return [];
                const taskExists = oldData.some(t => t._id === updatedTask._id);
                if (taskExists) {
                    return oldData.map(t => t._id === updatedTask._id ? updatedTask : t);
                } else {
                    return [...oldData, updatedTask];
                }
            });
        });

        // Listen for raw task deletions
        socket.on('taskDeleted', (deletedTaskId) => {
            queryClient.setQueryData(['tasks', projectId], (oldData) => {
                if (!oldData) return [];
                return oldData.filter(t => t._id !== deletedTaskId);
            });
        });

        // Listen for direct Kanban "drag" movement events 
        // (Handled directly in KanbanBoard.jsx usually, but we can capture it here globally)
        socket.on('task:moved', (movedTask) => {
            queryClient.setQueryData(['tasks', projectId], (oldData) => {
                if (!oldData) return [];
                const taskExists = oldData.some(t => t._id === movedTask._id);
                if (taskExists) {
                    return oldData.map(t => t._id === movedTask._id ? { ...t, status: movedTask.newStatus } : t);
                }
                return [...oldData, { ...movedTask, status: movedTask.newStatus }];
            });
        });

        return () => {
            socket.off('taskUpdated');
            socket.off('taskDeleted');
            socket.off('task:moved');
            socket.disconnect();
        };
    }, [projectId, queryClient]);
};
