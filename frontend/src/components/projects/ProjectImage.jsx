import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


/**
 * Modern 2026 Project Image Primitive
 * Performance-first, cinematic fallback, Glassmorphism 2.0
 */

const ProjectImage = ({ project, className = "", aspect = "aspect-video" }) => {
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
                        {/* Shimmer overlay for loading */}
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
                        {/* 2026 Gradient Mesh Fallback */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b] to-[#0f172a]" />
                        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" />
                        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-blue-600/10 rounded-full blur-[100px] animate-pulse" />
                        
                        {/* Grainy Texture */}
                        <div className="absolute inset-0 opacity-[0.03] grayscale bg-[url('https://grainy-gradients.vercel.app/noise.svg')] blend-overlay pointer-events-none" />

                        <div className="relative z-10 flex flex-col items-center">
                            <span className="text-white font-black text-6xl uppercase tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                                {initial}
                            </span>
                            <div className="absolute -inset-4 border border-white/5 rounded-[2rem] opacity-20 group-hover:scale-110 transition-transform duration-500" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cinematic Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 border border-white/5 rounded-[inherit] pointer-events-none" />
        </div>
    );
};

export default memo(ProjectImage);
