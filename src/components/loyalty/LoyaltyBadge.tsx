import { Star, Crown, Award, Medal } from 'lucide-react';
import { getTierColor } from '@/hooks/useLoyalty';
import { useLanguage } from '@/lib/i18n';

interface LoyaltyBadgeProps {
  tier: string;
  points: number;
  showPoints?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const tierIcons = {
  bronze: Medal,
  silver: Award,
  gold: Star,
  platinum: Crown,
};

export const LoyaltyBadge = ({ tier, points, showPoints = true, size = 'md' }: LoyaltyBadgeProps) => {
  const { language } = useLanguage();
  const Icon = tierIcons[tier as keyof typeof tierIcons] || Medal;
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-2',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const tierLabels = {
    bronze: language === 'ar' ? 'برونزي' : 'Bronze',
    silver: language === 'ar' ? 'فضي' : 'Silver',
    gold: language === 'ar' ? 'ذهبي' : 'Gold',
    platinum: language === 'ar' ? 'بلاتيني' : 'Platinum',
  };

  const pointsLabel = language === 'ar' ? 'نقطة' : 'pts';

  return (
    <div className={`inline-flex items-center rounded-full font-medium ${getTierColor(tier)} ${sizeClasses[size]}`}>
      <Icon className={iconSizes[size]} />
      <span className="capitalize">{tierLabels[tier as keyof typeof tierLabels] || tier}</span>
      {showPoints && (
        <span className="opacity-80">• {points.toLocaleString()} {pointsLabel}</span>
      )}
    </div>
  );
};
