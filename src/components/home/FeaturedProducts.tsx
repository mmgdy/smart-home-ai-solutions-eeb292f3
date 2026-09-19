import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/store';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function FeaturedProducts() {
  const { t, isRTL } = useLanguage();

  const { data: hiddenIds } = useQuery({
    queryKey: ['hidden-product-ids'],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_info')
        .select('value')
        .eq('section', 'products')
        .eq('key', 'hidden_ids')
        .maybeSingle();
      if (!data?.value) return [] as string[];
      try { return JSON.parse(data.value) as string[]; } catch { return [] as string[]; }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: rawProducts } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .is('parent_id', null)
        .order('featured', { ascending: false })
        .limit(16);
      if (error) throw error;
      return data;
    },
  });

  const products = useMemo(() => {
    if (!rawProducts) return [];
    const hiddenSet = new Set(hiddenIds ?? []);
    return (rawProducts as any[])
      .filter((p) => !hiddenSet.has(p.id))
      .map((p) => ({
        ...p,
        category: p.categories || p.category,
        images: Array.isArray(p.images) && p.images.length > 0 ? p.images : p.image_url ? [p.image_url] : [],
      }))
      .slice(0, 8) as Product[];
  }, [rawProducts, hiddenIds]);

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div className="container px-6 md:px-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-sm tracking-[0.2em] uppercase text-primary font-medium block mb-2"
            >
              {isRTL ? 'الأكثر مبيعاً' : 'Best Sellers'}
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-display text-3xl md:text-4xl font-bold tracking-tight"
            >
              {isRTL ? 'منتجات مميزة' : 'Featured Products'}
            </motion.h2>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Link to="/products">
              <Button variant="outline" className="h-10 px-5 rounded-full border-foreground/20 hover:bg-foreground/5 group text-sm">
                {t('viewAll')}
                <svg
                  className={cn(
                    'ml-2 h-4 w-4 transition-transform group-hover:translate-x-1',
                    isRTL && 'rotate-180 mr-2 ml-0'
                  )}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m13 18 6-6-6-6" />
                </svg>
              </Button>
            </Link>
          </motion.div>
        </div>

        {products && products.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
