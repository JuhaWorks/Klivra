import React, { memo, useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { RADAR_SUBJECTS } from './RadarConstants';

/**
 * SpecialtyRadar - A high-fidelity strategic visualization component.
 * Used for both Global Profile progression and Project-specific dynamics.
 */
const SpecialtyRadar = memo(function SpecialtyRadar({ 
    specialties = {}, 
    level = 1, 
    height = 200, 
    isProjectView = false,
    manualFullMark = null
}) {
    // Generate unique ID for Gradient to avoid collisions in complex views
    const gradientId = useMemo(() => `radarGradient-${Math.random().toString(36).substring(7)}`, []);

    const fullMark = manualFullMark ?? 100;

    const data = useMemo(() => 
        RADAR_SUBJECTS.map((sub) => ({
            subject: sub,
            A: Math.min(fullMark, Math.max(0, specialties[sub] ?? 0)),
            fullMark: fullMark,
        })),
        [specialties, fullMark]
    );

    return (
        <div style={{ height }} className="w-full relative group/radar">
            <AnimatePresence>
                {isProjectView && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.1 }}
                        className="absolute inset-0 bg-theme rounded-full blur-[60px] pointer-events-none"
                    />
                )}
            </AnimatePresence>

            <div className="h-full min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7B52FF" stopOpacity={0.7} />
                                <stop offset="95%" stopColor="#0D6EFD" stopOpacity={0.3} />
                            </linearGradient>
                        </defs>
                        
                        <PolarGrid 
                            stroke="#1E2530" 
                            strokeOpacity={1} 
                            gridType="polygon"
                        />
                        
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ 
                                fontSize: 9, 
                                fontWeight: 900, 
                                fill: '#8A95A8', 
                                letterSpacing: '0.08em',
                                textAnchor: 'middle'
                            }}
                        />

                        <Radar
                            name="Resource Allocation"
                            dataKey="A"
                            stroke="#7B52FF"
                            strokeWidth={3}
                            fill={`url(#${gradientId})`}
                            fillOpacity={1}
                            dot={{ 
                                r: 4, 
                                fill: '#7B52FF', 
                                fillOpacity: 1, 
                                stroke: '#fff', 
                                strokeWidth: 2 
                            }}
                            animationDuration={1500}
                            animationBegin={200}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            {!isProjectView && Object.values(specialties).some(v => v > 80) && (
                <div className="absolute top-2 right-2 px-2.5 py-1 bg-theme/10 border border-theme/20 rounded-lg text-[8px] font-black text-theme uppercase tracking-widest animate-pulse backdrop-blur-sm">
                    Elite Maturity
                </div>
            )}
        </div>
    );
});

export default SpecialtyRadar;
