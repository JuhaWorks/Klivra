import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
    Lock, ShieldAlert, User, Shield, 
    UserMinus, ChevronDown, MoreHorizontal, 
    UserCog, History, Activity, ImageIcon 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useSocketStore } from '../../store/useSocketStore';
import { useAuthStore, api } from '../../store/useAuthStore';
import { useQueryClient } from '@tanstack/react-query';

/**
 * 🏛️ Vanguard Project Shared Components
 * High-performance, cinematic UI primitives for the Projects ecosystem.
 */

// 1. AvatarGroup
export const AvatarGroup = ({ viewers = [], max = 4, onClick }) => {
    const displayViewers = viewers.slice(0, max);
    const overflowCount = viewers.length > max ? viewers.length - max : 0;

    return (
        <div
            onClick={onClick}
            className={twMerge(clsx(
                "flex items-center -space-x-4",
                onClick && "cursor-pointer hover:opacity-80 transition-opacity"
            ))}
        >
            <AnimatePresence mode="popLayout">
                {displayViewers.map((viewer, index) => (
                    <motion.div
                        key={viewer.userId}
                        initial={{ opacity: 0, x: 10, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -10, scale: 0.8 }}
                        transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 30,
                            delay: index * 0.05
                        }}
                        className="relative group focus:outline-none"
                    >
                        <div className={twMerge(clsx(
                            "w-12 h-12 rounded-[1.25rem] border-2 border-[#09090b] bg-white/5 shadow-2xl overflow-hidden transition-all duration-500",
                            "group-hover:-translate-y-2 group-hover:scale-110 group-hover:z-50 group-hover:border-cyan-500/30 group-hover:shadow-cyan-500/10",
                            (viewer.status === 'Away' || viewer.status === 'away') ? 'opacity-40 grayscale' : 'opacity-100'
                        ))}>
                            {viewer.avatar ? (
                                <img
                                    src={viewer.avatar}
                                    alt={viewer.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-[11px] font-black text-white uppercase tracking-tighter">
                                    {viewer.name?.charAt(0) || '?'}
                                </div>
                            )}
                        </div>

                        <div className={twMerge(clsx(
                            "absolute bottom-0 right-0 w-4 h-4 rounded-lg border-2 border-[#09090b] z-[2] shadow-xl",
                            (viewer.status === 'Online' || viewer.status === 'active') ? 'bg-emerald-500 shadow-emerald-500/40' :
                                (viewer.status === 'Away' || viewer.status === 'away') ? 'bg-amber-500 shadow-amber-500/40' :
                                    viewer.status === 'Do Not Disturb' ? 'bg-rose-500 shadow-rose-500/40' : 'bg-gray-600'
                        ))}>
                            <div className="absolute inset-0 bg-white/20 rounded-sm scale-[0.3]" />
                        </div>

                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 glass-2 bg-black/60 border border-white/10 rounded-xl text-[10px] font-black text-white opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-2xl z-[60] scale-90 group-hover:scale-100 uppercase tracking-widest">
                            {viewer.name}
                            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-black/60" />
                        </div>
                    </motion.div>
                ))}

                {overflowCount > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-12 h-12 rounded-[1.25rem] border-2 border-[#09090b] bg-white/5 flex items-center justify-center text-[10px] font-black text-gray-400 shadow-2xl relative z-10 backdrop-blur-md"
                    >
                        +{overflowCount}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// 2. ProjectImage
export const ProjectImage = memo(({ project, className = "", aspect = "aspect-video" }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    const hasImage = project?.coverImageUrl && !imageError;
    const initial = project?.name?.charAt(0) || 'P';

    return (
        <div className={twMerge(clsx("relative overflow-hidden group", aspect, className))}>
            <AnimatePresence mode="wait">
                {hasImage ? (
                    <motion.div
                        key="image-container"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full h-full"
                    >
                        <motion.img
                            src={project.coverImageUrl}
                            alt={project.name}
                            loading="lazy"
                            decoding="async"
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageError(true)}
                            className={twMerge(clsx(
                                "w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105",
                                !imageLoaded && "opacity-0"
                            ))}
                        />
                        <AnimatePresence>
                            {!imageLoaded && (
                                <motion.div 
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-white/5 animate-pulse" 
                                />
                            )}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <motion.div
                        key="fallback"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="w-full h-full flex items-center justify-center relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b] to-[#0f172a]" />
                        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" />
                        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-blue-600/10 rounded-full blur-[100px] animate-pulse" />
                        <div className="absolute inset-0 opacity-[0.03] grayscale bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] blend-overlay pointer-events-none" />

                        <div className="relative z-10 flex flex-col items-center">
                            <span className="text-white font-black text-6xl uppercase tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                {initial}
                            </span>
                            <div className="absolute -inset-4 border border-white/5 rounded-[2rem] opacity-20 group-hover:scale-110 transition-transform duration-500" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 border border-white/5 rounded-[inherit] pointer-events-none" />
        </div>
    );
});

// 3. LockedInput
export const LockedInput = ({
    projectId,
    fieldId,
    label,
    value,
    onChange,
    placeholder,
    type = 'text',
    as = 'input',
    disabled: externalDisabled,
    register,
    error,
    ...props
}) => {
    const { socket, fieldLocks, isConnected } = useSocketStore();
    const { user: currentUser } = useAuthStore();

    const activeLock = fieldLocks[fieldId];
    const isLockedByOthers = activeLock && activeLock.userId !== currentUser?._id?.toString();
    const isLockedByMe = activeLock && activeLock.userId === currentUser?._id?.toString();

    const handleFocus = () => {
        if (isConnected && !isLockedByOthers) {
            socket.emit('acquireFieldLock', { projectId, fieldId });
        }
    };

    const handleBlur = (e) => {
        if (isConnected && isLockedByMe) {
            socket.emit('releaseFieldLock', { projectId, fieldId });
        }
        if (props.onBlur) props.onBlur(e);
    };

    const Component = as;

    return (
        <div className="space-y-3 relative group/input">
            <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                    {label}
                </label>

                <AnimatePresence>
                    {isLockedByOthers && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, x: 20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9, x: 20 }}
                            className="flex items-center gap-2 px-3 py-1.5 glass-2 bg-amber-500/10 border border-amber-500/20 rounded-xl"
                        >
                            <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </div>
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                                {activeLock.userName} is editing
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className={twMerge(clsx(
                "relative transition-all duration-500",
                isLockedByOthers ? "opacity-60 grayscale-[0.5] scale-[0.98]" : "opacity-100"
            ))}>
                <Component
                    {...register(fieldId)}
                    {...props}
                    type={type}
                    placeholder={placeholder}
                    disabled={externalDisabled || isLockedByOthers}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    className={twMerge(clsx(
                        "w-full bg-surface border border-default rounded-2xl px-5 py-4 text-primary placeholder:text-tertiary transition-all font-medium text-sm",
                        "focus:outline-none focus:ring-4 focus:ring-cyan-500/5 focus:border-cyan-500/30",
                        isLockedByOthers && "cursor-not-allowed border-amber-500/20 bg-amber-500/[0.02]",
                        as === 'textarea' && "resize-none leading-relaxed h-32"
                    ))}
                />

                {isLockedByOthers && (
                    <div className="absolute inset-0 z-10 cursor-not-allowed flex items-center justify-center">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-amber-400"
                        >
                            <Lock className="w-4 h-4" />
                        </motion.div>
                    </div>
                )}

                <AnimatePresence>
                    {isLockedByMe && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute -bottom-1 right-4 translate-y-full pt-2"
                        >
                            <div className="px-3 py-1.5 glass-2 bg-cyan-700/20 border border-cyan-500/30 rounded-xl flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest text-glow-cyan">Editing Mode</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mt-2 flex items-center gap-2 ml-1">
                            <ShieldAlert className="w-3 h-3" />
                            {error.message}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// 4. MemberRow
export const MemberRow = ({
    member,
    currentUser,
    managerCount,
    isViewer,
    onUpdateRole,
    onRemove,
    isUpdating,
    isRemoving,
    canManage
}) => {
    const isSelf = member.userId?._id === currentUser?._id;
    const isOnlyManager = member.role === 'Manager' && managerCount === 1;

    return (
        <motion.tr 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={twMerge(clsx(
                "group hover:bg-white/[0.02] transition-colors",
                member.status === 'rejected' && "opacity-50 grayscale"
            ))}
        >
            <td className="px-10 py-6">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-[#09090b] border border-white/10 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 shadow-xl">
                            {member.userId?.avatar ? (
                                <img src={member.userId.avatar} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 text-gray-400 font-black text-xs">
                                    {member.userId?.name?.charAt(0)}
                                </div>
                            )}
                        </div>
                        {isSelf && (
                            <div className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-md bg-cyan-500 text-[#09090b] text-[8px] font-black uppercase tracking-widest shadow-lg shadow-cyan-500/40 border border-white/20">
                                You
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-white tracking-tight group-hover:text-cyan-400 transition-colors">
                                {member.userId?.name}
                            </p>
                            {member.status === 'pending' && (
                                <span className="px-1.5 py-0.5 rounded bg-yellow-400/10 border border-yellow-500/20 text-yellow-500 text-[8px] font-black uppercase tracking-widest animate-pulse">
                                    Pending
                                </span>
                            )}
                            {member.status === 'rejected' && (
                                <span className="px-1.5 py-0.5 rounded bg-red-400/10 border border-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-widest">
                                    Declined
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] font-medium text-gray-500 mt-1 uppercase tracking-widest">{member.userId?.email}</p>
                    </div>
                </div>
            </td>
            <td className="px-10 py-6">
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                        disabled={isViewer || (isSelf && isOnlyManager) || isUpdating || member.status === 'rejected'}
                        className={twMerge(clsx(
                            "flex items-center gap-3 px-4 py-2 rounded-xl border border-white/5 bg-white/[0.02] text-[10px] font-black uppercase tracking-widest text-gray-300 transition-all outline-none",
                            "hover:border-cyan-500/30 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed group/trigger"
                        ))}
                    >
                        <Shield className="w-3.5 h-3.5 text-cyan-500/60 transition-colors group-hover/trigger:text-cyan-400" />
                        <span>{member.role}</span>
                        <ChevronDown className="w-3 h-3 text-gray-600 transition-transform group-data-[state=open]:rotate-180" />
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                        <DropdownMenu.Content 
                            className="z-[200] min-w-[180px] glass-2 bg-[#09090b]/80 border border-white/10 rounded-[1.5rem] p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                            sideOffset={8}
                        >
                            <div className="px-3 py-2 text-[9px] font-black text-gray-600 uppercase tracking-[0.2em] mb-1">Select Access Level</div>
                            {['Manager', 'Editor', 'Viewer'].map((role) => (
                                <DropdownMenu.Item
                                    key={role}
                                    onClick={() => onUpdateRole(member.userId._id, role)}
                                    className={twMerge(clsx(
                                        "flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer outline-none transition-all",
                                        member.role === role ? "bg-cyan-500/10 text-cyan-400" : "text-gray-400",
                                        "hover:bg-white/5 hover:text-white"
                                    ))}
                                >
                                    <div className={twMerge(clsx(
                                        "w-1.5 h-1.5 rounded-full transition-all",
                                        member.role === role ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" : "bg-gray-800"
                                    ))} />
                                    {role}
                                </DropdownMenu.Item>
                            ))}
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>
            </td>
            <td className="px-10 py-6">
                <div className="flex items-center gap-2 text-gray-500">
                    <History className="w-3.5 h-3.5 opacity-40" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        {new Date(member.joinedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                </div>
            </td>
            <td className="px-10 py-6 text-right">
                <div className="flex items-center justify-end gap-2">
                    {canManage && !isSelf && (
                        <button
                            onClick={() => onRemove(member.userId._id)}
                            disabled={isRemoving}
                            className="p-3 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all disabled:opacity-20 active:scale-90 border border-transparent hover:border-red-500/20 shadow-xl"
                            title="De-authorize Agent"
                        >
                            <UserMinus className="w-4 h-4" />
                        </button>
                    )}
                    <button className="p-3 text-gray-600 hover:text-white hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10 active:scale-90">
                        <UserCog className="w-4 h-4" />
                    </button>
                </div>
            </td>
        </motion.tr>
    );
};

// 5. DeadlinePopup
export const DeadlinePopup = ({ projects, user }) => {
    const queryClient = useQueryClient();
    const [dismissing, setDismissing] = useState(false);
    const [hidden, setHidden] = useState(false);

    if (!user || !projects || projects.length === 0) return null;

    let alertInfo = null;
    for (const p of projects) {
        if (p.status === 'Completed' || p.status === 'Archived') continue;
        
        const isManager = p.members.some(m => {
            if (!m.userId) return false;
            const memberId = typeof m.userId === 'object' ? m.userId._id : m.userId;
            return memberId === user._id && m.role === 'Manager';
        });
        if (!isManager) continue;

        const notif = p.deadlineNotified || {};
        const timeDiff = new Date(p.endDate).getTime() - new Date().getTime();
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

        if (timeDiff < 0) {
            if (!notif.exceededDismissedBy?.includes(user._id)) {
                alertInfo = { project: p, type: 'exceeded' };
                break;
            }
        } 
        else if (timeDiff <= threeDaysMs) {
            if (!notif.approachingDismissedBy?.includes(user._id)) {
                alertInfo = { project: p, type: 'approaching' };
                break;
            }
        }
    }

    if (!alertInfo || hidden) return null;

    const handleDismiss = async () => {
        setDismissing(true);
        try {
            await api.post(`/projects/${alertInfo.project._id}/dismiss-alert`, { type: alertInfo.type });
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setHidden(true);
        } catch (err) {
            console.error(err);
        }
        setDismissing(false);
    };

    const isExceeded = alertInfo.type === 'exceeded';

    return (
        <AnimatePresence>
            {!hidden && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[420px] px-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full bg-surface/90 backdrop-blur-xl border border-default rounded-full py-2.5 px-3 shadow-xl flex items-center gap-3 overflow-hidden"
                    >
                        <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${isExceeded ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>
                            {isExceeded ? <Shield className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <p className="text-secondary text-xs truncate">
                                <strong className="text-primary tracking-tight mr-1">{alertInfo.project.name}</strong>
                                {isExceeded ? 'deadline exceeded.' : 'deadline approaching.'}
                            </p>
                        </div>
                        
                        <div className="flex gap-2 shrink-0 pr-1">
                            <button 
                                onClick={handleDismiss} 
                                disabled={dismissing}
                                className="text-[11px] font-semibold text-tertiary hover:text-primary transition-colors px-2 py-1.5 rounded-lg"
                            >
                                Dismiss
                            </button>
                            <Link 
                                to={`/projects/${alertInfo.project._id}/settings`}
                                onClick={() => setHidden(true)}
                                className="text-[11px] font-bold text-theme bg-theme/10 hover:bg-theme/20 transition-colors px-3 py-1.5 rounded-lg"
                            >
                                Manage
                            </Link>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
