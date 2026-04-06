import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '../store/useSocketStore';

export const useSocketSync = (projectId) => {
    const queryClient = useQueryClient();
    const { socket } = useSocketStore();

    useEffect(() => {
        if (!projectId || !socket) return;

        // Subscribe to this specific project room
        socket.emit('joinProject', projectId);

        // Listen for standard background MVC updates
        const onTaskUpdated = (updatedTask) => {
            queryClient.setQueryData(['tasks', projectId], (oldData) => {
                if (!oldData) return [];
                const taskExists = oldData.some(t => t._id === updatedTask._id);
                if (taskExists) {
                    return oldData.map(t => t._id === updatedTask._id ? updatedTask : t);
                } else {
                    return [...oldData, updatedTask];
                }
            });
        };

        // Listen for raw task deletions
        const onTaskDeleted = (deletedTaskId) => {
            queryClient.setQueryData(['tasks', projectId], (oldData) => {
                if (!oldData) return [];
                return oldData.filter(t => t._id !== deletedTaskId);
            });
        };

        // Listen for direct Kanban "drag" movement events 
        const onTaskMoved = (movedTask) => {
            queryClient.setQueryData(['tasks', projectId], (oldData) => {
                if (!oldData) return [];
                const taskExists = oldData.some(t => t._id === movedTask._id);
                if (taskExists) {
                    return oldData.map(t => t._id === movedTask._id ? { ...t, status: movedTask.newStatus } : t);
                }
                return [...oldData, { ...movedTask, status: movedTask.newStatus }];
            });
        };

        socket.on('taskUpdated', onTaskUpdated);
        socket.on('taskDeleted', onTaskDeleted);
        socket.on('task:moved', onTaskMoved);

        return () => {
            socket.off('taskUpdated', onTaskUpdated);
            socket.off('taskDeleted', onTaskDeleted);
            socket.off('task:moved', onTaskMoved);
            socket.emit('leaveProject', projectId);
        };
    }, [projectId, socket, queryClient]);
};
