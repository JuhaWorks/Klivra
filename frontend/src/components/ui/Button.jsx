import React, { forwardRef, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { Loader2, Check, X } from 'lucide-react/dist/esm/lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

// ── Vanguard 2026: Physics Configuration ──
const LIQUID_SPRING = { type: 'spring', stiffness: 260, damping: 20, mass: 0.5 };
const MAGNETIC_SPRING_CONFIG = { damping: 15, stiffness: 150, mass: 0.1 };

/**
 * Modern 2026 Vanguard Button
 * Liquid Glassmorphism, Magnetic Haptic Physics
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
    hapticIntensity = 'light', // 'light' | 'heavy'
    ...props
}, ref) => {
    const internalRef = useRef(null);
    const buttonRef = ref || internalRef;
    const [isHovered, setIsHovered] = useState(false);

    // Magnetic Physics Values
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const springX = useSpring(x, MAGNETIC_SPRING_CONFIG);
    const springY = useSpring(y, MAGNETIC_SPRING_CONFIG);

    const isDisabled = disabled || isLoading || !!status;

    // ── Vanguard 2026: Haptic Reinforcement & Magnetic Mouse ──
    const handleMouseMove = (e) => {
        if (isDisabled || !buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        // Subtle magnetic pull (15% toward cursor)
        x.set((e.clientX - centerX) * 0.15);
        y.set((e.clientY - centerY) * 0.15);
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        x.set(0);
        y.set(0);
    };

    const handleMouseOver = () => {
        if (!isDisabled) setIsHovered(true);
    };

    const handleClick = (e) => {
        if (isDisabled) {
            e.preventDefault();
            return;
        }
        
        // Haptic Feedback (if supported)
        if (typeof window !== 'undefined' && navigator.vibrate) {
            if (variant === 'destructive' || hapticIntensity === 'heavy') {
                navigator.vibrate([10, 30, 20]); // Heavy tactile response
            } else {
                navigator.vibrate(10); // Light crisp click
            }
        }

        if (onClick) onClick(e);
    };

    // ── Aesthetic & Structural Maps ──
    const variants = {
        primary: 'bg-gradient-to-br from-cyan-500/80 to-blue-600/80 border-[oklch(100%_0_0/0.1)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),_0_10px_20px_rgba(6,182,212,0.2)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3),_0_15px_30px_rgba(6,182,212,0.4)]',
        secondary: 'bg-[oklch(100%_0_0/0.05)] border-[oklch(100%_0_0/0.1)] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:bg-[oklch(100%_0_0/0.1)]',
        ghost: 'bg-transparent border-transparent text-gray-300 hover:text-white hover:bg-[oklch(100%_0_0/0.05)]',
        destructive: 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),_0_10px_20px_rgba(244,63,94,0.1)]',
        outline: 'bg-transparent border-[oklch(100%_0_0/0.1)] text-gray-300 hover:text-white hover:border-[oklch(100%_0_0/0.3)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]'
    };

    const sizes = {
        sm: 'h-9 px-4 text-xs gap-2 rounded-xl',
        md: 'h-12 px-6 text-sm gap-2.5 rounded-2xl',
        lg: 'h-14 px-8 text-base gap-3 rounded-[1.25rem]',
    };

    return (
        <motion.button
            ref={buttonRef}
            type={type}
            disabled={isDisabled}
            onClick={handleClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseOver}
            style={{ x: springX, y: springY }}
            whileHover={isDisabled ? {} : { scale: 1.02, rotateX: 2, perspective: 1000 }}
            whileTap={isDisabled ? {} : { scale: 0.96, rotateX: -2, z: -10 }}
            transition={LIQUID_SPRING}
            aria-busy={isLoading}
            className={cn(
                'relative inline-flex items-center justify-center font-bold tracking-tight select-none',
                'transition-colors duration-300 border backdrop-blur-3xl transform-gpu',
                'focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/30',
                sizes[size],
                variants[variant],
                fullWidth && 'w-full',
                isDisabled && 'opacity-40 cursor-not-allowed pointer-events-none grayscale blur-[1px]',
                className
            )}
            {...props}
        >
            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 0, scale: 0.5, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: -5 }}
                        transition={LIQUID_SPRING}
                        className="flex items-center gap-2"
                    >
                        <Loader2 className="w-5 h-5 animate-spin text-cyan-200" />
                        {!iconOnly && <span>Orchestrating</span>}
                    </motion.div>
                ) : status === 'success' ? (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={LIQUID_SPRING}
                        className="flex items-center gap-2 text-emerald-300"
                    >
                        <Check className="w-5 h-5" />
                        {!iconOnly && <span>Verified</span>}
                    </motion.div>
                ) : status === 'error' ? (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={LIQUID_SPRING}
                        className="flex items-center gap-2 text-rose-300"
                    >
                        <X className="w-5 h-5" />
                        {!iconOnly && <span>Sync Failed</span>}
                    </motion.div>
                ) : (
                    <motion.div
                        key="content"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-[inherit] z-10"
                    >
                        {LeftIcon && <LeftIcon className="w-5 h-5" />}
                        {!iconOnly && children}
                        {RightIcon && <RightIcon className="w-5 h-5 font-black" />}
                        {iconOnly && !LeftIcon && !RightIcon && children}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Vanguard Spotlight Tracking */}
            {isHovered && !isDisabled && variant !== 'ghost' && (
                <motion.div
                    className="absolute inset-0 rounded-[inherit] pointer-events-none z-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        background: 'radial-gradient(100px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.1), transparent 40%)',
                    }}
                />
            )}
            
            {/* Structural Highlight */}
            <span className="absolute inset-0 rounded-[inherit] pointer-events-none shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)] mix-blend-overlay border border-[oklch(100%_0_0/0.05)]" aria-hidden />
        </motion.button>
    );
});

Button.displayName = 'Button';
export default Button;