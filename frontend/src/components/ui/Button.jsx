import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge tailwind classes properly
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Pristine Button Component
 * Adheres strictly to the Global Design System & UX Standards.
 */
export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className,
    isLoading = false,
    disabled = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    onClick,
    type = 'button',
    ...props
}) {
    // 1. Base typographic & structural classes
    const baseClass = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 relative overflow-hidden";

    // 2. Size variants (Pristine layout spacing)
    const sizeClasses = {
        sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
        md: "px-4 py-2 text-sm rounded-lg gap-2",
        lg: "px-6 py-2.5 text-base rounded-xl gap-2",
        icon: "p-2 rounded-lg",
    };

    // 3. Style variants (Linear / Apple aesthetic)
    const variantClasses = {
        primary: "bg-emerald-600 text-white shadow-sm-soft hover:bg-emerald-700 hover:-translate-y-0.5 focus:ring-emerald-500/50",
        secondary: "bg-white text-zinc-900 border border-zinc-200/80 shadow-sm-soft hover:bg-zinc-50 hover:border-zinc-300 hover:-translate-y-0.5 focus:ring-zinc-400/50",
        destructive: "bg-red-600 text-white shadow-sm-soft hover:bg-red-700 hover:-translate-y-0.5 focus:ring-red-500/50",
        ghost: "bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus:ring-zinc-400/50",
    };

    // Merge all resulting classes safely
    const combinedClasses = cn(baseClass, sizeClasses[size], variantClasses[variant], className);

    // 4. Micro-interactions
    // We disable tap scale if it's already loading/disabled to avoid weird jittering
    const tapAnimation = disabled || isLoading ? {} : { scale: 0.98 };

    // Common icon sizing logic based on button size
    const getIconSize = () => {
        if (size === 'sm') return 'w-3.5 h-3.5';
        if (size === 'lg') return 'w-5 h-5';
        return 'w-4 h-4';
    };

    const iconClass = getIconSize();

    return (
        <motion.button
            type={type}
            className={combinedClasses}
            disabled={disabled || isLoading}
            onClick={onClick}
            whileTap={tapAnimation}
            // Optional minimal mount animation for UI entrances (can be removed if too loud globally)
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            {...props}
        >
            {/* Loading spinner overrides left icon if loading */}
            {isLoading ? (
                <Loader2 className={cn("animate-spin", iconClass)} />
            ) : LeftIcon && (
                <LeftIcon className={iconClass} />
            )}

            {/* Don't render span gap if it's an icon-only button */}
            {children && <span>{children}</span>}

            {!isLoading && RightIcon && (
                <RightIcon className={iconClass} />
            )}
        </motion.button>
    );
}
