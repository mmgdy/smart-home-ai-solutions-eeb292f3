import { useEffect, useRef, useState } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';

interface StatsCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  formatLocale?: boolean;
}

/**
 * Adapted from Vengeance UI StatsCounter with reduced-motion fallback.
 */
export function StatsCounter({
  value,
  duration = 1.2,
  prefix = '',
  suffix = '',
  decimals = 0,
  formatLocale = true,
  className,
}: StatsCounterProps) {
  const { reducedMotion } = useMotionPreferences();
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const motionValue = useMotionValue(reducedMotion ? value : 0);
  const springValue = useSpring(motionValue, { duration: duration * 1000, bounce: 0 });
  const [displayValue, setDisplayValue] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const unsubscribe = springValue.on('change', (latest) => {
      setDisplayValue(latest);
    });
    return unsubscribe;
  }, [springValue, reducedMotion]);

  const formatted =
    decimals > 0
      ? displayValue.toFixed(decimals)
      : formatLocale
        ? Math.round(displayValue).toLocaleString('en-US')
        : String(Math.round(displayValue));

  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

export default StatsCounter;
