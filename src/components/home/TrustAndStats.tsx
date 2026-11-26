import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { Shield, Truck, Award, Headphones, Wrench, Zap } from 'lucide-react';
import { AzkaBentoCard } from '@/components/vengeance/AzkaBentoCard';
import { BorderBeam } from '@/components/vengeance/BorderBeam';
import { StatsCounter } from '@/components/vengeance/StatsCounter';
import { AnimatedTooltip } from '@/components/vengeance/AnimatedTooltip';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';

export const TrustAndStats = () => {
  const { isRTL } = useLanguage();
  const { reducedMotion } = useMotionPreferences();

  const trustItems = [
    {
      icon: Shield,
      title: isRTL ? 'ضمان رسمي' : 'Official Warranty',
      desc: isRTL ? 'ضمان لمدة سنة على جميع المنتجات' : '1-year warranty on all products',
    },
    {
      icon: Truck,
      title: isRTL ? 'شحن لكل مصر' : 'Nationwide Shipping',
      desc: isRTL ? 'توصيل سريع وآمن لباب بيتك' : 'Fast & safe delivery to your door',
    },
    {
      icon: Wrench,
      title: isRTL ? 'تركيب احترافي' : 'Professional Installation',
      desc: isRTL ? 'فنيون معتمدون يركبون لك كل شيء' : 'Certified technicians install everything',
    },
    {
      icon: Headphones,
      title: isRTL ? 'دعم ٢٤/٧' : '24/7 Support',
      desc: isRTL ? 'دعم فني على مدار الساعة عبر واتساب' : 'Round-the-clock WhatsApp support',
    },
    {
      icon: Zap,
      title: isRTL ? 'وفر الكهرباء' : 'Save Electricity',
      desc: isRTL ? 'وفر حتى ٣٠٪ من فاتورة الكهرباء' : 'Save up to 30% on electricity bills',
    },
    {
      icon: Award,
      title: isRTL ? 'علامات تجارية أصلية' : 'Genuine Brands',
      desc: isRTL ? 'منتجات أصلية من أفضل العلامات العالمية' : 'Authentic products from top global brands',
    },
  ];

  const stats = [
    {
      value: 1000,
      suffix: '+',
      decimals: 0,
      label: isRTL ? 'منزل ذكي في مصر' : 'Smart Homes in Egypt',
      tip: isRTL ? 'شقق وفيلات ومشاريع سكنية مجهزة بالكامل' : 'Apartments, villas & compounds powered by AzkaSmart',
    },
    {
      value: 5000,
      suffix: '+',
      decimals: 0,
      label: isRTL ? 'جهاز مُركّب' : 'Devices Installed',
      tip: isRTL ? 'مفاتيح، أقفال، كاميرات وحساسات أصلية' : 'Switches, locks, cameras & sensors installed',
    },
    {
      value: 50,
      suffix: '+',
      decimals: 0,
      label: isRTL ? 'مشروع كمبوند' : 'Compound Projects',
      tip: isRTL ? 'تغطية شاملة بالقاهرة الجديدة والشيخ زايد والإسكندرية' : 'Serving New Cairo, Sheikh Zayed & nationwide',
    },
    {
      value: 4.9,
      suffix: '★',
      decimals: 1,
      label: isRTL ? 'تقييم العملاء' : 'Customer Rating',
      tip: isRTL ? 'رضا عملاء مرتفع مع دعم فني مستمر' : 'Top customer satisfaction & after-sales support',
    },
  ];

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div className="container relative z-10 px-6 md:px-12">
        {/* Section header */}
        <div className="text-center mb-12">
          <motion.span
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center px-3.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary font-semibold text-xs uppercase tracking-[0.16em]"
          >
            {isRTL ? 'ليه أزكاسمارت' : 'Why AzkaSmart'}
          </motion.span>
          <motion.h2
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: reducedMotion ? 0 : 0.08 }}
            className="font-display text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4"
          >
            {isRTL ? 'شريكك الموثوق للمنزل الذكي' : 'Your Trusted Smart Home Partner'}
          </motion.h2>
        </div>

        {/* Trust grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto mb-14">
          {trustItems.map((item, index) => (
            <AzkaBentoCard key={item.title} delay={index * 0.04}>
              <div className="flex items-start gap-4 p-5">
                <div className="azka-gradient-ring flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            </AzkaBentoCard>
          ))}
        </div>

        {/* Vengeance Stats Bar with BorderBeam + StatsCounter + AnimatedTooltip */}
        <div className="azka-bento relative grid grid-cols-2 md:grid-cols-4 gap-6 max-w-7xl mx-auto p-7 sm:p-8">
          <BorderBeam size={200} duration={14} borderWidth={1.5} colorFrom="#2DD4BF" colorTo="#3B82F6" />
          {stats.map((stat, idx) => (
            <div key={stat.label} className="text-center relative z-10">
              <AnimatedTooltip content={stat.tip} variant={idx % 2 === 0 ? 'smaug' : 'indis'}>
                <div className="font-display text-2xl md:text-3xl font-bold azka-gradient-text mb-1">
                  <StatsCounter value={stat.value} decimals={stat.decimals} suffix={stat.suffix} />
                </div>
              </AnimatedTooltip>
              <div className="text-xs text-muted-foreground font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
