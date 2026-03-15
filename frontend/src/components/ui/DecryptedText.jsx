import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';

export default function DecryptedText({
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
}) {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDecrypted, setIsDecrypted] = useState(animateOn !== 'click');
  const [revealedIndices, setRevealedIndices] = useState(new Set());
  const [hasAnimated, setHasAnimated] = useState(false);

  // Sync displayText with text prop when not animating
  useEffect(() => {
    if (!isAnimating) {
      setDisplayText(text);
    }
  }, [text, isAnimating]);

  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const lastTimestamp = useRef(0);
  const iterationCount = useRef(0);

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

  const startAnimation = useCallback(() => {
    setIsAnimating(true);
    setIsDecrypted(false);
    iterationCount.current = 0;
    setRevealedIndices(new Set());
  }, []);

  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
    setIsDecrypted(true);
    setDisplayText(text);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  }, [text]);

  const animate = useCallback((timestamp) => {
    if (!lastTimestamp.current) lastTimestamp.current = timestamp;
    const elapsed = timestamp - lastTimestamp.current;

    if (elapsed >= speed) {
      lastTimestamp.current = timestamp;

      setRevealedIndices((prev) => {
        const nextRevealed = new Set(prev);
        const textLength = text.length;

        // Calculate how many characters SHOULD be revealed by now
        let revealTarget;
        if (sequential) {
          revealTarget = prev.size + 1;
        } else {
          // In non-sequential, we reveal based on iteration count
          iterationCount.current += 1;
          revealTarget = Math.floor((iterationCount.current / maxIterations) * textLength);
        }

        // Add indices until target is reached
        while (nextRevealed.size < revealTarget && nextRevealed.size < textLength) {
          const nextIndex = getNextIndex(nextRevealed);
          if (nextIndex !== null) {
            nextRevealed.add(nextIndex);
          } else {
            break;
          }
        }

        // Update display text with new reveal set
        setDisplayText(shuffleText(text, nextRevealed));

        // Check if we are done
        if (nextRevealed.size >= textLength) {
          // Wait a tiny bit before stopping to let the final reveal "settle"
          setTimeout(stopAnimation, speed);
          return nextRevealed;
        }

        return nextRevealed;
      });
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [speed, sequential, text, shuffleText, getNextIndex, maxIterations, stopAnimation]);

  useEffect(() => {
    if (isAnimating) {
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isAnimating, animate]);

  useEffect(() => {
    if (trigger) {
      startAnimation();
    }
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
    if (animateOn === 'hover' || animateOn === 'inViewHover') {
      startAnimation();
    }
  };

  const handleMouseLeave = () => {
    if (animateOn === 'hover' || animateOn === 'inViewHover') {
      stopAnimation();
    }
  };

  const handleClick = () => {
    if (animateOn === 'click' && (clickMode === 'toggle' || !isDecrypted)) {
      if (isDecrypted && clickMode === 'toggle') {
        setIsDecrypted(false);
        setDisplayText(shuffleText(text, new Set()));
      } else {
        startAnimation();
      }
    }
  };

  return (
    <motion.span
      ref={containerRef}
      className={`inline-block whitespace-pre-wrap ${parentClassName}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      {...props}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {displayText.split('').map((char, i) => (
          <span
            key={i}
            className={revealedIndices.has(i) || isDecrypted ? className : encryptedClassName}
            style={{ transition: 'color 0.1s ease, opacity 0.1s ease' }}
          >
            {char}
          </span>
        ))}
      </span>
    </motion.span>
  );
}
