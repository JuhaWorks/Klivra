import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

const Tooltip = ({ children, content, position = 'top', className }) => {
    const [isVisible, setIsVisible] = useState(false);

    const positions = {
        top: "-top-10 left-1/2 -translate-x-1/2",
        bottom: "-bottom-10 left-1/2 -translate-x-1/2",
        left: "-left-10 top-1/2 -translate-y-1/2 -translate-x-full",
        right: "-right-10 top-1/2 -translate-y-1/2 translate-x-full"
    };

    return (
        <div 
            className="relative flex items-center"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: position === 'top' ? 10 : -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: position === 'top' ? 10 : -10 }}
                        className={cn(
                            "absolute z-[1000] px-3 py-1.5 rounded-lg bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl pointer-events-none whitespace-nowrap",
                            positions[position],
                            className
                        )}
                    >
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">
                            {content}
                        </span>
                        {/* Little Arrow */}
                        <div className={cn(
                            "absolute w-2 h-2 bg-black/90 border-r border-b border-white/10 rotate-45",
                            position === 'top' && "bottom-[-4px] left-1/2 -translate-x-1/2",
                            position === 'bottom' && "top-[-4px] left-1/2 -translate-x-1/2",
                            position === 'left' && "right-[-4px] top-1/2 -translate-y-1/2",
                            position === 'right' && "left-[-4px] top-1/2 -translate-y-1/2",
                        )} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Tooltip;
