import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Wifi, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { defaultBundles, normalizeBundles } from '@/lib/bundles';
import { supabase } from '@/integrations/supabase/client';

export function SmartBundles() {
  const { isRTL, formatPrice } = useLanguage();
  const [displayBundles, setDisplayBundles] = useState(normalizeBundles(defaultBundles).slice(0, 4));

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('site_info')
        .select('value')
        .eq('section', 'bundles')
        .eq('key', 'list')
        .maybeSingle();
      if (!data?.value) return;
      try {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed) && parsed.length) setDisplayBundles(normalizeBundles(parsed).slice(0, 4));
      } catch {
        // Keep built-in bundles as fallback.
      }
    })();
  }, []);

  return (
    <section className="py-20 bg-card/30">
      <div className="container px-6 md:px-12">
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-primary font-medium text-sm uppercase tracking-wider"
          >
            {isRTL ? 'وفّر أكثر مع الباقات' : 'Save More with Bundles'}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2 mb-3"
          >
            {isRTL ? 'باقات المنزل الذكي الجاهزة' : 'Ready-Made Smart Home Bundles'}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-muted-foreground max-w-xl mx-auto"
          >
            {isRTL
              ? 'باقات متكاملة بأسعار حقيقية مدروسة مع خيار التركيب المعتمد وضمان رسمي'
              : 'Complete smart home bundles with real catalog prices, certified installation & warranty'}
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {displayBundles.map((bundle, index) => {
            const discount = Math.round(((bundle.originalPrice - bundle.priceEgp) / bundle.originalPrice) * 100);
            return (
              <motion.div
                key={bundle.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "relative rounded-2xl border bg-card p-6 transition-all hover:border-primary/40",
                  bundle.popular ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
                )}
              >
                {bundle.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary rounded-full text-xs font-bold text-primary-foreground">
                    {isRTL ? 'الأكثر مبيعاً' : 'Most Popular'}
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      {isRTL ? bundle.nameAr : bundle.nameEn}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {isRTL ? 'صعوبة التركيب:' : 'Install difficulty:'}
                      </span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={cn(
                              "w-4 h-1.5 rounded-full",
                              level <= bundle.difficulty ? "bg-primary" : "bg-border"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl font-bold text-foreground">
                      {formatPrice(bundle.priceEgp)}
                    </div>
                    <div className="text-sm text-muted-foreground line-through">
                      {formatPrice(bundle.originalPrice)}
                    </div>
                    <span className="text-xs font-semibold text-success">-{discount}%</span>
                  </div>
                </div>

                {/* Devices list */}
                <div className="grid grid-cols-2 gap-1.5 mb-4">
                  {(isRTL ? bundle.devicesAr : bundle.devicesEn).map((device) => (
                    <div key={device} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-primary flex-shrink-0" />
                      <span>{device}</span>
                    </div>
                  ))}
                </div>

                {/* Savings */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 mb-4">
                  <Wifi className="h-3 w-3 text-success" />
                  <span className="text-xs font-medium text-success">
                    {isRTL ? bundle.savingsAr : bundle.savingsEn}
                  </span>
                </div>

                {/* Badges */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {bundle.badges.map((badge) => (
                      <span key={badge} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                        {badge}
                      </span>
                    ))}
                  </div>
                  <Link to={`/bundles#${bundle.id}`}>
                    <Button size="sm" variant="outline" className="h-8 rounded-full text-xs group">
                      {isRTL ? 'التفاصيل' : 'Details'}
                      <ArrowRight className={cn("ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform", isRTL && "rotate-180 mr-1 ml-0")} />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link to="/bundles">
            <Button size="lg" variant="outline" className="rounded-full h-12 px-8">
              {isRTL ? 'عرض جميع الباقات' : 'View All Bundles'}
              <ArrowRight className={cn("ml-2 h-4 w-4", isRTL && "rotate-180 mr-2 ml-0")} />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
