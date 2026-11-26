import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Lightbulb, Shield, Zap, Thermometer, Blinds, Home } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Hub, Padlock, Plug, Relay, Router, Stack } from '@/components/ui/hairline';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';

const categories = [
  {
    icon: Lightbulb,
    Figure: Relay,
    nameEn: 'Control Lighting',
    nameAr: 'تحكم في الإضاءة',
    descEn: 'Smart switches, dimmers & RGB bulbs',
    descAr: 'مفاتيح ذكية، دايمر وإضاءة RGB',
    href: '/products?category=lighting',
    color: 'from-yellow-500/20 to-orange-500/10',
  },
  {
    icon: Shield,
    Figure: Padlock,
    nameEn: 'Secure My Home',
    nameAr: 'أمّن منزلي',
    descEn: 'Cameras, sensors & smart locks',
    descAr: 'كاميرات، حساسات وأقفال ذكية',
    href: '/products?category=security',
    color: 'from-blue-500/20 to-indigo-500/10',
  },
  {
    icon: Zap,
    Figure: Plug,
    nameEn: 'Save Electricity',
    nameAr: 'وفّر الكهرباء',
    descEn: 'Smart plugs, meters & scheduling',
    descAr: 'مقابس ذكية، عدادات وجدولة',
    href: '/products?category=energy',
    color: 'from-green-500/20 to-emerald-500/10',
  },
  {
    icon: Thermometer,
    Figure: Router,
    nameEn: 'Control AC Remotely',
    nameAr: 'تحكم في التكييف عن بعد',
    descEn: 'IR controllers & smart thermostats',
    descAr: 'ريموت ذكي وترموستات',
    href: '/products?category=climate',
    color: 'from-cyan-500/20 to-teal-500/10',
  },
  {
    icon: Blinds,
    Figure: Stack,
    nameEn: 'Smart Curtains',
    nameAr: 'ستائر ذكية',
    descEn: 'Motorized curtains & blinds',
    descAr: 'ستائر كهربائية وأوتوماتيكية',
    href: '/products?category=curtains',
    color: 'from-purple-500/20 to-pink-500/10',
  },
  {
    icon: Home,
    Figure: Hub,
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
  const { shouldAutoPlay } = useMotionPreferences();

  return (
    <section className="py-20 bg-card/50 relative overflow-hidden">
      <div className="container px-6 md:px-12">
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            className="text-primary font-medium text-sm uppercase tracking-wider"
          >
            {isRTL ? 'ماذا تريد تحقيقه؟' : 'What do you want to achieve?'}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2"
          >
            {isRTL ? 'حلول المنزل الذكي' : 'Smart Home Solutions'}
          </motion.h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {categories.map((cat, index) => {
            const Figure = cat.Figure;
            return (
              <motion.div
                key={cat.nameEn}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={cat.href}
                  className={cn(
                    "group flex items-center gap-3.5 p-4 sm:p-5 rounded-xl border border-border bg-gradient-to-br hover:border-teal-400/50 hover:shadow-[0_12px_36px_-16px_rgba(45,212,191,0.35)] transition-all duration-300",
                    cat.color
                  )}
                >
                  <div className="w-20 sm:w-24 shrink-0 rounded-xl azka-navy-stage border border-teal-400/20 p-1.5 shadow-sm">
                    <Figure
                      variant="navy"
                      intensity={0.6}
                      play={shouldAutoPlay}
                      label={isRTL ? cat.nameAr : cat.nameEn}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <cat.icon className="w-4 h-4 text-primary shrink-0" />
                      <h3 className="font-display text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {isRTL ? cat.nameAr : cat.nameEn}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {isRTL ? cat.descAr : cat.descEn}
                    </p>
                  </div>
                  <ArrowRight className={cn(
                    "h-4 w-4 text-muted-foreground group-hover:text-primary transition-all shrink-0",
                    isRTL && "rotate-180"
                  )} />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
