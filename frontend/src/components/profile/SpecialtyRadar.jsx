import React, { memo, useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Standard Professional Strategic Axes
 */
export const RADAR_SUBJECTS = [
    'Strategic', 
    'Engineering', 
    'Sustainability', 
    'Operations'
];

/**
 * SpecialtyRadar - A high-fidelity strategic visualization component.
 * Used for both Global Profile progression and Project-specific dynamics.
 */
const SpecialtyRadar = memo(({ 
    specialties = {}, 
    level = 1, 
    height = 200, 
    isProjectView = false,
    manualFullMark = null
}) => {
    // Universal Normalization: All radars now scale based on a percentage mix (0-100)
    // This ensures accuracy and geometric stability across both Profiles and Projects.
    const fullMark = manualFullMark || 100;

    const data = useMemo(() => 
        RADAR_SUBJECTS.map((sub) => ({
            subject: sub,
            // Clamping 0-100 ensures geometric stability against outlier data
            A: Math.min(100, Math.max(0, specialties[sub] ?? 0)),
            fullMark: fullMark,
        })),
        [specialties, fullMark]
    );

    return (
        <div style={{ height }} className="w-full relative group/radar">
            {/* Subtle pulsir bg for active feel */}
            <AnimatePresence>
                {isProjectView && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.05 }}
                        className="absolute inset-0 bg-theme rounded-full blur-[80px] pointer-events-none"
                    />
                )}
            </AnimatePresence>

            <div className="h-full min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
                        <defs>
                            <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--theme)" stopOpacity={0.6} />
                                <stop offset="95%" stopColor="var(--theme)" stopOpacity={0.15} />
                            </linearGradient>
                        </defs>
                        
                        <PolarGrid 
                            stroke="var(--border-strong)" 
                            strokeOpacity={0.4} 
                            gridType="polygon"
                        />
                        
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ 
                                fontSize: 9, 
                                fontWeight: 900, 
                                fill: 'var(--text-tertiary)', 
                                letterSpacing: '0.08em',
                                textAnchor: 'middle'
                            }}
                        />

                        <Radar
                            name="Resource Allocation"
                            dataKey="A"
                            stroke="var(--theme)"
                            strokeWidth={2.5}
                            fill="url(#radarGradient)"
                            fillOpacity={1}
                            animationDuration={1500}
                            animationBegin={200}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            {/* Overlay indicators - Dynamic Logic */}
            {!isProjectView && Object.values(specialties).some(v => v > 80) && (
                <div className="absolute top-2 right-2 px-2.5 py-1 bg-theme/10 border border-theme/20 rounded-lg text-[8px] font-black text-theme uppercase tracking-widest animate-pulse backdrop-blur-sm">
                    Elite Maturity
                </div>
            )}
        </div>
    );
});

SpecialtyRadar.displayName = 'SpecialtyRadar';

export default SpecialtyRadar;
