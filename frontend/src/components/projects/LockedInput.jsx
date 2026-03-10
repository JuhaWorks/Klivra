import React, { useEffect } from 'react';
import { useSocketStore } from '../../store/useSocketStore';
import { useAuthStore } from '../../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';

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
        <div className="space-y-3 relative">
            <div className="flex justify-between items-center ml-1">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    {label}
                </label>

                <AnimatePresence>
                    {isLockedByOthers && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tight">
                                {activeLock.userName} is editing
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className={`relative transition-all duration-300 ${isLockedByOthers ? 'scale-[0.99] opacity-80' : ''}`}>
                <Component
                    {...register(fieldId)}
                    {...props}
                    type={type}
                    placeholder={placeholder}
                    disabled={externalDisabled || isLockedByOthers}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    className={`
                        w-full bg-white/[0.03] border rounded-2xl px-5 py-4 text-white placeholder:text-zinc-700 transition-all font-medium
                        focus:outline-none focus:ring-4 
                        ${isLockedByOthers
                            ? 'border-emerald-500/30 ring-4 ring-emerald-500/5 cursor-not-allowed bg-emerald-500/[0.02]'
                            : 'border-white/[0.08] focus:border-emerald-500/50 focus:ring-emerald-500/10'}
                        ${as === 'textarea' ? 'resize-none leading-relaxed text-sm' : ''}
                    `}
                />

                {isLockedByOthers && (
                    <div className="absolute inset-0 z-10 cursor-not-allowed" title={`${activeLock.userName} is currently editing this field`} />
                )}

                <AnimatePresence>
                    {isLockedByMe && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute right-4 top-1/2 -translate-y-1/2"
                        >
                            <div className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">You're editing</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {error && <p className="text-xs text-red-100 font-medium ml-1 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl">{error.message}</p>}
        </div>
    );
};

export default LockedInput;
