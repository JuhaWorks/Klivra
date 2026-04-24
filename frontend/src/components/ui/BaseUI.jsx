import React, { useState, useEffect, useRef, memo, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ─── BUTTON ──────────────────────────────────────────────────────────────────
export const Button = memo(forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  isLoading, 
  icon: Icon,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  fullWidth = false,
  ...props 
}, ref) => {
  const variants = {
    primary: 'bg-theme text-white hover:opacity-90 active:scale-95 shadow-theme',
    secondary: 'bg-surface border border-default text-primary hover:bg-elevated active:scale-95',
    ghost: 'hover:bg-shimmer text-secondary hover:text-primary',
    danger: 'bg-danger/10 border border-danger/20 text-danger hover:bg-danger/20 active:scale-95',
    outline: 'border border-strong text-secondary hover:border-accent hover:text-accent'
  };

  const sizes = {
    inner: 'px-2 py-1 text-2xs',
    xs: 'px-3 py-1.5 text-xs',
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  const FinalLeftIcon = Icon || LeftIcon;

  return (
    <button
      ref={ref}
      className={cn(
        'relative inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-xl disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute"
          >
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2"
          >
            {FinalLeftIcon && <FinalLeftIcon size={size === 'sm' ? 16 : 18} />}
            {children}
            {RightIcon && <RightIcon size={size === 'sm' ? 16 : 18} />}
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}));

Button.displayName = 'Button';

// ─── CARD ────────────────────────────────────────────────────────────────────
export const Card = memo(({ children, className, glow = false, compact, variant = 'default', padding, hoverable, ...props }) => {
  const variants = {
    default: 'bg-surface border-default',
    glass: 'bg-glass backdrop-blur-xl border-glass shadow-glass',
    transparent: 'bg-transparent border-transparent',
  };

  const selectedVariant = variants[variant] || variants.default;

  return (
    <div 
      className={cn(
        selectedVariant,
        'border rounded-3xl transition-all duration-300',
        padding || (compact ? 'p-4' : 'p-6'),
        glow && 'hover:shadow-glow-sm hover:border-accent',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

// ─── INPUT ───────────────────────────────────────────────────────────────────
export const Input = memo(forwardRef(({ 
  label, 
  error, 
  className, 
  icon: Icon, 
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  id,
  overlay,
  ...props 
}, ref) => {
  const FinalLeftIcon = Icon || LeftIcon;
  
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label htmlFor={id} className="text-xs font-bold text-tertiary uppercase tracking-widest pl-1">{label}</label>}
      <div className="relative group">
        {FinalLeftIcon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary group-focus-within:text-accent transition-colors">
            <FinalLeftIcon size={18} />
          </div>
        )}
        <input
          id={id}
          ref={ref}
          className={cn(
            'w-full bg-sunken border border-default group-hocus:border-accent rounded-xl py-3 transition-all duration-200 text-primary placeholder:text-disabled focus:shadow-glow-sm outline-none',
            FinalLeftIcon ? 'pl-11' : 'px-4',
            RightIcon ? 'pr-11' : 'pr-4',
            error && 'border-danger/50 bg-danger/5 text-danger',
            overlay && 'text-transparent [-webkit-text-fill-color:transparent] caret-accent',
            className
          )}
          {...props}
        />
        {overlay && (
          <div className="absolute inset-0 flex items-center pointer-events-none px-4 select-none" style={{ paddingLeft: FinalLeftIcon ? '2.75rem' : '1rem' }}>
            <div className="truncate w-full text-primary opacity-100">
                {overlay}
            </div>
          </div>
        )}
        {RightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {RightIcon}
          </div>
        )}
      </div>
      <AnimatePresence>
        {error && (
            <motion.span 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xs font-medium text-danger pl-1"
            >
                {error}
            </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}));

Input.displayName = 'Input';

// ─── COUNTER ─────────────────────────────────────────────────────────────────
export const Counter = memo(({ value, className }) => {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    const start = displayValue;
    const end = value;
    if (start === end) return;

    const duration = 500;
    const startTime = performance.now();

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(start + (end - start) * progress);
      setDisplayValue(current);

      if (progress < 1) requestAnimationFrame(update);
    };

    requestAnimationFrame(update);
  }, [value]);

  return <span className={cn('tabular-nums font-mono', className)}>{displayValue}</span>;
});

// ─── SKELETON ────────────────────────────────────────────────────────────────
export const Skeleton = memo(({ className, noBorder = false, opacity = 1, ...rest }) => (
  <div
    className={cn('relative overflow-hidden rounded-lg bg-shimmer', className)}
    style={{
      background: 'var(--bg-surface)',
      border: noBorder ? 'none' : '1px solid var(--border-default)',
      opacity,
    }}
    {...rest}
  >
    <motion.div
      initial={{ x: '-100%' }}
      animate={{ x: '250%' }}
      transition={{ repeat: Infinity, duration: 2, ease: [0.45, 0, 0.55, 1], repeatDelay: 0.5 }}
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)',
      }}
    />
  </div>
));

// ─── LOADING SPINNER ──────────────────────────────────────────────────────────
export const Spinner = memo(({ size = 'md', className, color = 'var(--accent-500)' }) => {
  const sizes = { sm: 16, md: 24, lg: 40, xl: 64 };
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      className={cn('inline-block rounded-full border-2 border-t-transparent', className)}
      style={{
        width: sizes[size],
        height: sizes[size],
        borderColor: color,
        borderTopColor: 'transparent'
      }}
    />
  );
});

// ─── TOOLTIP ───────────────────────────────────────────────────────────────
export const Tooltip = memo(({ children, content, position = 'top', className }) => {
    const [isVisible, setIsVisible] = useState(false);

    const positions = {
        top: "-top-10 left-1/2 -translate-x-1/2",
        bottom: "-bottom-10 left-1/2 -translate-x-1/2",
        left: "-left-10 top-1/2 -translate-y-1/2 -translate-x-full",
        right: "-right-10 top-1/2 -translate-y-1/2 translate-x-full"
    };

    return (
        <div 
            className="relative flex items-center"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: position === 'top' ? 10 : -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: position === 'top' ? 10 : -10 }}
                        className={cn(
                            "absolute z-[1000] px-3 py-1.5 rounded-lg bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl pointer-events-none whitespace-nowrap",
                            positions[position],
                            className
                        )}
                    >
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">
                            {content}
                        </span>
                        {/* Little Arrow */}
                        <div className={cn(
                            "absolute w-2 h-2 bg-black/90 border-r border-b border-white/10 rotate-45",
                            position === 'top' && "bottom-[-4px] left-1/2 -translate-x-1/2",
                            position === 'bottom' && "top-[-4px] left-1/2 -translate-y-1/2",
                            position === 'left' && "right-[-4px] top-1/2 -translate-y-1/2",
                            position === 'right' && "left-[-4px] top-1/2 -translate-y-1/2",
                        )} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

Tooltip.displayName = 'Tooltip';
