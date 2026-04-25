import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { ProductCard } from "@/components/products/ProductCard";
import type { Product } from "@/types/store";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Brand { id: string; name: string; slug: string; logo_url: string | null; description: string | null; }

export default function BrandsPage() {
  const { isRTL } = useLanguage();
  const [params, setParams] = useSearchParams();
  const activeSlug = params.get("brand");

  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: b } = await supabase
        .from("brands")
        .select("id, name, slug, logo_url, description")
        .order("display_order", { ascending: true })
        .order("name");
      setBrands((b as any) ?? []);

      // Also derive brands from product table for any brand not yet in `brands`
      const { data: distinct } = await supabase
        .from("products").select("brand").not("brand", "is", null).limit(2000);
      const inDb = new Set((b ?? []).map((x: any) => x.name.toLowerCase()));
      const fromProducts = Array.from(new Set((distinct ?? []).map((r: any) => r.brand).filter(Boolean)))
        .filter((name: string) => !inDb.has(name.toLowerCase()))
        .map((name: string) => ({
          id: `derived-${name}`,
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          logo_url: null,
          description: null,
        }));
      setBrands((prev) => [...prev, ...fromProducts]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!activeSlug) { setProducts([]); return; }
    (async () => {
      const brand = brands.find((b) => b.slug === activeSlug);
      if (!brand) return;
      const { data } = await supabase
        .from("products").select("*").ilike("brand", brand.name).order("featured", { ascending: false }).limit(120);
      setProducts((data as any) ?? []);
    })();
  }, [activeSlug, brands]);

  const activeBrand = useMemo(() => brands.find((b) => b.slug === activeSlug), [brands, activeSlug]);

  return (
    <Layout>
      <Helmet>
        <title>{isRTL ? "الماركات | بيت زكي" : "Brands | Baytzaki"}</title>
      </Helmet>

      <div className="container px-6 md:px-12 py-12">
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
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.name}
                        className="max-h-20 max-w-full object-contain grayscale group-hover:grayscale-0 transition-all"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
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
              {activeBrand?.logo_url && (
                <img src={activeBrand.logo_url} alt={activeBrand.name} className="h-20 mx-auto mb-4 object-contain" />
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
