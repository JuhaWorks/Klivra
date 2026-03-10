import React from 'react';
import { useProjectInsights } from '../../hooks/projects/useProjectQueries';
import {
    Clock,
    Activity,
    ShieldCheck,
    AlertTriangle,
    Zap,
    Calendar,
    ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';

const InsightsTab = ({ projectId }) => {
    const { data: insights, isLoading, error } = useProjectInsights(projectId);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-40 bg-white/5 rounded-3xl border border-white/5" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-20 bg-white/5 rounded-3xl border border-white/5">
                <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
                <p className="text-zinc-400 font-bold">Failed to load insights</p>
            </div>
        );
    }

    const healthColor = {
        'On Track': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        'At Risk': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
        'Overdue': 'text-rose-400 bg-rose-400/10 border-rose-400/20'
    }[insights.healthScore] || 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';

    const healthIcon = {
        'On Track': ShieldCheck,
        'At Risk': AlertTriangle,
        'Overdue': Zap
    }[insights.healthScore] || Activity;

    const HealthIcon = healthIcon;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Project Health Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-gradient-to-br from-zinc-900 to-black rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <HealthIcon className="w-20 h-20" />
                    </div>
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-4">Project Health</p>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl border ${healthColor}`}>
                            <HealthIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white">{insights.healthScore}</h3>
                            <p className="text-zinc-500 text-xs font-bold">Based on timeline & activity</p>
                        </div>
                    </div>
                </motion.div>

                {/* Deadline Tracking Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-6 bg-zinc-900/50 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group"
                >
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-4">Deadline Status</p>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white">
                                {insights.daysRemaining > 0 ? `${insights.daysRemaining} Days` : insights.daysRemaining === 0 ? 'Due Today' : `${Math.abs(insights.daysRemaining)} Days Late`}
                            </h3>
                            <p className="text-zinc-500 text-xs font-bold">Remaining until end date</p>
                        </div>
                    </div>
                </motion.div>

                {/* Activity Velocity Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-6 bg-zinc-900/50 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group"
                >
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-4">Activity Velocity</p>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white">{insights.activityVelocity}</h3>
                            <p className="text-zinc-500 text-xs font-bold">Events in last 7 days</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Detailed Stats / Suggestions */}
            <div className="p-8 bg-zinc-900/30 rounded-3xl border border-white/5">
                <div className="flex items-center gap-3 mb-6">
                    <Zap className="w-5 h-5 text-amber-400" />
                    <h4 className="text-lg font-black text-white tracking-tight">Smart Recommendations</h4>
                </div>
                <div className="space-y-4">
                    {insights.healthScore === 'At Risk' && (
                        <div className="flex items-center gap-4 p-4 bg-amber-400/5 border border-amber-400/10 rounded-2xl">
                            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                            <p className="text-sm text-zinc-300 font-medium">The deadline is approaching fast (under 7 days). Consider re-evaluating priorities.</p>
                        </div>
                    )}
                    {insights.activityVelocity === 0 && (
                        <div className="flex items-center gap-4 p-4 bg-rose-400/5 border border-rose-400/10 rounded-2xl">
                            <Zap className="w-5 h-5 text-rose-400 shrink-0" />
                            <p className="text-sm text-zinc-300 font-medium">No activity recorded in the last 7 days. This project might be stalling.</p>
                        </div>
                    )}
                    <div className="flex items-center gap-4 p-4 bg-zinc-800/20 border border-white/5 rounded-2xl">
                        <Calendar className="w-5 h-5 text-zinc-500 shrink-0" />
                        <p className="text-sm text-zinc-300 font-medium">Keep your project status updated to reflect the most accurate health metrics.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InsightsTab;
