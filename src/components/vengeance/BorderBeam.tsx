import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';

export interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  anchor?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

/**
 * Adapted from Vengeance UI BorderBeam using global CSS keyframes in src/index.css.
 */
export function BorderBeam({
  className,
  size = 180,
  duration = 10,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = '#2DD4BF',
  colorTo = '#3B82F6',
  delay = 0,
}: BorderBeamProps) {
  const { reducedMotion } = useMotionPreferences();
  if (reducedMotion) return null;

  return (
    <div
      aria-hidden="true"
      style={
        {
          '--size': size,
          '--duration': duration,
          '--anchor': anchor,
          '--border-width': borderWidth,
          '--color-from': colorFrom,
          '--color-to': colorTo,
          '--delay': delay,
        } as CSSProperties
      }
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent]',
        '![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]',
        'after:absolute after:aspect-square after:w-[calc(var(--size)*1px)] after:[animation:border-beam_calc(var(--duration)*1s)_infinite_linear] after:[animation-delay:calc(var(--delay)*1s)] after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] after:[offset-anchor:calc(var(--anchor)*1%)_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]',
        className,
      )}
    />
  );
}

export default BorderBeam;
