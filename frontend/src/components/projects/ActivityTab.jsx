import React from 'react';
import { History, User as UserIcon, Calendar, Info } from 'lucide-react';
import { useProjectActivity } from '../../hooks/projects/useProjectQueries';

const ActivityTab = ({ projectId }) => {
    const { data: activities, isLoading } = useProjectActivity(projectId);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Audit Trail</h2>
                    <p className="text-zinc-500 text-sm mt-1">Detailed history of changes and interventions.</p>
                </div>
            </div>

            <section className="bg-zinc-950/50 border border-white/5 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
                <div className="p-8 relative">
                    {/* Timeline Line */}
                    <div className="absolute left-10 top-12 bottom-12 w-px bg-gradient-to-b from-zinc-800 via-zinc-800 to-transparent" />

                    <div className="space-y-10 relative">
                        {isLoading ? (
                            <div className="flex justify-center py-20">
                                <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                            </div>
                        ) : activities?.length === 0 ? (
                            <div className="text-center py-20 space-y-4">
                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto">
                                    <Info className="w-6 h-6 text-zinc-600" />
                                </div>
                                <p className="text-zinc-500 text-sm italic">No activity recorded for this project yet.</p>
                            </div>
                        ) : (
                            activities.map((log, i) => (
                                <div key={log._id} className="flex gap-6 group">
                                    <div className="relative z-10">
                                        <div className="w-8 h-8 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl group-hover:border-emerald-500/50 transition-all">
                                            {log.actorId?.avatar ? (
                                                <img src={log.actorId.avatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <UserIcon className="w-4 h-4 text-zinc-500" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-white">
                                                {log.actorId?.name || 'System Auto'}
                                            </span>
                                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                        </div>

                                        {/* Metadata Preview */}
                                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                                            <div className="text-xs text-zinc-500 bg-white/[0.02] p-3 rounded-2xl border border-white/5 font-medium leading-relaxed max-w-lg">
                                                {JSON.stringify(log.metadata, null, 2).substring(0, 150)}...
                                            </div>
                                        )}

                                        <p className="text-[11px] text-zinc-600 flex items-center gap-1.5 font-bold tracking-tight">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(log.createdAt).toLocaleString([], {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ActivityTab;
