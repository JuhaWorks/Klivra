import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


/**
 * Modern 2026 AvatarGroup
 * High-vibrance presence indicators with Glassmorphism 2.0
 */
const AvatarGroup = ({ viewers = [], max = 4, onClick }) => {
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

                        {/* Status Indicator Grid */}
                        <div className={twMerge(clsx(
                            "absolute bottom-0 right-0 w-4 h-4 rounded-lg border-2 border-[#09090b] z-[2] shadow-xl",
                            (viewer.status === 'Online' || viewer.status === 'active') ? 'bg-emerald-500 shadow-emerald-500/40' :
                                (viewer.status === 'Away' || viewer.status === 'away') ? 'bg-amber-500 shadow-amber-500/40' :
                                    viewer.status === 'Do Not Disturb' ? 'bg-rose-500 shadow-rose-500/40' : 'bg-gray-600'
                        ))}>
                            <div className="absolute inset-0 bg-white/20 rounded-sm scale-[0.3]" />
                        </div>

                        {/* Cinematic Tooltip */}
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

export default AvatarGroup;
