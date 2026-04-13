import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { X, Shield, MapPin, Activity, Award, Calendar, CheckCircle2, Star, Zap, UserPlus, MessageCircle, Briefcase, LayoutGrid, ThumbsUp } from 'lucide-react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    ResponsiveContainer
} from 'recharts';
import { api } from '../../store/useAuthStore';
import { getOptimizedAvatar } from '../../utils/avatar';

const getLevelProgress = (xp, level) => {
    // Mirror the thresholds from backend
    const thresholds = {
        1: 0, 2: 50, 3: 150, 4: 300, 5: 600,
        6: 1000, 7: 1500, 8: 2200, 9: 3200, 10: 4500
    };
    
    // Fallback scaling for 10+
    const getReq = (lvl) => thresholds[lvl] || (thresholds[10] + (lvl - 10) * 5000);
    
    const baseXP = getReq(level);
    const nextXP = getReq(level + 1);
    const progress = Math.min(100, Math.max(0, ((xp - baseXP) / (nextXP - baseXP)) * 100));
    
    return { progress, nextXP };
};

export default function UserProfileModal({ isOpen, onClose, userId }) {
    const { data: res, isLoading } = useQuery({
        queryKey: ['publicProfile', userId],
        queryFn: async () => (await api.get(`/users/public/${userId}`)).data,
        enabled: !!userId && isOpen,
        staleTime: 1000 * 60 * 5,
    });

    const { data: endorsementsRes, refetch: refetchEndorsements } = useQuery({
        queryKey: ['endorsements', userId],
        queryFn: async () => (await api.get(`/endorsements/user/${userId}`)).data,
        enabled: !!userId && isOpen,
    });

    const toggleEndorsement = async (skillName) => {
        try {
            await api.post('/endorsements/toggle', { toUserId: userId, skillName });
            refetchEndorsements();
        } catch (err) {
            console.error(err);
        }
    };

    const user = res?.data;
    const endorsements = endorsementsRes?.data || { counts: {}, myEndorsements: [] };

    if (!isOpen) return null;

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center p-12">
                    <div className="w-8 h-8 rounded-full border-2 border-theme border-t-transparent animate-spin mb-4" />
                    <span className="text-xs font-black text-tertiary uppercase tracking-widest">Loading Profile...</span>
                </div>
            );
        }

        if (!user) {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                    <span className="text-xs font-black text-danger uppercase tracking-widest">Profile not found</span>
                </div>
            );
        }

        const stats = user.gamification || { xp: 0, level: 1, badges: [] };
        const { progress, nextXP } = getLevelProgress(stats.xp, stats.level);

        return (
            <div className="flex flex-col">
                {/* Banner Area */}
                <div className="h-32 w-full relative">
                    <div className={cn(
                        "w-full h-full bg-gradient-to-br from-theme/20 via-surface to-sunken",
                        user.coverImage ? "" : "opacity-100"
                    )} />
                    {user.coverImage && <img src={user.coverImage} className="w-full h-full object-cover" alt="Banner" />}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-base to-transparent" />
                </div>

                {/* Profile Identity */}
                <div className="px-8 -mt-12 relative z-10">
                    <div className="flex items-end gap-6">
                        <div className="relative">
                            <div className="w-28 h-28 rounded-3xl overflow-hidden ring-8 ring-base shadow-2xl relative group">
                                <img 
                                    src={getOptimizedAvatar(user.avatar)} 
                                    alt={user.name}
                                    className="w-full h-full object-cover"
                                />
                                {user.status === 'Online' && (
                                    <div className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-success border-4 border-base" />
                                )}
                            </div>
                            <div className="absolute -bottom-2 -left-2 w-8 h-8 rounded-xl bg-theme text-black flex items-center justify-center text-[10px] font-extrabold shadow-lg border-2 border-base">
                                L{stats.level}
                            </div>
                        </div>

                        <div className="flex-1 pb-2">
                             <div className="flex items-center gap-3">
                                <h2 className="text-3xl font-black text-primary tracking-tighter truncate">{user.name}</h2>
                                <span className="px-2 py-0.5 rounded-md bg-theme/10 text-[9px] font-black text-theme border border-theme/20 uppercase">
                                    {user.role}
                                </span>
                             </div>
                             <div className="flex items-center gap-3 mt-1.5 text-tertiary">
                                {user.location && (
                                    <span className="flex items-center gap-1 text-[11px] font-bold">
                                        <MapPin className="w-3 h-3" /> {user.location}
                                    </span>
                                )}
                                <span className="w-1 h-1 rounded-full bg-tertiary/30" />
                                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider">
                                    PROFESSIONAL SUITE
                                </span>
                             </div>
                        </div>
                    </div>

                    {user.bio && (
                        <p className="mt-6 text-sm text-secondary leading-relaxed opacity-90 p-4 rounded-2xl bg-sunken/50 border border-glass italic">
                            {user.bio}
                        </p>
                    )}
                </div>

                <div className="px-8 pb-8 space-y-6 mt-4">
                    {/* Mutual Collaboration Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-sunken border border-glass rounded-3xl p-6 flex flex-col items-center text-center relative overflow-hidden group">
                           <Briefcase className="w-5 h-5 text-theme mb-3" />
                           <span className="text-[10px] font-black text-tertiary uppercase tracking-widest">Mutual Projects</span>
                           <div className="text-3xl font-black text-primary mt-1">{user.mutualStats?.projects || 0}</div>
                        </div>
                        
                        <div className="bg-sunken border border-glass rounded-3xl p-6 flex flex-col items-center text-center relative overflow-hidden group">
                           <LayoutGrid className="w-5 h-5 text-success mb-3" />
                           <span className="text-[10px] font-black text-tertiary uppercase tracking-widest">Shared Tasks</span>
                           <div className="text-3xl font-black text-primary mt-1">{user.mutualStats?.tasks || 0}</div>
                        </div>
                    </div>

                    {/* Skill Endorsements */}
                    {user.skills?.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-[11px] font-black text-tertiary uppercase tracking-widest flex items-center gap-2">
                                <Star className="w-4 h-4 text-amber-400" /> Professional Endorsements
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {user.skills.map(s => {
                                    const count = endorsements.counts[s] || 0;
                                    const isEndorsed = endorsements.myEndorsements.includes(s);
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => toggleEndorsement(s)}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all active:scale-95",
                                                isEndorsed 
                                                    ? "bg-theme border-theme text-black" 
                                                    : "bg-surface border-glass text-primary hover:border-theme/30"
                                            )}
                                        >
                                            <span className="text-xs font-bold uppercase">{s}</span>
                                            <div className={cn(
                                                "flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-lg",
                                                isEndorsed ? "bg-black/20" : "bg-theme/10 text-theme"
                                            )}>
                                                <ThumbsUp className="w-2.5 h-2.5" />
                                                {count}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Specialty Matrix */}
                    <div className="bg-elevated/50 border border-glass rounded-3xl p-8 relative overflow-hidden">
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                            <div className="w-full md:w-1/2 aspect-square max-w-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={[
                                        { subject: 'Bug', A: user.gamification?.specialties?.Bug || 0 },
                                        { subject: 'Feature', A: user.gamification?.specialties?.Feature || 0 },
                                        { subject: 'Maint', A: user.gamification?.specialties?.Maintenance || 0 },
                                        { subject: 'Res', A: user.gamification?.specialties?.Research || 0 },
                                        { subject: 'Task', A: user.gamification?.specialties?.Task || 0 },
                                    ]}>
                                        <PolarGrid stroke="var(--border-subtle)" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 800, fill: 'var(--text-tertiary)' }} />
                                        <Radar
                                            name="Skill"
                                            dataKey="A"
                                            stroke="var(--theme-color)"
                                            fill="var(--theme-color)"
                                            fillOpacity={0.4}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-sm font-black text-primary uppercase tracking-tighter">Contribution Specialty</h3>
                                <p className="text-[11px] text-tertiary leading-relaxed mt-2 uppercase font-bold tracking-widest">
                                    Visualizing technical depth across project domains.
                                </p>
                                <div className="mt-6 flex flex-col gap-2">
                                    <div className="flex items-center justify-between text-[11px] font-black text-tertiary uppercase">
                                        <span>Streak Bonus</span>
                                        <span className="text-theme">x{Math.min(1.5, 1 + ((user.gamification?.streaks?.current || 0) * 0.05)).toFixed(2)}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-glass rounded-full overflow-hidden">
                                        <div className="h-full bg-theme w-[70%]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="bg-surface border border-glass rounded-[1.5rem] p-6">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                                <Zap className="w-3 h-3 text-theme" />
                                Level Progress
                            </span>
                            <span className="text-[10px] font-mono text-tertiary">
                                {stats.xp.toLocaleString()} / {nextXP.toLocaleString()} XP
                            </span>
                        </div>
                        <div className="h-2 w-full bg-glass rounded-full overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                                className="h-full bg-theme relative"
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                            </motion.div>
                        </div>
                    </div>

                    {/* Badges */}
                    <div className="bg-surface border border-glass rounded-[1.5rem] p-6">
                        <h3 className="text-[11px] font-black text-tertiary uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Award className="w-4 h-4 text-theme" />
                            Achievements
                        </h3>
                        {stats.badges?.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {stats.badges.map((badge, idx) => (
                                    <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-sunken/50 border border-glass hover:bg-theme/5 hover:border-theme/30 transition-all">
                                        <div className="w-10 h-10 rounded-xl bg-theme/10 text-theme flex items-center justify-center shrink-0 shadow-inner">
                                            {/* Generic medal icon, or matched dynamically if we extend it */}
                                            <Award className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-black text-primary truncate leading-tight mb-1">{badge.name}</div>
                                            <div className="text-[10px] text-tertiary font-medium line-clamp-2 leading-relaxed">{badge.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-glass rounded-xl opacity-50">
                                <Award className="w-8 h-8 text-tertiary mb-2" />
                                <span className="text-[10px] font-black text-tertiary uppercase tracking-widest">No Achievements Yet</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-2xl bg-base rounded-[2.5rem] border border-glass shadow-2xl overflow-hidden relative"
                >
                    {/* Background glow effects */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-theme/5 rounded-full blur-[80px] pointer-events-none" />
                    
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-xl text-tertiary hover:bg-glass hover:text-primary transition-all z-20"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {renderContent()}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
