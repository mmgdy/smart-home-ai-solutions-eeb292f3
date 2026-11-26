import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Wifi, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { defaultBundles, getBundleProductRefs, normalizeBundles, syncBundlesWithCatalog } from '@/lib/bundles';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/store';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';
import { GlowBorderCard } from '@/components/vengeance/GlowBorderCard';
import { AzkaBentoCard } from '@/components/vengeance/AzkaBentoCard';
import { BorderBeam } from '@/components/vengeance/BorderBeam';
import { AnimatedButton } from '@/components/vengeance/AnimatedButton';

export function SmartBundles() {
  const { isRTL, formatPrice } = useLanguage();
  const { reducedMotion } = useMotionPreferences();
  const [displayBundles, setDisplayBundles] = useState(normalizeBundles(defaultBundles).slice(0, 4));

  useEffect(() => {
    (async () => {
      const [{ data: bundleRow }, { data: hiddenRow }] = await Promise.all([
        supabase
          .from('site_info')
          .select('value')
          .eq('section', 'bundles')
          .eq('key', 'list')
          .maybeSingle(),
        supabase
          .from('site_info')
          .select('value')
          .eq('section', 'products')
          .eq('key', 'hidden_ids')
          .maybeSingle(),
      ]);

      let baseBundles = normalizeBundles(defaultBundles);
      if (bundleRow?.value) {
        try {
          const parsed = JSON.parse(bundleRow.value);
          if (Array.isArray(parsed) && parsed.length) baseBundles = normalizeBundles(parsed);
        } catch {
          // Keep built-in bundles as fallback.
        }
      }

      let hiddenSet = new Set<string>();
      if (hiddenRow?.value) {
        try {
          const parsedHidden = JSON.parse(hiddenRow.value);
          if (Array.isArray(parsedHidden)) {
            hiddenSet = new Set(parsedHidden.map((id) => String(id)));
          }
        } catch {
          // Ignore malformed hidden_ids value.
        }
      }

      const refs = getBundleProductRefs(baseBundles);
      const cols = 'id, name, slug, price, original_price, image_url, brand, stock, featured, description, protocol, is_published';
      const [{ data: byIdData }, { data: bySlugData }] = await Promise.all([
        refs.ids.length
          ? supabase.from('products').select(cols).in('id', refs.ids)
          : Promise.resolve({ data: [] as any[] }),
        refs.slugs.length
          ? supabase.from('products').select(cols).in('slug', refs.slugs)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const byId = new Map<string, Product>();
      [...(byIdData ?? []), ...(bySlugData ?? [])].forEach((p: any) => {
        if (p?.id && !byId.has(p.id)) byId.set(p.id, p as Product);
      });

      const prodList = Array.from(byId.values());
      setDisplayBundles(syncBundlesWithCatalog(baseBundles, prodList, hiddenSet).slice(0, 4));
    })();
  }, []);

  return (
    <section className="py-20 bg-card/30 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />
      <div className="container px-4 sm:px-6 md:px-12">
        <div className="text-center mb-12">
          <motion.span
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center px-3.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary font-semibold text-xs uppercase tracking-[0.16em]"
          >
            {isRTL ? 'وفّر أكثر مع الباقات — شامل التركيب مجاناً' : 'Save More with Bundles — Free Installation Included'}
          </motion.span>
          <motion.h2
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: reducedMotion ? 0 : 0.08 }}
            className="font-display text-3xl md:text-4xl font-bold text-foreground mt-3 mb-3"
          >
            {isRTL ? 'باقات المنزل الذكي الجاهزة' : 'Ready-Made Smart Home Bundles'}
          </motion.h2>
          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: reducedMotion ? 0 : 0.14 }}
            className="text-muted-foreground max-w-xl mx-auto"
          >
            {isRTL
              ? 'باقات متكاملة بنفس أسعار الأجهزة الفعلية في الكتالوج + تركيب احترافي معتمد مجاناً بالكامل وضمان رسمي'
              : 'Complete smart home bundles matching exact catalog device prices + FREE certified installation & official warranty'}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-7xl mx-auto">
          {displayBundles.map((bundle, index) => {
            const installSaving = Math.max(0, bundle.originalPrice - bundle.priceEgp);
            const cardInner = (
              <div className="relative p-5 sm:p-6 flex flex-col h-full">
                {bundle.popular && (
                  <BorderBeam size={200} duration={12} borderWidth={1.5} colorFrom="#2DD4BF" colorTo="#8B5CF6" />
                )}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    {bundle.popular && (
                      <span className="inline-flex items-center px-3 py-0.5 mb-2 rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 text-[#070D16] text-[11px] font-bold">
                        {isRTL ? 'الأكثر مبيعاً' : 'Most Popular'}
                      </span>
                    )}
                    <h3 className="font-display text-lg font-bold text-foreground break-words">
                      {isRTL ? bundle.nameAr : bundle.nameEn}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-500">
                        <Wrench className="h-3 w-3 shrink-0" />
                        {isRTL ? 'شامل التركيب مجاناً' : 'FREE Certified Install'}
                      </span>
                    </div>
                  </div>
                  <div className={cn('shrink-0', isRTL ? 'text-right sm:text-left' : 'text-left sm:text-right')}>
                    <div className="font-display text-2xl font-bold text-foreground">
                      {formatPrice(bundle.priceEgp)}
                    </div>
                    <div className="text-sm text-muted-foreground line-through">
                      {formatPrice(bundle.originalPrice)}
                    </div>
                    <span className="text-xs font-semibold text-success">
                      {isRTL ? `وفّر ${formatPrice(installSaving)} تركيب` : `Save ${formatPrice(installSaving)} install`}
                    </span>
                  </div>
                </div>

                {/* Devices list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-4 flex-1">
                  {(isRTL ? bundle.devicesAr : bundle.devicesEn).map((device) => (
                    <div key={device} className="flex items-start gap-1.5 text-xs text-muted-foreground min-w-0">
                      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="break-words min-w-0">{device}</span>
                    </div>
                  ))}
                </div>

                {/* Savings */}
                <div className="flex items-start sm:items-center gap-2 px-3 py-2 rounded-xl bg-success/10 border border-success/20 mb-4 min-w-0">
                  <Wifi className="h-3.5 w-3.5 text-success shrink-0 mt-0.5 sm:mt-0" />
                  <span className="text-xs font-medium text-success break-words min-w-0">
                    {isRTL ? bundle.savingsAr : bundle.savingsEn}
                  </span>
                </div>

                {/* Badges + Details CTA */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap gap-1.5 min-w-0">
                    {bundle.badges.map((badge) => (
                      <span
                        key={badge}
                        className="text-[11px] px-2.5 py-0.5 rounded-full bg-secondary/80 border border-border/60 text-muted-foreground font-medium"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                  <Link to={`/bundles#${bundle.id}`} className="shrink-0">
                    <Button size="sm" variant="outline" className="h-9 px-4 rounded-full text-xs font-semibold group border-primary/35 hover:bg-primary/10">
                      {isRTL ? 'التفاصيل' : 'Details'}
                      <ArrowRight
                        className={cn(
                          'ms-1 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform',
                          isRTL && 'rotate-180 group-hover:-translate-x-0.5',
                        )}
                      />
                    </Button>
                  </Link>
                </div>
              </div>
            );

            if (bundle.popular) {
              return (
                <GlowBorderCard key={bundle.id} colorPreset="azka" animationDuration={7} borderWidth="0.25rem" blurAmount="0.55rem" inset="-0.2rem">
                  {cardInner}
                </GlowBorderCard>
              );
            }

            return (
              <AzkaBentoCard key={bundle.id} delay={index * 0.05} className="min-w-0">
                {cardInner}
              </AzkaBentoCard>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link to="/bundles">
            <AnimatedButton azkaVariant="glass" className="h-12 px-8">
              <span>{isRTL ? 'عرض جميع الباقات' : 'View All Bundles'}</span>
              <ArrowRight className={cn('h-4 w-4', isRTL && 'rotate-180')} />
            </AnimatedButton>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
