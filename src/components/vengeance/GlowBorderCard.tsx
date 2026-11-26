import React from 'react';
import { cn } from '@/lib/utils';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';

export interface GlowBorderCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  width?: string;
  height?: string;
  aspectRatio?: string;
  borderRadius?: string;
  animationDuration?: number;
  gradientColors?: string[];
  borderWidth?: string;
  blurAmount?: string;
  inset?: string;
  colorPreset?: 'azka' | 'aurora' | 'ocean' | 'custom';
  paused?: boolean;
  contentClassName?: string;
}

const colorPresets: Record<string, string[]> = {
  azka: ['#2DD4BF', '#06B6D4', '#3B82F6', '#8B5CF6', '#2DD4BF', '#14B8A6', '#0EA5E9', '#6366F1', '#2DD4BF', '#06B6D4'],
  ocean: ['#0EA5E9', '#14B8A6', '#2DD4BF', '#38BDF8', '#0284C7', '#0EA5E9', '#22D3EE', '#3B82F6', '#06B6D4', '#0EA5E9'],
  aurora: ['#2DD4BF', '#22D3EE', '#60EFFF', '#818CF8', '#A78BFA', '#38BDF8', '#2DD4BF', '#14B8A6', '#8B5CF6', '#2DD4BF'],
  custom: ['#2DD4BF', '#06B6D4', '#3B82F6', '#8B5CF6', '#2DD4BF', '#14B8A6', '#0EA5E9', '#6366F1', '#2DD4BF', '#06B6D4'],
};

/**
 * Adapted from Vengeance UI GlowBorderCard for AzkaSmart Midnight Navy & gradient-ring accents.
 */
export const GlowBorderCard = React.forwardRef<HTMLDivElement, GlowBorderCardProps>(
  (
    {
      children,
      className,
      contentClassName,
      width = '100%',
      height = 'auto',
      aspectRatio,
      borderRadius = '1rem',
      animationDuration = 6,
      gradientColors,
      borderWidth = '0.35rem',
      blurAmount = '0.65rem',
      inset = '-0.35rem',
      colorPreset = 'azka',
      paused = false,
      style,
      ...props
    },
    ref,
  ) => {
    const { reducedMotion } = useMotionPreferences();
    const colors = gradientColors || colorPresets[colorPreset] || colorPresets.azka;

    const colorVars: Record<string, string> = {};
    for (let i = 0; i < 10; i++) {
      colorVars[`--glow-color-${i + 1}`] = colors[i % colors.length];
    }

    const isPaused = paused || reducedMotion;

    return (
      <div
        ref={ref}
        className={cn(
          'relative overflow-hidden isolate rounded-2xl',
          'bg-card/85 backdrop-blur-xl border border-border/60 shadow-xl',
          className,
        )}
        style={{
          width,
          height,
          ...(aspectRatio ? { aspectRatio } : {}),
          borderRadius,
          '--glow-animation-duration': `${animationDuration}s`,
          ...colorVars,
          ...style,
        } as React.CSSProperties}
        {...props}
      >
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute -z-10 border-solid rounded-[inherit] glow-conic opacity-75',
            isPaused && '[animation-play-state:paused]',
          )}
          style={{
            inset,
            borderWidth,
            filter: `blur(${blurAmount})`,
          }}
        />
        <div className={cn('relative z-10 w-full h-full', contentClassName)}>{children}</div>
      </div>
    );
  },
);

GlowBorderCard.displayName = 'GlowBorderCard';

export default GlowBorderCard;
