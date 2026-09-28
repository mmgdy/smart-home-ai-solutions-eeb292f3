import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Wifi, ShoppingCart, Sparkles, Settings2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/i18n';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types/store';
import { defaultBundles, normalizeBundles } from '@/lib/bundles';
import { supabase } from '@/integrations/supabase/client';

const Bundles = () => {
  const { isRTL, formatPrice } = useLanguage();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [bundles, setBundles] = useState(normalizeBundles(defaultBundles));
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [activeBundle, setActiveBundle] = useState<any>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');

  // Match device labels / configured bundle items to real catalog products
  const matchProductsForBundle = (bundle: any, products: Product[]): Record<string, number> => {
    const sel: Record<string, number> = {};

    // 1. Direct match by configured items if available
    if (Array.isArray(bundle.items) && bundle.items.length) {
      bundle.items.forEach((item: any) => {
        const found = products.find((p) =>
          (item.productId && p.id === item.productId) ||
          (item.nameMatch && p.name.toLowerCase().includes(item.nameMatch.toLowerCase()))
        );
        if (found) {
          sel[found.id] = (sel[found.id] || 0) + item.qty;
        }
      });
      if (Object.keys(sel).length > 0) return sel;
    }

    // 2. Fallback: match by line parsing on devicesEn
    const devices: string[] = Array.isArray(bundle.devicesEn)
      ? bundle.devicesEn
      : (bundle.devicesEn || '').split('\n').map((s: string) => s.trim()).filter(Boolean);

    devices.forEach((d) => {
      const m = d.match(/^(\d+)\s*x?\s*(.+)$/i);
      const qty = m ? parseInt(m[1], 10) : 1;
      const term = (m ? m[2] : d).toLowerCase();
      const tokens = term.split(/[\s,/-]+/).filter((t) => t.length > 2);
      const found =
        products.find((p) => p.name.toLowerCase().includes(term)) ||
        products.find((p) => tokens.length >= 2 && tokens.every((t) => p.name.toLowerCase().includes(t))) ||
        products.find((p) =>
          tokens.every((t) => (p.name + ' ' + (p.description || '') + ' ' + (p.brand || '')).toLowerCase().includes(t))
        ) ||
        products.find((p) => tokens.some((t) => p.name.toLowerCase().includes(t)));
      if (found) sel[found.id] = (sel[found.id] || 0) + qty;
    });
    return sel;
  };

  const ensureProductsLoaded = async () => {
    if (allProducts.length) return allProducts;
    setProductsLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .gt('stock', 0)
      .order('name')
      .limit(500);
    const list = (data ?? []) as any as Product[];
    setAllProducts(list);
    setProductsLoading(false);
    return list;
  };

  const openCustomize = async (bundle: any) => {
    setActiveBundle(bundle);
    setCustomizeOpen(true);
    const products = await ensureProductsLoaded();
    setSelectedProducts(matchProductsForBundle(bundle, products));
  };

  const addCustomizedToCart = () => {
    let added = 0;
    Object.entries(selectedProducts).forEach(([id, qty]) => {
      if (qty <= 0) return;
      const p = allProducts.find((x) => x.id === id);
      if (p) { addItem(p as any, qty); added += qty; }
    });
    if (added === 0) {
      toast({ title: isRTL ? 'لم يتم اختيار أي منتج' : 'No products selected', variant: 'destructive' });
      return;
    }
    toast({
      title: isRTL ? 'تمت الإضافة للسلة' : 'Added to cart',
      description: isRTL ? `${added} منتج من ${activeBundle.nameAr}` : `${added} items from ${activeBundle.nameEn}`,
    });
    setCustomizeOpen(false);
    navigate('/cart');
  };

  const handleOrderBundle = async (bundle: ReturnType<typeof normalizeBundles>[number]) => {
    const products = await ensureProductsLoaded();
    const matched = matchProductsForBundle(bundle, products);
    const ids = Object.keys(matched);
    if (!ids.length) {
      toast({
        title: isRTL ? 'تعذّر إضافة الباقة' : "Couldn't auto-add bundle",
        description: isRTL ? 'افتح "تخصيص" لاختيار المنتجات يدوياً' : 'Open "Customize" to pick products manually',
        variant: 'destructive',
      });
      openCustomize(bundle);
      return;
    }
    let total = 0;
    ids.forEach((id) => {
      const p = products.find((x) => x.id === id);
      const qty = matched[id];
      if (p) { addItem(p as any, qty); total += qty; }
    });
    toast({
      title: isRTL ? 'تمت إضافة الباقة' : 'Bundle added to cart',
      description: isRTL ? `${total} منتج من ${bundle.nameAr}` : `${total} items from ${bundle.nameEn}`,
    });
    navigate('/cart');
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('site_info')
        .select('value')
        .eq('section', 'bundles')
        .eq('key', 'list')
        .maybeSingle();
      if (!data?.value) return;
      try {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed) && parsed.length) setBundles(normalizeBundles(parsed));
      } catch {
        // Keep built-in bundles as fallback.
      }
    })();
  }, []);

  return (
    <>
      <Helmet>
        <title>{isRTL ? 'باقات المنزل الذكي | أزكاسمارت' : 'Smart Home Bundles | AzkaSmart'}</title>
        <meta name="description" content="Ready-made smart home bundles with real catalog prices for Egyptian homes. Studio, apartment, and villa kits with certified installation and official warranty." />
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
                {isRTL ? 'تركيب احترافي معتمد + ضمان سنتين' : 'Certified Pro Installation + 2-Year Warranty'}
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
                ? 'باقات ذكية مصممة بأسعار الأجهزة الحقيقية وخصومات مدروسة للمنازل المصرية. تشمل أجهزة أصلية معتمدة مع خيار التركيب الاحترافي (٢٠٪، بحد أدنى ١٥٠٠ ج.م للزيارة).'
                : 'Smart bundles configured with real catalog prices and authentic savings for Egyptian homes. Genuine devices with optional certified installation (20%, min. 1,500 EGP per visit).'}
            </motion.p>
          </div>

          {/* Bundles grid */}
          <div className="container px-6 md:px-12">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {bundles.map((bundle, index) => {
                const discount = Math.round(((bundle.originalPrice - bundle.priceEgp) / bundle.originalPrice) * 100);
                return (
                  <motion.div
                    key={bundle.id}
                    id={bundle.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-all flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-display text-lg font-bold text-foreground">
                        {isRTL ? bundle.nameAr : bundle.nameEn}
                      </h3>
                      <span className="text-xs font-bold text-success bg-success/10 px-2 py-1 rounded-full">
                        -{discount}%
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {isRTL ? bundle.descAr : bundle.descEn}
                    </p>

                    {/* Price */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-display text-2xl font-bold text-foreground">{formatPrice(bundle.priceEgp)}</span>
                      <span className="text-sm text-muted-foreground line-through">{formatPrice(bundle.originalPrice)}</span>
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
                      <div className="flex gap-1">
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
                        {isRTL ? 'اطلب الآن' : 'Order Now'}
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
            placeholder={isRTL ? 'بحث عن منتج…' : 'Search products…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3"
          />
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {productsLoading && <div className="flex justify-center py-8"><Loader2 className="animate-spin" /></div>}
            {!productsLoading && allProducts
              .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.brand || '').toLowerCase().includes(search.toLowerCase()))
              .slice(0, 100)
              .map((p) => {
                const qty = selectedProducts[p.id] || 0;
                return (
                  <div key={p.id} className="flex items-center gap-3 border border-border rounded-lg p-2">
                    <Checkbox
                      checked={qty > 0}
                      onCheckedChange={(v) => setSelectedProducts((s) => ({ ...s, [p.id]: v ? Math.max(1, qty) : 0 }))}
                    />
                    <img src={(p as any).image_url || '/placeholder.svg'} alt={p.name} className="w-10 h-10 rounded-lg object-contain p-0.5 bg-muted/30 border border-border/40 shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }} />
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
              })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomizeOpen(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={addCustomizedToCart}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              {isRTL ? 'أضف المختار للسلة' : 'Add selected to cart'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Bundles;
