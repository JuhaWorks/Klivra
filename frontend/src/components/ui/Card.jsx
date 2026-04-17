import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import GlassSurface from './GlassSurface';

/**
 * Standard Vanguard Card v5 (Professional Edition)
 * Refined radius and density controls for 'Command Center' aesthetics.
 */
const Card = ({
    children,
    className,
    hoverable = true,
    padding = 'p-6',
    variant = 'glass', // 'glass' | 'solid' | 'outline'
    interactive = true,
    hideBorder = false,
    radius = '2rem', // Responsive default
    compact = false,
    ...props
}) => {
    // Override radius and padding if compact
    const effectiveRadius = compact ? '1.25rem' : radius;
    const effectivePadding = compact ? 'p-4' : padding;

    const variants = {
        glass: 'glass-card border-glass shadow-elevation',
        solid: 'bg-surface border-default shadow-card',
        outline: 'bg-transparent border-default'
    };

    const commonClasses = cn(
        'relative flex flex-col overflow-hidden transition-all duration-500', 
        variants[variant], 
        className
    );

    const style = { borderRadius: effectiveRadius };

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
                className={cn('relative w-full h-full overflow-hidden', commonClasses)}
                style={style}
                {...rest}
            >
                <div className="absolute inset-0 z-0">
                    <GlassSurface
                        width="100%"
                        height="100%"
                        borderRadius={compact ? 24 : 32} // Match CSS radius in px roughly
                        displace={0}
                        distortionScale={0}
                        redOffset={0}
                        greenOffset={0}
                        blueOffset={0}
                        opacity={0.9}
                        backgroundOpacity={0.08}
                        blur={20}
                        performance={performance}
                        hideBorder={hideBorder}
                        className="transition-all duration-500"
                    />
                </div>
                
                <div className={cn("relative z-10 flex flex-col h-full w-full", effectivePadding)}>
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
            className={commonClasses}
            style={style}
            {...rest}
        >
            <div className={cn("relative z-10 flex flex-col h-full w-full", effectivePadding)}>
                {children}
            </div>
        </motion.div>
    );
};

export default memo(Card);
