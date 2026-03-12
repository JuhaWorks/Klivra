"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";

/**
 * Premium Interactive Grid Background (V4.0 - Cinematic Emerald)
 * Pure Emerald vibrance, Screen blending (No muddiness), and balanced aspect ratios.
 */
const InteractiveGridBackground = ({
  gridSize = 70, // Slightly larger for professional cinematic look
  trailLength = 10,
  idleSpeed = 0.08,
  glow = true,
  children,
  showFade = true,
  fadeIntensity = 35, // Balanced for cinematic depth
  idleRandomCount = 3,
  className,
  ...props
}) => {
  const canvasRef = useRef(null);
  const gridCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Motion Refs
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const lerpMouseRef = useRef({ x: -1000, y: -1000 });
  const trailRef = useRef([]);
  const idleTargetsRef = useRef([]);
  const idlePositionsRef = useRef([]);
  const lastMouseTimeRef = useRef(Date.now());
  const animationReqRef = useRef(null);

  // Pure Brand Color Palette
  const COLORS = {
    emerald: "#10b981", // Exact Emerald
    emeraldGlow: "rgba(16, 185, 129, 0.8)", // Highly saturated glow core
    cyanGlow: "rgba(34, 211, 238, 0.4)", // Subtler cyan accents for idle
    gridDark: "rgba(16, 185, 129, 0.08)",
    gridLight: "rgba(16, 185, 129, 0.12)"
  };

  useEffect(() => {
    const update = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      lastMouseTimeRef.current = Date.now();
      
      if (lerpMouseRef.current.x === -1000) {
        lerpMouseRef.current.x = mouseRef.current.x;
        lerpMouseRef.current.y = mouseRef.current.y;
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gridCanvas = gridCanvasRef.current;
    if (!canvas || !gridCanvas) return;
    
    const ctx = canvas.getContext("2d");
    const gridCtx = gridCanvas.getContext("2d");
    if (!ctx || !gridCtx) return;

    let width, height, cols, rows;
    let lastTime = performance.now();

    const handleResize = () => {
      if (!containerRef.current) return;
      width = containerRef.current.clientWidth;
      height = containerRef.current.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      // Dual-Canvas Setup
      canvas.width = gridCanvas.width = width * dpr;
      canvas.height = gridCanvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gridCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Aspect Ratio Control (Perfect Squares)
      cols = Math.floor(width / gridSize);
      rows = Math.floor(height / gridSize);

      // Render Static Grid Canvas (Vector Sharp)
      gridCtx.clearRect(0, 0, width, height);
      gridCtx.strokeStyle = isDarkMode ? COLORS.gridDark : COLORS.gridLight;
      gridCtx.lineWidth = 1;
      gridCtx.beginPath();
      // Centered Grid for better Aspect Ratio flow
      const offsetX = (width % gridSize) / 2;
      const offsetY = (height % gridSize) / 2;
      for (let x = offsetX; x <= width; x += gridSize) { gridCtx.moveTo(x, 0); gridCtx.lineTo(x, height); }
      for (let y = offsetY; y <= height; y += gridSize) { gridCtx.moveTo(0, y); gridCtx.lineTo(width, y); }
      gridCtx.stroke();

      // Setup Idle Targets
      idleTargetsRef.current = Array.from({ length: idleRandomCount }, () => ({
        x: Math.floor(Math.random() * (cols || 1)),
        y: Math.floor(Math.random() * (rows || 1)),
      }));
      idlePositionsRef.current = idleTargetsRef.current.map((p) => ({ ...p }));
    };

    const draw = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.032);
      lastTime = now;
      ctx.clearRect(0, 0, width, height);

      // ── Responsive Motion (Optimized Lerp) ────────────────
      const lerpVelocity = 18.0; // Snappy, liquid feel
      lerpMouseRef.current.x += (mouseRef.current.x - lerpMouseRef.current.x) * lerpVelocity * dt;
      lerpMouseRef.current.y += (mouseRef.current.y - lerpMouseRef.current.y) * lerpVelocity * dt;

      // ── Interaction Simulation ─────────────────────────
      const isIdle = Date.now() - lastMouseTimeRef.current > 2000;
      const offsetX = (width % gridSize) / 2;
      const offsetY = (height % gridSize) / 2;

      if (isIdle) {
        idlePositionsRef.current.forEach((pos, i) => {
          const target = idleTargetsRef.current[i];
          pos.x += (target.x - pos.x) * idleSpeed;
          pos.y += (target.y - pos.y) * idleSpeed;

          if (Math.abs(target.x - pos.x) < 0.1) {
            idleTargetsRef.current[i] = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
          }
          
          const rx = Math.round(pos.x);
          const ry = Math.round(pos.y);
          if (!trailRef.current[0] || trailRef.current[0].x !== rx || trailRef.current[0].y !== ry) {
             trailRef.current.unshift({ x: rx, y: ry, type: 'idle' });
             if (trailRef.current.length > trailLength * 1.5) trailRef.current.pop();
          }
        });
      } else {
        const snX = Math.floor((lerpMouseRef.current.x - offsetX) / gridSize);
        const snY = Math.floor((lerpMouseRef.current.y - offsetY) / gridSize);
        if (!trailRef.current[0] || trailRef.current[0].x !== snX || trailRef.current[0].y !== snY) {
          trailRef.current.unshift({ x: snX, y: snY, type: 'mouse' });
          if (trailRef.current.length > trailLength) trailRef.current.pop();
        }
      }

      // ── Cinematic Additive Rendering (No Muddiness) ───────
      ctx.globalCompositeOperation = "screen"; // Vibrance stack
      
      trailRef.current.forEach((cell, idx) => {
        const factor = 1 - idx / trailRef.current.length;
        const alpha = Math.pow(factor, 1.8) * 0.85; // Sharp decay
        
        ctx.fillStyle = cell.type === 'mouse' ? COLORS.emerald : COLORS.cyan;
        ctx.globalAlpha = alpha;
        
        if (glow) {
          ctx.shadowColor = COLORS.emerald;
          ctx.shadowBlur = 20 * factor;
        }

        const sizeOffset = 2; // Fixed spacing for professional vector feel
        ctx.fillRect(
          offsetX + cell.x * gridSize + sizeOffset, 
          offsetY + cell.y * gridSize + sizeOffset, 
          gridSize - (sizeOffset * 2), 
          gridSize - (sizeOffset * 2)
        );
      });

      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = "source-over";
      animationReqRef.current = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    animationReqRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationReqRef.current);
    };
  }, [gridSize, trailLength, idleSpeed, glow, idleRandomCount, isDarkMode]);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden bg-[#09090b] select-none", className)}
      {...props}
    >
      <canvas ref={gridCanvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-50" />
      <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none" />
      
      {showFade && (
        <div
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            background: `radial-gradient(circle at center, transparent ${fadeIntensity}%, #09090b 95%)`,
          }}
        />
      )}
      
      <div className="relative z-30 w-full h-full pointer-events-none">
        {children}
      </div>
    </div>
  );
};

export default InteractiveGridBackground;
