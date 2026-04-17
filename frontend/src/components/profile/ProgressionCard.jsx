import React, { memo, useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Star, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { cn, getLevelProgress } from './ProfileUtils';
import { BadgeIcon } from './ProfileHelpers';
import SpecialtyRadar from './SpecialtyRadar';
import { RADAR_SUBJECTS } from './RadarConstants';

// ----------------------------------------------------------------------
// Hooks
// ----------------------------------------------------------------------

const useGamificationData = (user) =>
    useMemo(() => {
        const g = user?.gamification ?? {};
        // Use normalizedSpecialties for visual accuracy (0-100% Mix)
        const displaySpecialties = g.normalizedSpecialties ?? 
                                 g.specialties ?? 
                                 RADAR_SUBJECTS.reduce((acc, sub) => ({ ...acc, [sub]: 0 }), {});

        return {
            xp: g.xp ?? 0,
            level: g.level ?? 1,
            specialties: displaySpecialties,
            badges: g.badges ?? [],
            progress: getLevelProgress(g.xp ?? 0, g.level ?? 1).progress,
        };
    }, [user]);

// ----------------------------------------------------------------------
// Tooltip Portal (avoids clipping/parent overflow issues)
// ----------------------------------------------------------------------

const TooltipPortal = ({ targetRef, children, open }) => {
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const tooltipRef = useRef(null);

    useEffect(() => {
        if (!open || !targetRef.current || !tooltipRef.current) return;
        const targetRect = targetRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        setPosition({
            top: targetRect.top - tooltipRect.height - 8,
            left: targetRect.left + targetRect.width / 2 - tooltipRect.width / 2,
        });
    }, [open, targetRef, children]);

    if (!open) return null;
    return createPortal(
        <div
            ref={tooltipRef}
            style={{ top: position.top, left: position.left }}
            className="fixed z-[9999] w-56 p-4 bg-surface/95 backdrop-blur-md border border-default rounded-[24px] shadow-2xl"
            role="tooltip"
        >
            {children}
        </div>,
        document.body
    );
};

// ----------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------


const BadgeItem = memo(({ badge, level }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const triggerRef = useRef(null);
    const rarity = level > 20 ? 'Legendary' : level > 10 ? 'Rare' : 'Common';
    const rarityColor =
        rarity === 'Legendary' ? 'text-amber-500' : rarity === 'Rare' ? 'text-purple-500' : 'text-theme';

    return (
        <>
            <div
                ref={triggerRef}
                className="relative aspect-square rounded-2xl bg-sunken border border-default flex items-center justify-center cursor-help transition-all hover:scale-110 hover:border-theme/40 hover:shadow-[0_0_20px_rgba(var(--theme-rgb),0.1)]"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onFocus={() => setShowTooltip(true)}
                onBlur={() => setShowTooltip(false)}
                tabIndex={0}
                role="button"
                aria-describedby={showTooltip ? `badge-tooltip-${badge.name}` : undefined}
            >
                <BadgeIcon name={badge.name} className="w-10 h-10" />
                <div className="absolute inset-0 bg-gradient-to-tr from-theme/0 to-theme/5 opacity-0 group-hover/badge:opacity-100 transition-opacity" />
            </div>

            <TooltipPortal targetRef={triggerRef} open={showTooltip}>
                <div id={`badge-tooltip-${badge.name}`}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <BadgeIcon name={badge.name} className="w-5 h-5" />
                            <span className="text-[11px] font-black text-primary uppercase tracking-tighter">{badge.name}</span>
                        </div>
                        <span className={cn('text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-default/50', rarityColor)}>
                            {rarity}
                        </span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-tertiary font-medium mb-3">
                        {badge.description || 'Earned through consistency and high-impact contributions.'}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-default/50">
                        <span className="text-[8px] font-black text-tertiary uppercase tracking-widest">Unlocked</span>
                        <span className="text-[10px] font-black text-primary">LVL {level}</span>
                    </div>
                </div>
            </TooltipPortal>
        </>
    );
});
BadgeItem.displayName = 'BadgeItem';

const LevelProgressBar = memo(({ level, progress }) => (
    <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                <span className="w-4 h-4 rounded bg-theme/20 text-theme flex items-center justify-center text-[10px]">
                    L{level}
                </span>
                Progress to L{level + 1}
            </span>
            <span className="text-[10px] font-mono text-tertiary">{progress.toFixed(0)}%</span>
        </div>
        <div
            className="h-1.5 w-full bg-sunken rounded-full overflow-hidden border border-default/30"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.5, ease: 'circOut' }}
                className="h-full bg-theme relative"
            >
                <div className="absolute inset-0 bg-white/40 animate-pulse" />
            </motion.div>
        </div>
    </div>
));
LevelProgressBar.displayName = 'LevelProgressBar';

// ----------------------------------------------------------------------
// Skeleton Loading State
// ----------------------------------------------------------------------

const ProgressionCardSkeleton = () => (
    <div className="bg-surface border border-default rounded-2xl p-6 animate-pulse">
        <div className="h-4 w-24 bg-sunken rounded mb-2" />
        <div className="h-8 w-32 bg-sunken rounded mb-4" />
        <div className="h-1.5 w-full bg-sunken rounded-full mb-6" />
        <div className="h-[200px] w-full bg-sunken/30 rounded-xl mb-4" />
        <div className="border-t border-glass pt-6">
            <div className="h-4 w-32 bg-sunken rounded mb-4" />
            <div className="grid grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="aspect-square rounded-2xl bg-sunken" />
                ))}
            </div>
        </div>
    </div>
);

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------

const ProgressionCard = memo(({ user, isLoading = false, error = null, className }) => {
    const { xp, level, specialties, badges, progress } = useGamificationData(user);

    if (isLoading) return <ProgressionCardSkeleton />;
    if (error) {
        return (
            <div className={cn('bg-surface border border-default rounded-2xl p-6', className)}>
                <p className="text-tertiary text-sm">Unable to load progression data.</p>
            </div>
        );
    }

    return (
        <section
            className={cn('bg-surface border border-default rounded-2xl p-6 relative overflow-hidden', className)}
            aria-labelledby="progression-heading"
        >
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-theme/20 rounded-full blur-[50px] animate-pulse" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-theme/10 rounded-full blur-[40px]" />
            </div>

            <div className="flex flex-col mb-5">
                <span className="text-[10px] font-black text-tertiary uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                    <Star className="w-3 h-3 text-theme" /> Total Experience
                </span>
                <div className="text-3xl font-black font-mono text-primary tracking-tighter">
                    {xp.toLocaleString()} <span className="text-sm font-bold opacity-40 ml-0.5">XP</span>
                </div>
            </div>

            <LevelProgressBar level={level} progress={progress} />
            <SpecialtyRadar specialties={specialties} level={level} height={220} />

            <div className="border-t border-glass pt-6 mt-2">
                <h3 id="progression-heading" className="text-[10px] font-black text-tertiary uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-theme" /> Achievement Showcase
                </h3>

                {badges.length ? (
                    <div className="grid grid-cols-4 gap-3" role="list">
                        {badges.map((badge, idx) => (
                            <BadgeItem key={`${badge.name}-${idx}`} badge={badge} level={level} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 border border-dashed border-glass rounded-2xl bg-sunken/50">
                        <Award className="w-5 h-5 text-tertiary mx-auto mb-2 opacity-50" />
                        <p className="text-[10px] font-black text-tertiary uppercase tracking-widest">No badges yet</p>
                        <p className="text-[9px] text-zinc-500 font-medium">Complete tasks to start your legend.</p>
                    </div>
                )}
            </div>
        </section>
    );
});

ProgressionCard.displayName = 'ProgressionCard';

export default ProgressionCard;

// Force HMR Refresh - Clean State 1