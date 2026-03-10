import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ProjectImage = ({ project, className = "", aspect = "aspect-video" }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    const hasImage = project?.coverImageUrl && !imageError;
    const initial = project?.name?.charAt(0) || 'P';

    return (
        <div className={`relative overflow-hidden ${aspect} ${className}`}>
            <AnimatePresence mode="wait">
                {hasImage ? (
                    <motion.img
                        key="image"
                        src={project.coverImageUrl}
                        alt={project.name}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: imageLoaded ? 1 : 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <motion.div
                        key="fallback"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full h-full bg-gradient-to-br from-emerald-500 to-purple-600 flex items-center justify-center relative group"
                    >
                        {/* Elegant background texture */}
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:20px_20px]" />

                        <div className="relative z-10 flex flex-col items-center">
                            <span className="text-white font-black text-4xl sm:text-5xl uppercase tracking-tighter drop-shadow-2xl">
                                {initial}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Subtle overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </div>
    );
};

export default ProjectImage;
