import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/store';
import { ProductCard } from '@/components/products/ProductCard';
import { useLanguage } from '@/lib/i18n';
import { fetchHiddenProductIds, filterPublicProducts } from '@/lib/productVisibility';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';
import { AnimatedButton } from '@/components/vengeance/AnimatedButton';

export function FeaturedProducts() {
  const { t, isRTL } = useLanguage();
  const { reducedMotion } = useMotionPreferences();

  const { data: hiddenIds, isLoading: hiddenLoading } = useQuery({
    queryKey: ['hidden-product-ids'],
    queryFn: fetchHiddenProductIds,
    staleTime: 30 * 1000,
  });

  const { data: rawProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .is('parent_id', null)
        .neq('is_published', false)
        .order('featured', { ascending: false })
        .limit(24);
      if (error) throw error;
      return data;
    },
  });

  const isLoading = productsLoading || hiddenLoading;

  const products = useMemo(() => {
    if (!rawProducts || hiddenIds === undefined) return [];
    return filterPublicProducts(rawProducts as any[], hiddenIds)
      .map((p) => ({
        ...p,
        category: p.categories || p.category,
        images: Array.isArray(p.images) && p.images.length > 0 ? p.images : p.image_url ? [p.image_url] : [],
      }))
      .slice(0, 8) as Product[];
  }, [rawProducts, hiddenIds]);

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div className="container px-4 sm:px-6 md:px-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <motion.span
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/25 text-xs tracking-[0.18em] uppercase text-primary font-semibold mb-3"
            >
              {isRTL ? 'الأكثر مبيعاً' : 'Best Sellers'}
            </motion.span>
            <motion.h2
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: reducedMotion ? 0 : 0.08 }}
              className="font-display text-3xl md:text-4xl font-bold tracking-tight"
            >
              {isRTL ? 'منتجات مميزة' : 'Featured Products'}
            </motion.h2>
          </div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: isRTL ? -16 : 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Link to="/products">
              <AnimatedButton azkaVariant="glass" className="h-11 px-6 text-sm">
                <span>{t('viewAll')}</span>
                <ArrowRight
                  className={cn(
                    'h-4 w-4 transition-transform group-hover:translate-x-1',
                    isRTL && 'rotate-180 group-hover:-translate-x-1',
                  )}
                />
              </AnimatedButton>
            </Link>
          </motion.div>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card overflow-hidden p-3 sm:p-4 space-y-3 animate-pulse"
              >
                <div className="aspect-square rounded-xl bg-muted" />
                <div className="h-3 w-1/3 rounded bg-muted" />
                <div className="h-4 w-4/5 rounded bg-muted" />
                <div className="h-5 w-1/2 rounded bg-muted" />
                <div className="h-10 w-full rounded-full bg-muted" />
              </div>
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-16">{t('noFeaturedProducts')}</p>
        )}
      </div>
    </section>
  );
}
