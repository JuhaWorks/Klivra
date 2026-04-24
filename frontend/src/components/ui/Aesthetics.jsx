import { useEffect, useState, useRef, useMemo, useCallback, useId, memo } from 'react';
import { motion } from 'framer-motion';
import { useTheme, MODES } from '../../store/useTheme';
import { cn } from '../../utils/cn';
import { THEME_COLORS } from '../../constants';
import './ui.css';

// ─── BORDER GLOW ─────────────────────────────────────────────────────────────
export const BorderGlow = memo(({
  children,
  className = '',
  backgroundColor = '#060010',
  borderRadius = 28,
}) => {
  const cardRef = useRef(null);
  const rectRef = useRef(null);

  // Performance: Cache rect on resize to avoid layout queries during mouse move
  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        rectRef.current = entry.target.getBoundingClientRect();
      }
    });
    observer.observe(cardRef.current);
    // Initial rect
    rectRef.current = cardRef.current.getBoundingClientRect();
    return () => observer.disconnect();
  }, []);

  const handlePointerMove = useCallback((e) => {
    const rect = rectRef.current;
    if (!rect || !cardRef.current) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Performance: Direct property update is faster than React state for mouse followers
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  }, []);

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      className={cn('magic-glow-card', className)}
      style={{
        '--card-bg': backgroundColor,
        '--radius': `${borderRadius}px`
      }}
    >
      <div className="magic-glow-inner">
        {children}
      </div>
    </div>
  );
});

// ─── GLASS SURFACE ───────────────────────────────────────────────────────────
export const GlassSurface = memo(({
  children,
  width = 200,
  height = 80,
  borderRadius = 20,
  borderWidth = 0.07,
  brightness,
  opacity = 0.93,
  blur = 22,
  displace = 0,
  backgroundOpacity = 0.08,
  saturation = 1,
  distortionScale = -180,
  redOffset = 0,
  greenOffset = 10,
  blueOffset = 20,
  xChannel = 'R',
  yChannel = 'G',
  mixBlendMode = 'difference',
  performance = 'premium',
  hideBorder = false,
  className = '',
  style = {}
}) => {
  const { mode } = useTheme();
  const isDark = mode === MODES.DARK;
  const defaultBrightness = isDark ? 10 : 96;
  const effectiveBrightness = brightness !== undefined ? brightness : defaultBrightness;
  const uniqueId = useId().replace(/:/g, '-');
  const filterId = `glass-filter-${uniqueId}`;
  const redGradId = `red-grad-${uniqueId}`;
  const blueGradId = `blue-grad-${uniqueId}`;

  const [svgSupported, setSvgSupported] = useState(false);
  const containerRef = useRef(null);
  const feImageRef = useRef(null);
  const redChannelRef = useRef(null);
  const greenChannelRef = useRef(null);
  const blueChannelRef = useRef(null);
  const gaussianBlurRef = useRef(null);

  const generateDisplacementMap = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    const actualWidth = rect?.width || 400;
    const actualHeight = rect?.height || 200;
    const edgeSize = Math.min(actualWidth, actualHeight) * (borderWidth * 0.5);
    let rx = typeof borderRadius === 'number' ? borderRadius : parseInt(borderRadius) || 0;

    const svgContent = `
      <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="inner-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="${blur}" />
          </filter>
          <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black"></rect>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${rx}" fill="url(#${redGradId})" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${rx}" fill="url(#${blueGradId})" style="mix-blend-mode: ${mixBlendMode}" />
        <rect x="${edgeSize}" y="${edgeSize}" width="${actualWidth - edgeSize * 2}" height="${actualHeight - edgeSize * 2}" rx="${rx}" fill="hsl(0 0% ${effectiveBrightness}% / ${opacity})" filter="url(#inner-blur)" />
      </svg>
    `;
    return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
  }, [borderRadius, borderWidth, blur, redGradId, blueGradId, mixBlendMode, effectiveBrightness, opacity]);

  const updateDisplacementMap = useCallback(() => {
    feImageRef.current?.setAttribute('href', generateDisplacementMap());
  }, [generateDisplacementMap]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      updateDisplacementMap();
    });
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [updateDisplacementMap]);

  useEffect(() => {
    updateDisplacementMap();
    [
      { ref: redChannelRef, offset: redOffset },
      { ref: greenChannelRef, offset: greenOffset },
      { ref: blueChannelRef, offset: blueOffset }
    ].forEach(({ ref, offset }) => {
      if (ref.current) {
        ref.current.setAttribute('scale', (distortionScale + offset).toString());
        ref.current.setAttribute('xChannelSelector', xChannel);
        ref.current.setAttribute('yChannelSelector', yChannel);
      }
    });
    gaussianBlurRef.current?.setAttribute('stdDeviation', displace.toString());
  }, [updateDisplacementMap, distortionScale, redOffset, greenOffset, blueOffset, xChannel, yChannel, displace]);

  useEffect(() => {
    const supportsSVGFilters = () => {
      if (typeof window === 'undefined' || typeof document === 'undefined') return false;
      const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
      const isFirefox = /Firefox/.test(navigator.userAgent);
      if (isWebkit || isFirefox) return false;
      const div = document.createElement('div');
      div.style.backdropFilter = `url(#${filterId})`;
      return div.style.backdropFilter !== '';
    };
    setSvgSupported(supportsSVGFilters());
  }, [filterId]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'glass-surface',
        performance === 'premium' && svgSupported ? 'glass-surface--svg' : 'glass-surface--high-perf',
        hideBorder && 'glass-surface--no-border',
        className
      )}
      style={{
        ...style,
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
        '--glass-frost': backgroundOpacity,
        '--glass-saturation': saturation,
        '--filter-id': `url(#${filterId})`
      }}
    >
      {performance === 'premium' && svgSupported && (
        <svg className="glass-surface__filter" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id={filterId} colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
              <feImage ref={feImageRef} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />
              <feDisplacementMap ref={redChannelRef} in="SourceGraphic" in2="map" result="dispRed" />
              <feColorMatrix in="dispRed" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="red" />
              <feDisplacementMap ref={greenChannelRef} in="SourceGraphic" in2="map" result="dispGreen" />
              <feColorMatrix in="dispGreen" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="green" />
              <feDisplacementMap ref={blueChannelRef} in="SourceGraphic" in2="map" result="dispBlue" />
              <feColorMatrix in="dispBlue" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="blue" />
              <feBlend in="red" in2="green" mode="screen" result="rg" />
              <feBlend in="rg" in2="blue" mode="screen" result="output" />
              <feGaussianBlur ref={gaussianBlurRef} in="output" stdDeviation="0.7" />
            </filter>
          </defs>
        </svg>
      )}
      <div className="glass-surface__content">{children}</div>
    </div>
  );
});

// ─── DECRYPTED TEXT ──────────────────────────────────────────────────────────
export const DecryptedText = memo(({
  text,
  speed = 50,
  maxIterations = 10,
  sequential = true,
  revealDirection = 'start',
  useOriginalCharsOnly = false,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+',
  className = '',
  parentClassName = '',
  encryptedClassName = '',
  animateOn = 'hover',
  clickMode = 'once',
  trigger = false,
  ...props
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDecrypted, setIsDecrypted] = useState(animateOn !== 'click');
  const [hasAnimated, setHasAnimated] = useState(false);
  const containerRef = useRef(null);
  const textContentRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimestamp = useRef(0);
  const iterationCount = useRef(0);
  const revealedIndices = useRef(new Set());

  const availableChars = useMemo(() => {
    return useOriginalCharsOnly
      ? Array.from(new Set(text.split(''))).filter(char => char !== ' ')
      : characters.split('');
  }, [useOriginalCharsOnly, text, characters]);

  const shuffleText = useCallback((originalText, currentRevealed) => {
    return originalText.split('').map((char, i) => {
      if (char === ' ') return ' ';
      if (currentRevealed.has(i)) return originalText[i];
      return availableChars[Math.floor(Math.random() * availableChars.length)];
    }).join('');
  }, [availableChars]);

  const getNextIndex = useCallback((revealedSet) => {
    const textLength = text.length;
    const available = [];
    for (let i = 0; i < textLength; i++) {
        if (!revealedSet.has(i) && text[i] !== ' ') available.push(i);
    }
    if (available.length === 0) return null;
    if (revealDirection === 'start') return available[0];
    if (revealDirection === 'end') return available[available.length - 1];
    return available[Math.floor(Math.random() * available.length)];
  }, [text, revealDirection]);

  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
    setIsDecrypted(true);
    if (textContentRef.current) {
        textContentRef.current.textContent = text;
        textContentRef.current.className = className;
    }
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  }, [text, className]);

  const animate = useCallback((timestamp) => {
    if (!lastTimestamp.current) lastTimestamp.current = timestamp;
    const elapsed = timestamp - lastTimestamp.current;

    if (elapsed >= speed) {
      lastTimestamp.current = timestamp;
      const nextRevealed = revealedIndices.current;
      const textLength = text.length;
      let revealTarget = sequential ? nextRevealed.size + 1 : Math.floor((iterationCount.current / maxIterations) * textLength);
      
      while (nextRevealed.size < revealTarget && nextRevealed.size < textLength) {
        const nextIndex = getNextIndex(nextRevealed);
        if (nextIndex !== null) nextRevealed.add(nextIndex);
        else break;
      }

      if (textContentRef.current) {
        textContentRef.current.textContent = shuffleText(text, nextRevealed);
        textContentRef.current.className = nextRevealed.size < textLength ? (encryptedClassName || className) : className;
      }

      if (nextRevealed.size >= textLength) {
        stopAnimation();
        return;
      }
    }
    animationRef.current = requestAnimationFrame(animate);
  }, [speed, sequential, text, shuffleText, getNextIndex, maxIterations, stopAnimation, encryptedClassName, className]);

  const startAnimation = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsDecrypted(false);
    iterationCount.current = 0;
    revealedIndices.current = new Set();
    lastTimestamp.current = 0;
    animationRef.current = requestAnimationFrame(animate);
  }, [animate, isAnimating]);

  useEffect(() => {
    if (trigger) startAnimation();
  }, [trigger, startAnimation]);

  return (
    <motion.span
      ref={containerRef}
      className={cn('inline-block whitespace-pre-wrap font-mono tracking-normal tabular-nums', parentClassName)}
      onMouseEnter={() => (animateOn === 'hover' && startAnimation())}
      onMouseLeave={() => (animateOn === 'hover' && stopAnimation())}
      style={{ minWidth: `${text.length}ch` }}
      {...props}
    >
      <span className="sr-only">{text}</span>
      <span ref={textContentRef} className={isDecrypted ? className : encryptedClassName}>
        {isDecrypted ? text : shuffleText(text, new Set())}
      </span>
    </motion.span>
  );
});

// ─── INTERACTIVE GRID BACKGROUND ─────────────────────────────────────────────
export const InteractiveGridBackground = memo(({
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
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const lerpRef = useRef({ x: -1000, y: -1000 });
  const rectCache = useRef(null);
  const lastMouseTime = useRef(Date.now());
  const rafRef = useRef(null);
  const trailX = useRef(new Int16Array(trailLength));
  const trailY = useRef(new Int16Array(trailLength));
  const trailHead = useRef(0);
  const trailCount = useRef(0);
  const idlePosX = useRef(new Float32Array(idleRandomCount));
  const idlePosY = useRef(new Float32Array(idleRandomCount));
  const idleTgtX = useRef(new Float32Array(idleRandomCount));
  const idleTgtY = useRef(new Float32Array(idleRandomCount));
  const geo = useRef({ width: 0, height: 0, cols: 0, rows: 0, ox: 0, oy: 0, dpr: 1 });

  useEffect(() => {
    const update = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const onEnter = () => {
      rectCache.current = containerRef.current?.getBoundingClientRect();
    };

    const onMove = (e) => {
      if (!rectCache.current) {
        rectCache.current = containerRef.current?.getBoundingClientRect();
      }
      const rect = rectCache.current;
      if (!rect) return;
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      lastMouseTime.current = Date.now();
    };

    window.addEventListener("mouseenter", onEnter, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mouseenter", onEnter);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  useEffect(() => {
    const gridCanvas = gridCanvasRef.current;
    const trailCanvas = trailCanvasRef.current;
    const container = containerRef.current;
    if (!gridCanvas || !trailCanvas || !container) return;

    const gCtx = gridCanvas.getContext("2d");
    const tCtx = trailCanvas.getContext("2d");
    const EMERALD = THEME_COLORS.EMERALD;
    const EMERALD_RGB = THEME_COLORS.EMERALD_RGB;

    const build = () => {
      const dpr = 1; // Force 1x DPR to save ~60MB of video memory
      const w = container.clientWidth;
      const h = container.clientHeight;
      for (const c of [gridCanvas, trailCanvas]) {
        c.width = w * dpr; c.height = h * dpr;
        c.style.width = w + "px"; c.style.height = h + "px";
      }
      gCtx.setTransform(dpr, 0, 0, dpr, 0, 0); tCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cols = Math.floor(w / gridSize), rows = Math.floor(h / gridSize);
      const ox = (w % gridSize) / 2, oy = (h % gridSize) / 2;
      geo.current = { width: w, height: h, cols, rows, ox, oy, dpr };
      gCtx.clearRect(0, 0, w, h); gCtx.strokeStyle = isDarkMode ? `rgba(${EMERALD_RGB},0.08)` : `rgba(${EMERALD_RGB},0.13)`;
      gCtx.lineWidth = 0.5; gCtx.beginPath();
      for (let x = ox; x <= w + 1; x += gridSize) { gCtx.moveTo(x, 0); gCtx.lineTo(x, h); }
      for (let y = oy; y <= h + 1; y += gridSize) { gCtx.moveTo(0, y); gCtx.lineTo(w, y); }
      gCtx.stroke();
    };

    const pushTrail = (x, y) => {
      const len = trailLength, prev = (trailHead.current - 1 + len) % len;
      if (trailCount.current > 0 && trailX.current[prev] === x && trailY.current[prev] === y) return;
      trailX.current[trailHead.current] = x; trailY.current[trailHead.current] = y;
      trailHead.current = (trailHead.current + 1) % len;
      if (trailCount.current < len) trailCount.current++;
    };

    const frame = () => {
      const { width, height, ox, oy } = geo.current;
      lerpRef.current.x += (mouseRef.current.x - lerpRef.current.x) * 0.15;
      lerpRef.current.y += (mouseRef.current.y - lerpRef.current.y) * 0.15;
      const isIdle = Date.now() - lastMouseTime.current > 2000;
      if (!isIdle) pushTrail(((lerpRef.current.x - ox) / gridSize) | 0, ((lerpRef.current.y - oy) / gridSize) | 0);
      
      const ctx = tCtx;
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = "screen";
        for (let i = 0; i < trailCount.current; i++) {
          const idx = (trailHead.current - 1 - i + trailLength) % trailLength;
          ctx.globalAlpha = Math.pow(1 - i / trailCount.current, 1.7) * 0.9;
          ctx.fillStyle = EMERALD;
          ctx.fillRect(ox + trailX.current[idx] * gridSize + 2, oy + trailY.current[idx] * gridSize + 2, gridSize - 4, gridSize - 4);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    const ro = new ResizeObserver(build); ro.observe(container); build();
    rafRef.current = requestAnimationFrame(frame);
    return () => { ro.disconnect(); cancelAnimationFrame(rafRef.current); };
  }, [gridSize, trailLength, idleSpeed, glow, idleRandomCount, isDarkMode]);

  return (
    <div ref={containerRef} className={cn("relative w-full h-full overflow-hidden select-none", className)} style={{ backgroundColor: "var(--bg-base)" }}>
      <canvas ref={gridCanvasRef} className="absolute inset-0 z-0 pointer-events-none" style={{ opacity: 0.55 }} />
      <canvas ref={trailCanvasRef} className="absolute inset-0 z-10 pointer-events-none" />
      {showFade && <div className="pointer-events-none absolute inset-0 z-20" style={{ background: `radial-gradient(circle at center, transparent ${fadeIntensity}%, var(--bg-base) 95%)` }} />}
      <div className="relative z-30 w-full h-full">{children}</div>
    </div>
  );
});
