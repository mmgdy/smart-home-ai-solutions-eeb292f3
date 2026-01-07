import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function HeroSection() {
  const { t, isRTL } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Geometric overlays */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large gradient circle */}
        <div className="absolute -top-1/4 -right-1/4 w-[80vw] h-[80vw] rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-cyan-accent/10 via-transparent to-transparent blur-3xl" />
        
        {/* Geometric lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" className="text-foreground" />
        </svg>
        
        {/* Diagonal accent line */}
        <div className="absolute top-0 right-0 w-px h-[70vh] bg-gradient-to-b from-transparent via-primary/50 to-transparent transform rotate-12 translate-x-[30vw]" />
      </div>

      <div className="container relative z-10 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          {/* Small label */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <span className="text-sm md:text-base tracking-[0.3em] uppercase text-muted-foreground font-medium">
              {t('aiPoweredSolutions')}
            </span>
          </motion.div>

          {/* Main headline - Blocksgroup style large typography */}
          <motion.h1 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold tracking-tight leading-[0.9] mb-8"
          >
            <span className="block text-foreground">{t('makeHomeSmarter')}</span>
            <span className="block text-gradient mt-2">{t('smarter')}</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mb-12 leading-relaxed"
          >
            {t('heroDescription')}
          </motion.p>

          {/* CTAs - Blocksgroup style with white/outlined buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 sm:gap-6"
          >
            <Link to="/ai-consultant">
              <Button 
                size="lg" 
                className="h-14 px-8 text-base font-medium bg-foreground text-background hover:bg-foreground/90 rounded-full group"
              >
                {t('buildSmartHome')}
                <ArrowRight className={cn(
                  "ml-2 h-5 w-5 transition-transform group-hover:translate-x-1",
                  isRTL && "rotate-180 mr-2 ml-0 group-hover:-translate-x-1"
                )} />
              </Button>
            </Link>
            <Link to="/products">
              <Button 
                size="lg" 
                variant="outline"
                className="h-14 px-8 text-base font-medium rounded-full border-foreground/20 hover:bg-foreground/5"
              >
                {t('browseProducts')}
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Bottom scroll indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground">Scroll</span>
          <div className="w-px h-16 bg-gradient-to-b from-foreground/50 to-transparent animate-pulse" />
        </div>
      </motion.div>
    </section>
  );
}
