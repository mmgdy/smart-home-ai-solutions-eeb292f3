import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import heroBg from '@/assets/hero-bg.jpg';
import { useSiteInfo } from '@/hooks/useSiteInfo';

const HERO_VIDEO = '/hero-loop.mp4';

export function HeroSection() {
  const { isRTL } = useLanguage();
  const { get } = useSiteInfo();

  const headline = get('hero', isRTL ? 'headline_ar' : 'headline_en',
    isRTL ? 'اشعر بسحر البيت الذكي' : 'Feel the magic of a Smarter Home');
  const subheadline = get('hero', isRTL ? 'subheadline_ar' : 'subheadline_en',
    isRTL
      ? 'إضاءة، أمان، تحكم — بضغطة واحدة. منتجات أصلية، تركيب احترافي، ودفع عند الاستلام.'
      : 'Lighting, security, control — in one tap. Genuine products, expert installation, cash on delivery.');
  const ctaLabel = get('hero', isRTL ? 'cta_ar' : 'cta_en',
    isRTL ? 'ابدأ بناء بيتك الذكي' : 'Start Building Your Smart Home');

  const steps = [
    { num: '01', label: isRTL ? 'احكيلنا عن بيتك' : 'Tell us about your home' },
    { num: '02', label: isRTL ? 'استلم خطتك' : 'Get your plan' },
    { num: '03', label: isRTL ? 'اشترِ الأجهزة' : 'Order devices' },
    { num: '04', label: isRTL ? 'احجز التركيب' : 'Book install' },
  ];

  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden">
      {/* Cinematic hook — looping video background */}
      <div className="absolute inset-0">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster={heroBg}
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
        {/* Image fallback that always renders behind the video */}
        <img
          src={heroBg}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover -z-10"
        />
        {/* Color overlays for legibility + brand vibe */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/55 to-background/95" />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-warning/15 mix-blend-overlay" />
        {/* Animated shimmer accents */}
        <motion.div
          aria-hidden
          className="absolute -top-40 -right-32 h-[60vw] w-[60vw] rounded-full bg-gradient-to-br from-primary/30 via-cyan-500/15 to-transparent blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-40 -left-32 h-[55vw] w-[55vw] rounded-full bg-gradient-to-tr from-warning/25 via-primary/10 to-transparent blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="container relative z-10 px-6 md:px-12 pt-28 pb-24">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/40 backdrop-blur-md border border-primary/30 mb-8 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)]"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-sm font-medium text-foreground">
              {isRTL ? 'منزلك الذكي يبدأ من هنا' : 'Your smart home starts here'}
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-6"
          >
            <span className="block text-foreground drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)]">
              {headline}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="text-lg md:text-xl text-foreground/85 max-w-2xl mx-auto mb-10 leading-relaxed font-medium drop-shadow-[0_1px_8px_rgba(0,0,0,0.4)]"
          >
            {subheadline}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
          >
            <Link to="/bundles">
              <Button
                size="lg"
                className="h-14 px-10 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-full group glow-primary shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.7)]"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                {ctaLabel}
                <ArrowRight className={cn(
                  'ml-2 h-5 w-5 transition-transform group-hover:translate-x-1',
                  isRTL && 'rotate-180 mr-2 ml-0 group-hover:-translate-x-1'
                )} />
              </Button>
            </Link>
            <Link to="/products">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base font-medium rounded-full border-foreground/30 bg-background/30 backdrop-blur-md hover:bg-background/50 text-foreground"
              >
                <Play className="mr-2 h-4 w-4 fill-current" />
                {isRTL ? 'تصفح المنتجات' : 'Browse Products'}
              </Button>
            </Link>
          </motion.div>

          {/* Steps indicator */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto"
          >
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                whileHover={{ y: -4 }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-card/40 backdrop-blur-md border border-border/50"
              >
                <span className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center text-xs font-bold text-primary-foreground shadow-lg">
                  {step.num}
                </span>
                <span className="text-xs md:text-sm text-foreground/90 font-medium text-left">
                  {step.label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Trust strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.9 }}
        className="absolute bottom-0 left-0 right-0 border-t border-border/40 bg-background/60 backdrop-blur-xl z-10"
      >
        <div className="container px-6 md:px-12 py-3">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-foreground/80">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              {isRTL ? '١٠٠٠+ منزل ذكي في مصر' : '1,000+ Smart Homes'}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              {isRTL ? 'الدفع عند الاستلام' : 'Cash on Delivery'}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning" />
              {isRTL ? 'ضمان رسمي' : 'Official Warranty'}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              {isRTL ? 'تركيب احترافي' : 'Pro Installation'}
            </span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
