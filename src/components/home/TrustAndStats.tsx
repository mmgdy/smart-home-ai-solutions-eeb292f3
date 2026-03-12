import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { Shield, Truck, Award, Headphones, Wrench, Zap } from 'lucide-react';

export const TrustAndStats = () => {
  const { isRTL } = useLanguage();

  const trustItems = [
    {
      icon: Shield,
      title: isRTL ? 'ضمان رسمي' : 'Official Warranty',
      desc: isRTL ? 'ضمان ٢ سنة على جميع المنتجات' : '2-year warranty on all products',
    },
    {
      icon: Truck,
      title: isRTL ? 'الدفع عند الاستلام' : 'Cash on Delivery',
      desc: isRTL ? 'ادفع عند استلام المنتج بباب بيتك' : 'Pay when you receive it at your door',
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
    { value: '1,000+', label: isRTL ? 'منزل ذكي في مصر' : 'Smart Homes in Egypt' },
    { value: '5,000+', label: isRTL ? 'جهاز مُركّب' : 'Devices Installed' },
    { value: '50+', label: isRTL ? 'مشروع كمبوند' : 'Compound Projects' },
    { value: '4.9★', label: isRTL ? 'تقييم العملاء' : 'Customer Rating' },
  ];

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/3 via-transparent to-transparent" />

      <div className="container relative z-10 px-6 md:px-12">
        {/* Section header */}
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-primary font-medium text-sm uppercase tracking-wider"
          >
            {isRTL ? 'ليه بيتزكي' : 'Why Baytzaki'}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4"
          >
            {isRTL ? 'شريكك الموثوق للمنزل الذكي' : 'Your Trusted Smart Home Partner'}
          </motion.h2>
        </div>

        {/* Trust grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto mb-16">
          {trustItems.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
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
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto p-8 rounded-2xl bg-card border border-border"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-display text-2xl md:text-3xl font-bold text-primary mb-1">
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
