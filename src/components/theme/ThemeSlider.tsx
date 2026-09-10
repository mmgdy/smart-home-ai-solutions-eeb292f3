import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ThemeSliderProps {
  className?: string;
  showLabels?: boolean;
}

export function ThemeSlider({ className, showLabels = false }: ThemeSliderProps) {
  const { theme, toggleTheme, isDark } = useTheme();
  const { isRTL } = useLanguage();

  const titleText = isDark
    ? (isRTL ? 'التبديل إلى الوضع النهاري' : 'Switch to Light Mode')
    : (isRTL ? 'التبديل إلى الوضع الليلي' : 'Switch to Dark Mode');

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={titleText}
      title={titleText}
      onClick={toggleTheme}
      className={cn(
        "relative flex items-center justify-between p-1 rounded-full",
        "w-16 h-8 select-none cursor-pointer transition-colors duration-300",
        "bg-secondary/80 hover:bg-secondary border border-border/80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "shadow-inner",
        className
      )}
    >
      {/* Sun Icon Station (Light) */}
      <span className="flex items-center justify-center w-6 h-6 z-10 text-amber-500 transition-opacity duration-200">
        <Sun className={cn("w-3.5 h-3.5", !isDark ? "opacity-100" : "opacity-40")} />
      </span>

      {/* Moon Icon Station (Dark) */}
      <span className="flex items-center justify-center w-6 h-6 z-10 text-emerald-400 transition-opacity duration-200">
        <Moon className={cn("w-3.5 h-3.5", isDark ? "opacity-100" : "opacity-40")} />
      </span>

      {/* Animated Sliding Thumb */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={cn(
          "absolute top-1 bottom-1 w-6 h-6 rounded-full shadow-md flex items-center justify-center",
          isDark
            ? "left-[calc(100%-1.75rem)] bg-primary text-primary-foreground shadow-primary/30"
            : "left-1 bg-amber-400 text-slate-900 shadow-amber-400/40"
        )}
      >
        {isDark ? (
          <Moon className="w-3 h-3 fill-current text-white" />
        ) : (
          <Sun className="w-3 h-3 fill-current text-slate-900" />
        )}
      </motion.div>

      {showLabels && (
        <span className="sr-only">
          {isDark ? 'Dark Mode Active' : 'Light Mode Active'}
        </span>
      )}
    </button>
  );
}
