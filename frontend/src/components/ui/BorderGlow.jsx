import { useRef, useCallback, memo } from 'react';
import './BorderGlow.css'; // Make sure this is imported!

const BorderGlow = ({
  children,
  className = '',
  backgroundColor = '#060010',
  borderRadius = 28,
}) => {
  const cardRef = useRef(null);

  const handlePointerMove = useCallback((e) => {
    const card = cardRef.current;
    if (!card) return;

    // Get exact mouse coordinates
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Send coordinates to CSS
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  }, []);

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      /* CHANGED CLASS NAME to escape old zombie CSS */
      className={`magic-glow-card ${className}`}
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
};

export default memo(BorderGlow);