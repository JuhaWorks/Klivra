import { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react';
import { motion } from 'framer-motion';

/**
 * High-Performance DecryptedText Component
 * Optimized for LCP (Largest Contentful Paint) and INP (Interaction to Next Paint)
 * Refactored to use direct DOM manipulation for animation to eliminate React overhead.
 */
const DecryptedText = memo(({
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

  const shuffleText = useCallback(
    (originalText, currentRevealed) => {
      return originalText
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' ';
          if (currentRevealed.has(i)) return originalText[i];
          return availableChars[Math.floor(Math.random() * availableChars.length)];
        })
        .join('');
    },
    [availableChars]
  );

  const getNextIndex = useCallback((revealedSet) => {
    const textLength = text.length;
    const available = [];
    for (let i = 0; i < textLength; i++) {
      if (!revealedSet.has(i) && text[i] !== ' ') available.push(i);
    }
    if (available.length === 0) return null;

    if (revealDirection === 'start') return available[0];
    if (revealDirection === 'end') return available[available.length - 1];
    if (revealDirection === 'center') {
      const middle = textLength / 2;
      return available.reduce((prev, curr) =>
        Math.abs(curr - middle) < Math.abs(prev - middle) ? curr : prev
      );
    }
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

      // Calculate reveal target
      let revealTarget;
      if (sequential) {
        revealTarget = nextRevealed.size + 1;
      } else {
        iterationCount.current += 1;
        revealTarget = Math.floor((iterationCount.current / maxIterations) * textLength);
      }

      while (nextRevealed.size < revealTarget && nextRevealed.size < textLength) {
        const nextIndex = getNextIndex(nextRevealed);
        if (nextIndex !== null) nextRevealed.add(nextIndex);
        else break;
      }

      // ── HIGH PERFORMANCE: Direct DOM Update ──
      if (textContentRef.current) {
        textContentRef.current.textContent = shuffleText(text, nextRevealed);
        // During animation, use encryptedClassName if provided
        if (nextRevealed.size < textLength) {
            textContentRef.current.className = encryptedClassName || className;
        } else {
            textContentRef.current.className = className;
        }
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
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    if (trigger) startAnimation();
  }, [trigger, startAnimation]);

  useEffect(() => {
    if (animateOn === 'view' || animateOn === 'inViewHover') {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasAnimated) {
            startAnimation();
            setHasAnimated(true);
          }
        },
        { threshold: 0.1 }
      );

      if (containerRef.current) observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [animateOn, hasAnimated, startAnimation]);

  const handleMouseEnter = () => {
    if (animateOn === 'hover' || animateOn === 'inViewHover') startAnimation();
  };

  const handleMouseLeave = () => {
    if (animateOn === 'hover' || animateOn === 'inViewHover') stopAnimation();
  };

  const handleClick = () => {
    if (animateOn === 'click' && (clickMode === 'toggle' || !isDecrypted)) {
      if (isDecrypted && clickMode === 'toggle') {
        setIsDecrypted(false);
        if (textContentRef.current) textContentRef.current.textContent = shuffleText(text, new Set());
      } else {
        startAnimation();
      }
    }
  };

  return (
    <motion.span
      ref={containerRef}
      className={`inline-block whitespace-pre-wrap font-mono tracking-normal tabular-nums ${parentClassName}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{ minWidth: `${text.length}ch` }} // CLS Fix: Reserve space
      {...props}
    >
      <span className="sr-only">{text}</span>
      <span 
        aria-hidden="true" 
        ref={textContentRef} 
        className={isDecrypted ? className : encryptedClassName}
      >
        {isDecrypted ? text : shuffleText(text, new Set())}
      </span>
    </motion.span>
  );
});

export default DecryptedText;
