import React from 'react';
import { useProjectInsights } from '../../hooks/projects/useProjectQueries';
import {
    Clock,
    Activity,
    ShieldCheck,
    AlertTriangle,
    Zap,
    Calendar,
    ArrowRight,
    TrendingUp,
    Target,
    BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../ui/Card';
import { Skeleton } from '../ui/PremiumLoaders';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


/**
 * Modern 2026 InsightsTab
 * Advanced Data Analytics with predictive metrics and Glassmorphism 2.0
 */
const InsightsTab = ({ projectId }) => {
    const { data: insights, isLoading, error } = useProjectInsights(projectId);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-44 w-full rounded-2xl" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24 glass-2 bg-red-500/5 border border-red-500/10 rounded-2xl">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-6" />
                <h3 className="text-xl font-black text-white tracking-tight">Analytics Sync Failed</h3>
                <p className="text-gray-500 font-medium mt-1">Failed to synchronize with the analytics server.</p>
            </div>
        );
    }

    const healthColor = {
        'On Track': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 shadow-emerald-500/10',
        'At Risk': 'text-amber-400 bg-amber-400/10 border-amber-400/20 shadow-amber-500/10',
        'Overdue': 'text-rose-400 bg-rose-400/10 border-rose-400/20 shadow-rose-500/10'
    }[insights.healthScore] || 'text-gray-400 bg-white/5 border-white/10';

    const healthIcon = {
        'On Track': ShieldCheck,
        'At Risk': AlertTriangle,
        'Overdue': Zap
    }[insights.healthScore] || Activity;

    const HealthIcon = healthIcon;

    return (
        <div className="space-y-10">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-cyan-400 font-black text-[10px] uppercase tracking-[0.4em]">
                        <Activity className="w-4 h-4" />
                        <span>Project Analytics</span>
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">Project Insights.</h2>
                    <p className="text-gray-500 font-medium text-sm max-w-lg">
                        Performance metrics, timeline tracking, and project health indicators for this workspace.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Project Health Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative"
                >
                    <Card className="h-full overflow-hidden" padding="p-8">
                        <div className="absolute top-[-10%] right-[-5%] p-4 opacity-5 group-hover:opacity-10 transition-all duration-700 pointer-events-none">
                            <HealthIcon className="w-32 h-32" />
                        </div>
                        
                        <div className="flex flex-col h-full gap-6">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Project Status</span>
                            <div className="flex items-center gap-5">
                                <div className={twMerge(clsx("p-4 rounded-2xl border transition-all duration-500 shadow-xl", healthColor))}>
                                    <HealthIcon className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-black text-white tracking-tighter">{insights.healthScore}</h3>
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Current Status</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Deadline Tracking Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="group"
                >
                    <Card className="h-full overflow-hidden" padding="p-8">
                        <div className="absolute top-[-10%] right-[-5%] p-4 opacity-5 group-hover:opacity-10 transition-all duration-700 pointer-events-none">
                            <Clock className="w-32 h-32" />
                        </div>

                        <div className="flex flex-col h-full gap-6">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Timeline Tracking</span>
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-cyan-400 shadow-xl shadow-cyan-500/5 group-hover:bg-cyan-500/20 transition-all">
                                    <Clock className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-black text-white tracking-tighter">
                                        {insights.daysRemaining > 0 ? `${insights.daysRemaining} Days` : insights.daysRemaining === 0 ? 'Due Today' : `${Math.abs(insights.daysRemaining)} Late`}
                                    </h3>
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Days Remaining</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Activity Velocity Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="group"
                >
                    <Card className="h-full overflow-hidden" padding="p-8">
                        <div className="absolute top-[-10%] right-[-5%] p-4 opacity-5 group-hover:opacity-10 transition-all duration-700 pointer-events-none">
                            <TrendingUp className="w-32 h-32" />
                        </div>

                        <div className="flex flex-col h-full gap-6">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Activity Velocity</span>
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 shadow-xl shadow-indigo-500/5 group-hover:bg-indigo-500/20 transition-all">
                                    <TrendingUp className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-black text-white tracking-tighter">{insights.activityVelocity}</h3>
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Updates this week</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </div>

            {/* Smart Recommendations Segment */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-1">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <h4 className="text-xl font-black text-white tracking-tighter uppercase">Performance Metrics</h4>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AnimatePresence>
                        {insights.healthScore === 'At Risk' && (
                            <motion.div 
                                key="health-warning"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-start gap-5 p-8 glass-2 bg-amber-500/5 border border-amber-500/10 rounded-2xl shadow-2xl relative overflow-hidden group"
                            >
                                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 shrink-0">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest">Attention: Approaching Deadline</span>
                                    <p className="text-sm text-gray-300 font-medium leading-relaxed">
                                        A major deadline is approaching within <span className="text-white font-black">7 days</span>. Consider reprioritizing tasks to ensure on-time completion.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                        {insights.activityVelocity === 0 && (
                            <motion.div 
                                key="stagnation-warning"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-start gap-5 p-8 glass-2 bg-rose-500/5 border border-rose-500/10 rounded-2xl shadow-2xl relative overflow-hidden group"
                            >
                                <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500 shrink-0">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest">Attention: Inactive Workspace</span>
                                    <p className="text-sm text-gray-300 font-medium leading-relaxed">
                                        No activity has been detected in this project recently. This project may need attention to resume progress.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                        <motion.div 
                            key="maintenance-suggestion"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-start gap-5 p-8 glass-2 bg-white/5 border border-white/5 rounded-2xl shadow-2xl relative overflow-hidden group"
                        >
                            <div className="p-3 bg-white/5 rounded-xl text-gray-500 shrink-0">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div className="space-y-2">
                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Project Maintenance</span>
                                <p className="text-sm text-gray-400 font-medium leading-relaxed">
                                    Keep your project data accurate and up to date by regularly updating task statuses.
                                </p>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default InsightsTab;
