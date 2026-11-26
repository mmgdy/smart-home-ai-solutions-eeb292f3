import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { normalizeBrand, brandToSlug } from '@/lib/brands';
import {
  BRAND_LOGOS_BUCKET,
  buildBrandLogoIndex,
  resolveBrandLogoUrl,
  type BrandLogoObject,
} from '@/lib/brandLogos';
import { fetchHiddenProductIds, filterPublicProducts } from '@/lib/productVisibility';
import { supabase } from '@/integrations/supabase/client';
import { LogoSlider } from '@/components/vengeance/LogoSlider';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';

interface Brand {
  name: string;
  slug: string;
  logo_url: string | null;
}

const FALLBACK = ['SONOFF', 'eWeLink', 'LEZN', 'DNAKE', 'SIB', 'Levana', 'Zosar', 'Surpass', 'Tuya', 'Bosch'];
const ECOSYSTEMS = ['Matter', 'Zigbee 3.0', 'Wi-Fi', 'Apple Home', 'Google Home', 'Alexa'];

export function BrandShowcase() {
  const { isRTL } = useLanguage();
  const { reducedMotion } = useMotionPreferences();
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: brandsRows }, logoListRes] = await Promise.all([
        supabase
          .from('brands')
          .select('name, slug, logo_url')
          .order('display_order', { ascending: true })
          .limit(18),
        supabase.storage
          .from(BRAND_LOGOS_BUCKET)
          .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
          .catch(() => ({ data: null, error: null })),
      ]);

      const logoIndex = buildBrandLogoIndex(
        ((logoListRes as { data?: BrandLogoObject[] | null })?.data ?? []) as BrandLogoObject[],
      );

      if (brandsRows && brandsRows.length > 0) {
        const seen = new Set<string>();
        const cleaned: Brand[] = [];
        for (const row of brandsRows as any[]) {
          const canonical = normalizeBrand(row.name);
          if (!canonical || seen.has(canonical.toLowerCase())) continue;
          seen.add(canonical.toLowerCase());
          const slug = brandToSlug(canonical);
          cleaned.push({
            name: canonical,
            slug,
            logo_url: resolveBrandLogoUrl(logoIndex, canonical, slug) || row.logo_url || null,
          });
        }
        setBrands(cleaned);
      } else {
        const [{ data: distinct }, hiddenIds] = await Promise.all([
          supabase
            .from('products')
            .select('id, brand, is_published')
            .not('brand', 'is', null)
            .neq('is_published', false)
            .limit(2000),
          fetchHiddenProductIds(),
        ]);
        const visibleRows = filterPublicProducts((distinct ?? []) as any[], hiddenIds);
        const names = Array.from(
          new Set(visibleRows.map((r: any) => normalizeBrand(r.brand)).filter(Boolean)),
        ).slice(0, 14) as string[];
        const list = names.length ? names : FALLBACK;
        setBrands(
          list.map((name) => {
            const slug = brandToSlug(name);
            return {
              name,
              slug,
              logo_url: resolveBrandLogoUrl(logoIndex, name, slug) || null,
            };
          }),
        );
      }
    })();
  }, []);

  const logoNodes = brands.map((brand) => (
    <Link
      key={brand.slug}
      to={`/brands?brand=${brand.slug}`}
      className="group flex items-center justify-center h-12 min-w-[100px] px-2 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
      title={brand.name}
    >
      {brand.logo_url ? (
        <img
          src={brand.logo_url}
          alt={brand.name}
          loading="lazy"
          decoding="async"
          className="max-h-9 max-w-[115px] w-auto h-auto object-contain bg-transparent opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            el.style.display = 'none';
            el.nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : null}
      <span
        className={`font-display text-sm md:text-base font-bold tracking-tight text-foreground/80 group-hover:text-primary transition-colors duration-200 ${
          brand.logo_url ? 'hidden' : ''
        }`}
      >
        {brand.name}
      </span>
    </Link>
  ));

  return (
    <section className="py-14 bg-background border-y border-border/70 relative overflow-hidden">
      <div className="container px-4 sm:px-6 md:px-12">
        <motion.p
          initial={reducedMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs tracking-[0.2em] uppercase text-primary font-semibold mb-6"
        >
          {isRTL ? 'علامات تجارية أصلية وأنظمة متوافقة' : 'Authorized Genuine Brands & Ecosystems'}
        </motion.p>

        {/* Vengeance LogoSlider marquee — transparent logos directly on canvas */}
        <LogoSlider logos={logoNodes} speed={38} direction="left" pauseOnHover showBlur />

        {/* Ecosystem compatibility chips */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {ECOSYSTEMS.map((eco) => (
            <span
              key={eco}
              className="px-3 py-1 rounded-full bg-card/70 border border-border/70 text-[11px] font-medium text-muted-foreground"
            >
              {eco}
            </span>
          ))}
        </div>

        <div className="text-center mt-7">
          <Link to="/brands" className="text-sm text-primary hover:underline font-semibold">
            {isRTL ? 'عرض كل الماركات →' : 'View all brands →'}
          </Link>
        </div>
      </div>
    </section>
  );
}
