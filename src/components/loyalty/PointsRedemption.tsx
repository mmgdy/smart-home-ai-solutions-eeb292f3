import { useState, useEffect } from 'react';
import { Gift, Minus, Plus, X, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLoyalty } from '@/hooks/useLoyalty';
import { useLanguage } from '@/lib/i18n';
import { LoyaltyBadge } from './LoyaltyBadge';

interface PointsRedemptionProps {
  email: string;
  maxDiscount: number;
  onRedemptionChange: (discount: number, pointsToRedeem: number) => void;
  pointsPerEgp?: number; // How many points = 1 EGP discount
}

export const PointsRedemption = ({ 
  email, 
  maxDiscount, 
  onRedemptionChange,
  pointsPerEgp = 10, // Default: 10 points = 1 EGP
}: PointsRedemptionProps) => {
  const { language, formatPrice } = useLanguage();
  const { loyalty, isLoading, refetch } = useLoyalty(email);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [isApplied, setIsApplied] = useState(false);

  // Reset when email changes
  useEffect(() => {
    setPointsToRedeem(0);
    setIsApplied(false);
    onRedemptionChange(0, 0);
    if (email) {
      refetch();
    }
  }, [email]);

  const availablePoints = loyalty?.points_balance || 0;
  const maxRedeemablePoints = Math.min(availablePoints, maxDiscount * pointsPerEgp);
  const discountValue = Math.floor(pointsToRedeem / pointsPerEgp);

  const labels = {
    loyaltyPoints: language === 'ar' ? 'نقاط الولاء' : 'Loyalty Points',
    availablePoints: language === 'ar' ? 'النقاط المتاحة' : 'Available Points',
    redeemPoints: language === 'ar' ? 'استبدال النقاط' : 'Redeem Points',
    pointsToRedeem: language === 'ar' ? 'النقاط للاستبدال' : 'Points to Redeem',
    discount: language === 'ar' ? 'خصم' : 'Discount',
    apply: language === 'ar' ? 'تطبيق' : 'Apply',
    applied: language === 'ar' ? 'تم التطبيق' : 'Applied',
    remove: language === 'ar' ? 'إزالة' : 'Remove',
    noPoints: language === 'ar' ? 'لا توجد نقاط متاحة' : 'No points available',
    enterEmail: language === 'ar' ? 'أدخل بريدك الإلكتروني أولاً' : 'Enter your email first',
    pointsValue: language === 'ar' ? `${pointsPerEgp} نقطة = 1 ج.م` : `${pointsPerEgp} points = 1 EGP`,
    max: language === 'ar' ? 'الحد الأقصى' : 'Max',
  };

  const handleApply = () => {
    if (pointsToRedeem > 0 && pointsToRedeem <= maxRedeemablePoints) {
      setIsApplied(true);
      onRedemptionChange(discountValue, pointsToRedeem);
    }
  };

  const handleRemove = () => {
    setIsApplied(false);
    setPointsToRedeem(0);
    onRedemptionChange(0, 0);
  };

  const handlePointsChange = (value: number) => {
    const clampedValue = Math.max(0, Math.min(value, maxRedeemablePoints));
    // Round to nearest multiple of pointsPerEgp for clean discount values
    const roundedValue = Math.floor(clampedValue / pointsPerEgp) * pointsPerEgp;
    setPointsToRedeem(roundedValue);
  };

  const handleMaxPoints = () => {
    handlePointsChange(maxRedeemablePoints);
  };

  if (!email) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center">
        <Gift className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{labels.enterEmail}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!loyalty || availablePoints === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center">
        <Gift className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{labels.noPoints}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">{labels.loyaltyPoints}</span>
        </div>
        <LoyaltyBadge tier={loyalty.tier} points={availablePoints} size="sm" />
      </div>

      <AnimatePresence mode="wait">
        {isApplied ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between rounded-lg bg-green-500/10 p-3"
          >
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-700">
                  {labels.applied}: -{formatPrice(discountValue)}
                </p>
                <p className="text-xs text-green-600">
                  {pointsToRedeem.toLocaleString()} {language === 'ar' ? 'نقطة' : 'points'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-1" />
              {labels.remove}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <p className="text-xs text-muted-foreground">{labels.pointsValue}</p>
            
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => handlePointsChange(pointsToRedeem - pointsPerEgp)}
                disabled={pointsToRedeem <= 0}
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <div className="relative flex-1">
                <Input
                  type="number"
                  value={pointsToRedeem}
                  onChange={(e) => handlePointsChange(parseInt(e.target.value) || 0)}
                  className="text-center pr-16"
                  min={0}
                  max={maxRedeemablePoints}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
                  onClick={handleMaxPoints}
                >
                  {labels.max}
                </Button>
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => handlePointsChange(pointsToRedeem + pointsPerEgp)}
                disabled={pointsToRedeem >= maxRedeemablePoints}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {pointsToRedeem > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-muted-foreground">
                  {labels.discount}: <span className="font-medium text-foreground">-{formatPrice(discountValue)}</span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApply}
                  disabled={discountValue <= 0}
                >
                  {labels.apply}
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
