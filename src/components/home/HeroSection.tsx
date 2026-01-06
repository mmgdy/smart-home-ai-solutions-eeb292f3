import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Zap, Shield, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function HeroSection() {
  const { t, isRTL } = useLanguage();

  const features = [
    { icon: Zap, title: t('smartLighting'), desc: t('smartLightingDesc') },
    { icon: Shield, title: t('homeSecurity'), desc: t('homeSecurityDesc') },
    { icon: Thermometer, title: t('climateControl'), desc: t('climateControlDesc') },
  ];

  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 hero-gradient" />
      <div className={cn(
        "absolute -top-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl",
        isRTL ? "-right-40" : "-left-40"
      )} />
      <div className={cn(
        "absolute -bottom-40 h-80 w-80 rounded-full bg-cyan-accent/10 blur-3xl",
        isRTL ? "-left-40" : "-right-40"
      )} />

      <div className="container relative py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm animate-fade-in">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-primary">{t('aiPoweredSolutions')}</span>
          </div>

          {/* Heading */}
          <h1 className="mb-6 font-display text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {t('makeHomeSmarter')}{' '}
            <span className="text-gradient">{t('smarter')}</span>
          </h1>

          {/* Subheading */}
          <p className="mb-10 text-lg text-muted-foreground md:text-xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {t('heroDescription')}
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link to="/ai-consultant">
              <Button size="lg" className="gap-2 glow-primary">
                <Sparkles className="h-5 w-5" />
                {t('buildSmartHome')}
                <ArrowRight className={cn("h-4 w-4", isRTL && "rotate-180")} />
              </Button>
            </Link>
            <Link to="/products">
              <Button size="lg" variant="outline" className="gap-2">
                {t('browseProducts')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mx-auto mt-20 grid max-w-5xl gap-6 md:grid-cols-3 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-border bg-card/50 p-6 backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-card"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
