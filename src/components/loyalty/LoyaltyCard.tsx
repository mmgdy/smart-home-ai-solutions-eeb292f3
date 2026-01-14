import { Gift, TrendingUp, History, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { LoyaltyBadge } from './LoyaltyBadge';
import { getTierNextThreshold } from '@/hooks/useLoyalty';
import { useLanguage } from '@/lib/i18n';
import { Progress } from '@/components/ui/progress';

interface LoyaltyCardProps {
  email: string;
  pointsBalance: number;
  lifetimePoints: number;
  tier: string;
  transactions?: Array<{
    id: string;
    points: number;
    transaction_type: string;
    description: string | null;
    created_at: string;
  }>;
}

export const LoyaltyCard = ({ 
  email, 
  pointsBalance, 
  lifetimePoints, 
  tier,
  transactions = []
}: LoyaltyCardProps) => {
  const { language } = useLanguage();
  const nextTier = getTierNextThreshold(tier, lifetimePoints);

  const labels = {
    loyaltyProgram: language === 'ar' ? 'برنامج الولاء' : 'Loyalty Program',
    availablePoints: language === 'ar' ? 'النقاط المتاحة' : 'Available Points',
    lifetimePoints: language === 'ar' ? 'إجمالي النقاط' : 'Lifetime Points',
    pointsToNext: language === 'ar' ? 'نقطة للوصول إلى' : 'points to',
    recentActivity: language === 'ar' ? 'النشاط الأخير' : 'Recent Activity',
    noActivity: language === 'ar' ? 'لا يوجد نشاط بعد' : 'No activity yet',
    earned: language === 'ar' ? 'ربحت' : 'Earned',
    redeemed: language === 'ar' ? 'استبدلت' : 'Redeemed',
    bonus: language === 'ar' ? 'مكافأة' : 'Bonus',
    expired: language === 'ar' ? 'انتهت صلاحية' : 'Expired',
    points: language === 'ar' ? 'نقطة' : 'points',
    earnRate: language === 'ar' ? 'اربح 1 نقطة لكل 10 ج.م' : 'Earn 1 point per 10 EGP',
  };

  const transactionLabels: Record<string, string> = {
    earn: labels.earned,
    redeem: labels.redeemed,
    bonus: labels.bonus,
    expire: labels.expired,
  };

  const progress = nextTier 
    ? ((lifetimePoints / nextTier.threshold) * 100)
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-lg"
    >
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">
              {labels.loyaltyProgram}
            </h3>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </div>
        <LoyaltyBadge tier={tier} points={pointsBalance} showPoints={false} size="lg" />
      </div>

      {/* Points Display */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-primary/10 p-4">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">{labels.availablePoints}</span>
          </div>
          <p className="mt-1 font-display text-3xl font-bold text-foreground">
            {pointsBalance.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl bg-muted/50 p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">{labels.lifetimePoints}</span>
          </div>
          <p className="mt-1 font-display text-3xl font-bold text-foreground">
            {lifetimePoints.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Progress to next tier */}
      {nextTier && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {nextTier.points.toLocaleString()} {labels.pointsToNext} {nextTier.next}
            </span>
            <span className="font-medium text-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Earn rate info */}
      <div className="mb-6 rounded-lg bg-muted/30 p-3 text-center">
        <p className="text-sm text-muted-foreground">{labels.earnRate}</p>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-medium text-foreground">{labels.recentActivity}</h4>
        </div>
        
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.noActivity}</p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 5).map((tx) => (
              <div 
                key={tx.id}
                className="flex items-center justify-between rounded-lg bg-muted/30 p-3"
              >
                <div>
                  <span className={`text-sm font-medium ${tx.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {transactionLabels[tx.transaction_type]} {Math.abs(tx.points)} {labels.points}
                  </span>
                  {tx.description && (
                    <p className="text-xs text-muted-foreground">{tx.description}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(tx.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
