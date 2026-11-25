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

export function SmartBundles() {
  const { isRTL, formatPrice } = useLanguage();
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
      const cols = 'id, name, slug, price, original_price, image_url, brand, stock, featured, description, protocol';
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
    <section className="py-20 bg-card/30">
      <div className="container px-4 sm:px-6 md:px-12">
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-primary font-medium text-sm uppercase tracking-wider"
          >
            {isRTL ? 'وفّر أكثر مع الباقات — شامل التركيب مجاناً' : 'Save More with Bundles — Free Installation Included'}
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
              ? 'باقات متكاملة بنفس أسعار الأجهزة الفعلية في الكتالوج + تركيب احترافي معتمد مجاناً بالكامل وضمان رسمي'
              : 'Complete smart home bundles matching exact catalog device prices + FREE certified installation & official warranty'}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {displayBundles.map((bundle, index) => {
            const installSaving = Math.max(0, bundle.originalPrice - bundle.priceEgp);
            return (
              <motion.div
                key={bundle.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "relative min-w-0 rounded-2xl border bg-card p-4 sm:p-6 transition-all hover:border-primary/40",
                  bundle.popular ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
                )}
              >
                {bundle.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary rounded-full text-xs font-bold text-primary-foreground">
                    {isRTL ? 'الأكثر مبيعاً' : 'Most Popular'}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg font-bold text-foreground break-words">
                      {isRTL ? bundle.nameAr : bundle.nameEn}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-500">
                        <Wrench className="h-3 w-3 shrink-0" />
                        {isRTL ? 'شامل التركيب مجاناً' : 'FREE Certified Install'}
                      </span>
                    </div>
                  </div>
                  <div className={cn("shrink-0", isRTL ? "text-right sm:text-left" : "text-left sm:text-right")}>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-4">
                  {(isRTL ? bundle.devicesAr : bundle.devicesEn).map((device) => (
                    <div key={device} className="flex items-start gap-1.5 text-xs text-muted-foreground min-w-0">
                      <Check className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                      <span className="break-words min-w-0">{device}</span>
                    </div>
                  ))}
                </div>

                {/* Savings */}
                <div className="flex items-start sm:items-center gap-2 px-3 py-2 rounded-lg bg-success/10 mb-4 min-w-0">
                  <Wifi className="h-3 w-3 text-success shrink-0 mt-0.5 sm:mt-0" />
                  <span className="text-xs font-medium text-success break-words min-w-0">
                    {isRTL ? bundle.savingsAr : bundle.savingsEn}
                  </span>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5 min-w-0">
                    {bundle.badges.map((badge) => (
                      <span key={badge} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                        {badge}
                      </span>
                    ))}
                  </div>
                  <Link to={`/bundles#${bundle.id}`} className="shrink-0">
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
