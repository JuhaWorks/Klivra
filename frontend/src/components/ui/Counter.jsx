import React, { useRef, useEffect, memo } from 'react';

/**
 * Optimized Counter Component
 * Uses requestAnimationFrame for zero-CLS, smooth numeric transitions.
 * Consolidates into a single frame loop per instance.
 */
const Counter = memo(({ value, delay = 0, duration = 1200 }) => {
    const textRef = useRef(null);
    
    useEffect(() => {
        const end = Number(value) || 0;
        if (end === 0) { 
            if (textRef.current) textRef.current.textContent = '0'; 
            return; 
        }
        
        const startTime = performance.now() + delay;
        
        const tick = (now) => {
            if (now < startTime) {
                requestAnimationFrame(tick);
                return;
            }
            
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Cubic Ease Out: 1 - (1 - x)^3
            const ease = 1 - Math.pow(1 - progress, 3);
            
            if (textRef.current) {
                textRef.current.textContent = Math.round(ease * end).toLocaleString();
            }
            
            if (progress < 1) requestAnimationFrame(tick);
        };
        
        const raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [value, delay, duration]);

    return <span ref={textRef} className="tabular-nums">0</span>;
});

export default Counter;
