"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";

/**
 * InteractiveGridBackground v5.0 — Vercel-optimized
 * - All-emerald (no cyan idle color)
 * - Zero-GC circular buffer trail (TypedArrays)
 * - Single offscreen canvas blit per frame
 * - Static grid rendered once on resize, never again
 * - DPR capped at 2 (saves ~56% GPU on 3× screens)
 * - Frame-rate-independent exponential lerp
 * - Batched fillRect path for trail (one composite op per frame)
 * - will-change: transform on canvases for GPU layer promotion
 */
const InteractiveGridBackground = ({
  gridSize = 70,
  trailLength = 14,
  idleSpeed = 0.07,
  glow = true,
  children,
  showFade = true,
  fadeIntensity = 35,
  idleRandomCount = 3,
  className,
  ...props
}) => {
  const containerRef = useRef(null);
  const gridCanvasRef = useRef(null);
  const trailCanvasRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // ─── All refs live outside React render cycle ───────────────────────────
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const lerpRef = useRef({ x: -1000, y: -1000 });
  const lastMouseTime = useRef(Date.now());
  const rafRef = useRef(null);

  // Circular trail buffer — zero allocations per frame
  const trailX = useRef(new Int16Array(trailLength));
  const trailY = useRef(new Int16Array(trailLength));
  const trailHead = useRef(0);
  const trailCount = useRef(0);

  // Idle state — pre-allocated Float32Arrays
  const idlePosX = useRef(new Float32Array(idleRandomCount));
  const idlePosY = useRef(new Float32Array(idleRandomCount));
  const idleTgtX = useRef(new Float32Array(idleRandomCount));
  const idleTgtY = useRef(new Float32Array(idleRandomCount));

  // Grid geometry — computed once on resize, read every frame
  const geo = useRef({ width: 0, height: 0, cols: 0, rows: 0, ox: 0, oy: 0, dpr: 1 });

  // Offscreen canvas for trail (avoid main-canvas thrash)
  const offTrail = useRef(null);
  const offTrailCtx = useRef(null);

  // ─── Dark mode observer ──────────────────────────────────────────────────
  useEffect(() => {
    const update = () =>
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  // ─── Mouse listener (window-level, once) ────────────────────────────────
  useEffect(() => {
    const onMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      lastMouseTime.current = Date.now();
      if (lerpRef.current.x === -1000) {
        lerpRef.current.x = mouseRef.current.x;
        lerpRef.current.y = mouseRef.current.y;
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // ─── Main canvas loop ────────────────────────────────────────────────────
  useEffect(() => {
    const gridCanvas = gridCanvasRef.current;
    const trailCanvas = trailCanvasRef.current;
    const container = containerRef.current;
    if (!gridCanvas || !trailCanvas || !container) return;

    const gCtx = gridCanvas.getContext("2d");
    const tCtx = trailCanvas.getContext("2d");
    if (!gCtx || !tCtx) return;

    // Disable smoothing — sharp pixel-perfect grid
    gCtx.imageSmoothingEnabled = false;
    tCtx.imageSmoothingEnabled = false;

    // ── Resize / init ──────────────────────────────────────────────────────
    const EMERALD = "#10b981";
    const EMERALD_RGB = "16,185,129";
    const GRID_COLOR = isDarkMode
      ? `rgba(${EMERALD_RGB},0.08)`
      : `rgba(${EMERALD_RGB},0.13)`;

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = container.clientWidth;
      const h = container.clientHeight;

      for (const c of [gridCanvas, trailCanvas]) {
        c.width = w * dpr;
        c.height = h * dpr;
        c.style.width = w + "px";
        c.style.height = h + "px";
      }
      gCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cols = Math.floor(w / gridSize);
      const rows = Math.floor(h / gridSize);
      const ox = (w % gridSize) / 2;
      const oy = (h % gridSize) / 2;
      geo.current = { width: w, height: h, cols, rows, ox, oy, dpr };

      // ── Draw static grid ONCE ────────────────────────────────────────────
      gCtx.clearRect(0, 0, w, h);
      gCtx.strokeStyle = GRID_COLOR;
      gCtx.lineWidth = 0.5;
      gCtx.beginPath();
      for (let x = ox; x <= w + 1; x += gridSize) {
        gCtx.moveTo(x, 0);
        gCtx.lineTo(x, h);
      }
      for (let y = oy; y <= h + 1; y += gridSize) {
        gCtx.moveTo(0, y);
        gCtx.lineTo(w, y);
      }
      gCtx.stroke();

      // ── Offscreen trail canvas ───────────────────────────────────────────
      if (!offTrail.current) offTrail.current = document.createElement("canvas");
      offTrail.current.width = w * dpr;
      offTrail.current.height = h * dpr;
      offTrailCtx.current = offTrail.current.getContext("2d");
      offTrailCtx.current.setTransform(dpr, 0, 0, dpr, 0, 0);
      offTrailCtx.current.imageSmoothingEnabled = false;

      // ── Reset idle positions ─────────────────────────────────────────────
      for (let i = 0; i < idleRandomCount; i++) {
        idleTgtX.current[i] = (Math.random() * cols) | 0;
        idleTgtY.current[i] = (Math.random() * rows) | 0;
        idlePosX.current[i] = idleTgtX.current[i];
        idlePosY.current[i] = idleTgtY.current[i];
      }

      // Reset trail
      trailHead.current = 0;
      trailCount.current = 0;
    };

    // ── Circular buffer push ───────────────────────────────────────────────
    const pushTrail = (x, y) => {
      const len = trailLength;
      const prev = (trailHead.current - 1 + len) % len;
      if (
        trailCount.current > 0 &&
        trailX.current[prev] === x &&
        trailY.current[prev] === y
      ) return;
      trailX.current[trailHead.current] = x;
      trailY.current[trailHead.current] = y;
      trailHead.current = (trailHead.current + 1) % len;
      if (trailCount.current < len) trailCount.current++;
    };

    // ── Animation loop ─────────────────────────────────────────────────────
    let lastTs = performance.now();

    const frame = (now) => {
      const dt = Math.min((now - lastTs) * 0.001, 0.032);
      lastTs = now;

      const { width, height, cols, rows, ox, oy } = geo.current;

      // Exponential lerp — frame-rate independent, never overshoots
      const lv = 1 - Math.pow(0.002, dt * 18);
      lerpRef.current.x += (mouseRef.current.x - lerpRef.current.x) * lv;
      lerpRef.current.y += (mouseRef.current.y - lerpRef.current.y) * lv;

      const isIdle = Date.now() - lastMouseTime.current > 2000;

      if (isIdle) {
        // Idle: float multiple points around grid — ALL emerald
        for (let i = 0; i < idleRandomCount; i++) {
          idlePosX.current[i] +=
            (idleTgtX.current[i] - idlePosX.current[i]) * idleSpeed;
          idlePosY.current[i] +=
            (idleTgtY.current[i] - idlePosY.current[i]) * idleSpeed;

          if (Math.abs(idleTgtX.current[i] - idlePosX.current[i]) < 0.2) {
            idleTgtX.current[i] = (Math.random() * cols) | 0;
            idleTgtY.current[i] = (Math.random() * rows) | 0;
          }

          pushTrail((idlePosX.current[i] + 0.5) | 0, (idlePosY.current[i] + 0.5) | 0);
        }
      } else {
        const snX = ((lerpRef.current.x - ox) / gridSize) | 0;
        const snY = ((lerpRef.current.y - oy) / gridSize) | 0;
        pushTrail(snX, snY);
      }

      // ── Render trail to offscreen ──────────────────────────────────────
      const ctx = offTrailCtx.current;
      if (!ctx) { rafRef.current = requestAnimationFrame(frame); return; }

      ctx.clearRect(0, 0, width, height);

      const count = trailCount.current;
      const len = trailLength;
      const PAD = 2;
      const CELL = gridSize - PAD * 2;

      if (count > 0) {
        ctx.globalCompositeOperation = "screen";

        // One shadow pass for the head cell (most expensive — do once)
        if (glow) {
          ctx.shadowColor = EMERALD;
          ctx.shadowBlur = 8; // Reduced from 22
        }

        for (let i = 0; i < count; i++) {
          const idx = (trailHead.current - 1 - i + len) % len;
          const factor = 1 - i / count;
          const alpha = Math.pow(factor, 1.7) * 0.9;

          ctx.globalAlpha = alpha;
          // Only apply shadow on first few cells (optimized)
          if (glow) ctx.shadowBlur = i < 2 ? 8 * factor : 0;

          ctx.fillStyle = EMERALD;
          ctx.fillRect(
            ox + trailX.current[idx] * gridSize + PAD,
            oy + trailY.current[idx] * gridSize + PAD,
            CELL,
            CELL
          );
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = "source-over";
      }

      // ── Single blit to visible canvas ──────────────────────────────────
      tCtx.clearRect(0, 0, width, height);
      tCtx.drawImage(
        offTrail.current,
        0, 0, offTrail.current.width, offTrail.current.height,
        0, 0, width, height
      );

      rafRef.current = requestAnimationFrame(frame);
    };

    // ── ResizeObserver (no debounce — build() is O(grid lines)) ───────────
    const ro = new ResizeObserver(build);
    ro.observe(container);
    build();
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [gridSize, trailLength, idleSpeed, glow, idleRandomCount, isDarkMode]);

  const bg = "var(--bg-base)";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden select-none",
        className
      )}
      style={{ backgroundColor: bg }}
      {...props}
    >
      {/* Static grid — rendered once, GPU-promoted layer */}
      <canvas
        ref={gridCanvasRef}
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ opacity: 0.55, willChange: "transform" }}
      />

      {/* Trail — composited each frame */}
      <canvas
        ref={trailCanvasRef}
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ willChange: "transform" }}
      />

      {/* Radial vignette */}
      {showFade && (
        <div
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            background: `radial-gradient(circle at center, transparent ${fadeIntensity}%, var(--bg-base) 95%)`,
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-30 w-full h-full">{children}</div>
    </div>
  );
};

export default InteractiveGridBackground;