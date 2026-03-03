import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore, api } from '../store/useAuthStore';

// URL resolved once at module level (no socket yet — that happens in useEffect)
const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://syncforge-io.onrender.com' : 'http://localhost:5000');

const KanbanBoard = ({ projectId }) => {
    const [tasks, setTasks] = useState({
        Pending: [],
        'In Progress': [],
        Completed: []
    });
    const socketRef = useRef(null);

    useEffect(() => {
        // Create the socket only when this component actually mounts
        socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });
        const socket = socketRef.current;

        // 1. Fetch initial tasks from standard API
        const fetchTasks = async () => {
            try {
                const res = await api.get(`/projects/${projectId}/tasks`);
                const grouped = { Pending: [], 'In Progress': [], Completed: [] };
                res.data.data.forEach(task => {
                    if (grouped[task.status]) grouped[task.status].push(task);
                });
                setTasks(grouped);
            } catch (error) {
                console.error('Failed to fetch tasks', error);
            }
        };

        if (projectId) fetchTasks();

        // 2. Real-Time Socket: receive moves from other users
        socket.on('task:moved', (movedTask) => {
            setTasks(prevTasks => {
                const newTasks = { ...prevTasks };
                for (let status in newTasks) {
                    newTasks[status] = newTasks[status].filter(t => t._id !== movedTask._id);
                }
                if (newTasks[movedTask.newStatus]) {
                    newTasks[movedTask.newStatus].push({ ...movedTask, status: movedTask.newStatus });
                }
                return newTasks;
            });
        });

        // Cleanup: disconnect socket when component unmounts
        return () => {
            socket.off('task:moved');
            socket.disconnect();
        };
    }, [projectId]);

    // HTML5 Drag and Drop Handlers
    const handleDragStart = (e, taskId, currentStatus) => {
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.setData('currentStatus', currentStatus);

    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    const handleDrop = async (e, newStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        const currentStatus = e.dataTransfer.getData('currentStatus');

        if (currentStatus === newStatus) return; // Didn't change columns

        // 1. Optimistic UI Update (move it locally immediately before API finishes)
        const taskToMove = tasks[currentStatus].find(t => t._id === taskId);

        setTasks(prev => ({
            ...prev,
            [currentStatus]: prev[currentStatus].filter(t => t._id !== taskId),
            [newStatus]: [...prev[newStatus], { ...taskToMove, status: newStatus }]
        }));

        // 2. Emit Socket Event so everyone else sees the drag-and-drop instantly!
        socket.emit('task:move', {
            _id: taskId,
            title: taskToMove.title,
            newStatus: newStatus,
            projectId: projectId
        });

        // 3. Persist change to database via REST API
        try {
            await api.put(`/tasks/${taskId}`, { status: newStatus });
        } catch (error) {
            console.error("Failed to update task in DB, reverting UI...", error);
            // Error logic: ideally revert the optimistic UI update here
        }
    };

    const columns = ['Pending', 'In Progress', 'Completed'];

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
                            <div
                                key={task._id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, task._id, status)}
                                className="bg-gray-700 p-4 rounded shadow cursor-grab active:cursor-grabbing hover:bg-gray-650 transition-colors border border-gray-600"
                            >
                                <h3 className="font-semibold text-white">{task.title}</h3>
                                {task.priority && (
                                    <span className={`text-xs mt-2 inline-block px-2 py-1 rounded 
                    ${task.priority === 'High' || task.priority === 'Urgent' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                        {task.priority}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KanbanBoard;
