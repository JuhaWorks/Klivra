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
import { Skeleton } from '../ui/Loading';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


/**
 * Modern 2026 InsightsTab
 * Intelligence core with predictive analytics and Glassmorphism 2.0
 */
const InsightsTab = ({ projectId }) => {
    const { data: insights, isLoading, error } = useProjectInsights(projectId);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-44 w-full rounded-[2.5rem]" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24 glass-2 bg-red-500/5 border border-red-500/10 rounded-[3rem]">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-6" />
                <h3 className="text-xl font-black text-white tracking-tight">Intelligence Failure</h3>
                <p className="text-gray-500 font-medium mt-1">Failed to synchronize with the analytics node.</p>
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
                        <BrainCircuit className="w-4 h-4" />
                        <span>Intelligence Core</span>
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tighter">Segment Analytics.</h2>
                    <p className="text-gray-500 font-medium text-sm max-w-lg">
                        Predictive performance metrics, temporal tracking, and neural health indicators for this project domain.
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
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Node Vitality</span>
                            <div className="flex items-center gap-5">
                                <div className={twMerge(clsx("p-4 rounded-2xl border transition-all duration-500 shadow-xl", healthColor))}>
                                    <HealthIcon className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-black text-white tracking-tighter">{insights.healthScore}</h3>
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Active Neural Status</p>
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
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Temporal Horizon</span>
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-cyan-400 shadow-xl shadow-cyan-500/5 group-hover:bg-cyan-500/20 transition-all">
                                    <Clock className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-black text-white tracking-tighter">
                                        {insights.daysRemaining > 0 ? `${insights.daysRemaining} Days` : insights.daysRemaining === 0 ? 'Due Today' : `${Math.abs(insights.daysRemaining)} Late`}
                                    </h3>
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Remaining Frequency</p>
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
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Transmission Flow</span>
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 shadow-xl shadow-indigo-500/5 group-hover:bg-indigo-500/20 transition-all">
                                    <TrendingUp className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-black text-white tracking-tighter">{insights.activityVelocity}</h3>
                                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Events / 7-Day Cycle</p>
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
                    <h4 className="text-xl font-black text-white tracking-tighter uppercase">Predictive Directives</h4>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AnimatePresence>
                        {insights.healthScore === 'At Risk' && (
                            <motion.div 
                                key="health-warning"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-start gap-5 p-8 glass-2 bg-amber-500/5 border border-amber-500/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group"
                            >
                                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 shrink-0">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest">Protocol Warning: Sequential Strain</span>
                                    <p className="text-sm text-gray-300 font-medium leading-relaxed">
                                        Segment deadline approaches within a <span className="text-white font-black">7-Day Horizon</span>. Immediate node reprioritization recommended to avoid temporal drift.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                        {insights.activityVelocity === 0 && (
                            <motion.div 
                                key="stagnation-warning"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-start gap-5 p-8 glass-2 bg-rose-500/5 border border-rose-500/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group"
                            >
                                <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500 shrink-0">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div className="space-y-2">
                                    <span className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest">System Warning: Node Stagnation</span>
                                    <p className="text-sm text-gray-300 font-medium leading-relaxed">
                                        Zero transmissions detected in the previous cycle. Operational domain is nearing <span className="text-white font-black">Inert State</span>.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                        <motion.div 
                            key="maintenance-directive"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-start gap-5 p-8 glass-2 bg-white/5 border border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden group"
                        >
                            <div className="p-3 bg-white/5 rounded-xl text-gray-500 shrink-0">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div className="space-y-2">
                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Maintenance Directive</span>
                                <p className="text-sm text-gray-400 font-medium leading-relaxed">
                                    Maintain high neural fidelity by ensuring status identifiers are synchronized with actual progress metrics.
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
