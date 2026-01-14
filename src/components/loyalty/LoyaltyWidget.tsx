import { useState } from 'react';
import { Gift, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoyaltyCard } from './LoyaltyCard';
import { LoyaltyBadge } from './LoyaltyBadge';
import { useLoyalty } from '@/hooks/useLoyalty';
import { useLanguage } from '@/lib/i18n';

interface LoyaltyWidgetProps {
  email?: string;
  onEmailChange?: (email: string) => void;
  compact?: boolean;
}

export const LoyaltyWidget = ({ email: propEmail, onEmailChange, compact = false }: LoyaltyWidgetProps) => {
  const [inputEmail, setInputEmail] = useState(propEmail || '');
  const [searchEmail, setSearchEmail] = useState(propEmail || '');
  const [isExpanded, setIsExpanded] = useState(false);
  const { language } = useLanguage();
  const { loyalty, isLoading, transactions } = useLoyalty(searchEmail);

  const labels = {
    loyaltyPoints: language === 'ar' ? 'نقاط الولاء' : 'Loyalty Points',
    enterEmail: language === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter your email',
    checkPoints: language === 'ar' ? 'تحقق من النقاط' : 'Check Points',
    checking: language === 'ar' ? 'جاري التحقق...' : 'Checking...',
    noAccount: language === 'ar' ? 'لا يوجد حساب ولاء لهذا البريد' : 'No loyalty account found for this email',
    startEarning: language === 'ar' ? 'ابدأ بكسب النقاط مع أول طلب!' : 'Start earning points with your first order!',
    viewDetails: language === 'ar' ? 'عرض التفاصيل' : 'View Details',
    hideDetails: language === 'ar' ? 'إخفاء التفاصيل' : 'Hide Details',
  };

  const handleCheckPoints = () => {
    setSearchEmail(inputEmail);
    onEmailChange?.(inputEmail);
  };

  if (compact && loyalty) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <Gift className="h-5 w-5 text-primary" />
            <span className="font-medium text-foreground">{labels.loyaltyPoints}</span>
          </div>
          <div className="flex items-center gap-2">
            <LoyaltyBadge tier={loyalty.tier} points={loyalty.points_balance} size="sm" />
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <LoyaltyCard
                email={loyalty.email}
                pointsBalance={loyalty.points_balance}
                lifetimePoints={loyalty.lifetime_points}
                tier={loyalty.tier}
                transactions={transactions}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Email Input */}
      {!propEmail && (
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder={labels.enterEmail}
            value={inputEmail}
            onChange={(e) => setInputEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheckPoints()}
          />
          <Button onClick={handleCheckPoints} disabled={!inputEmail || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {labels.checking}
              </>
            ) : (
              labels.checkPoints
            )}
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Loyalty Card */}
      {!isLoading && searchEmail && loyalty && (
        <LoyaltyCard
          email={loyalty.email}
          pointsBalance={loyalty.points_balance}
          lifetimePoints={loyalty.lifetime_points}
          tier={loyalty.tier}
          transactions={transactions}
        />
      )}

      {/* No Account Found */}
      {!isLoading && searchEmail && !loyalty && (
        <div className="rounded-xl border border-border bg-muted/30 p-6 text-center">
          <Gift className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
          <p className="font-medium text-foreground">{labels.noAccount}</p>
          <p className="mt-1 text-sm text-muted-foreground">{labels.startEarning}</p>
        </div>
      )}
    </div>
  );
};
