import { Link } from 'react-router-dom';
import { ArrowRight, Bot, Lightbulb, Cpu, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function AIConsultantCTA() {
  const { t, isRTL } = useLanguage();

  const features = [
    { icon: Bot, title: 'Personalized Advice', desc: 'AI analyzes your needs' },
    { icon: Lightbulb, title: 'Smart Recommendations', desc: 'Get the perfect products' },
    { icon: Cpu, title: 'Compatibility Check', desc: 'All devices work together' },
    { icon: Zap, title: 'Instant Setup', desc: 'One-click bundles' },
  ];

  return (
    <section className="py-32 bg-card relative overflow-hidden">
      {/* Geometric background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] rounded-full border border-border/30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] rounded-full border border-border/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] rounded-full border border-border/10" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent" />
      </div>

      <div className="container relative z-10 px-6 md:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left content */}
          <div>
            <motion.span 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-sm tracking-[0.3em] uppercase text-primary font-medium block mb-4"
            >
              {t('aiConsultant')}
            </motion.span>
            
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
            >
              Not Sure Where to Start?
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed"
            >
              Our AI Smart Home Consultant analyzes your needs and builds a personalized 
              solution package. Just tell us about your home, and we'll do the rest.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Link to="/ai-consultant">
                <Button 
                  size="lg" 
                  className="h-14 px-8 text-base font-medium bg-foreground text-background hover:bg-foreground/90 rounded-full group"
                >
                  Start AI Consultation
                  <ArrowRight className={cn(
                    "ml-2 h-5 w-5 transition-transform group-hover:translate-x-1",
                    isRTL && "rotate-180 mr-2 ml-0 group-hover:-translate-x-1"
                  )} />
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Right - Feature grid */}
          <div className="grid grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index }}
                className="group p-6 rounded-2xl bg-background/50 border border-border/50 hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
