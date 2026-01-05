import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Zap, Shield, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-cyan-accent/10 blur-3xl" />

      <div className="container relative py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm animate-fade-in">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-primary">AI-Powered Smart Home Solutions</span>
          </div>

          {/* Heading */}
          <h1 className="mb-6 font-display text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Make Your Home{' '}
            <span className="text-gradient">Smarter</span>
          </h1>

          {/* Subheading */}
          <p className="mb-10 text-lg text-muted-foreground md:text-xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Discover premium smart home products and get personalized recommendations from our AI consultant. 
            Transform your living space with cutting-edge technology.
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link to="/ai-consultant">
              <Button size="lg" className="gap-2 glow-primary">
                <Sparkles className="h-5 w-5" />
                Build Your Smart Home
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/products">
              <Button size="lg" variant="outline" className="gap-2">
                Browse Products
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mx-auto mt-20 grid max-w-5xl gap-6 md:grid-cols-3 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          {[
            { icon: Zap, title: 'Smart Lighting', desc: 'Control ambiance with voice & app' },
            { icon: Shield, title: 'Home Security', desc: 'Keep your home safe 24/7' },
            { icon: Thermometer, title: 'Climate Control', desc: 'Optimize comfort & energy' },
          ].map((feature, i) => (
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
