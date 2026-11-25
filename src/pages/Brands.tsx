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
import type { Product } from "@/types/store";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      const [{ data: b }, { data: hiddenData }, { data: prods }, logoListRes] = await Promise.all([
        supabase
          .from("brands")
          .select("id, name, slug, logo_url, description")
          .order("display_order", { ascending: true })
          .order("name"),
        supabase
          .from("site_info")
          .select("value")
          .eq("section", "products")
          .eq("key", "hidden_ids")
          .maybeSingle(),
        supabase
          .from("products")
          .select("*")
          .is("parent_id", null)
          .order("featured", { ascending: false }),
        supabase.storage
          .from(BRAND_LOGOS_BUCKET)
          .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } })
          .catch(() => ({ data: null, error: null })),
      ]);

      const logoIndex = buildBrandLogoIndex(
        ((logoListRes as { data?: BrandLogoObject[] | null })?.data ?? []) as BrandLogoObject[]
      );

      let hiddenIds = new Set<string>();
      if (hiddenData?.value) {
        try {
          hiddenIds = new Set(JSON.parse(hiddenData.value) as string[]);
        } catch {}
      }

      const visibleProds = ((prods as any[]) ?? [])
        .filter((p) => !hiddenIds.has(p.id))
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
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    whileHover={{ y: -4 }}
                    className="group aspect-square rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-[0_10px_40px_-20px_hsl(var(--primary)/0.4)] flex flex-col items-center justify-center p-4 transition-all"
                  >
                    {b.logo_url && !failedLogos[b.slug] ? (
                      <img
                        src={b.logo_url}
                        alt={b.name}
                        loading="lazy"
                        decoding="async"
                        className="max-h-14 max-w-[80%] w-auto h-auto object-contain bg-transparent"
                        onError={() => setFailedLogos((prev) => ({ ...prev, [b.slug]: true }))}
                      />
                    ) : (
                      <span className="font-display text-lg md:text-xl font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                        {b.name}
                      </span>
                    )}
                    <span className="mt-2 text-xs text-muted-foreground">{isRTL ? "اعرض المنتجات" : "View products"}</span>
                  </motion.button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setParams({})} className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />{isRTL ? "كل الماركات" : "All brands"}
            </Button>
            <div className="text-center mb-10">
              {activeBrand?.logo_url && !failedLogos[activeBrand.slug] && (
                <img
                  src={activeBrand.logo_url}
                  alt={activeBrand.name}
                  loading="lazy"
                  decoding="async"
                  className="max-h-14 max-w-[240px] w-auto h-auto mx-auto mb-4 object-contain bg-transparent"
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
