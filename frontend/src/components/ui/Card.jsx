import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';



const Card = ({
    children,
    className,
    hoverable = true,
    padding = 'p-6',
    variant = 'glass', // 'glass' | 'solid' | 'outline'
    ...props
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={hoverable ? {
                y: -5,
                transition: { type: 'spring', stiffness: 400, damping: 25 }
            } : {}}
            className={twMerge(clsx(
                'relative flex flex-col overflow-hidden rounded-[2rem] transition-all duration-500',
                variant === 'glass' && 'glass-2 border-default bg-[var(--bg-surface)]',
                variant === 'solid' && 'bg-[var(--bg-surface)] border border-default',
                variant === 'outline' && 'bg-transparent border border-default',
                padding,
                className
            ))}
            {...props}
        >
            {/* 2026 Structural Reinforcement Glow */}
            {variant === 'glass' && hoverable && (
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-theme-500/5 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            )}
            <span className="absolute inset-0 rounded-[inherit] pointer-events-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" aria-hidden />

            <div className="relative z-10 flex flex-col h-full">
                {children}
            </div>

            {/* Subtle Texture Layer */}
            <div className="absolute inset-0 opacity-[0.015] pointer-events-none grayscale bg-[url('https://grainy-gradients.vercel.app/noise.svg')] blend-overlay" />
        </motion.div>
    );
};

export default Card;
