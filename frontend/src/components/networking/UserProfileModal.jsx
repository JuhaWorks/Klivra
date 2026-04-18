import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
    X, MapPin, Activity, Award, Star, Zap, ThumbsUp,
    LayoutGrid, TrendingUp, Shield, Clock, Users, ChevronRight, Circle, MessageSquare
} from 'lucide-react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from 'recharts';
import { useChatStore } from '../../store/useChatStore';
import { useAuthStore, api } from '../../store/useAuthStore';
import { getOptimizedAvatar } from '../../utils/avatar';
import { cn } from '../../utils/cn';
import { toast } from 'react-hot-toast';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const getLevelProgress = (xp, level) => {
    // Sync with Backend: Math.floor(100 * Math.pow(lvl, 2.2))
    const getReq = (lvl) => lvl <= 1 ? 0 : Math.floor(100 * Math.pow(lvl, 2.2));
    const baseXP = getReq(level), nextXP = getReq(level + 1);
    const progress = Math.min(100, Math.max(0, ((xp - baseXP) / (nextXP - baseXP)) * 100));
    return { progress, nextXP };
};

const multiplier = (current) =>
    Math.min(1.5, 1 + (current * 0.05)).toFixed(2);

/* ─── sub-components ──────────────────────────────────────────────────────── */
const Divider = () => (
    <div className="border-t border-[#1E2530]" />
);

const SectionLabel = ({ icon: Icon, label, accent }) => (
    <div className="flex items-center gap-2.5 mb-4">
        <div className={cn(
            "w-6 h-6 rounded flex items-center justify-center",
            accent ? "bg-[#0D6EFD]/10" : "bg-[#1A2333]"
        )}>
            <Icon className={cn("w-3 h-3", accent ? "text-[#0D6EFD]" : "text-[#5A6478]")} />
        </div>
        <span className="text-[10px] font-semibold text-[#5A6478] uppercase tracking-[0.18em]">{label}</span>
    </div>
);

const StatPill = ({ label, value, highlight }) => (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-lg bg-[#0C1118] border border-[#1E2530]">
        <span className={cn(
            "text-[18px] font-bold tabular-nums leading-none",
            highlight ? "text-[#0D6EFD]" : "text-[#E8EDF5]"
        )}>{value}</span>
        <span className="text-[9px] font-semibold text-[#3D4A5C] uppercase tracking-[0.15em]">{label}</span>
    </div>
);

/* ─── main component ──────────────────────────────────────────────────────── */
export default function UserProfileModal({ isOpen, onClose, userId }) {
    const [activeTab, setActiveTab] = useState('overview');
    const { user: reqUser } = useAuthStore();

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

    const { fetchChats, sendMessage, setActiveChat, setDrawerOpen, startPrivateChat } = useChatStore();

    const handleStartChat = async () => {
        const tid = toast.loading("Establishing secure channel...");
        try {
            await startPrivateChat(userId);
            toast.success("Intelligence frequency synced", { id: tid });
            onClose();
        } catch (err) {
            toast.error("Signal lost: Could not initialize chat", { id: tid });
            console.error(err);
        }
    };

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

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'skills', label: 'Skills' },
        { id: 'badges', label: 'Badges' },
    ];

    /* ─── loading / error ────────────────────────────────────────────────── */
    const renderShell = (children) => (
        <AnimatePresence>
            <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={onClose}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-6"
            >
                <motion.div
                    key="modal"
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-[780px] bg-[#080D14] rounded-2xl border border-[#1A2333] shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden relative"
                    style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}
                >
                    <div
                        className="absolute inset-0 pointer-events-none z-0 opacity-[0.025]"
                        style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 1px,#fff 1px,#fff 2px)', backgroundSize: '100% 4px' }}
                    />

                    {children}

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-30 w-8 h-8 rounded flex items-center justify-center text-[#3D4A5C] hover:text-[#8A95A8] hover:bg-[#12192A] transition-all"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );

    if (isLoading) return renderShell(
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-7 h-7 rounded-full border-2 border-[#0D6EFD] border-t-transparent animate-spin" />
            <span className="text-[10px] font-semibold text-[#3D4A5C] uppercase tracking-[0.2em]">Retrieving Profile</span>
        </div>
    );

    if (!user) return renderShell(
        <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Shield className="w-6 h-6 text-[#3D4A5C]" />
            <span className="text-[10px] font-semibold text-[#5A6478] uppercase tracking-[0.15em]">Profile Unavailable</span>
        </div>
    );

    /* ─── derive data ─────────────────────────────────────────────────────── */
    const stats = user.gamification || { xp: 0, level: 1, badges: [], streaks: { current: 0 } };
    const { progress, nextXP } = getLevelProgress(stats.xp, stats.level);
    const streakPct = Math.min(100, (stats.streaks?.current || 0) * 10);

    const radarData = [
        { subject: 'Strategic', A: user.gamification?.normalizedSpecialties?.Strategic || 0, fullMark: 100 },
        { subject: 'Engineering', A: user.gamification?.normalizedSpecialties?.Engineering || 0, fullMark: 100 },
        { subject: 'Sustainability', A: user.gamification?.normalizedSpecialties?.Sustainability || 0, fullMark: 100 },
        { subject: 'Operations', A: user.gamification?.normalizedSpecialties?.Operations || 0, fullMark: 100 },
    ];

    /* ─── tab panels ─────────────────────────────────────────────────────── */
    const renderOverview = () => (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2">
                <StatPill label="Shared Projects" value={user.mutualStats?.projects ?? 0} />
                <StatPill label="Shared Tasks" value={user.mutualStats?.tasks ?? 0} highlight />
            </div>

            <div>
                <SectionLabel icon={Activity} label="Expertise Matrix" accent />
                <div className="rounded-xl border border-[#1A2333] bg-[#0C1118] p-4">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="w-[180px] h-[180px] shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                                    <defs>
                                        <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#7B52FF" stopOpacity={0.6} />
                                            <stop offset="100%" stopColor="#0D6EFD" stopOpacity={0.2} />
                                        </linearGradient>
                                    </defs>
                                    <PolarGrid stroke="#1E2530" gridType="polygon" />
                                    <PolarAngleAxis
                                        dataKey="subject"
                                        tick={{ fontSize: 8, fontWeight: 600, fill: '#8A95A8', letterSpacing: '0.05em' }}
                                    />
                                    <Radar
                                        dataKey="A"
                                        stroke="#7B52FF"
                                        strokeWidth={2}
                                        fill="url(#radarFill)"
                                        fillOpacity={1}
                                        animationDuration={900}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex-1 w-full space-y-5">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-1.5 text-[9px] font-semibold text-[#5A6478] uppercase tracking-[0.15em]">
                                        <Zap className="w-2.5 h-2.5 text-[#F59E0B]" />
                                        Streak Momentum
                                    </div>
                                    <span className="text-[10px] font-bold text-[#F59E0B] font-mono">×{multiplier(stats.streaks?.current || 0)}</span>
                                </div>
                                <div className="h-1 w-full bg-[#1A2333] rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${streakPct}%` }}
                                        transition={{ duration: 1.2, ease: 'easeOut' }}
                                        className="h-full bg-gradient-to-r from-[#F59E0B] to-[#EF4444] rounded-full"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-1.5 text-[9px] font-semibold text-[#5A6478] uppercase tracking-[0.15em]">
                                        <TrendingUp className="w-2.5 h-2.5 text-[#0D6EFD]" />
                                        Level Progression
                                    </div>
                                    <span className="text-[10px] font-bold text-[#0D6EFD] font-mono">{stats.xp.toLocaleString()} XP</span>
                                </div>
                                <div className="h-1 w-full bg-[#1A2333] rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 1.4, ease: 'easeOut' }}
                                        className="h-full bg-[#0D6EFD] rounded-full"
                                    />
                                </div>
                                <div className="mt-1.5 flex justify-between">
                                    <span className="text-[8px] text-[#2D3848] font-mono">LVL {stats.level}</span>
                                    <span className="text-[8px] text-[#2D3848] font-mono">LVL {stats.level + 1} — {nextXP.toLocaleString()} XP</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSkills = () => (
        user.skills?.length > 0 ? (
            <div>
                <SectionLabel icon={Star} label="Endorsed Skills" accent />
                <div className="flex flex-wrap gap-2">
                    {user.skills.map((s) => {
                        const count = endorsements.counts[s] || 0;
                        const endorsed = endorsements.myEndorsements.includes(s);
                        return (
                            <button
                                key={s}
                                onClick={() => toggleEndorsement(s)}
                                className={cn(
                                    "inline-flex items-center gap-2 px-3 py-2 rounded text-[10px] font-semibold uppercase tracking-[0.1em] border transition-all duration-150 active:scale-[0.97]",
                                    endorsed
                                        ? "bg-[#0D6EFD] border-[#0D6EFD] text-white"
                                        : "bg-[#0C1118] border-[#1A2333] text-[#8A95A8] hover:border-[#0D6EFD]/40 hover:text-[#E8EDF5]"
                                )}
                            >
                                {s}
                                <span className={cn(
                                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold",
                                    endorsed ? "bg-white/20 text-white" : "bg-[#1A2333] text-[#5A6478]"
                                )}>
                                    <ThumbsUp className="w-2 h-2" />
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        ) : (
            <div className="text-center py-12 rounded-xl border border-dashed border-[#1A2333]">
                <Star className="w-6 h-6 text-[#1E2530] mx-auto mb-2" />
                <span className="text-[9px] font-semibold text-[#3D4A5C] uppercase tracking-[0.15em]">No skills listed</span>
            </div>
        )
    );

    const renderBadges = () => (
        stats.badges?.length > 0 ? (
            <div>
                <SectionLabel icon={Award} label="Achievements" accent />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {stats.badges.map((badge, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 p-3 rounded-lg bg-[#0C1118] border border-[#1A2333] hover:border-[#1E2A3A] transition-all group"
                        >
                            <div className="w-8 h-8 rounded bg-[#0D6EFD]/10 border border-[#0D6EFD]/20 flex items-center justify-center shrink-0 group-hover:border-[#0D6EFD]/40 transition-all">
                                <Award className="w-3.5 h-3.5 text-[#0D6EFD]" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] font-semibold text-[#C8D0DC] truncate uppercase tracking-[0.05em]">{badge.name}</div>
                                <div className="text-[8px] text-[#3D4A5C] truncate mt-0.5">{badge.description}</div>
                            </div>
                            <ChevronRight className="w-3 h-3 text-[#1E2530] shrink-0 ml-auto" />
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            <div className="text-center py-12 rounded-xl border border-dashed border-[#1A2333]">
                <Award className="w-6 h-6 text-[#1E2530] mx-auto mb-2" />
                <span className="text-[9px] font-semibold text-[#3D4A5C] uppercase tracking-[0.15em]">No achievements yet</span>
            </div>
        )
    );

    const tabContent = {
        overview: renderOverview,
        skills: renderSkills,
        badges: renderBadges,
    };

    /* ─── full render ─────────────────────────────────────────────────────── */
    return renderShell(
        <div className="relative z-10 flex flex-col md:flex-row">

            <div className="md:w-[240px] shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-[#1A2333] bg-[#060A10]">

                <div className="relative h-20 md:h-24 overflow-hidden bg-[#0C1118]">
                    {user.coverImage ? (
                        <img src={user.coverImage} className="w-full h-full object-cover opacity-40" alt="" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#0D6EFD]/10 to-transparent" />
                    )}
                    <div
                        className="absolute inset-0 opacity-10"
                        style={{ backgroundImage: 'linear-gradient(#1A2333 1px,transparent 1px),linear-gradient(90deg,#1A2333 1px,transparent 1px)', backgroundSize: '20px 20px' }}
                    />
                </div>

                <div className="px-5 pb-5 flex flex-col gap-4">
                    <div className="relative -mt-7 mb-1">
                        <div className="w-14 h-14 rounded-xl overflow-hidden ring-2 ring-[#0D6EFD]/40 ring-offset-2 ring-offset-[#060A10] shadow-xl">
                            <img src={getOptimizedAvatar(user.avatar)} alt={user.name} className="w-full h-full object-cover" />
                        </div>
                        {user.status === 'Online' && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#22C55E] border-2 border-[#060A10]" />
                        )}
                        <div className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded bg-[#0D6EFD] flex items-center justify-center text-[8px] font-bold text-white shadow-lg">
                            L{stats.level}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <h2 className="text-[15px] font-bold text-[#E8EDF5] tracking-tight leading-tight">{user.name}</h2>
                        <div className="flex flex-wrap gap-1.5">
                            <span className="text-[8px] font-semibold text-[#0D6EFD] bg-[#0D6EFD]/10 border border-[#0D6EFD]/20 px-2 py-0.5 rounded uppercase tracking-[0.12em]">
                                {user.role}
                            </span>
                            {user.location && (
                                <span className="inline-flex items-center gap-1 text-[8px] font-medium text-[#3D4A5C]">
                                    <MapPin className="w-2 h-2" />{user.location}
                                </span>
                            )}
                        </div>
                    </div>

                    <Divider />

                    {user.bio && (
                        <div className="bg-[#0C1118] border border-[#1A2333] p-3 rounded-lg relative italic overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-[#0D6EFD]/30" />
                            <p className="text-[10px] text-[#5A6478] leading-relaxed opacity-80">"{user.bio}"</p>
                        </div>
                    )}

                    {user._id !== reqUser?._id && (
                        <button 
                            onClick={handleStartChat}
                            className="w-full py-2.5 bg-[#0D6EFD] text-white rounded-lg font-bold text-[10px] uppercase tracking-[0.15em] hover:bg-[#0B5ED7] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <MessageSquare className="w-3 h-3" />
                            Send Message
                        </button>
                    )}

                    <div className="space-y-2 mt-auto">
                        {user.department && (
                            <div className="flex items-center gap-2 text-[9px] text-[#3D4A5C]">
                                <Users className="w-3 h-3 shrink-0" />
                                <span className="truncate">{user.department}</span>
                            </div>
                        )}
                        {user.joinedDate && (
                            <div className="flex items-center gap-2 text-[9px] text-[#3D4A5C]">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span>Joined {user.joinedDate}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-[9px] text-[#3D4A5C]">
                            <Circle className="w-2 h-2 shrink-0 fill-current" style={{ color: user.status === 'Online' ? '#22C55E' : '#3D4A5C' }} />
                            <span>{user.status || 'Offline'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Right panel ──────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Tab bar */}
                <div className="flex items-center gap-0 border-b border-[#1A2333] px-5 pt-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "relative px-4 py-2.5 text-[9px] font-semibold uppercase tracking-[0.15em] transition-all",
                                activeTab === tab.id
                                    ? "text-[#E8EDF5]"
                                    : "text-[#3D4A5C] hover:text-[#8A95A8]"
                            )}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="tab-indicator"
                                    className="absolute bottom-0 inset-x-0 h-[2px] bg-[#0D6EFD] rounded-t-full"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto p-5 max-h-[480px]"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#1A2333 transparent' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.15 }}
                        >
                            {tabContent[activeTab]?.()}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-[#1A2333] bg-[#060A10]">
                    <div className="flex items-center gap-2 text-[8px] font-medium text-[#2D3848] uppercase tracking-[0.15em]">
                        <Shield className="w-2.5 h-2.5" />
                        Verified Member
                    </div>
                    <div className="text-[8px] font-mono text-[#2D3848]">ID #{userId?.slice(0, 8).toUpperCase()}</div>
                </div>
            </div>
        </div>
    );
}