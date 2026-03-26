"use client";

/**
 * AsciiWave — Generative Art Edition
 *
 * Upgrades over v2:
 *  ─ Fluid spring simulation: each column has real velocity + position state,
 *    nudged by wave forces and damped each frame → momentum-carrying crests
 *  ─ Perlin-ish smooth noise (no deps) layered on top of sine waves for
 *    aperiodic, never-looping organic swell
 *  ─ Chromatic aberration: crest cells emit offset R and B ghost copies
 *  ─ Mouse / touch ripple distortion: pointer warps column heights; click
 *    fires a larger splash that propagates outward and decays
 *  ─ Five-tier heat-map character set (cold mist → hot foam)
 *  ─ Crest foam: top 1-2 rows always render dense chars at near-full alpha
 *  ─ Exponential subsurface fade (vs linear) for realistic light absorption
 *  ─ Temporal dithering: ~6 % of body cells skipped per frame → organic shimmer
 *  ─ Multi-colour palette prop: hex[] interpolated across column width
 *  ─ CRT scanline + vignette CSS overlays (zero extra draw calls)
 *  ─ Parallax layers: deeper layers use independent wave eval + y-offset
 */

import React, { useRef, useEffect, useCallback } from "react";

// ─── Character tiers: cold → hot ──────────────────────────────────────────
const TIERS = [
    " ·".split(""),
    "·:;,".split(""),
    ";=+tl".split(""),
    "ltfjrx".split(""),
    "xX#%@".split(""),
];

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;

// ─── CSS-color → [r, g, b] via temp element (cached) ─────────────────────
const parseRGB = (() => {
    const cache = {};
    return (css) => {
        if (cache[css]) return cache[css];
        if (typeof document === "undefined") return (cache[css] = [6, 182, 212]);
        const el = document.createElement("div");
        Object.assign(el.style, { color: css, position: "fixed", opacity: "0" });
        document.body.appendChild(el);
        const m = getComputedStyle(el).color.match(/\d+/g);
        document.body.removeChild(el);
        return (cache[css] = m ? m.slice(0, 3).map(Number) : [6, 182, 212]);
    };
})();

// ─── Minimal smooth 1-D noise (no external deps) ─────────────────────────
const _fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const _perm = (() => {
    const p = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36,
        103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62,
        94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136,
        171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
        60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1,
        216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86,
        164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126,
        255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
        119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253,
        19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242,
        193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192,
        214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138,
        236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];
    return Array.from({ length: 512 }, (_, i) => p[i & 255]);
})();
const noise1 = (x) => {
    const xi = Math.floor(x) & 255;
    const xf = x - Math.floor(x);
    const u = _fade(xf);
    const g0 = _perm[xi] & 1 ? xf : -xf;
    const g1 = _perm[xi + 1] & 1 ? xf - 1 : -(xf - 1);
    return lerp(g0, g1, u);
};

// ─────────────────────────────────────────────────────────────────────────
const AsciiWave = ({
    className = "",
    color = "#06b6d4",
    palette = null,       // string[] → multi-colour gradient across width
    speed = 1,
    layers = 2,           // Optimized from 3
    fontSize = 12,
    columnWidth = 12,     // Optimized from 9 to reduce columns by 25%
    splitPx = 1.4,        // chromatic aberration spread (px)
    scanlines = true,       // CRT line overlay
    interactive = true,       // mouse/touch distortion
}) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const rafRef = useRef(null);
    const stateRef = useRef({
        time: 0,
        cols: 0,
        vel: null,   // Float32Array – fluid velocity per column
        pos: null,   // Float32Array – fluid position per column
        ripples: [],     // { col, strength, age }
    });

    // ── Pointer handlers ────────────────────────────────────────────────────
    const onPointerMove = useCallback((e) => {
        if (!interactive) return;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const col = Math.floor((e.clientX - rect.left) / columnWidth);
        const st = stateRef.current;
        const last = st.ripples.at(-1);
        if (!last || Math.abs(col - last.col) > 2) {
            const yFrac = (e.clientY - rect.top) / rect.height;
            st.ripples.push({ col, strength: 0.15 + (1 - yFrac) * 0.18, age: 0 });
            if (st.ripples.length > 50) st.ripples.shift();
        }
    }, [interactive, columnWidth]);

    const onPointerDown = useCallback((e) => {
        if (!interactive) return;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const col = Math.floor((e.clientX - rect.left) / columnWidth);
        stateRef.current.ripples.push({ col, strength: 0.6, age: 0 });
    }, [interactive, columnWidth]);

    // ── Main animation loop ─────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const colors = (palette ?? [color]).map(parseRGB);

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = container.clientWidth * dpr;
            canvas.height = container.clientHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const c = Math.ceil(container.clientWidth / columnWidth);
            const st = stateRef.current;
            if (c !== st.cols) {
                st.cols = c;
                st.vel = new Float32Array(c);
                st.pos = new Float32Array(c);
            }
        };
        const ro = new ResizeObserver(resize);
        ro.observe(container);
        resize();

        // Three co-prime wave sources for quasi-aperiodic interference
        const SOURCES = [
            { fx: 0.072, ft: 0.00110, ph: 0.00, a: 0.42 },
            { fx: 0.039, ft: 0.00071, ph: 2.09, a: 0.31 },
            { fx: 0.117, ft: 0.00158, ph: 4.19, a: 0.27 },
        ];

        const draw = () => {
            const st = stateRef.current;
            const W = container.clientWidth;
            const H = container.clientHeight;
            const t = st.time;
            const cols = st.cols;
            const rows = Math.ceil(H / fontSize);

            ctx.clearRect(0, 0, W, H);
            ctx.font = `${fontSize}px "Courier New", Courier, monospace`;

            // Global breath envelope
            const breath = 0.9 + 0.10 * Math.sin(t * 0.00022 * speed);

            // ── Fluid spring update (layer 0 only) ──────────────────────────
            for (let c = 0; c < cols; c++) {
                let wave = 0;
                for (const s of SOURCES)
                    wave += Math.sin(c * s.fx + t * s.ft * speed + s.ph) * s.a;
                const swell = noise1(c * 0.04 + t * 0.00018 * speed) * 0.35;
                const target = clamp((wave + swell + 1.35) / 2.7 * breath, 0.05, 0.82) - 0.5;
                const force = (target - st.pos[c]) * 0.045;
                st.vel[c] = st.vel[c] * 0.91 + force;
                st.pos[c] = clamp(st.pos[c] + st.vel[c], -0.5, 0.5);
            }

            // ── Ripple distortion accumulation ──────────────────────────────
            const ripFx = new Float32Array(cols);
            for (const rip of st.ripples) {
                const decay = Math.exp(-rip.age * 0.004);
                if (decay < 0.01) continue;
                for (let c = 0; c < cols; c++) {
                    const d = c - rip.col;
                    ripFx[c] += rip.strength * decay * Math.exp(-d * d * 0.018);
                }
            }
            st.ripples = st.ripples.filter(r => Math.exp(-r.age * 0.004) >= 0.01);
            st.ripples.forEach(r => (r.age += 16));

            // ── Layer loop ───────────────────────────────────────────────────
            for (let layer = 0; layer < layers; layer++) {
                const tOff = layer * 900;
                const yOff = layer * 1.8;
                const baseAlpha = layer === 0 ? 1.0 : layer === 1 ? 0.48 : 0.20;

                for (let c = 0; c < cols; c++) {
                    // Height for this layer
                    let h;
                    if (layer === 0) {
                        h = clamp(0.5 + st.pos[c] + ripFx[c] * 0.55, 0.04, 0.92);
                    } else {
                        let w = 0;
                        for (const s of SOURCES)
                            w += Math.sin(c * s.fx * 0.88 + (t + tOff) * s.ft * speed + s.ph + layer) * s.a;
                        h = clamp((w + 1.35) / 2.7 * breath + ripFx[c] * 0.3, 0.04, 0.88);
                    }

                    const activeRows = Math.floor(h * rows);
                    if (activeRows < 1) continue;
                    const crestRow = rows - activeRows;

                    // Palette colour for this column
                    const ct = c / Math.max(cols - 1, 1);
                    const ci0 = Math.floor(ct * (colors.length - 1));
                    const ci1 = Math.min(ci0 + 1, colors.length - 1);
                    const cf = ct * (colors.length - 1) - ci0;
                    const [r, g, b] = [0, 1, 2].map(i =>
                        Math.round(lerp(colors[ci0][i], colors[ci1][i], cf))
                    );

                    const posX = c * columnWidth;

                    for (let row = rows - 1; row >= crestRow; row--) {
                        const dist = row - crestRow;
                        const relDepth = dist / activeRows;

                        // Exponential subsurface fade
                        const fade = Math.exp(-relDepth * 3.2);

                        // Perlin turbulence for character jitter
                        const turb = noise1(row * 0.18 + t * 0.0035 * speed + c * 3.7) * 0.22
                            + Math.sin(row * 0.41 - t * 0.005 * speed + c * 1.3) * 0.09;

                        const isCrest = dist <= 1;
                        const rawDens = isCrest
                            ? 0.75 + Math.random() * 0.25
                            : clamp(fade * 0.85 + turb, 0, 1);

                        // Temporal dither on body cells
                        if (!isCrest && Math.random() < 0.06) continue;

                        // Tier selection
                        const tier = rawDens < 0.18 ? 0
                            : rawDens < 0.38 ? 1
                                : rawDens < 0.60 ? 2
                                    : rawDens < 0.80 ? 3 : 4;
                        const arr = TIERS[tier];
                        const char = arr[Math.floor(rawDens * arr.length) % arr.length];
                        if (char === " ") continue;

                        const posY = row * fontSize + yOff;
                        const cellAlpha = clamp(baseAlpha * fade, 0.02, 1.0);

                        // PERFORMANCE: Only draw if alpha is meaningful
                        if (cellAlpha < 0.05) continue;

                        const alphaStr = cellAlpha.toFixed(2);

                        // Chromatic aberration on crest (layer 0 only, very sparingly)
                        if (isCrest && layer === 0 && splitPx > 0) {
                            const sa = Math.min(cellAlpha * 0.7, 0.8);
                            ctx.fillStyle = `rgba(${r},${Math.round(g * 0.2)},${Math.round(b * 0.1)},${sa})`;
                            ctx.fillText(char, posX - splitPx, posY);
                            ctx.fillStyle = `rgba(${Math.round(r * 0.1)},${Math.round(g * 0.2)},${b},${sa})`;
                            ctx.fillText(char, posX + splitPx, posY);
                        }

                        // Main pass
                        ctx.fillStyle = `rgba(${r},${g},${b},${alphaStr})`;
                        ctx.fillText(char, posX, posY);
                    }
                }
            }

            st.time += 16;
            rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);
        return () => {
            ro.disconnect();
            cancelAnimationFrame(rafRef.current);
        };
    }, [color, palette, speed, layers, fontSize, columnWidth, splitPx]);

    return (
        <div
            ref={containerRef}
            className={`w-full h-full overflow-hidden relative select-none ${className}`}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
            onPointerUp={() => { }}
            onPointerLeave={() => { }}
            style={{ cursor: interactive ? "crosshair" : "default" }}
        >
            <canvas ref={canvasRef} className="block w-full h-full" />

            {/* CRT scanline overlay — pure CSS, zero canvas draw calls */}
            {scanlines && (
                <div
                    aria-hidden="true"
                    style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        background: `repeating-linear-gradient(
              to bottom,
              transparent 0px,
              transparent ${fontSize - 1}px,
              rgba(0,0,0,0.07) ${fontSize - 1}px,
              rgba(0,0,0,0.07) ${fontSize}px
            )`,
                        mixBlendMode: "multiply",
                    }}
                />
            )}

            {/* Radial vignette — cinematic depth */}
            <div
                aria-hidden="true"
                style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background: "radial-gradient(ellipse 95% 75% at 50% 100%, transparent 45%, rgba(0,0,0,0.5) 100%)",
                }}
            />
        </div>
    );
};

export default AsciiWave;