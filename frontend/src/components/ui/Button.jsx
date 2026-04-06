import React, { forwardRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, X } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Interactive Button Component
 * Premium Glassmorphism Design
 */
const Button = forwardRef(({
    children,
    variant = 'primary',
    size = 'md',
    className,
    isLoading = false,
    status = null, // 'success' | 'error' | null
    disabled = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    iconOnly = false,
    fullWidth = false,
    onClick,
    type = 'button',
    as,
    ...props
}, ref) => {
    const Component = as ? motion.create(as) : motion.button;
    const isDisabled = disabled || isLoading || !!status;

    const handleClick = (e) => {
        if (isDisabled) {
            e.preventDefault();
            return;
        }
        if (typeof window !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
        }
        if (onClick) onClick(e);
    };

    const sizes = {
        sm: 'h-9 px-4 text-xs gap-2 rounded-xl',
        md: 'h-12 px-6 text-sm gap-2.5 rounded-2xl',
        lg: 'h-14 px-8 text-base gap-3 rounded-[1.25rem]',
    };

    const variants = {
        primary: 'bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 backdrop-blur-md shadow-lg shadow-accent/10',
        vibrant: 'bg-theme hover:brightness-110 text-white border border-white/10 shadow-2xl shadow-theme/30 font-black',
        secondary: 'bg-surface hover:bg-elevated text-primary border border-default backdrop-blur-md',
        ghost: 'bg-transparent text-tertiary hover:text-primary hover:bg-surface border-transparent',
        destructive: 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 backdrop-blur-md',
        outline: 'bg-transparent text-secondary hover:text-primary border border-default hover:border-strong backdrop-blur-sm'
    };

    return (
        <Component
            ref={ref}
            type={!as ? type : undefined}
            disabled={isDisabled}
            onClick={handleClick}
            whileHover={!isDisabled ? { y: -2, scale: 1.02, transition: { type: 'spring', stiffness: 400, damping: 10 } } : {}}
            whileTap={!isDisabled ? { scale: 0.98 } : {}}
            className={cn(
                'relative inline-flex items-center justify-center select-none transition-all duration-300 transform-gpu overflow-hidden',
                sizes[size],
                variants[variant],
                fullWidth && 'w-full',
                isDisabled && 'opacity-40 cursor-not-allowed pointer-events-none grayscale',
                className
            )}
            {...props}
        >
            {/* Inner Glow/Highlight */}
            <span
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                aria-hidden="true"
            />

            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="flex items-center gap-2"
                    >
                        <Loader2 className="w-4 h-4 animate-spin text-accent-500" />
                        {!iconOnly && <span>Loading</span>}
                    </motion.div>
                ) : status === 'success' ? (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 text-emerald-400"
                    >
                        <Check className="w-4 h-4" />
                        {!iconOnly && <span>Success</span>}
                    </motion.div>
                ) : status === 'error' ? (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-center gap-2 text-rose-400"
                    >
                        <X className="w-4 h-4" />
                        {!iconOnly && <span>Error</span>}
                    </motion.div>
                ) : (
                    <motion.div
                        key="content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-[inherit] relative z-10"
                    >
                        {LeftIcon && <LeftIcon className="w-4 h-4" />}
                        {!iconOnly && children}
                        {RightIcon && <RightIcon className="w-4 h-4" />}
                        {iconOnly && !LeftIcon && !RightIcon && children}
                    </motion.div>
                )}
            </AnimatePresence>
        </Component>
    );
});

Button.displayName = 'Button';
export default Button;