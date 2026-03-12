import React, { forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Modern 2026 Vite-Optimized Input
 * Adheres to Glassmorphism 2.0 and Agentic UX standards.
 */


const Input = forwardRef(({
    className,
    error,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    label,
    id,
    ...props
}, ref) => {
    return (
        <div className="flex flex-col gap-2 w-full">
            {label && (
                <label 
                    htmlFor={id} 
                    className="text-xs font-bold uppercase tracking-widest text-secondary ml-1"
                >
                    {label}
                </label>
            )}
            <div className="relative group">
                {LeftIcon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary group-focus-within:text-cyan-400 transition-colors">
                        <LeftIcon className="w-4 h-4" />
                    </div>
                )}
                <input
                    id={id}
                    ref={ref}
                    className={twMerge(clsx(
                        'w-full h-11 px-4 text-sm bg-surface border border-default rounded-2xl outline-none text-primary',
                        'backdrop-blur-xl transition-all duration-300',
                        'placeholder:text-tertiary',
                        'focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/5',
                        'hover:bg-white/[0.08] dark:hover:bg-white/[0.03] hover:border-accent-border',
                        LeftIcon && 'pl-11',
                        RightIcon && 'pr-11',
                        error && 'border-red-500/30 focus:border-red-500/50 focus:ring-red-500/5',
                        className
                    ))}
                    {...props}
                />
                {RightIcon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {RightIcon}
                    </div>
                )}
                {/* 2026 Inner Glow */}
                <span className="absolute inset-0 rounded-[inherit] pointer-events-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" />
            </div>
            
            <AnimatePresence>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="text-xs font-medium text-red-400/90 ml-1"
                    >
                        {error}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
});

Input.displayName = 'Input';
export default Input;
