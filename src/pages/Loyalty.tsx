import { Helmet } from 'react-helmet-async';
import { Gift, Star, Crown, Award, Medal, TrendingUp, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { LoyaltyWidget } from '@/components/loyalty/LoyaltyWidget';
import { useLanguage } from '@/lib/i18n';

const Loyalty = () => {
  const { language } = useLanguage();

  const labels = {
    pageTitle: language === 'ar' ? 'برنامج الولاء' : 'Loyalty Program',
    pageDesc: language === 'ar' 
      ? 'اكسب نقاط مع كل طلب واستمتع بمكافآت حصرية'
      : 'Earn points with every order and enjoy exclusive rewards',
    howItWorks: language === 'ar' ? 'كيف يعمل البرنامج' : 'How It Works',
    shopAndEarn: language === 'ar' ? 'تسوق واكسب' : 'Shop & Earn',
    shopAndEarnDesc: language === 'ar' 
      ? 'اكسب نقطة واحدة لكل 10 ج.م تنفقها'
      : 'Earn 1 point for every 10 EGP you spend',
    levelUp: language === 'ar' ? 'ارتقِ بمستواك' : 'Level Up',
    levelUpDesc: language === 'ar'
      ? 'اجمع المزيد من النقاط للوصول إلى مستويات أعلى'
      : 'Collect more points to reach higher tiers',
    enjoyRewards: language === 'ar' ? 'استمتع بالمكافآت' : 'Enjoy Rewards',
    enjoyRewardsDesc: language === 'ar'
      ? 'استبدل نقاطك بخصومات ومكافآت حصرية'
      : 'Redeem your points for discounts and exclusive rewards',
    tierBenefits: language === 'ar' ? 'مزايا المستويات' : 'Tier Benefits',
    bronze: language === 'ar' ? 'برونزي' : 'Bronze',
    bronzeDesc: language === 'ar' ? 'مستوى البداية' : 'Starting tier',
    silver: language === 'ar' ? 'فضي' : 'Silver',
    silverDesc: language === 'ar' ? '1,000+ نقطة' : '1,000+ points',
    gold: language === 'ar' ? 'ذهبي' : 'Gold',
    goldDesc: language === 'ar' ? '5,000+ نقطة' : '5,000+ points',
    platinum: language === 'ar' ? 'بلاتيني' : 'Platinum',
    platinumDesc: language === 'ar' ? '10,000+ نقطة' : '10,000+ points',
    checkYourPoints: language === 'ar' ? 'تحقق من نقاطك' : 'Check Your Points',
  };

  const tiers = [
    { 
      name: labels.bronze, 
      desc: labels.bronzeDesc, 
      icon: Medal, 
      color: 'from-orange-600 to-orange-500',
      benefits: language === 'ar' 
        ? ['اكسب نقاط على كل طلب', 'عروض حصرية'] 
        : ['Earn points on every order', 'Exclusive offers']
    },
    { 
      name: labels.silver, 
      desc: labels.silverDesc, 
      icon: Award, 
      color: 'from-gray-400 to-gray-300',
      benefits: language === 'ar'
        ? ['كل مزايا البرونزي', 'مضاعفة النقاط 1.25x']
        : ['All Bronze benefits', '1.25x points multiplier']
    },
    { 
      name: labels.gold, 
      desc: labels.goldDesc, 
      icon: Star, 
      color: 'from-yellow-500 to-amber-400',
      benefits: language === 'ar'
        ? ['كل مزايا الفضي', 'مضاعفة النقاط 1.5x', 'شحن مجاني']
        : ['All Silver benefits', '1.5x points multiplier', 'Free shipping']
    },
    { 
      name: labels.platinum, 
      desc: labels.platinumDesc, 
      icon: Crown, 
      color: 'from-slate-400 to-slate-300',
      benefits: language === 'ar'
        ? ['كل مزايا الذهبي', 'مضاعفة النقاط 2x', 'أولوية الدعم', 'عروض VIP']
        : ['All Gold benefits', '2x points multiplier', 'Priority support', 'VIP offers']
    },
  ];

  const steps = [
    { icon: ShoppingBag, title: labels.shopAndEarn, desc: labels.shopAndEarnDesc },
    { icon: TrendingUp, title: labels.levelUp, desc: labels.levelUpDesc },
    { icon: Gift, title: labels.enjoyRewards, desc: labels.enjoyRewardsDesc },
  ];

  return (
    <>
      <Helmet>
        <title>{`${labels.pageTitle} | Baytzaki`}</title>
        <meta name="description" content={labels.pageDesc} />
      </Helmet>
      <Layout>
        <div className="container py-8 md:py-12">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 text-center"
          >
            <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-4">
              <Gift className="h-8 w-8 text-primary" />
            </div>
            <h1 className="mb-4 font-display text-3xl font-bold text-foreground md:text-4xl">
              {labels.pageTitle}
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              {labels.pageDesc}
            </p>
          </motion.div>

          {/* How It Works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-12"
          >
            <h2 className="mb-8 text-center font-display text-2xl font-semibold text-foreground">
              {labels.howItWorks}
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  className="flex flex-col items-center rounded-xl border border-border bg-card p-6 text-center"
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Tier Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="mb-8 text-center font-display text-2xl font-semibold text-foreground">
              {labels.tierBenefits}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tiers.map((tier, index) => (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className={`mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${tier.color} px-3 py-1.5 text-sm font-medium`}>
                    <tier.icon className="h-4 w-4" />
                    {tier.name}
                  </div>
                  <p className="mb-3 text-sm text-muted-foreground">{tier.desc}</p>
                  <ul className="space-y-2">
                    {tier.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-center gap-2 text-sm text-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Check Points Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mx-auto max-w-xl"
          >
            <h2 className="mb-6 text-center font-display text-2xl font-semibold text-foreground">
              {labels.checkYourPoints}
            </h2>
            <LoyaltyWidget />
          </motion.div>
        </div>
      </Layout>
    </>
  );
};

export default Loyalty;
