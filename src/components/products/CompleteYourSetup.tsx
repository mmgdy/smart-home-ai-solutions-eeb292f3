import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, ShoppingCart, Layers, ArrowRight, ArrowLeft } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n';
import { getProductImage, productPlaceholder } from '@/lib/productImage';
import { parseHiddenIds } from '@/lib/productVisibility';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/store';
import {
  DEPENDENCIES_SITE_INFO_SECTION,
  generateAutoDependencies,
  parseManualDependencies,
  resolveManualDependencies,
  type DependencyRelationType,
} from '@/lib/productDependencies';

interface CompleteYourSetupProps {
  mainProduct: Product;
  mainQuantity: number;
}

const RELATION_LABELS: Record<
  DependencyRelationType,
  { en: string; ar: string; badgeClass: string }
> = {
  required: {
    en: 'Required',
    ar: 'مطلوب للتشغيل',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  recommended: {
    en: 'Recommended',
    ar: 'موصى به',
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  },
  accessory: {
    en: 'Accessory',
    ar: 'ملحق',
    badgeClass: 'bg-secondary text-foreground/80 border-border',
  },
};

export function CompleteYourSetup({ mainProduct, mainQuantity }: CompleteYourSetupProps) {
  const { isRTL, formatPrice } = useLanguage();
  const addItem = useCart((state) => state.addItem);
  const { toast } = useToast();
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [justAdded, setJustAdded] = useState(false);

  const { data: manualRecords = [], isLoading: manualLoading } = useQuery({
    queryKey: ['product-dependencies-manual', mainProduct.id],
    staleTime: 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('site_info')
        .select('value')
        .eq('section', DEPENDENCIES_SITE_INFO_SECTION)
        .eq('key', mainProduct.id)
        .maybeSingle();
      return parseManualDependencies(data?.value);
    },
  });

  const { data: catalogBundle, isLoading: catalogLoading } = useQuery({
    queryKey: ['complete-setup-catalog'],
    staleTime: 60_000,
    queryFn: async () => {
      const [{ data: hiddenRow }, products] = await Promise.all([
        supabase
          .from('site_info')
          .select('value')
          .eq('section', 'products')
          .eq('key', 'hidden_ids')
          .maybeSingle(),
        (async () => {
          const pageSize = 1000;
          const rows: Product[] = [];
          for (let from = 0; ; from += pageSize) {
            const { data, error } = await supabase
              .from('products')
              .select('id, name, slug, price, original_price, image_url, images, brand, protocol, stock, featured, is_published, description, category_id, categories(id, name, slug)')
              .neq('is_published', false)
              .order('name')
              .range(from, from + pageSize - 1);
            if (error) throw error;
            rows.push(...((data as unknown as Product[]) ?? []));
            if (!data || data.length < pageSize) break;
          }
          return rows;
        })(),
      ]);

      const hiddenIds = new Set<string>(parseHiddenIds(hiddenRow?.value));

      return { hiddenIds, products };
    },
  });

  const resolvedItems = useMemo(() => {
    if (!catalogBundle) return [];
    const { products, hiddenIds } = catalogBundle;
    if (manualRecords.length > 0) {
      return resolveManualDependencies(mainProduct.id, manualRecords, products, hiddenIds);
    }
    return generateAutoDependencies(mainProduct, products, hiddenIds);
  }, [catalogBundle, manualRecords, mainProduct]);

  useEffect(() => {
    const nextChecked: Record<string, boolean> = {};
    const nextQty: Record<string, number> = {};
    for (const item of resolvedItems) {
      nextChecked[item.product.id] = item.available ? item.default_checked : false;
      nextQty[item.product.id] = 1;
    }
    setCheckedMap(nextChecked);
    setQtyMap(nextQty);
    setJustAdded(false);
  }, [mainProduct.id, resolvedItems]);

  if (manualLoading || catalogLoading || resolvedItems.length === 0) {
    return null;
  }

  const tickedItems = resolvedItems.filter(
    (item) => item.available && Boolean(checkedMap[item.product.id]),
  );

  const dependentsTotal = tickedItems.reduce((sum, item) => {
    const q = Math.max(1, Math.min(item.product.stock || 1, qtyMap[item.product.id] || 1));
    return sum + Number(item.product.price) * q;
  }, 0);

  const toggleItem = (productId: string, available: boolean) => {
    if (!available) return;
    setJustAdded(false);
    setCheckedMap((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  const updateItemQty = (productId: string, maxStock: number, next: number) => {
    setJustAdded(false);
    const clamped = Math.max(1, Math.min(maxStock || 1, next));
    setQtyMap((prev) => ({ ...prev, [productId]: clamped }));
  };

  const handleAddSelected = () => {
    if ((mainProduct.stock ?? 0) <= 0 || tickedItems.length === 0) return;

    const safeMainQty = Math.max(1, Math.min(mainProduct.stock || 1, mainQuantity || 1));
    addItem(mainProduct, safeMainQty);

    let totalUnits = safeMainQty;
    for (const item of tickedItems) {
      const q = Math.max(1, Math.min(item.product.stock || 1, qtyMap[item.product.id] || 1));
      addItem(item.product, q);
      totalUnits += q;
    }

    setJustAdded(true);
    toast({
      title: isRTL ? 'تمت إضافة المنظومة للسلة' : 'Added selected setup to cart',
      description: isRTL
        ? `${mainProduct.name} (×${safeMainQty}) + ${tickedItems.length} منتج(ات) تكميلية (${totalUnits} قطعة)`
        : `${mainProduct.name} (×${safeMainQty}) + ${tickedItems.length} add-on(s) (${totalUnits} units total)`,
    });
  };

  const ViewCartArrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section
      data-testid="complete-your-setup"
      aria-labelledby="complete-your-setup-heading"
      className="mt-8 sm:mt-10 rounded-2xl border border-border bg-card p-4 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h2
            id="complete-your-setup-heading"
            className="font-display text-lg sm:text-xl font-bold text-foreground flex items-center gap-2"
          >
            <Layers className="h-5 w-5 text-primary shrink-0" />
            <span>{isRTL ? 'أكمل منظومتك' : 'Complete your setup'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {isRTL
              ? 'اختر المنتجات المتوافقة لإضافتها مع هذا المنتج بسعر الكتالوج الفعلي'
              : 'Select compatible products to add alongside this item at live catalogue prices'}
          </p>
        </div>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border/80 bg-background/40 overflow-hidden">
        {resolvedItems.map((item) => {
          const p = item.product;
          const isChecked = item.available && Boolean(checkedMap[p.id]);
          const qty = qtyMap[p.id] || 1;
          const rel = RELATION_LABELS[item.relation_type];

          return (
            <div
              key={p.id}
              data-testid="dependent-product-row"
              data-product-id={p.id}
              className={cn(
                'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 transition-colors',
                !item.available && 'opacity-60 bg-muted/20',
                isChecked && 'bg-primary/[0.04]',
              )}
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                <Checkbox
                  aria-label={isRTL ? `اختيار ${p.name}` : `Select ${p.name}`}
                  checked={isChecked}
                  disabled={!item.available}
                  onCheckedChange={() => toggleItem(p.id, item.available)}
                  className="mt-1 sm:mt-0 h-5 w-5 shrink-0"
                />
                <Link
                  to={`/products/${p.slug}`}
                  className="h-14 w-14 shrink-0 rounded-lg border border-border/60 bg-card p-1 flex items-center justify-center overflow-hidden"
                >
                  <img
                    src={getProductImage(p)}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = productPlaceholder;
                    }}
                    className="h-full w-full object-contain"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold leading-none',
                        rel.badgeClass,
                      )}
                    >
                      {isRTL ? rel.ar : rel.en}
                    </span>
                    {item.available ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-emerald-600 dark:text-emerald-400 leading-none">
                        {isRTL ? `متوفر (${p.stock})` : `In Stock (${p.stock})`}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-destructive leading-none">
                        {isRTL ? 'نفد من المخزون' : 'Out of Stock'}
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/products/${p.slug}`}
                    className="block text-sm font-medium text-foreground hover:text-primary transition-colors break-words line-clamp-2"
                  >
                    {p.name}
                  </Link>
                  <div className="mt-0.5 text-sm font-display font-bold text-foreground">
                    {formatPrice(p.price)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 ps-8 sm:ps-0 shrink-0">
                <div className="text-xs text-muted-foreground sm:hidden">
                  {formatPrice(Number(p.price) * qty)}
                </div>
                <div className="flex h-10 sm:h-9 items-center rounded-full border border-border bg-card shrink-0">
                  <button
                    type="button"
                    aria-label={isRTL ? `تقليل كمية ${p.name}` : `Decrease quantity for ${p.name}`}
                    className="grid h-10 w-9 sm:h-9 sm:w-8 place-items-center text-foreground/80 hover:text-foreground disabled:opacity-40"
                    disabled={!item.available || qty <= 1}
                    onClick={() => updateItemQty(p.id, p.stock, qty - 1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span
                    data-testid="dependent-qty-value"
                    className="w-7 text-center text-sm font-semibold text-foreground"
                  >
                    {qty}
                  </span>
                  <button
                    type="button"
                    aria-label={isRTL ? `زيادة كمية ${p.name}` : `Increase quantity for ${p.name}`}
                    className="grid h-10 w-9 sm:h-9 sm:w-8 place-items-center text-foreground/80 hover:text-foreground disabled:opacity-40"
                    disabled={!item.available || qty >= (p.stock || 1)}
                    onClick={() => updateItemQty(p.id, p.stock, qty + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer summary + Add selected to cart CTA */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border/70">
        <div className="space-y-0.5 min-w-0">
          <div className="text-sm font-medium text-foreground flex flex-wrap items-baseline gap-1.5">
            <span>
              {isRTL
                ? `إجمالي الإضافات المختارة (${tickedItems.length}):`
                : `Selected add-ons total (${tickedItems.length}):`}
            </span>
            <span
              data-testid="dependents-running-total"
              className="font-display text-lg font-bold text-primary"
            >
              {formatPrice(dependentsTotal)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground break-words">
            {isRTL
              ? `سيُضاف المنتج الرئيسي (×${mainQuantity}) مع المنتجات المختارة أعلاه إلى السلة`
              : `Includes main product (×${mainQuantity}) plus every ticked item above`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          {justAdded && (
            <Link to="/cart" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto h-11 rounded-full gap-1.5">
                <span>{isRTL ? 'عرض السلة' : 'View Cart'}</span>
                <ViewCartArrow className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <Button
            type="button"
            data-testid="add-selected-dependents-btn"
            className="w-full sm:w-auto h-11 rounded-full px-6 gap-2 glow-primary font-semibold"
            disabled={(mainProduct.stock ?? 0) <= 0 || tickedItems.length === 0}
            onClick={handleAddSelected}
          >
            <ShoppingCart className="h-4 w-4 shrink-0" />
            <span>{isRTL ? 'أضف المختار للسلة' : 'Add selected to cart'}</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
