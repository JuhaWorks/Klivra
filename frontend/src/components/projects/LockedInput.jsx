import React from 'react';
import { useSocketStore } from '../../store/useSocketStore';
import { useAuthStore } from '../../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldAlert } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


/**
 * Modern 2026 LockedInput Component
 * Real-time presence collaboration with Glassmorphism 2.0
 */

const LockedInput = ({
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

export default LockedInput;
