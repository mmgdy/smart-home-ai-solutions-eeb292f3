import type { ComponentProps, CSSProperties, ForwardRefExoticComponent, RefAttributes } from 'react';
import * as Hairline from '@lucasmarkes/hairline/react';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

const NAVY_TOKENS = {
  '--hairline-plate': '#070D16',
  '--hairline-hi': '#E6F4F1',
  '--hairline-edge': '#2DD4BF',
  '--hairline-mid': '#1E3A5F',
  '--hairline-lo': '#12233A',
} as CSSProperties;

const LIGHT_SURFACE_TOKENS = {
  '--hairline-plate': 'hsl(var(--card))',
  '--hairline-hi': 'hsl(var(--foreground))',
  '--hairline-edge': 'hsl(var(--primary))',
  '--hairline-mid': 'hsl(var(--muted-foreground) / 0.55)',
  '--hairline-lo': 'hsl(var(--border))',
} as CSSProperties;

export type AzkaHairlineVariant = 'navy' | 'surface';

type BaseFigureComponent = ForwardRefExoticComponent<
  ComponentProps<typeof Hairline.Hub> & RefAttributes<HTMLDivElement>
>;

export type AzkaHairlineProps = ComponentProps<typeof Hairline.Hub> & {
  variant?: AzkaHairlineVariant;
  containerClassName?: string;
};

function createFigure(Figure: BaseFigureComponent, figureName: string) {
  return function AzkaHairlineFigure({
    variant = 'navy',
    style,
    className,
    containerClassName,
    intensity,
    play,
    theme,
    ...props
  }: AzkaHairlineProps) {
    const { reducedMotion, shouldAutoPlay } = useMotionPreferences();
    const { isDark } = useTheme();

    const paletteTokens =
      variant === 'navy' || isDark ? NAVY_TOKENS : LIGHT_SURFACE_TOKENS;
    const resolvedTheme = theme ?? (variant === 'navy' || isDark ? 'dark' : 'light');
    const resolvedPlay = reducedMotion ? false : (play ?? shouldAutoPlay);
    const resolvedIntensity = reducedMotion ? 0 : (intensity ?? 0.65);

    return (
      <div
        data-hairline-figure={figureName}
        className={cn('relative aspect-[5/4] w-full overflow-hidden', containerClassName)}
      >
        <Figure
          theme={resolvedTheme}
          play={resolvedPlay}
          intensity={resolvedIntensity}
          style={{ ...paletteTokens, ...style }}
          className={cn('h-full w-full', className)}
          {...props}
        />
      </div>
    );
  };
}

export const Hub = createFigure(Hairline.Hub, 'hub');
export const Terrain = createFigure(Hairline.Terrain, 'terrain');
export const Router = createFigure(Hairline.Router, 'router');
export const Padlock = createFigure(Hairline.Padlock, 'padlock');
export const Plug = createFigure(Hairline.Plug, 'plug');
export const Phone = createFigure(Hairline.Phone, 'phone');
export const Laptop = createFigure(Hairline.Laptop, 'laptop');
export const Relay = createFigure(Hairline.Relay, 'relay');
export const Stack = createFigure(Hairline.Stack, 'stack');
export const Exploded = createFigure(Hairline.Exploded, 'exploded');
export const Cabinet = createFigure(Hairline.Cabinet, 'cabinet');
export const Drawer = createFigure(Hairline.Drawer, 'drawer');
export const Basket = createFigure(Hairline.Basket, 'basket');
