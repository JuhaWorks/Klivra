import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { api } from '../../store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSocketSync } from '../../hooks/useSocketSync';

// URL resolved once at module level (no socket yet — that happens in useEffect)
const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://klivra-backend.onrender.com' : 'http://localhost:5000');

// Extracted into a pure memoized component to prevent re-rendering unaffected cards
const TaskCard = React.memo(({ task, onDragStart }) => {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, task._id, task.status)}
            className="bg-gray-700 p-4 rounded shadow cursor-grab active:cursor-grabbing hover:bg-gray-650 transition-colors border border-gray-600"
        >
            <h3 className="font-semibold text-white">{task.title}</h3>
            {task.priority && (
                <span className={`text-xs mt-2 inline-block px-2 py-1 rounded 
                ${task.priority === 'High' || task.priority === 'Urgent' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {task.priority}
                </span>
            )}
        </div>
    );
});

// Added displayName for React DevTools readability
TaskCard.displayName = 'TaskCard';

const KanbanBoard = ({ projectId }) => {
    const queryClient = useQueryClient();
    const socketRef = useRef(null); // Keep ref for emitting drags (or we could move emit to hook too)

    // Activate Real-Time Global Sync
    useSocketSync(projectId);

    // 1. Fetch initial tasks utilizing React Query for automatic caching
    const { data: rawTasks = [], isLoading } = useQuery({
        queryKey: ['tasks', projectId],
        queryFn: async () => {
            const res = await api.get(`/projects/${projectId}/tasks`);
            return res.data.data;
        },
        enabled: !!projectId,
    });

    // 2. React Mutation for zero-latency Optimistic Updates
    const updateTaskMutation = useMutation({
        mutationFn: async ({ taskId, newStatus }) => {
            await api.put(`/tasks/${taskId}`, { status: newStatus });
        },
        onMutate: async ({ taskId, newStatus }) => {
            // Cancel outgoing refetches so they don't overwrite optimistic UI
            await queryClient.cancelQueries({ queryKey: ['tasks', projectId] });
            const previousTasks = queryClient.getQueryData(['tasks', projectId]);

            // Optimistically update to the new value instantly
            queryClient.setQueryData(['tasks', projectId], (old) => {
                if (!old) return [];
                return old.map(t =>
                    t._id === taskId ? { ...t, status: newStatus } : t
                );
            });

            // Return context with previous task data for rollback
            return { previousTasks };
        },
        onError: (err, variables, context) => {
            console.error("Failed to update task in DB, reverting UI...", err);
            // Rollback on error
            if (context?.previousTasks) {
                queryClient.setQueryData(['tasks', projectId], context.previousTasks);
            }
        }
    });

    // 3. useMemo for heavy client-side filtering (grouping raw array into columns)
    const tasks = useMemo(() => {
        const grouped = { Pending: [], 'In Progress': [], Completed: [] };
        rawTasks.forEach(task => {
            if (grouped[task.status]) grouped[task.status].push(task);
        });
        return grouped;
    }, [rawTasks]);

    // HTML5 Drag and Drop Handlers (wrapped in useCallback so they don't break TaskCard memoization)
    const handleDragStart = useCallback((e, taskId, currentStatus) => {
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.setData('currentStatus', currentStatus);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault(); // Necessary to allow dropping
    }, []);

    const handleDrop = useCallback(async (e, newStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        const currentStatus = e.dataTransfer.getData('currentStatus');

        if (currentStatus === newStatus) return; // Didn't change columns

        const taskToMove = rawTasks.find(t => t._id === taskId);
        if (!taskToMove) return;

        // 1. Instantly triggers Optimistic UI via React Query Mutation
        updateTaskMutation.mutate({ taskId, newStatus });

        // 2. Emit Socket Event so everyone else sees the drag-and-drop instantly!
        socketRef.current?.emit('task:move', {
            _id: taskId,
            title: taskToMove.title,
            newStatus: newStatus,
            projectId: projectId
        });
    }, [rawTasks, projectId, updateTaskMutation]);

    const columns = ['Pending', 'In Progress', 'Completed'];

    if (isLoading) {
        return (
            <div className="flex h-[500px] items-center justify-center bg-gray-900 border border-gray-800 rounded-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="flex gap-6 p-6 min-h-[500px] overflow-x-auto bg-gray-900 border border-gray-800 rounded-xl">
            {columns.map(status => (
                <div
                    key={status}
                    className="flex-1 min-w-[300px] bg-gray-800 rounded-lg p-4"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, status)}
                >
                    <h2 className="text-xl font-bold text-gray-200 mb-4 pb-2 border-b border-gray-700">
                        {status} <span className="text-sm font-normal text-gray-500 ml-2">({tasks[status].length})</span>
                    </h2>

                    <div className="space-y-3 min-h-[100px]">
                        {tasks[status].map(task => (
                            <TaskCard
                                key={task._id}
                                task={task}
                                onDragStart={handleDragStart}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KanbanBoard;
