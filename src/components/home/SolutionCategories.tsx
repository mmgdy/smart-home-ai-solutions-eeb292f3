import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Lightbulb, Shield, Zap, Thermometer, Blinds, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const categories = [
  {
    icon: Lightbulb,
    nameEn: 'Control Lighting',
    nameAr: 'تحكم في الإضاءة',
    descEn: 'Smart switches, dimmers & RGB bulbs',
    descAr: 'مفاتيح ذكية، دايمر وإضاءة RGB',
    href: '/products?category=lighting',
    color: 'from-yellow-500/20 to-orange-500/10',
  },
  {
    icon: Shield,
    nameEn: 'Secure My Home',
    nameAr: 'أمّن منزلي',
    descEn: 'Cameras, sensors & smart locks',
    descAr: 'كاميرات، حساسات وأقفال ذكية',
    href: '/products?category=security',
    color: 'from-blue-500/20 to-indigo-500/10',
  },
  {
    icon: Zap,
    nameEn: 'Save Electricity',
    nameAr: 'وفّر الكهرباء',
    descEn: 'Smart plugs, meters & scheduling',
    descAr: 'مقابس ذكية، عدادات وجدولة',
    href: '/products?category=energy',
    color: 'from-green-500/20 to-emerald-500/10',
  },
  {
    icon: Thermometer,
    nameEn: 'Control AC Remotely',
    nameAr: 'تحكم في التكييف عن بعد',
    descEn: 'IR controllers & smart thermostats',
    descAr: 'ريموت ذكي وترموستات',
    href: '/products?category=climate',
    color: 'from-cyan-500/20 to-teal-500/10',
  },
  {
    icon: Blinds,
    nameEn: 'Smart Curtains',
    nameAr: 'ستائر ذكية',
    descEn: 'Motorized curtains & blinds',
    descAr: 'ستائر كهربائية وأوتوماتيكية',
    href: '/products?category=curtains',
    color: 'from-purple-500/20 to-pink-500/10',
  },
  {
    icon: Home,
    nameEn: 'Full Smart Home Kits',
    nameAr: 'باقات المنزل الذكي الكاملة',
    descEn: 'Everything you need in one bundle',
    descAr: 'كل ما تحتاجه في باقة واحدة',
    href: '/bundles',
    color: 'from-primary/20 to-cyan-accent/10',
  },
];

export function SolutionCategories() {
  const { isRTL } = useLanguage();

  return (
    <section className="py-20 bg-card/50">
      <div className="container px-6 md:px-12">
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-primary font-medium text-sm uppercase tracking-wider"
          >
            {isRTL ? 'ماذا تريد تحقيقه؟' : 'What do you want to achieve?'}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2"
          >
            {isRTL ? 'حلول المنزل الذكي' : 'Smart Home Solutions'}
          </motion.h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {categories.map((cat, index) => (
            <motion.div
              key={cat.nameEn}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={cat.href}
                className={cn(
                  "group flex items-start gap-4 p-5 rounded-xl border border-border bg-gradient-to-br hover:border-primary/40 transition-all duration-300",
                  cat.color
                )}
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <cat.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {isRTL ? cat.nameAr : cat.nameEn}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? cat.descAr : cat.descEn}
                  </p>
                </div>
                <ArrowRight className={cn(
                  "h-4 w-4 text-muted-foreground group-hover:text-primary transition-all mt-1",
                  isRTL && "rotate-180"
                )} />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
