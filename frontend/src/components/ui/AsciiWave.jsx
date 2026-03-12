"use client";

import React, { useRef, useEffect } from "react";
import { useTheme } from "../../store/useTheme";

const AsciiWave = ({
    className = "",
    color = "#06b6d4",  // Default to Cyan 500 to match Loading.jsx
    speed = 1
}) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const { mode } = useTheme();

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationId;
        let time = 0;

        const resize = () => {
            if (!container || !canvas) return;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = container.clientWidth * dpr;
            canvas.height = container.clientHeight * dpr;
            ctx.scale(dpr, dpr);
        };

        const observer = new ResizeObserver(resize);
        observer.observe(container);
        resize();

        // ASCII Characters sorted by density (light to dark)
        const chars = " .:+x*#".split("");
        const fontSize = 12;
        const columnWidth = 10;

        const draw = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;

            ctx.clearRect(0, 0, width, height);

            ctx.font = `${fontSize}px monospace`;
            ctx.fillStyle = color;

            const columns = Math.ceil(width / columnWidth);
            const rows = Math.ceil(height / fontSize);

            // "Fire" Logic: Pure Vertical Ascent
            for (let x = 0; x < columns; x++) {
                const shapeBase = Math.sin(x * 0.1) * 0.6 + Math.cos(x * 0.25) * 0.4;
                const breath = Math.sin(time * 0.002 * speed) * 0.1;
                const flicker = Math.sin(time * 0.008 * speed + x * 100) * 0.05;

                const noise = shapeBase + breath + flicker;
                const columnHeightNormal = Math.max(0.15, (noise + 1) / 2 * 0.6 + 0.15);
                const activeRows = Math.floor(columnHeightNormal * rows);

                for (let y = rows - 1; y > rows - activeRows; y--) {
                    const flowShift = time * 0.005 * speed;
                    const charNoise = Math.sin((y * 0.2) - flowShift + x * 10);
                    const distFromTop = (y - (rows - activeRows));
                    const fade = Math.min(1, distFromTop / 6);
                    const normalizedNoise = (charNoise + 1) / 2;
                    const charIndex = Math.floor(normalizedNoise * chars.length);
                    const char = chars[Math.min(charIndex, chars.length - 1)];

                    const posX = x * columnWidth;
                    const posY = y * fontSize;

                    if (Math.random() > 0.95) continue;

                    ctx.globalAlpha = fade;
                    ctx.fillText(char, posX, posY);
                }
            }

            ctx.globalAlpha = 1.0;
            time += 16;
            animationId = requestAnimationFrame(draw);
        };

        animationId = requestAnimationFrame(draw);

        return () => {
            observer.disconnect();
            cancelAnimationFrame(animationId);
        };
    }, [color, speed, mode]);

    return (
        <div ref={containerRef} className={`w-full h-full overflow-hidden ${className}`}>
            <canvas ref={canvasRef} className="block w-full h-full" />
        </div>
    );
};

export default AsciiWave;
