import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';

interface Brand { name: string; slug: string; logo_url: string | null; }

const FALLBACK = ['SONOFF', 'MOES', 'TP-Link', 'FIBARO', 'MCOHome', 'HELTUN', 'Danalock', 'Arylic', 'Tuya', 'Aqara'];

export function BrandShowcase() {
  const { isRTL } = useLanguage();
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('brands')
        .select('name, slug, logo_url')
        .order('display_order', { ascending: true })
        .limit(12);
      if (data && data.length > 0) {
        setBrands(data as any);
      } else {
        // Derive from products
        const { data: distinct } = await supabase
          .from('products').select('brand').not('brand', 'is', null).limit(2000);
        const names = Array.from(new Set((distinct ?? []).map((r: any) => r.brand).filter(Boolean))).slice(0, 12);
        const fallback = names.length ? names : FALLBACK;
        setBrands(fallback.map((n) => ({ name: n, slug: n.toLowerCase().replace(/[^a-z0-9]+/g, '-'), logo_url: null })));
      }
    })();
  }, []);

  return (
    <section className="py-12 bg-background border-y border-border/50">
      <div className="container px-6 md:px-12">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium mb-8"
        >
          {isRTL ? 'علامات تجارية أصلية معتمدة' : 'Authorized Genuine Brands'}
        </motion.p>

        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {brands.map((brand, index) => (
            <motion.div
              key={brand.slug}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.03 }}
            >
              <Link
                to={`/brands?brand=${brand.slug}`}
                className="group flex items-center justify-center h-12 min-w-[100px] px-3"
              >
                {brand.logo_url ? (
                  <img
                    src={brand.logo_url}
                    alt={brand.name}
                    className="max-h-10 max-w-[120px] object-contain grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-100 transition-all"
                    onError={(e) => {
                      const el = e.currentTarget as HTMLImageElement;
                      el.style.display = 'none';
                      el.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <span className={`font-display text-sm md:text-base font-bold tracking-tight text-muted-foreground/60 group-hover:text-foreground transition-colors ${brand.logo_url ? 'hidden' : ''}`}>
                  {brand.name}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/brands" className="text-sm text-primary hover:underline font-medium">
            {isRTL ? 'عرض كل الماركات →' : 'View all brands →'}
          </Link>
        </div>
      </div>
    </section>
  );
}
