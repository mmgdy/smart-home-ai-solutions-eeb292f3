import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function HeroSection() {
  const { t, isRTL } = useLanguage();

  const steps = [
    { num: '01', label: isRTL ? 'أجب على أسئلة بسيطة' : 'Answer Simple Questions' },
    { num: '02', label: isRTL ? 'احصل على خطة ذكية' : 'Get Smart Plan' },
    { num: '03', label: isRTL ? 'اشترِ الأجهزة' : 'Buy Devices' },
    { num: '04', label: isRTL ? 'احجز التركيب' : 'Book Installation' },
  ];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-background">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/3 -right-1/4 w-[70vw] h-[70vw] rounded-full bg-gradient-to-br from-primary/15 via-primary/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/3 -left-1/4 w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-cyan-accent/8 via-transparent to-transparent blur-3xl" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" className="text-foreground" />
        </svg>
      </div>

      <div className="container relative z-10 px-6 md:px-12 pt-28 pb-16">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
          >
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {isRTL ? 'أول منصة ذكاء اصطناعي للمنازل الذكية في مصر' : "Egypt's 1st AI Smart Home Platform"}
            </span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
          >
            <span className="block text-foreground">
              {isRTL ? 'ابني منزلك الذكي' : 'Build Your Smart Home'}
            </span>
            <span className="block text-gradient mt-1">
              {isRTL ? 'في دقائق بالذكاء الاصطناعي' : 'in Minutes with AI'}
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            {isRTL
              ? 'أجب على أسئلة بسيطة → احصل على خطة منزل ذكي → اشترِ الأجهزة → احجز التركيب. بدون خبرة تقنية.'
              : 'Answer a few questions → Get a smart home plan → Buy devices → Book installation. No technical knowledge needed.'}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link to="/ai-consultant">
              <Button
                size="lg"
                className="h-14 px-8 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-full group glow-primary"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                {isRTL ? 'ابدأ مستشار المنزل الذكي' : 'Start Smart Home AI Advisor'}
                <ArrowRight className={cn(
                  "ml-2 h-5 w-5 transition-transform group-hover:translate-x-1",
                  isRTL && "rotate-180 mr-2 ml-0 group-hover:-translate-x-1"
                )} />
              </Button>
            </Link>
            <Link to="/bundles">
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base font-medium rounded-full border-foreground/20 hover:bg-foreground/5"
              >
                {isRTL ? 'تصفح باقات المنزل الذكي' : 'Browse Smart Home Bundles'}
              </Button>
            </Link>
          </motion.div>

          {/* Steps indicator */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto"
          >
            {steps.map((step, i) => (
              <div key={step.num} className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/50">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {step.num}
                </span>
                <span className="text-xs md:text-sm text-muted-foreground font-medium">{step.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Trust strip at bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="absolute bottom-0 left-0 right-0 border-t border-border/50 bg-card/30 backdrop-blur-sm"
      >
        <div className="container px-6 md:px-12 py-4">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success" />
              {isRTL ? '١٠٠٠+ منزل ذكي في مصر' : '1,000+ Smart Homes in Egypt'}
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
              <span className="w-2 h-2 rounded-full bg-primary" />
              {isRTL ? 'تركيب احترافي' : 'Professional Installation'}
            </span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
