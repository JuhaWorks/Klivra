import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../../../store/useAuthStore';
import { useSocketStore } from '../../../store/useSocketStore';
import { Activity, Clock } from 'lucide-react';
import { renderActivityNarrative } from '../../../utils/activityNarrative';
import { cn } from '../../../utils/cn';

const TaskActivity = ({ taskId, projectId }) => {
    const queryClient = useQueryClient();
    const { socket } = useSocketStore();

    const { data: actRes, isLoading } = useQuery({
        queryKey: ['taskActivity', taskId],
        queryFn: async () => (await api.get(`/tasks/${taskId}/activity`)).data,
        enabled: !!taskId,
        staleTime: 1000 * 60 // 1 minute stale time, but manually invalidated on socket
    });

    React.useEffect(() => {
        if (!socket || !projectId || !taskId) return;

        const handleProjectActivity = (payload) => {
            // If this activity is about THIS task, refresh our list
            if (payload.entityId === taskId || (typeof payload.entityId === 'object' && payload.entityId?._id === taskId)) {
                queryClient.invalidateQueries(['taskActivity', taskId]);
            }
        };

        socket.on('project_activity', handleProjectActivity);
        return () => socket.off('project_activity', handleProjectActivity);
    }, [socket, taskId, projectId, queryClient]);

    const activities = actRes?.data || [];

    if (isLoading) {
        return (
            <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5" />
                        <div className="flex-1 space-y-2 py-1">
                            <div className="h-2 bg-white/5 rounded w-1/2" />
                            <div className="h-2 bg-white/5 rounded w-full" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="py-12 flex flex-col items-center justify-center text-center opacity-20">
                <Activity className="w-8 h-8 mb-4 text-tertiary" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-tertiary">Chronicle Empty</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 relative px-1">
            {/* Timeline Line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-glass" />

            {activities.map((a, i) => (
                <motion.div 
                    key={a._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-5 group relative z-10"
                >
                    <div className="w-8 h-8 rounded-xl bg-sunken border border-glass flex items-center justify-center shrink-0 group-hover:border-theme/30 transition-colors">
                        {a.user?.avatar ? (
                            <img src={a.user.avatar} className="w-full h-full rounded-xl object-cover" alt="" />
                        ) : (
                            <span className="text-[10px] font-black text-theme">
                                {a.user?.name?.charAt(0) || 'S'}
                            </span>
                        )}
                    </div>

                    <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center justify-between gap-4 mb-1.5">
                            <span className="text-[8px] font-black text-tertiary/40 uppercase tracking-widest">
                                {new Date(a.createdAt).toLocaleString([], { 
                                    month: 'short', day: 'numeric', 
                                    hour: '2-digit', minute: '2-digit' 
                                })}
                            </span>
                        </div>
                        <div className="text-[11px] font-black uppercase tracking-tight text-primary/80 group-hover:text-primary transition-colors">
                            {renderActivityNarrative(a)}
                        </div>
                        {a.action === 'EntityUpdate' && a.details?.details && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {a.details.details?.map((change, idx) => (
                                    <span key={idx} className="text-[7px] font-black px-2 py-0.5 bg-theme/5 border border-theme/10 rounded-lg text-theme/60 uppercase">
                                        {change}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default TaskActivity;
