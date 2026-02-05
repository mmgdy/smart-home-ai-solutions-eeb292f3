import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { User, Mail, Gift, ShoppingBag, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/lib/i18n';
import { useLoyalty, getTierColor, getTierNextThreshold } from '@/hooks/useLoyalty';
import { LoyaltyBadge } from '@/components/loyalty/LoyaltyBadge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { language } = useLanguage();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/checkout');
    }
  }, [loading, user, navigate]);

  const email = user?.email || '';
  const { loyalty, isLoading: loyaltyLoading, transactions } = useLoyalty(email);

  const { data: orders = [] } = useQuery({
    queryKey: ['user-orders', email],
    queryFn: async () => {
      if (!email) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!email,
  });

  const labels = {
    profile: language === 'ar' ? 'حسابي' : 'My Profile',
    welcome: language === 'ar' ? 'مرحباً' : 'Welcome',
    email: language === 'ar' ? 'البريد الإلكتروني' : 'Email',
    loyalty: language === 'ar' ? 'برنامج الولاء' : 'Loyalty Program',
    points: language === 'ar' ? 'نقاطك' : 'Your Points',
    tier: language === 'ar' ? 'المستوى' : 'Tier',
    nextTier: language === 'ar' ? 'المستوى التالي' : 'Next Tier',
    pointsNeeded: language === 'ar' ? 'نقاط للترقية' : 'points to upgrade',
    recentOrders: language === 'ar' ? 'الطلبات الأخيرة' : 'Recent Orders',
    noOrders: language === 'ar' ? 'لا توجد طلبات بعد' : 'No orders yet',
    signOut: language === 'ar' ? 'تسجيل الخروج' : 'Sign Out',
    recentTransactions: language === 'ar' ? 'آخر المعاملات' : 'Recent Transactions',
  };

  if (loading || !user) return null;

  const tierInfo = loyalty ? getTierNextThreshold(loyalty.tier, loyalty.lifetime_points) : null;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <Helmet>
        <title>{`${labels.profile} | Baytzaki`}</title>
      </Helmet>
      <Layout>
        <div className="container py-8 md:py-12 max-w-4xl">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Avatar"
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-8 w-8 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="font-display text-2xl font-bold text-foreground">
                  {labels.welcome}, {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </h1>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
                {loyalty && (
                  <div className="mt-2">
                    <LoyaltyBadge tier={loyalty.tier} points={loyalty.points_balance} />
                  </div>
                )}
              </div>
              <Button variant="outline" onClick={handleSignOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                {labels.signOut}
              </Button>
            </div>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Loyalty Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-border bg-card p-6"
            >
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-foreground">
                <Gift className="h-5 w-5 text-primary" />
                {labels.loyalty}
              </h2>
              
              {loyaltyLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-6 w-32 rounded bg-muted" />
                  <div className="h-4 w-48 rounded bg-muted" />
                </div>
              ) : loyalty ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{labels.points}</span>
                    <span className="text-2xl font-bold text-foreground">{loyalty.points_balance.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{labels.tier}</span>
                    <LoyaltyBadge tier={loyalty.tier} points={loyalty.lifetime_points} size="sm" />
                  </div>
                  {tierInfo && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-muted-foreground">
                        {tierInfo.points > 0
                          ? `${tierInfo.points.toLocaleString()} ${labels.pointsNeeded} → ${tierInfo.next}`
                          : `🎉 ${language === 'ar' ? 'أعلى مستوى!' : 'Top tier!'}`}
                      </p>
                      <div className="mt-2 h-2 rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full bg-primary transition-all`}
                          style={{ width: `${Math.min(100, ((loyalty.lifetime_points) / tierInfo.threshold) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {language === 'ar'
                    ? 'قم بأول طلب لبدء جمع النقاط!'
                    : 'Place your first order to start earning points!'}
                </p>
              )}
            </motion.div>

            {/* Recent Orders */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-border bg-card p-6"
            >
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-semibold text-foreground">
                <ShoppingBag className="h-5 w-5 text-primary" />
                {labels.recentOrders}
              </h2>
              
              {orders.length === 0 ? (
                <p className="text-muted-foreground text-sm">{labels.noOrders}</p>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {order.total.toLocaleString()} {language === 'ar' ? 'ج.م' : 'EGP'}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Recent Transactions */}
          {transactions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 rounded-xl border border-border bg-card p-6"
            >
              <h2 className="mb-4 font-display text-xl font-semibold text-foreground">
                {labels.recentTransactions}
              </h2>
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold ${tx.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {tx.points > 0 ? '+' : ''}{tx.points}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </Layout>
    </>
  );
};

export default Profile;
