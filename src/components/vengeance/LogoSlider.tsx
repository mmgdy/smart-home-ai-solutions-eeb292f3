import * as React from 'react';
import { cn } from '@/lib/utils';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';

export interface LogoSliderProps {
  logos: React.ReactNode[];
  speed?: number;
  direction?: 'left' | 'right';
  showBlur?: boolean;
  className?: string;
  pauseOnHover?: boolean;
}

/**
 * Adapted from Vengeance UI LogoSlider.
 * Keeps transparent brand artwork directly on the stage (zero opaque box wrappers),
 * isolates LTR marquee animation so Arabic RTL stays glitch-free, and degrades gracefully under reduced-motion.
 */
export const LogoSlider = ({
  logos,
  speed = 42,
  direction = 'left',
  showBlur = true,
  className,
  pauseOnHover = true,
}: LogoSliderProps) => {
  const { reducedMotion } = useMotionPreferences();

  if (logos.length === 0) return null;

  if (reducedMotion || logos.length < 3) {
    return (
      <div className={cn('w-full flex flex-wrap items-center justify-center gap-6 sm:gap-10 py-3', className)}>
        {logos.map((logo, idx) => (
          <div key={idx} className="h-12 min-w-[110px] px-2 flex items-center justify-center">
            {logo}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      dir="ltr"
      className={cn(
        'azka-logo-slider relative w-full overflow-hidden py-2',
        pauseOnHover && 'azka-logo-slider--pause',
        className,
      )}
      style={{ '--azka-marquee-duration': `${speed}s` } as React.CSSProperties}
    >
      {showBlur && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-24 z-10 bg-gradient-to-r from-background via-background/80 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-24 z-10 bg-gradient-to-l from-background via-background/80 to-transparent"
          />
        </>
      )}

      <div
        className={cn(
          'azka-logo-slider__track flex w-max items-center',
          direction === 'right' && 'azka-logo-slider__track--reverse',
        )}
      >
        {[0, 1].map((loopIdx) => (
          <ul
            key={loopIdx}
            aria-hidden={loopIdx === 1}
            className="flex items-center gap-8 sm:gap-12 px-4 sm:px-6 m-0 list-none shrink-0"
          >
            {logos.map((logo, index) => (
              <li
                key={`${loopIdx}-${index}`}
                className="h-14 min-w-[110px] sm:min-w-[136px] flex items-center justify-center shrink-0"
              >
                {logo}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
};

LogoSlider.displayName = 'LogoSlider';

export default LogoSlider;
