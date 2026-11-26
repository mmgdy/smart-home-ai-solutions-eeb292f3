import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';

export interface AnimatedButtonProps extends HTMLMotionProps<'button'> {
  children?: React.ReactNode;
  azkaVariant?: 'primary' | 'glass';
}

/**
 * Adapted from Vengeance UI AnimatedButton with Azka gradient-ring CTA styling and reduced-motion guards.
 */
export const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ children, className, azkaVariant = 'primary', ...rest }, ref) => {
    const { reducedMotion } = useMotionPreferences();

    const variantStyles =
      azkaVariant === 'primary'
        ? 'bg-gradient-to-r from-[#14B8A6] via-[#06B6D4] to-[#3B82F6] text-[#050A12] font-semibold border border-teal-300/40 shadow-[0_10px_35px_-10px_rgba(45,212,191,0.65)] hover:shadow-[0_14px_45px_-10px_rgba(6,182,212,0.8)] [--shine:rgba(255,255,255,0.65)]'
        : 'bg-card/75 text-foreground font-medium border border-border/80 hover:border-primary/60 hover:bg-card/95 backdrop-blur-md [--shine:rgba(45,212,191,0.5)]';

    return (
      <motion.button
        ref={ref}
        whileHover={reducedMotion ? undefined : { scale: 1.015 }}
        whileTap={reducedMotion ? undefined : { scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 480, damping: 30, mass: 0.5 }}
        className={cn(
          'group relative inline-flex items-center justify-center overflow-hidden rounded-full px-6 py-3 text-sm sm:text-base transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
          variantStyles,
          className,
        )}
        {...rest}
      >
        <span className="relative z-10 inline-flex items-center justify-center gap-2">
          {children}
        </span>

        {!reducedMotion && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full p-px"
            style={{
              background:
                'linear-gradient(-75deg, transparent 30%, var(--shine) 50%, transparent 70%)',
              backgroundSize: '200% 100%',
              mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              maskComposite: 'exclude',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
            }}
            initial={{ backgroundPosition: '120% 0', opacity: 0 }}
            animate={{ backgroundPosition: ['120% 0', '-20% 0'], opacity: [0, 0.9, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'linear', repeatDelay: 2.2 }}
          />
        )}
      </motion.button>
    );
  },
);

AnimatedButton.displayName = 'AnimatedButton';

export default AnimatedButton;
