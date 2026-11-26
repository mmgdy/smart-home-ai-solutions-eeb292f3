import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';

export interface AzkaBentoCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  delay?: number;
  hoverLift?: boolean;
}

/**
 * Vengeance-inspired bento surface adapted for Azka Midnight Navy & gradient-ring accents.
 */
export function AzkaBentoCard({
  children,
  className,
  delay = 0,
  hoverLift = true,
  ...props
}: AzkaBentoCardProps) {
  const { reducedMotion } = useMotionPreferences();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.4, delay: reducedMotion ? 0 : delay }}
      whileHover={reducedMotion || !hoverLift ? undefined : { y: -3 }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-border/70 bg-card/75 backdrop-blur-xl transition-all duration-300',
        'shadow-[0_12px_36px_-18px_rgba(0,0,0,0.55)] hover:border-primary/45 hover:shadow-[0_18px_45px_-16px_rgba(45,212,191,0.22)]',
        className,
      )}
      {...props}
    >
      {/* Top specular Azka hairline accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/50 to-transparent opacity-70 group-hover:opacity-100 transition-opacity"
      />
      {children}
    </motion.div>
  );
}

export default AzkaBentoCard;
