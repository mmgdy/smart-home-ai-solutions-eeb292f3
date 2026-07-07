import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Piece = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
  brand: string | null;
};

export function ArtFurnitureShowcase() {
  const { isRTL } = useLanguage();
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    (async () => {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', 'art-furniture')
        .maybeSingle();
      if (!cat?.id) return;
      const { data } = await supabase
        .from('products')
        .select('id, name, slug, price, image_url, brand')
        .eq('category_id', cat.id)
        .limit(6);
      if (data) setPieces(data as Piece[]);
    })();
  }, []);

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Ambient gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-cyan-accent/5 pointer-events-none" />

      <div className="container px-6 md:px-12 relative">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div className="max-w-xl">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-1.5 text-primary font-medium text-xs uppercase tracking-widest"
            >
              <Sparkles className="h-3 w-3" />
              {isRTL ? 'مجموعة مختارة' : 'Curated Collection'}
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              className="font-display text-3xl md:text-5xl font-bold text-foreground mt-3 leading-tight"
            >
              {isRTL ? 'قطع فنية تُكمل منزلك الذكي' : 'Art furniture that completes your smart home'}
            </motion.h2>
            <p className="mt-3 text-muted-foreground">
              {isRTL
                ? 'تصاميم فريدة صنعت خصيصاً لتنسجم مع تقنية المنزل الذكي — من طاولات جانبية إلى قطع تجميع رئيسية.'
                : 'Unique designer pieces made to live alongside your smart tech — from statement seating to sculptural side tables.'}
            </p>
          </div>
          <Link
            to="/products?category=art-furniture"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all whitespace-nowrap"
          >
            {isRTL ? 'استكشف المجموعة' : 'Explore the collection'}
            <ArrowRight className={cn('h-4 w-4', isRTL && 'rotate-180')} />
          </Link>
        </div>

        {pieces.length === 0 ? (
          // Empty state — invites admin to seed, still looks intentional
          <div className="rounded-3xl border border-dashed border-border bg-card/30 p-10 md:p-16 text-center">
            <div className="text-5xl mb-4">🪑</div>
            <h3 className="font-display text-xl font-semibold mb-2">
              {isRTL ? 'قريباً — قطع مختارة يدوياً' : 'Coming soon — handpicked pieces'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {isRTL
                ? 'أضف قطع الأثاث الفني من لوحة التحكم لتظهر هنا.'
                : 'Add art furniture pieces from the admin panel — they will appear here automatically.'}
            </p>
          </div>
        ) : (
          // Bento grid — asymmetric, modern
          <div className="grid grid-cols-2 md:grid-cols-4 md:grid-rows-2 gap-3 md:gap-4">
            {pieces.slice(0, 6).map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className={cn(
                  'group relative overflow-hidden rounded-2xl bg-card border border-border',
                  i === 0 && 'col-span-2 md:col-span-2 md:row-span-2 aspect-square md:aspect-auto',
                  i !== 0 && 'aspect-square',
                )}
              >
                <Link to={`/products/${p.slug}`} className="block h-full">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted to-card flex items-center justify-center text-4xl">
                      🪑
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <p className="text-white text-sm md:text-base font-semibold line-clamp-2">
                      {p.name}
                    </p>
                    <p className="text-white/80 text-xs md:text-sm mt-0.5">
                      EGP {Number(p.price).toLocaleString()}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}