import * as React from 'react';
import { useState, useId } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';

export type AnimatedTooltipVariant = 'cora' | 'smaug' | 'indis';

interface VariantConfig {
  width: number;
  height: number;
  bottom: string;
  transformOrigin: string;
  shape: (fill: string) => React.ReactNode;
  base: Variants;
  content: Variants;
}

const EASE_OUT_QUINT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_IN: [number, number, number, number] = [0.55, 0, 1, 0.45];

const VARIANTS: Record<AnimatedTooltipVariant, VariantConfig> = {
  smaug: {
    width: 220,
    height: 150,
    bottom: 'calc(100% + 0.15rem)',
    transformOrigin: '50% 100%',
    shape: (fill) => (
      <path
        d="M 314,100 C 313,100 312,100 311,100 L 89.5,100 C 55.9,100 29.1,121 29.1,150 29.1,178 53.1,201 89.5,201 L 184,201 200,223 217,201 311,201 C 344,201 371,178 371,150 371,122 346,99 314,100 Z"
        fill={fill}
      />
    ),
    base: {
      initial: { scale: 0.9, y: 8, opacity: 0 },
      animate: { scale: 1, y: 0, opacity: 1, transition: { duration: 0.22, ease: EASE_OUT_QUINT } },
      exit: { scale: 0.9, y: 6, opacity: 0, transition: { duration: 0.14, ease: EASE_IN } },
    },
    content: {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.18, delay: 0.04 } },
      exit: { opacity: 0, transition: { duration: 0.1 } },
    },
  },
  cora: {
    width: 220,
    height: 155,
    bottom: 'calc(100% + 0.25rem)',
    transformOrigin: '50% 100%',
    shape: (fill) => (
      <path
        d="M 199,21.9 C 152,22.2 109,35.7 78.8,57.4 48,79.1 29,109 29,142 29,172 45.9,201 73.6,222 101,243 140,258 183,260 189,270 200,282 200,282 200,282 211,270 217,260 261,258 299,243 327,222 354,201 371,172 371,142 371,109 352,78.7 321,57 290,35.3 247,21.9 199,21.9 Z"
        fill={fill}
      />
    ),
    base: {
      initial: { scale: 0.85, opacity: 0 },
      animate: { scale: 1, opacity: 1, transition: { duration: 0.28, ease: EASE_OUT_QUINT } },
      exit: { scale: 0.85, opacity: 0, transition: { duration: 0.15, ease: EASE_IN } },
    },
    content: {
      initial: { y: 6, opacity: 0 },
      animate: { y: 0, opacity: 1, transition: { duration: 0.2, delay: 0.06 } },
      exit: { opacity: 0, transition: { duration: 0.1 } },
    },
  },
  indis: {
    width: 220,
    height: 155,
    bottom: 'calc(100% + 0.25rem)',
    transformOrigin: '50% 100%',
    shape: (fill) => (
      <path
        d="M 44.5,24 C 148,24 252,24 356,24 367,24 376,32.9 376,44 L 376,256 C 376,267 367,276 356,276 252,276 148,276 44.5,276 33.4,276 24.5,267 24.5,256 L 24.5,44 C 24.5,32.9 33.4,24 44.5,24 Z"
        fill={fill}
      />
    ),
    base: {
      initial: { y: 12, scale: 0.92, opacity: 0 },
      animate: { y: 0, scale: 1, opacity: 1, transition: { type: 'spring', bounce: 0.3, duration: 0.4 } },
      exit: { y: 8, scale: 0.92, opacity: 0, transition: { duration: 0.15, ease: EASE_IN } },
    },
    content: {
      initial: { y: 4, opacity: 0 },
      animate: { y: 0, opacity: 1, transition: { duration: 0.2, delay: 0.05 } },
      exit: { opacity: 0, transition: { duration: 0.1 } },
    },
  },
};

export interface AnimatedTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  variant?: AnimatedTooltipVariant;
  className?: string;
}

/**
 * Adapted from Vengeance UI AnimatedTooltip using Azka semantic tokens and reduced-motion support.
 */
export function AnimatedTooltip({
  children,
  content,
  variant = 'smaug',
  className,
}: AnimatedTooltipProps) {
  const [open, setOpen] = useState(false);
  const { reducedMotion } = useMotionPreferences();
  const cfg = VARIANTS[variant] ?? VARIANTS.smaug;
  const id = useId().replace(/:/g, '');

  return (
    <span
      className={cn('relative inline-flex items-center', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span
        tabIndex={0}
        aria-describedby={open ? id : undefined}
        className="cursor-pointer select-none inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
      >
        {children}
      </span>

      <span
        aria-hidden={!open}
        style={{
          position: 'absolute',
          bottom: cfg.bottom,
          left: '50%',
          width: cfg.width,
          height: cfg.height,
          marginLeft: -cfg.width / 2,
          pointerEvents: 'none',
          zIndex: 50,
        }}
      >
        <AnimatePresence>
          {open && (
            <motion.span
              key="tooltip"
              id={id}
              role="tooltip"
              variants={reducedMotion ? undefined : cfg.base}
              initial={reducedMotion ? { opacity: 1 } : 'initial'}
              animate={reducedMotion ? { opacity: 1 } : 'animate'}
              exit={reducedMotion ? { opacity: 0 } : 'exit'}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transformOrigin: cfg.transformOrigin,
              }}
            >
              <svg
                viewBox="0 0 400 300"
                preserveAspectRatio="xMidYMid meet"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                aria-hidden="true"
              >
                {cfg.shape('hsl(var(--popover))')}
              </svg>
              <motion.span
                variants={reducedMotion ? undefined : cfg.content}
                initial={reducedMotion ? { opacity: 1 } : 'initial'}
                animate={reducedMotion ? { opacity: 1 } : 'animate'}
                exit={reducedMotion ? { opacity: 0 } : 'exit'}
                className="relative px-4 text-center text-xs font-medium leading-snug text-popover-foreground"
                style={{ width: '72%' }}
              >
                {content}
              </motion.span>
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </span>
  );
}

export default AnimatedTooltip;
