import { useState, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useSocketStore } from '../store/useSocketStore';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/getCroppedImg';
import {
    User,
    Mail,
    Camera,
    Trash2,
    Settings,
    MessageSquare,
    ChevronRight,
    Shield,
    CheckCircle2,
    X,
    ZoomIn,
    MapPin,
    Star,
    Zap,
    Award,
    Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useQuery } from '@tanstack/react-query';
import { api } from '../store/useAuthStore';

import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip as RechartsTooltip
} from 'recharts';

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

const STATUSES = ['Online', 'Away', 'Do Not Disturb', 'Offline'];

const STATUS_CONFIG = {
    Online: { dot: 'bg-success', label: 'text-success', ring: 'ring-success/20' },
    Away: { dot: 'bg-warning', label: 'text-warning', ring: 'ring-warning/20' },
    'Do Not Disturb': { dot: 'bg-danger', label: 'text-danger', ring: 'ring-danger/20' },
    Offline: { dot: 'bg-tertiary', label: 'text-tertiary', ring: 'ring-tertiary/20' },
};

const ROLE_CONFIG = {
    Admin: { bg: 'bg-danger/5', text: 'text-danger', border: 'border-danger/20' },
    Manager: { bg: 'bg-theme/5', text: 'text-theme', border: 'border-theme/20' },
    Developer: { bg: 'bg-theme/5', text: 'text-theme', border: 'border-theme/20' },
    Guest: { bg: 'bg-sunken', text: 'text-tertiary', border: 'border-subtle' },
};

function cn(...args) { return twMerge(clsx(args)); }

const AvatarFrame = ({ level, children, className }) => {
    const getFrameStyles = () => {
        if (level >= 25) return "ring-4 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]";
        if (level >= 10) return "ring-4 ring-zinc-300 shadow-[0_0_15px_rgba(212,212,216,0.3)]";
        if (level >= 5) return "ring-4 ring-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.2)]";
        return "ring-1 ring-zinc-200 dark:ring-zinc-700";
    };

    return (
        <div className={cn("relative p-1 rounded-2xl transition-all", getFrameStyles(), className)}>
            {children}
            {level >= 5 && (
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-surface border border-default flex items-center justify-center shadow-lg z-10">
                    <span className="text-[10px] font-black text-primary">L{level}</span>
                </div>
            )}
        </div>
    );
};

function SectionLabel({ children }) {
    return (
        <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
            {children}
        </p>
    );
}

function FieldWrapper({ icon: Icon, children, disabled }) {
    return (
        <div className={cn(
            "flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all",
            disabled
                ? "bg-sunken border-subtle opacity-60 cursor-not-allowed"
                : "bg-surface border-subtle focus-within:border-theme focus-within:ring-2 focus-within:ring-theme/20"
        )}>
            {Icon && <Icon className="w-4 h-4 shrink-0 text-tertiary" />}
            {children}
        </div>
    );
}

export default function Profile() {
    const { user, uploadAvatar, uploadCoverImage, updateProfile, removeAvatar } = useAuthStore();
    const fileRef = useRef(null);
    const coverFileRef = useRef(null);

    const [preview, setPreview] = useState(null);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedPx, setCroppedPx] = useState(null);
    const [cropping, setCropping] = useState(false);

    const [form, setForm] = useState({
        name: user?.name || '',
        status: user?.status || 'Online',
        location: user?.location || '',
        bio: user?.bio || '',
        skills: user?.skills || [],
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    const { data: heatmapData } = useQuery({
        queryKey: ['user-heatmap'],
        queryFn: async () => {
            const res = await api.get('/users/profile/heatmap');
            return res.data.data;
        }
    });

    const onFile = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        setPreview(URL.createObjectURL(f));
        setCropping(true);
    };

    const onCropComplete = useCallback((_, px) => setCroppedPx(px), []);

    const saveCrop = async () => {
        try {
            setAvatarLoading(true);
            const blob = await getCroppedImg(preview, croppedPx);
            await uploadAvatar(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
            setPreview(null);
            setCropping(false);
        } catch (err) {
            console.error(err);
        } finally {
            setAvatarLoading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const cancelCrop = () => {
        setPreview(null);
        setCropping(false);
        if (fileRef.current) fileRef.current.value = '';
    };

    const setStatus = async (s) => {
        setForm(f => ({ ...f, status: s }));
        const { socket } = useSocketStore.getState();
        if (socket?.connected) socket.emit('setStatus', { status: s });
        useAuthStore.setState(st => ({ user: st.user ? { ...st.user, status: s } : null }));
        try { await useAuthStore.getState().updateStatus(s); }
        catch (e) { console.error(e); }
    };

    const saveProfile = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setProfileLoading(true);
        try {
            const dataToSave = e?.overrides ? { ...form, ...e.overrides } : form;
            await updateProfile(dataToSave);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error(err);
        } finally {
            setProfileLoading(false);
        }
    };

    const role = user?.role || 'Guest';
    const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.Guest;
    const statusConfig = STATUS_CONFIG[form.status] || STATUS_CONFIG.Online;

    const handleCoverFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setProfileLoading(true);
        try {
            await uploadCoverImage(file);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error(err);
        } finally {
            setProfileLoading(false);
            if (coverFileRef.current) coverFileRef.current.value = '';
        }
    };

    const handleCoverPrompt = () => {
        const url = prompt("Enter banner image URL:");
        if (url) {
            saveProfile({ 
                preventDefault: () => {}, 
                target: {},
                overrides: { coverImage: url }
            });
        }
    };

    return (
        <div className="flex flex-col gap-8 pb-20">
            
            {/* Professional Cover Banner */}
            <div className="relative w-full h-48 rounded-3xl overflow-hidden group">
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-br from-theme/20 via-surface to-sunken transition-all duration-700",
                    user?.coverImage ? "" : "opacity-100"
                )} />
                {user?.coverImage && (
                    <img src={user.coverImage} className="w-full h-full object-cover" alt="Cover" />
                )}
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all" />
                
                <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                    <button 
                        onClick={() => coverFileRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-surface/80 backdrop-blur-md border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-theme hover:text-white transition-all"
                    >
                        <Camera className="w-3 h-3" /> Upload File
                    </button>
                    <button 
                        onClick={handleCoverPrompt}
                        className="flex items-center gap-2 px-4 py-2 bg-surface/80 backdrop-blur-md border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-theme hover:text-white transition-all"
                    >
                        <Activity className="w-3 h-3" /> Use Link
                    </button>
                    <input 
                        ref={coverFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCoverFile}
                    />
                </div>
            </div>

            <div className="w-full space-y-8">

                {/* Page Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-primary tracking-tighter uppercase">
                            Profile <span className="text-theme">Identity.</span>
                        </h1>
                        <p className="mt-1 text-[10px] font-black text-tertiary uppercase tracking-[0.3em]">
                            Manage your account details and preferences.
                        </p>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-default" />

                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">

                    {/* Left — Avatar & Identity */}
                    <div className="space-y-4">

                        {/* Avatar Card */}
                        <div className="bg-surface border border-default rounded-2xl p-6 flex flex-col items-center gap-5">

                            {/* Avatar */}
                            <div className="relative group">
                                <AvatarFrame level={user?.gamification?.level || 1}>
                                    <div className="w-24 h-24 rounded-2xl overflow-hidden">
                                        <img
                                            src={user?.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                                            alt={user?.name}
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </AvatarFrame>
                                {/* Status dot */}
                                <div className={cn(
                                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-surface",
                                    statusConfig.dot
                                )} />
                                {/* Hover overlay */}
                                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Camera className="w-5 h-5 text-primary" />
                                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
                                </label>
                            </div>

                            {/* Name & email */}
                            <div className="text-center space-y-1">
                                <p className="font-bold text-primary text-base leading-snug">
                                    {user?.name}
                                </p>
                                <p className="text-[11px] font-medium text-tertiary">{user?.email}</p>
                            </div>

                            {/* Role badge */}
                            <div className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border",
                                roleConfig.bg, roleConfig.text, roleConfig.border
                            )}>
                                <Shield className="w-3 h-3" />
                                {role}
                            </div>

                            {/* Avatar actions */}
                            <div className="w-full space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                                <button
                                    onClick={() => fileRef.current?.click()}
                                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-secondary hover:text-primary hover:bg-sunken rounded-lg transition-all"
                                >
                                    <Camera className="w-4 h-4" />
                                    Upload photo
                                </button>
                                {user?.avatar && !user.avatar.includes('149071.png') && (
                                    <button
                                        onClick={removeAvatar}
                                        className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Remove photo
                                    </button>
                                )}
                            </div>

                        </div>

                        {/* Progression & Gamification Card */}
                        <div className="bg-surface border border-default rounded-2xl overflow-hidden p-6 relative group">
                            {/* Glow backdrop */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-theme/5 rounded-full blur-[40px] pointer-events-none" />
                            
                            <div className="flex flex-col mb-5">
                                <span className="text-[10px] font-black text-tertiary uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                                    <Star className="w-3 h-3 text-theme" /> Total Experience
                                </span>
                                <div className="text-3xl font-black font-mono text-primary tracking-tighter">
                                    {(user?.gamification?.xp || 0).toLocaleString()} <span className="text-sm font-bold opacity-40 ml-0.5">XP</span>
                                </div>
                            </div>
                            
                            <div className="space-y-2 mb-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                                        <div className="w-4 h-4 rounded bg-theme/20 text-theme flex items-center justify-center text-[10px]">
                                            L{(user?.gamification?.level || 1)}
                                        </div>
                                        Progress to L{(user?.gamification?.level || 1) + 1}
                                    </span>
                                    {(() => {
                                        const { progress, nextXP } = getLevelProgress(user?.gamification?.xp || 0, user?.gamification?.level || 1);
                                        return (
                                            <span className="text-[10px] font-mono text-tertiary">
                                                {progress.toFixed(0)}%
                                            </span>
                                        );
                                    })()}
                                </div>
                                <div className="h-1.5 w-full bg-glass rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${getLevelProgress(user?.gamification?.xp || 0, user?.gamification?.level || 1).progress}%` }}
                                        transition={{ duration: 1.5, ease: "circOut" }}
                                        className="h-full bg-theme relative"
                                    >
                                        <div className="absolute inset-0 bg-white/30 animate-pulse" />
                                    </motion.div>
                                </div>
                            </div>

                            {/* Specialty Radar Chart */}
                            <div className="h-[180px] w-full mt-2 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="60%" data={[
                                        { subject: 'Bug', A: user?.gamification?.specialties?.Bug || 0, fullMark: 100 },
                                        { subject: 'Feat', A: user?.gamification?.specialties?.Feature || 0, fullMark: 100 },
                                        { subject: 'Main', A: user?.gamification?.specialties?.Maintenance || 0, fullMark: 100 },
                                        { subject: 'Res', A: user?.gamification?.specialties?.Research || 0, fullMark: 100 },
                                        { subject: 'Task', A: user?.gamification?.specialties?.Task || 0, fullMark: 100 },
                                    ]}>
                                        <PolarGrid stroke="var(--border-subtle)" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 800, fill: 'var(--text-tertiary)' }} />
                                        <Radar
                                            name="Specialty"
                                            dataKey="A"
                                            stroke="var(--theme-color)"
                                            fill="var(--theme-color)"
                                            fillOpacity={0.2}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="border-t border-glass pt-4 mt-2">
                                <h3 className="text-[10px] font-black text-tertiary uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <Award className="w-3 h-3" /> Achievements
                                </h3>
                                
                                {user?.gamification?.badges?.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {user.gamification.badges.map((badge, idx) => (
                                            <div 
                                                key={idx} 
                                                className="group/badge relative"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-theme/10 border border-theme/20 text-theme flex items-center justify-center cursor-help shadow-sm transition-all hover:scale-110 hover:bg-theme/20">
                                                    <Award className="w-4 h-4" />
                                                </div>
                                                
                                                {/* Tooltip */}
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 opacity-0 group-hover/badge:opacity-100 group-hover/badge:-translate-y-1 bg-elevated border border-default rounded-xl p-3 shadow-xl pointer-events-none transition-all z-20">
                                                    <div className="text-[11px] font-black text-primary mb-0.5">{badge.name}</div>
                                                    <div className="text-[10px] text-tertiary leading-tight">{badge.description}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 border border-dashed border-glass rounded-xl">
                                        <span className="text-[10px] font-bold text-tertiary">No badges earned yet.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right — Settings Form */}
                    <div className="space-y-6">

                        {/* General Info */}
                        <div className="bg-surface border border-default rounded-2xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-default flex items-center gap-2">
                                <Settings className="w-4 h-4 text-tertiary" />
                                <span className="text-xs font-black text-tertiary uppercase tracking-widest">General</span>
                            </div>

                            <form onSubmit={saveProfile} className="p-6 space-y-6">

                                {/* Name & Email row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <SectionLabel>Display name</SectionLabel>
                                        <FieldWrapper icon={User}>
                                            <input
                                                type="text"
                                                value={form.name}
                                                onChange={e => setForm(s => ({ ...s, name: e.target.value }))}
                                                placeholder="Your name"
                                                className="w-full bg-transparent text-sm text-primary placeholder-tertiary outline-none"
                                            />
                                        </FieldWrapper>
                                    </div>
                                    <div>
                                        <SectionLabel>Email address</SectionLabel>
                                        <FieldWrapper icon={Mail} disabled>
                                            <input
                                                disabled
                                                value={user?.email}
                                                className="w-full bg-transparent text-sm text-secondary outline-none cursor-not-allowed"
                                            />
                                        </FieldWrapper>
                                        <p className="mt-1.5 text-[11px] text-zinc-400 ml-1">Email cannot be changed.</p>
                                    </div>
                                </div>

                                {/* Location */}
                                <div>
                                    <SectionLabel>Home City</SectionLabel>
                                    <FieldWrapper icon={MapPin}>
                                        <input
                                            type="text"
                                            value={form.location}
                                            onChange={e => setForm(s => ({ ...s, location: e.target.value }))}
                                            placeholder="e.g. Dhaka, New York, London"
                                            className="w-full bg-transparent text-sm text-primary placeholder-tertiary outline-none"
                                        />
                                    </FieldWrapper>
                                    <p className="mt-1.5 text-[11px] text-zinc-400 ml-1">Manual location will override automatic weather detection.</p>
                                </div>

                                {/* Bio & Skills */}
                                <div className="space-y-6">
                                    <div>
                                        <SectionLabel>Professional Bio</SectionLabel>
                                        <div className="flex gap-3 px-4 py-3.5 rounded-xl border bg-sunken border-subtle focus-within:border-theme transition-all">
                                            <MessageSquare className="w-4 h-4 shrink-0 text-tertiary mt-0.5" />
                                            <textarea
                                                rows={4}
                                                value={form.bio}
                                                onChange={e => setForm(s => ({ ...s, bio: e.target.value }))}
                                                placeholder="Write a brief professional summary..."
                                                className="w-full bg-transparent text-sm text-primary placeholder-tertiary outline-none resize-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <SectionLabel>Professional Skills</SectionLabel>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {form.skills.map((s, i) => (
                                                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-theme/5 border border-theme/20 text-theme text-[11px] font-bold uppercase transition-all hover:bg-theme/10 group">
                                                    {s}
                                                    <button 
                                                        type="button"
                                                        onClick={() => setForm(f => ({ ...f, skills: f.skills.filter(sk => sk !== s) }))}
                                                        className="hover:text-rose-500"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text"
                                                id="skill-input"
                                                placeholder="Add a skill (e.g. React, Python)"
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const val = e.target.value.trim();
                                                        if (val && !form.skills.includes(val)) {
                                                            setForm(f => ({ ...f, skills: [...f.skills, val] }));
                                                            e.target.value = '';
                                                        }
                                                    }
                                                }}
                                                className="flex-1 bg-surface border border-subtle rounded-xl px-4 py-2 text-sm text-primary outline-none focus:border-theme"
                                            />
                                            <Button 
                                                type="button"
                                                variant="ghost"
                                                onClick={() => {
                                                    const inp = document.getElementById('skill-input');
                                                    const val = inp.value.trim();
                                                    if (val && !form.skills.includes(val)) {
                                                        setForm(f => ({ ...f, skills: [...f.skills, val] }));
                                                        inp.value = '';
                                                    }
                                                }}
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-zinc-100 dark:border-zinc-800" />

                                {/* Status */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <SectionLabel>Status</SectionLabel>
                                        <span className={cn("text-[11px] font-medium flex items-center gap-1.5", statusConfig.label)}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full inline-block", statusConfig.dot)} />
                                            {form.status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                                        {STATUSES.map(s => {
                                            const active = form.status === s;
                                            const cfg = STATUS_CONFIG[s];
                                            return (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    onClick={() => setStatus(s)}
                                                    className={cn(
                                                        "flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-tertiary",
                                                        active
                                                            ? "bg-theme text-primary border-theme"
                                                            : "bg-surface border-subtle hover:border-theme hover:text-primary"
                                                    )}
                                                >
                                                    <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                                                    <span className="text-[12px]">{s}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-zinc-100 dark:border-zinc-800" />

                                {/* Save */}
                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <AnimatePresence>
                                        {saved && (
                                            <motion.span
                                                initial={{ opacity: 0, x: 8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="flex items-center gap-1.5 text-sm text-theme font-medium"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                Saved
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                    <Button
                                        type="submit"
                                        isLoading={profileLoading}
                                        disabled={profileLoading}
                                        className="px-6 py-2.5 rounded-xl text-sm font-medium bg-theme text-primary hover:opacity-90 transition-opacity"
                                    >
                                        Save changes
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contribution Heatmap Section */}
            <div className="bg-surface border border-default rounded-3xl p-8 mt-4 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-theme/5 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-sm font-black text-primary uppercase tracking-tighter flex items-center gap-2">
                            <Activity className="w-4 h-4 text-theme" /> Consistency Matrix
                        </h3>
                        <p className="text-[10px] font-bold text-tertiary uppercase tracking-widest mt-1">Visualize your professional activity over the last quarter.</p>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-black text-tertiary uppercase tracking-widest">
                        <span>Less</span>
                        <div className="flex gap-1">
                            {[0, 1, 2, 3, 4].map(v => (
                                <div key={v} className={cn(
                                    "w-3 h-3 rounded-sm",
                                    v === 0 ? "bg-sunken border border-default" : 
                                    v === 1 ? "bg-theme/20" : 
                                    v === 2 ? "bg-theme/40" : 
                                    v === 3 ? "bg-theme/70" : "bg-theme"
                                )} />
                            ))}
                        </div>
                        <span>More</span>
                    </div>
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-4 scrollbar-hide">
                    {/* Fetched Heatmap generator */}
                    {Array.from({ length: 14 }).map((_, weekIndex) => (
                        <div key={weekIndex} className="flex flex-col gap-1.5 shrink-0">
                            {Array.from({ length: 7 }).map((_, dayIndex) => {
                                const count = heatmapData ? heatmapData[weekIndex][dayIndex] : 0;
                                const intensity = Math.min(count, 4);
                                
                                return (
                                    <div
                                        key={dayIndex}
                                        className={cn(
                                            "w-3.5 h-3.5 rounded-[4px] cursor-pointer transition-all duration-300",
                                            intensity === 0 ? "bg-sunken border border-default hover:border-theme/40" :
                                            intensity === 1 ? "bg-theme/20 hover:scale-110" :
                                            intensity === 2 ? "bg-theme/40 hover:scale-110 shadow-[0_0_10px_rgba(var(--theme-rgb),0.2)]" :
                                            intensity === 3 ? "bg-theme/70 hover:scale-110 shadow-[0_0_15px_rgba(var(--theme-rgb),0.3)]" :
                                            "bg-theme hover:scale-110 shadow-[0_0_20px_rgba(var(--theme-rgb),0.5)]"
                                        )}
                                        title={`${count} tasks completed`}
                                    />
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Crop Modal */}
            <AnimatePresence>
                {cropping && preview && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0, y: 8 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.96, opacity: 0, y: 8 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="bg-elevated dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
                        >
                            {/* Modal header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                                <div>
                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Crop photo</h3>
                                    <p className="text-xs text-zinc-400 mt-0.5">Adjust and position your profile photo.</p>
                                </div>
                                <button
                                    onClick={cancelCrop}
                                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Crop area */}
                            <div className="relative w-full h-72 bg-zinc-950">
                                <Cropper
                                    image={preview}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    cropShape="round"
                                    showGrid={false}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                />
                            </div>

                            {/* Zoom & actions */}
                            <div className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                                            <ZoomIn className="w-3.5 h-3.5" />
                                            Zoom
                                        </span>
                                        <span className="text-xs text-zinc-400">{parseFloat(zoom).toFixed(1)}×</span>
                                    </div>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.05}
                                        className="w-full accent-zinc-900 dark:accent-zinc-100 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full appearance-none"
                                        onChange={e => setZoom(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={cancelCrop}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <Button
                                        onClick={saveCrop}
                                        isLoading={avatarLoading}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                                    >
                                        Apply
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}