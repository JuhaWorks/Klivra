import React from 'react';
import { History, User as UserIcon, Calendar, Info, Zap, ChevronRight, Activity } from 'lucide-react';
import { useProjectActivity } from '../../hooks/projects/useProjectQueries';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../ui/Card';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

/**
 * Modern 2026 ActivityTab
 * Cinematic audit trail with Glassmorphism 2.0 and Framer Motion
 */
const ActivityTab = ({ projectId }) => {
    const { data: activities, isLoading } = useProjectActivity(projectId);

    return (
        <div className="space-y-8">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-cyan-400 font-black text-[10px] uppercase tracking-[0.4em]">
                        <History className="w-3.5 h-3.5" />
                        <span>Audit Protocol</span>
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">Operational Timeline.</h2>
                    <p className="text-gray-500 font-medium text-sm max-w-lg">
                        Immutable record of all segment modifications, agent interventions, and system-level neural updates.
                    </p>
                </div>
            </header>

            <Card className="overflow-hidden relative" padding="p-10">
                <div className="relative">
                    {/* Cinematic Timeline Guide */}
                    <div className="absolute left-6 top-4 bottom-4 w-px bg-gradient-to-b from-cyan-500/40 via-white/5 to-transparent" />

                    <div className="space-y-12 relative">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-12 h-12 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_20px_rgba(34,211,238,0.2)]" />
                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest animate-pulse">Synchronizing Logs...</span>
                            </div>
                        ) : !activities || activities.length === 0 ? (
                            <div className="text-center py-24 flex flex-col items-center justify-center">
                                <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                                    <Info className="w-8 h-8 text-gray-700" />
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight">Timeline Inert</h3>
                                <p className="text-gray-500 text-sm mt-1 max-w-xs">No operational data has been recorded for this segment.</p>
                            </div>
                        ) : (
                            <div className="space-y-12">
                                <AnimatePresence mode="popLayout">
                                    {activities.map((log, i) => (
                                        <motion.div 
                                            key={log._id} 
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
                                            className="flex gap-8 group"
                                        >
                                            <div className="relative z-10 shrink-0">
                                                <div className="w-12 h-12 rounded-2xl bg-[#09090b] border border-white/10 flex items-center justify-center overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] group-hover:border-cyan-500/30 group-hover:shadow-cyan-500/10 transition-all duration-500">
                                                    {log.user?.avatar ? (
                                                        <img src={log.user.avatar} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <UserIcon className="w-5 h-5 text-gray-600" />
                                                    )}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-cyan-700/20 border border-cyan-500/30 flex items-center justify-center backdrop-blur-md shadow-xl">
                                                    <Activity className="w-2.5 h-2.5 text-cyan-400" />
                                                </div>
                                            </div>

                                            <div className="flex-1 space-y-3 min-w-0">
                                                <div className="flex flex-col md:flex-row md:items-center gap-3">
                                                    <span className="text-sm font-black text-white tracking-tight">
                                                        {log.user?.name || 'System Sovereign'}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <ChevronRight className="w-3 h-3 text-gray-800" />
                                                        <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
                                                            {log.action.replace(/_/g, ' ')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Semantic Metadata Card */}
                                                {log.details && Object.keys(log.details).length > 0 && (
                                                    <div className="glass-2 bg-white/[0.01] p-4 rounded-2xl border border-white/5 font-medium leading-relaxed max-w-2xl group-hover:border-white/10 transition-colors">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/40" />
                                                            <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.2em]">Delta Payload</span>
                                                        </div>
                                                        <p className="text-xs text-gray-400 font-medium">
                                                            {log.details.name || log.details.title || log.details.description || 'Metadata update successful.'}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                                            {new Date(log.createdAt).toLocaleString([], {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                    </div>
                                                    <div className="w-1 h-1 rounded-full bg-gray-800" />
                                                    <span className="text-[9px] font-black text-gray-700 uppercase tracking-[0.2em]">Protocol Ver: 2.0.26</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <footer className="flex items-center gap-4 px-10 py-6 glass-2 bg-white/5 border border-white/5 rounded-3xl">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-cyan-400" />
                </div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    Real-time audit synchronization active. All interventions are cryptographically signed.
                </p>
            </footer >
        </div>
    );
};

export default ActivityTab;
