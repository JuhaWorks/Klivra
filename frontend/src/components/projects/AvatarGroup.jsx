import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AvatarGroup = ({ viewers = [], max = 4, onClick }) => {
    const displayViewers = viewers.slice(0, max);
    const overflowCount = viewers.length > max ? viewers.length - max : 0;

    return (
        <div
            onClick={onClick}
            className={`flex items-center -space-x-4 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
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
                            stiffness: 300,
                            damping: 25,
                            delay: index * 0.05
                        }}
                        className="relative group focus:outline-none"
                        title={viewer.name}
                    >
                        <div className={`
                            w-10 h-10 rounded-full border-2 border-zinc-950 bg-zinc-800 shadow-xl overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:scale-110 group-hover:z-50 ring-4 ring-transparent group-hover:ring-emerald-500/20
                            ${(viewer.status === 'Away' || viewer.status === 'away') ? 'opacity-50 grayscale' : 'opacity-100'}
                        `}>
                            {viewer.avatar ? (
                                <img
                                    src={viewer.avatar}
                                    alt={viewer.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 text-[10px] font-black text-white uppercase">
                                    {viewer.name?.charAt(0) || '?'}
                                </div>
                            )}
                        </div>

                        {/* Status Indicator */}
                        <div className={`
                            absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-950 z-[2]
                            ${(viewer.status === 'Online' || viewer.status === 'active') ? 'bg-emerald-500' :
                                (viewer.status === 'Away' || viewer.status === 'away') ? 'bg-amber-500' :
                                    viewer.status === 'Do Not Disturb' ? 'bg-rose-500' : 'bg-zinc-500'}
                        `} />

                        {/* Tooltip (Simple native fallback + style) */}
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-[10px] font-black text-white opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-2xl z-[60]">
                            {viewer.name}
                        </div>
                    </motion.div>
                ))}

                {overflowCount > 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-10 h-10 rounded-full border-2 border-zinc-950 bg-zinc-900 flex items-center justify-center text-[10px] font-black text-zinc-400 shadow-xl relative z-10"
                    >
                        +{overflowCount}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AvatarGroup;
