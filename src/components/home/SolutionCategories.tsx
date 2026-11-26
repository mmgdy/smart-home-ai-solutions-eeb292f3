import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Lightbulb, Shield, Zap, Thermometer, Blinds, Home } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { AzkaBentoCard } from '@/components/vengeance/AzkaBentoCard';
import { BorderBeam } from '@/components/vengeance/BorderBeam';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';

const categories = [
  {
    icon: Lightbulb,
    nameEn: 'Control Lighting',
    nameAr: 'تحكم في الإضاءة',
    descEn: 'Smart switches, dimmers & RGB bulbs',
    descAr: 'مفاتيح ذكية، دايمر وإضاءة RGB',
    href: '/products?category=lighting',
    spanClass: 'col-span-1 md:col-span-3',
    glowClass: 'from-amber-400/15 via-teal-400/5 to-transparent',
    iconTone: 'text-amber-400',
  },
  {
    icon: Shield,
    nameEn: 'Secure My Home',
    nameAr: 'أمّن منزلي',
    descEn: 'Cameras, sensors & smart locks',
    descAr: 'كاميرات، حساسات وأقفال ذكية',
    href: '/products?category=security',
    spanClass: 'col-span-1 md:col-span-3',
    glowClass: 'from-sky-400/15 via-blue-500/5 to-transparent',
    iconTone: 'text-sky-400',
  },
  {
    icon: Zap,
    nameEn: 'Save Electricity',
    nameAr: 'وفّر الكهرباء',
    descEn: 'Smart plugs, meters & scheduling',
    descAr: 'مقابس ذكية، عدادات وجدولة',
    href: '/products?category=energy',
    spanClass: 'col-span-1 md:col-span-2',
    glowClass: 'from-emerald-400/15 via-teal-500/5 to-transparent',
    iconTone: 'text-emerald-400',
  },
  {
    icon: Thermometer,
    nameEn: 'Control AC Remotely',
    nameAr: 'تحكم في التكييف عن بعد',
    descEn: 'IR controllers & smart thermostats',
    descAr: 'ريموت ذكي وترموستات',
    href: '/products?category=climate',
    spanClass: 'col-span-1 md:col-span-2',
    glowClass: 'from-cyan-400/15 via-sky-500/5 to-transparent',
    iconTone: 'text-cyan-400',
  },
  {
    icon: Blinds,
    nameEn: 'Smart Curtains',
    nameAr: 'ستائر ذكية',
    descEn: 'Motorized curtains & blinds',
    descAr: 'ستائر كهربائية وأوتوماتيكية',
    href: '/products?category=curtains',
    spanClass: 'col-span-2 md:col-span-2',
    glowClass: 'from-violet-400/15 via-indigo-500/5 to-transparent',
    iconTone: 'text-violet-400',
  },
  {
    icon: Home,
    nameEn: 'Full Smart Home Kits',
    nameAr: 'باقات المنزل الذكي الكاملة',
    descEn: 'Everything you need in one bundle',
    descAr: 'كل ما تحتاجه في باقة واحدة',
    href: '/bundles',
    spanClass: 'col-span-2 md:col-span-6',
    glowClass: 'from-teal-400/20 via-cyan-500/10 to-blue-500/10',
    iconTone: 'text-primary',
    featured: true,
  },
];

export function SolutionCategories() {
  const { isRTL } = useLanguage();
  const { reducedMotion } = useMotionPreferences();

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <div className="container px-4 sm:px-6 md:px-12">
        <div className="text-center mb-12">
          <motion.span
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center px-3.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary font-semibold text-xs uppercase tracking-[0.18em]"
          >
            {isRTL ? 'ماذا تريد تحقيقه؟' : 'What do you want to achieve?'}
          </motion.span>
          <motion.h2
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: reducedMotion ? 0 : 0.08 }}
            className="font-display text-3xl md:text-4xl font-bold text-foreground mt-3"
          >
            {isRTL ? 'حلول المنزل الذكي' : 'Smart Home Solutions'}
          </motion.h2>
        </div>

        {/* Vengeance Asymmetric Bento Grid */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4 max-w-5xl mx-auto">
          {categories.map((cat, index) => (
            <AzkaBentoCard key={cat.nameEn} delay={index * 0.04} className={cat.spanClass}>
              {cat.featured && (
                <BorderBeam size={180} duration={11} borderWidth={1.5} colorFrom="#2DD4BF" colorTo="#8B5CF6" />
              )}
              <Link
                to={cat.href}
                className={cn(
                  'group relative flex items-center gap-3.5 sm:gap-4 p-4 sm:p-5 h-full min-h-[100px] bg-gradient-to-br transition-all',
                  cat.glowClass,
                  cat.featured && 'sm:p-6 justify-between',
                )}
              >
                <div className="azka-gradient-ring flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-background/70 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <cat.icon className={cn('w-5 h-5 sm:w-6 sm:h-6', cat.iconTone)} />
                </div>
                <div className="flex-1 min-w-0 text-start">
                  <h3 className="font-display text-sm sm:text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {isRTL ? cat.nameAr : cat.nameEn}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {isRTL ? cat.descAr : cat.descEn}
                  </p>
                </div>
                <ArrowRight
                  className={cn(
                    'h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0',
                    isRTL && 'rotate-180 group-hover:-translate-x-1',
                  )}
                />
              </Link>
            </AzkaBentoCard>
          ))}
        </div>
      </div>
    </section>
  );
}
