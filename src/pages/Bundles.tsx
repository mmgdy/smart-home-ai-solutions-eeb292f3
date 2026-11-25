import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Wifi, ShoppingCart, Sparkles, Settings2, Loader2, Wrench, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/i18n';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types/store';
import {
  defaultBundles,
  getBundleCompositionBreakdown,
  getBundleProductRefs,
  normalizeBundles,
  syncBundlesWithCatalog,
  type ResolvedBundleEntry,
} from '@/lib/bundles';
import { supabase } from '@/integrations/supabase/client';

const Bundles = () => {
  const { isRTL, formatPrice } = useLanguage();
  const navigate = useNavigate();
  const { addItem, clearCart, setActiveBundle: setCartBundle } = useCart();
  const { toast } = useToast();
  const [bundles, setBundles] = useState(normalizeBundles(defaultBundles));
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [activeBundle, setActiveBundle] = useState<any>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [hiddenIdSet, setHiddenIdSet] = useState<Set<string>>(new Set());
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});
  const [unavailableItems, setUnavailableItems] = useState<ResolvedBundleEntry[]>([]);
  const [search, setSearch] = useState('');

  const loadCatalogProductsForBundles = async (
    targetBundles = bundles,
  ): Promise<{ products: Product[]; hiddenSet: Set<string> }> => {
    const refs = getBundleProductRefs(targetBundles);

    const [{ data: hiddenRow }, { data: byIdData }, { data: bySlugData }, { data: inStockData }] = await Promise.all([
      supabase
        .from('site_info')
        .select('value')
        .eq('section', 'products')
        .eq('key', 'hidden_ids')
        .maybeSingle(),
      refs.ids.length
        ? supabase.from('products').select('*').in('id', refs.ids)
        : Promise.resolve({ data: [] as any[] }),
      refs.slugs.length
        ? supabase.from('products').select('*').in('slug', refs.slugs)
        : Promise.resolve({ data: [] as any[] }),
      supabase
        .from('products')
        .select('*')
        .gt('stock', 0)
        .order('name')
        .range(0, 999),
    ]);

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

    const byId = new Map<string, Product>();
    [...(byIdData ?? []), ...(bySlugData ?? [])].forEach((p: any) => {
      if (p?.id && !byId.has(p.id)) {
        byId.set(p.id, p as Product);
      }
    });
    ((inStockData ?? []) as any as Product[]).forEach((p) => {
      if (hiddenSet.has(p.id)) return;
      if (!byId.has(p.id)) {
        byId.set(p.id, p);
      }
    });

    setHiddenIdSet(hiddenSet);
    const products = Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
    return { products, hiddenSet };
  };

  const ensureProductsLoaded = async (): Promise<{ products: Product[]; hiddenSet: Set<string> }> => {
    if (allProducts.length) return { products: allProducts, hiddenSet: hiddenIdSet };
    setProductsLoading(true);
    const res = await loadCatalogProductsForBundles(bundles);
    setAllProducts(res.products);
    setProductsLoading(false);
    return res;
  };

  const openCustomize = async (bundle: any) => {
    setActiveBundle(bundle);
    setSearch('');
    setSelectedProducts({});
    setUnavailableItems([]);
    setCustomizeOpen(true);
    const { products, hiddenSet } = await ensureProductsLoaded();
    const breakdown = getBundleCompositionBreakdown(bundle, products, hiddenSet);
    setSelectedProducts(breakdown.availableSelection);
    setUnavailableItems(breakdown.unavailableEntries);
  };

  const addCustomizedToCart = () => {
    let added = 0;
    clearCart();
    Object.entries(selectedProducts).forEach(([id, qty]) => {
      if (qty <= 0) return;
      const p = allProducts.find((x) => x.id === id);
      if (p && !hiddenIdSet.has(p.id) && (p.stock ?? 0) > 0) {
        addItem(p as any, qty);
        added += qty;
      }
    });
    if (added === 0) {
      toast({ title: isRTL ? 'لم يتم اختيار أي منتج متاح' : 'No available products selected', variant: 'destructive' });
      return;
    }
    if (activeBundle?.id) {
      setCartBundle(activeBundle.id);
    }
    toast({
      title: isRTL ? 'تمت الإضافة للسلة (شامل التركيب مجاناً)' : 'Added to cart (Free Installation included)',
      description: isRTL ? `${added} منتج من ${activeBundle.nameAr}` : `${added} items from ${activeBundle.nameEn}`,
    });
    setCustomizeOpen(false);
    navigate('/cart');
  };

  const handleOrderBundle = async (bundle: ReturnType<typeof normalizeBundles>[number]) => {
    const { products, hiddenSet } = await ensureProductsLoaded();
    const breakdown = getBundleCompositionBreakdown(bundle, products, hiddenSet);
    const ids = Object.keys(breakdown.availableSelection);
    if (!ids.length) {
      toast({
        title: isRTL ? 'تعذّر إضافة الباقة' : "Couldn't auto-add bundle",
        description: isRTL ? 'افتح "تخصيص" لاختيار المنتجات المتاحة' : 'Open "Customize" to review available products',
        variant: 'destructive',
      });
      openCustomize(bundle);
      return;
    }
    clearCart();
    let total = 0;
    ids.forEach((id) => {
      const p = products.find((x) => x.id === id);
      const qty = breakdown.availableSelection[id];
      if (p && !hiddenSet.has(p.id) && (p.stock ?? 0) > 0) {
        addItem(p as any, qty);
        total += qty;
      }
    });
    setCartBundle(bundle.id);
    const unavailableNote =
      breakdown.unavailableEntries.length > 0
        ? isRTL
          ? ` (تم استبعاد ${breakdown.unavailableEntries.length} مكون غير متوفر حالياً)`
          : ` (${breakdown.unavailableEntries.length} unavailable item(s) omitted)`
        : '';
    toast({
      title: isRTL ? 'تمت إضافة الباقة (شامل التركيب مجاناً)' : 'Bundle added to cart (Free Installation)',
      description: (isRTL ? `${total} جهاز من ${bundle.nameAr}` : `${total} devices from ${bundle.nameEn}`) + unavailableNote,
    });
    navigate('/cart');
  };

  useEffect(() => {
    (async () => {
      const { data: infoData } = await supabase
        .from('site_info')
        .select('value')
        .eq('section', 'bundles')
        .eq('key', 'list')
        .maybeSingle();

      let baseBundles = normalizeBundles(defaultBundles);
      if (infoData?.value) {
        try {
          const parsed = JSON.parse(infoData.value);
          if (Array.isArray(parsed) && parsed.length) {
            baseBundles = normalizeBundles(parsed);
          }
        } catch {
          // Keep built-in bundles as fallback.
        }
      }

      const { products: prodList, hiddenSet } = await loadCatalogProductsForBundles(baseBundles);
      if (prodList.length) {
        setAllProducts(prodList);
      }

      setBundles(syncBundlesWithCatalog(baseBundles, prodList, hiddenSet));
    })();
  }, []);

  const getUnavailableLabel = (reason?: ResolvedBundleEntry['reason']) => {
    if (reason === 'hidden') return isRTL ? 'مخفي / غير متاح' : 'Unavailable (Hidden)';
    if (reason === 'out_of_stock') return isRTL ? 'نفد من المخزون' : 'Unavailable (Out of stock)';
    return isRTL ? 'غير موجود بالكتالوج' : 'Unavailable (Not found)';
  };

  return (
    <>
      <Helmet>
        <title>{isRTL ? 'باقات المنزل الذكي | أزكاسمارت' : 'Smart Home Bundles | AzkaSmart'}</title>
        <meta name="description" content="Ready-made smart home bundles with exact catalog prices and FREE certified installation for Egyptian homes." />
      </Helmet>
      <Layout>
        <div className="pt-24 pb-20">
          {/* Header */}
          <div className="container px-6 md:px-12 text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {isRTL ? 'تركيب احترافي مجاناً + ضمان رسمي' : 'FREE Certified Pro Installation + Official Warranty'}
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display text-3xl md:text-5xl font-bold mb-4"
            >
              {isRTL ? 'باقات المنزل الذكي' : 'Smart Home Bundles'}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-muted-foreground max-w-2xl mx-auto"
            >
              {isRTL
                ? 'باقات ذكية متكاملة بأسعار الأجهزة الفعلية في الكتالوج مع تركيب احترافي وبرمجة مجانية بالكامل (وفّر رسوم التركيب ٢٠٪).'
                : 'Complete smart home bundles priced at the exact sum of their catalog devices — with FREE certified installation & setup (save the 20% installation fee).'}
            </motion.p>
          </div>

          {/* Bundles grid */}
          <div className="container px-6 md:px-12">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {bundles.map((bundle, index) => {
                const freeInstallValue = Math.max(0, bundle.originalPrice - bundle.priceEgp);
                return (
                  <motion.div
                    key={bundle.id}
                    id={bundle.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-all flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <h3 className="font-display text-lg font-bold text-foreground">
                        {isRTL ? bundle.nameAr : bundle.nameEn}
                      </h3>
                      <span className="text-xs font-bold text-success bg-success/10 px-2.5 py-1 rounded-full shrink-0">
                        {isRTL ? 'تركيب مجاني' : 'FREE Install'}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {isRTL ? bundle.descAr : bundle.descEn}
                    </p>

                    {/* Price */}
                    <div className="mb-4">
                      <div className="flex items-baseline gap-3">
                        <span className="font-display text-2xl font-bold text-foreground">{formatPrice(bundle.priceEgp)}</span>
                        <span className="text-sm text-muted-foreground line-through">{formatPrice(bundle.originalPrice)}</span>
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <Wrench className="h-3 w-3" />
                        <span>
                          {isRTL
                            ? `شامل التركيب الاحترافي مجاناً (بقيمة ${formatPrice(freeInstallValue)})`
                            : `Includes FREE Pro Installation (worth ${formatPrice(freeInstallValue)})`}
                        </span>
                      </div>
                    </div>

                    {/* Devices */}
                    <div className="space-y-1.5 mb-4 flex-1">
                      {(isRTL ? bundle.devicesAr : bundle.devicesEn).map((device) => (
                        <div key={device} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="h-3 w-3 text-primary flex-shrink-0" />
                          <span>{device}</span>
                        </div>
                      ))}
                    </div>

                    {/* Savings & install time */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 mb-3">
                      <Wifi className="h-3 w-3 text-success flex-shrink-0" />
                      <span className="text-xs font-medium text-success">
                        {isRTL ? bundle.savingsAr : bundle.savingsEn}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <span>⏱ {isRTL ? bundle.installTimeAr : bundle.installTimeEn}</span>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {bundle.badges.map((b) => (
                          <span key={b} className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-medium">{b}</span>
                        ))}
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 rounded-full h-10 text-sm"
                        onClick={() => handleOrderBundle(bundle)}
                      >
                        <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                        {isRTL ? 'اطلب الباقة الآن' : 'Order Bundle Now'}
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-full h-10 text-sm"
                        onClick={() => openCustomize(bundle)}
                        title={isRTL ? 'تخصيص الباقة' : 'Customize bundle'}
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Custom solution CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 text-center p-8 rounded-2xl bg-card border border-border max-w-3xl mx-auto"
            >
              <h3 className="font-display text-xl font-bold mb-2">
                {isRTL ? 'مش لاقي الباقة المناسبة؟' : "Can't find the right bundle?"}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                {isRTL ? 'المستشار الذكي هيعملك خطة مخصصة لبيتك' : 'The AI Advisor will create a custom plan for your home'}
              </p>
              <Link to="/ai-consultant">
                <Button size="lg" className="rounded-full h-12 px-8 glow-primary">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isRTL ? 'ابدأ المستشار الذكي' : 'Start AI Advisor'}
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </Layout>
      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {isRTL ? `تخصيص: ${activeBundle?.nameAr ?? ''}` : `Customize: ${activeBundle?.nameEn ?? ''}`}
            </DialogTitle>
          </DialogHeader>
          <Input
            placeholder={isRTL ? 'بحث عن منتج بالاسم أو الرابط…' : 'Search products by name or slug…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {productsLoading && <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>}
            {!productsLoading && unavailableItems.length > 0 && (
              <div
                data-testid="unavailable-bundle-items"
                className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2 mb-3"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    {isRTL
                      ? 'مكونات من الباقة غير متوفرة حالياً (لم يتم تحديدها للطلب تلقائياً):'
                      : 'Unavailable bundle component(s) (not pre-selected for checkout):'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {unavailableItems.map((entry, idx) => (
                    <div
                      key={`${entry.product?.id || entry.item.slug || entry.item.nameMatch}-${idx}`}
                      className="flex items-center gap-2.5 rounded-lg border border-amber-500/25 bg-background/70 p-2 opacity-80"
                    >
                      <img
                        src={entry.product?.image_url || '/placeholder.svg'}
                        alt={entry.product?.name || entry.item.nameMatch}
                        className="w-9 h-9 rounded-md object-contain p-0.5 bg-muted/30 border border-border/40 shrink-0 grayscale"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {entry.qty}× {entry.product?.name || entry.item.nameMatch}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {entry.product ? formatPrice(entry.product.price) : '—'}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-200">
                        {getUnavailableLabel(entry.reason)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!productsLoading && (() => {
              const bundleIdSet = new Set<string>(
                (activeBundle?.items || []).map((it: any) => it.productId).filter(Boolean),
              );
              const q = search.trim().toLowerCase();
              return [...allProducts]
                .filter((p) => !hiddenIdSet.has(p.id) && (p.stock ?? 0) > 0)
                .filter(
                  (p) =>
                    !q ||
                    p.name.toLowerCase().includes(q) ||
                    (p.slug || '').toLowerCase().includes(q) ||
                    (p.brand || '').toLowerCase().includes(q),
                )
                .sort((a, b) => {
                  const aInBundle = (selectedProducts[a.id] || 0) > 0 || bundleIdSet.has(a.id) ? 0 : 1;
                  const bInBundle = (selectedProducts[b.id] || 0) > 0 || bundleIdSet.has(b.id) ? 0 : 1;
                  if (aInBundle !== bInBundle) return aInBundle - bInBundle;
                  return a.name.localeCompare(b.name);
                })
                .slice(0, 100)
                .map((p) => {
                  const qty = selectedProducts[p.id] || 0;
                  return (
                    <div key={p.id} className="flex items-center gap-3 border border-border rounded-lg p-2">
                      <Checkbox
                        checked={qty > 0}
                        onCheckedChange={(v) => setSelectedProducts((s) => ({ ...s, [p.id]: v ? Math.max(1, qty) : 0 }))}
                      />
                      <img src={(p as any).image_url || '/placeholder.svg'} alt={p.name} loading="lazy" decoding="async" className="w-10 h-10 rounded-lg object-contain p-0.5 bg-muted/30 border border-border/40 shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(p.price)}</p>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        value={qty}
                        onChange={(e) => setSelectedProducts((s) => ({ ...s, [p.id]: Math.max(0, parseInt(e.target.value || '0', 10)) }))}
                        className="w-16 h-8 text-center"
                      />
                    </div>
                  );
                });
            })()}
          </div>
          <DialogFooter className="flex flex-wrap items-center justify-between sm:justify-between gap-2">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-foreground">
                {isRTL ? 'إجمالي المختار: ' : 'Selected Total: '}
                <span className="text-primary text-sm">
                  {formatPrice(
                    Object.entries(selectedProducts).reduce((sum, [id, q]) => {
                      const p = allProducts.find((x) => x.id === id);
                      return sum + (p && !hiddenIdSet.has(p.id) && (p.stock ?? 0) > 0 ? Number(p.price) * q : 0);
                    }, 0)
                  )}
                </span>
              </div>
              {!productsLoading && unavailableItems.length > 0 && activeBundle?.priceEgp > 0 && (
                <div className="text-[11px] text-muted-foreground">
                  {isRTL
                    ? `إجمالي مكونات الباقة الكامل: ${formatPrice(activeBundle.priceEgp)} (يستثني ${unavailableItems.length} مكون غير متوفر)`
                    : `Full bundle composition: ${formatPrice(activeBundle.priceEgp)} (excludes ${unavailableItems.length} unavailable)`}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCustomizeOpen(false)}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button onClick={addCustomizedToCart}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                {isRTL ? 'أضف المختار للسلة' : 'Add selected to cart'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Bundles;
