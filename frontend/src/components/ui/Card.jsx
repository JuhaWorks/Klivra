import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import GlassSurface from './GlassSurface';

/**
 * Standard Vanguard Card v4
 * Premium Liquid Glass with valid SVGs and explicit CSS backdrop
 */
const Card = ({
    children,
    className,
    hoverable = true,
    padding = 'p-6',
    variant = 'glass', // 'glass' | 'solid' | 'outline'
    interactive = true,
    hideBorder = false,
    ...props
}) => {
    const variants = {
        glass: 'glass-card border-default/10 dark:border-white/10 shadow-float dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]',
        solid: 'bg-[var(--bg-surface)] border-default shadow-card',
        outline: 'bg-transparent border-default'
    };

    if (variant === 'glass') {
        const { 
            initial, animate, whileInView, whileHover, viewport, transition, 
            performance = 'high',
            ...rest 
        } = props;
        return (
            <motion.div
                initial={initial || { opacity: 0, y: 20 }}
                whileInView={whileInView || { opacity: 1, y: 0 }}
                viewport={viewport || { once: true }}
                animate={animate}
                transition={transition}
                whileHover={hoverable ? (whileHover || { y: -5, transition: { type: 'spring', stiffness: 400, damping: 25 } }) : {}}
                className={cn('relative w-full h-full rounded-[3.15rem] overflow-hidden', className)}
                {...rest}
            >
                <div className="absolute inset-0 z-0">
                    <GlassSurface
                        width="100%"
                        height="100%"
                        borderRadius={48}
                        displace={0.5}
                        distortionScale={-60}
                        redOffset={0}
                        greenOffset={10}
                        blueOffset={20}
                        opacity={0.93}
                        backgroundOpacity={0.06}
                        performance={performance}
                        hideBorder={hideBorder}
                        className="transition-all duration-500"
                    />
                </div>
                
                <div className={cn("relative z-10 flex flex-col h-full w-full", padding)}>
                    {children}
                </div>
            </motion.div>
        );
    }

    const { 
        initial, animate, whileInView, whileHover, viewport, transition, 
        performance,
        ...rest 
    } = props;
    return (
        <motion.div
            initial={initial || { opacity: 0, y: 20 }}
            whileInView={whileInView || { opacity: 1, y: 0 }}
            viewport={viewport || { once: true }}
            animate={animate}
            transition={transition}
            whileHover={hoverable ? (whileHover || { y: -5, transition: { type: 'spring', stiffness: 400, damping: 25 } }) : {}}
            className={cn('relative flex flex-col overflow-hidden rounded-[3.15rem] transition-all duration-500', variants[variant], className)}
            {...rest}
        >
            <div className={cn("relative z-10 flex flex-col h-full w-full", padding)}>
                {children}
            </div>
        </motion.div>
    );
};

export default memo(Card);
