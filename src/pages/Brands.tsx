import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { normalizeBrand, brandToSlug } from "@/lib/brands";
import {
  BRAND_LOGOS_BUCKET,
  buildBrandLogoIndex,
  resolveBrandLogoUrl,
  type BrandLogoObject,
} from "@/lib/brandLogos";
import { ProductCard } from "@/components/products/ProductCard";
import { fetchHiddenProductIds, filterPublicProducts } from "@/lib/productVisibility";
import type { Product } from "@/types/store";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Brand { id: string; name: string; slug: string; logo_url: string | null; description: string | null; }

export default function BrandsPage() {
  const { isRTL } = useLanguage();
  const [params, setParams] = useSearchParams();
  const rawActiveSlug = params.get("brand");
  const activeSlug = rawActiveSlug === "k-zosar" || rawActiveSlug === "k.zosar" ? "zosar" : rawActiveSlug;

  const [brands, setBrands] = useState<Brand[]>([]);
  const [allVisibleProducts, setAllVisibleProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [failedLogos, setFailedLogos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: b }, hiddenList, prods, logoListRes] = await Promise.all([
        supabase
          .from("brands")
          .select("id, name, slug, logo_url, description")
          .order("display_order", { ascending: true })
          .order("name"),
        fetchHiddenProductIds(),
        (async () => {
          const pageSize = 1000;
          const rows: any[] = [];
          for (let from = 0; ; from += pageSize) {
            const { data, error } = await supabase
              .from("products")
              .select("*")
              .is("parent_id", null)
              .neq("is_published", false)
              .order("featured", { ascending: false })
              .range(from, from + pageSize - 1);
            if (error) throw error;
            rows.push(...(data ?? []));
            if (!data || data.length < pageSize) break;
          }
          return rows;
        })(),
        supabase.storage
          .from(BRAND_LOGOS_BUCKET)
          .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } })
          .catch(() => ({ data: null, error: null })),
      ]);

      const logoIndex = buildBrandLogoIndex(
        ((logoListRes as { data?: BrandLogoObject[] | null })?.data ?? []) as BrandLogoObject[]
      );

      const visibleProds = filterPublicProducts((prods as any[]) ?? [], hiddenList)
        .map((p) => ({
          ...p,
          brand: normalizeBrand(p.brand),
        })) as Product[];

      setAllVisibleProducts(visibleProds);

      const brandMap = new Map<string, Brand>();
      for (const row of (b as any[]) ?? []) {
        const canonical = normalizeBrand(row.name);
        if (!canonical) continue;
        const key = canonical.toLowerCase();
        if (!brandMap.has(key)) {
          brandMap.set(key, {
            id: row.id,
            name: canonical,
            slug: brandToSlug(canonical),
            logo_url: row.logo_url ?? null,
            description: row.description ?? null,
          });
        }
      }

      for (const p of visibleProds) {
        const canonical = normalizeBrand(p.brand);
        if (!canonical) continue;
        const key = canonical.toLowerCase();
        if (!brandMap.has(key)) {
          brandMap.set(key, {
            id: `derived-${canonical}`,
            name: canonical,
            slug: brandToSlug(canonical),
            logo_url: null,
            description: null,
          });
        }
      }

      const mergedList = Array.from(brandMap.values())
        .map((brand) => ({
          ...brand,
          logo_url: resolveBrandLogoUrl(logoIndex, brand.name, brand.slug) || brand.logo_url,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setFailedLogos({});
      setBrands(mergedList);
      setLoading(false);
    })();
  }, []);

  const activeBrand = useMemo(
    () => brands.find((b) => b.slug === activeSlug?.toLowerCase()),
    [brands, activeSlug]
  );

  const products = useMemo(() => {
    if (!activeBrand) return [];
    return allVisibleProducts.filter(
      (p) => normalizeBrand(p.brand)?.toLowerCase() === activeBrand.name.toLowerCase()
    );
  }, [allVisibleProducts, activeBrand]);

  return (
    <Layout>
      <Helmet>
        <title>{isRTL ? "الماركات | أزكاسمارت" : "Brands | AzkaSmart"}</title>
      </Helmet>

      <div className="container px-6 md:px-12 pt-24 pb-12 md:pt-28 md:pb-16">
        {!activeSlug ? (
          <>
            <div className="text-center mb-10">
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">
                {isRTL ? "علاماتنا التجارية" : "Our Brands"}
              </h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {isRTL
                  ? "نوزع منتجات أصلية من أفضل ماركات العالم في المنزل الذكي."
                  : "Authorized distributor for the world's leading smart home brands."}
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="animate-spin" /></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {brands.map((b, i) => (
                  <motion.button
                    key={b.id}
                    onClick={() => setParams({ brand: b.slug })}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: Math.min(i * 0.02, 0.25) }}
                    whileHover={{ y: -3 }}
                    className="group aspect-square rounded-2xl azka-glass border border-border/80 hover:border-primary/55 hover:shadow-[0_14px_40px_-18px_rgba(45,212,191,0.35)] flex flex-col items-center justify-center p-4 transition-all"
                  >
                    {b.logo_url && !failedLogos[b.slug] ? (
                      <img
                        src={b.logo_url}
                        alt={b.name}
                        loading="lazy"
                        decoding="async"
                        className="max-h-14 max-w-[80%] w-auto h-auto object-contain bg-transparent dark:brightness-110 dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.22)]"
                        onError={() => setFailedLogos((prev) => ({ ...prev, [b.slug]: true }))}
                      />
                    ) : (
                      <span className="font-display text-lg md:text-xl font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                        {b.name}
                      </span>
                    )}
                    <span className="mt-2.5 text-xs text-muted-foreground group-hover:text-primary transition-colors">{isRTL ? "اعرض المنتجات" : "View products"}</span>
                  </motion.button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setParams({})} className="mb-6 rounded-full">
              <ArrowLeft className={cn("h-4 w-4 me-2", isRTL && "rotate-180")} />{isRTL ? "كل الماركات" : "All brands"}
            </Button>
            <div className="text-center mb-10 rounded-2xl azka-glass p-6 sm:p-8 max-w-3xl mx-auto">
              {activeBrand?.logo_url && !failedLogos[activeBrand.slug] && (
                <img
                  src={activeBrand.logo_url}
                  alt={activeBrand.name}
                  loading="lazy"
                  decoding="async"
                  className="max-h-14 max-w-[240px] w-auto h-auto mx-auto mb-4 object-contain bg-transparent dark:brightness-110 dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.22)]"
                  onError={() => setFailedLogos((prev) => ({ ...prev, [activeBrand.slug]: true }))}
                />
              )}
              <h1 className="font-display text-4xl font-bold mb-2">{activeBrand?.name}</h1>
              {activeBrand?.description && (
                <p className="text-muted-foreground max-w-2xl mx-auto">{activeBrand.description}</p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {products.length} {isRTL ? "منتج" : "products"}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            {products.length === 0 && (
              <p className="text-center text-muted-foreground py-12">
                {isRTL ? "لا توجد منتجات لهذه الماركة بعد." : "No products yet for this brand."}
              </p>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
