import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Plus, Trash2, Package, Search, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/types/store";
import {
  adminEditableBundles,
  defaultBundles,
  getBundleCompositionBreakdown,
  resolveProductForBundleItem,
  splitBundleDevices,
  withComputedInstallSaving,
  type AdminBundle,
  type BundleItemConfig,
} from "@/lib/bundles";

interface EditableBundle extends Omit<AdminBundle, "devicesEn" | "devicesAr" | "items"> {
  devicesEn: string;
  devicesAr: string;
  items: BundleItemConfig[];
}

const STORAGE_KEY = { section: "bundles", key: "list" };

export function BundlesEditor({ adminToken }: { adminToken: string }) {
  const { toast } = useToast();
  const [bundles, setBundles] = useState<EditableBundle[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [productSearch, setProductSearch] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const fetchAllProducts = async () => {
        const pageSize = 1000;
        const rows: Product[] = [];
        for (let from = 0; ; from += pageSize) {
          const { data, error } = await supabase
            .from("products")
            .select("id, name, slug, price, original_price, stock, brand, image_url, description, featured, protocol")
            .order("name")
            .range(from, from + pageSize - 1);
          if (error) throw error;
          rows.push(...((data as unknown as Product[]) ?? []));
          if (!data || data.length < pageSize) break;
        }
        return rows;
      };

      try {
        const [{ data: bundleRow }, { data: hiddenRow }, products] = await Promise.all([
          supabase.from("site_info").select("value").eq("section", STORAGE_KEY.section).eq("key", STORAGE_KEY.key).maybeSingle(),
          supabase.from("site_info").select("value").eq("section", "products").eq("key", "hidden_ids").maybeSingle(),
          fetchAllProducts(),
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
        setHiddenIds(hiddenSet);
        setCatalogProducts(products);

        let parsed: AdminBundle[] = [];
        try {
          const raw = bundleRow?.value ? JSON.parse(bundleRow.value) : [];
          if (Array.isArray(raw) && raw.length) parsed = raw;
        } catch {
          parsed = [];
        }

        const sourceBundles: AdminBundle[] = parsed.length ? parsed : adminEditableBundles();
        const editable: EditableBundle[] = sourceBundles.map((b) => {
          const def = defaultBundles.find((db) => db.id === b.id);
          const rawItems = Array.isArray(b.items) ? b.items : def?.items ?? [];
          const normalizedItems: BundleItemConfig[] = rawItems.map((it) => {
            const resolved = resolveProductForBundleItem(it, products, hiddenSet);
            return {
              nameMatch: resolved?.name || it.nameMatch,
              qty: Math.max(1, Math.round(Number(it.qty) || 1)),
              productId: resolved?.id || it.productId,
              slug: resolved?.slug || it.slug,
            };
          });
          return {
            ...b,
            devicesEn: splitBundleDevices(b.devicesEn).join("\n"),
            devicesAr: splitBundleDevices(b.devicesAr).join("\n"),
            items: normalizedItems,
          };
        });

        setBundles(editable);
      } catch (e: any) {
        toast({ title: "Failed to load bundles", description: e?.message || String(e), variant: "destructive" });
        setBundles(
          adminEditableBundles().map((b) => ({
            ...b,
            items: b.items ?? [],
          })),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const publishedProducts = useMemo(
    () => catalogProducts.filter((p) => !hiddenIds.has(p.id)),
    [catalogProducts, hiddenIds],
  );

  const getComputedBundleTotals = (b: EditableBundle) => {
    const items = b.items || [];
    if (catalogProducts.length > 0) {
      const breakdown = getBundleCompositionBreakdown(b, catalogProducts, hiddenIds);
      if (items.length === 0) {
        return { priceEgp: 0, originalPrice: 0, installSaving: 0, breakdown };
      }
      if (breakdown.allResolved) {
        const priceEgp = breakdown.fullCompositionTotal;
        const originalPrice = Math.round(priceEgp * 1.2);
        return {
          priceEgp,
          originalPrice,
          installSaving: Math.max(0, originalPrice - priceEgp),
          breakdown,
        };
      }
    }
    const priceEgp = Number(b.priceEgp || 0);
    const originalPrice = Math.round(priceEgp * 1.2);
    return {
      priceEgp,
      originalPrice,
      installSaving: Math.max(0, originalPrice - priceEgp),
      breakdown: catalogProducts.length ? getBundleCompositionBreakdown(b, catalogProducts, hiddenIds) : null,
    };
  };

  const addBundle = () =>
    setBundles((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nameEn: "New Bundle",
        nameAr: "باقة جديدة",
        descEn: "",
        descAr: "",
        priceEgp: 0,
        originalPrice: 0,
        devicesEn: "",
        devicesAr: "",
        savingsEn: "FREE Certified Installation (Save 0 EGP) + Lower electricity bills",
        savingsAr: "تركيب احترافي مجاناً (وفّر ٠ ج.م) + تقليل فاتورة الكهرباء",
        items: [],
      },
    ]);

  const removeBundle = (id: string) => setBundles((prev) => prev.filter((b) => b.id !== id));

  const update = (id: string, field: keyof EditableBundle, value: any) =>
    setBundles((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));

  const updateBundleItemQty = (bundleId: string, itemIdx: number, qty: number) => {
    const cleanQty = Math.max(1, Math.round(Number(qty) || 1));
    setBundles((prev) =>
      prev.map((b) => {
        if (b.id !== bundleId) return b;
        const nextItems = b.items.map((it, idx) => (idx === itemIdx ? { ...it, qty: cleanQty } : it));
        return { ...b, items: nextItems };
      }),
    );
  };

  const removeBundleItem = (bundleId: string, itemIdx: number) => {
    setBundles((prev) =>
      prev.map((b) => (b.id === bundleId ? { ...b, items: b.items.filter((_, idx) => idx !== itemIdx) } : b)),
    );
  };

  const addProductToBundle = (bundleId: string, product: Product) => {
    setBundles((prev) =>
      prev.map((b) => {
        if (b.id !== bundleId) return b;
        const existingIdx = b.items.findIndex(
          (it) => it.productId === product.id || (it.slug && it.slug.toLowerCase() === product.slug.toLowerCase()),
        );
        if (existingIdx >= 0) {
          const nextItems = b.items.map((it, idx) =>
            idx === existingIdx
              ? { ...it, qty: it.qty + 1, productId: product.id, slug: product.slug, nameMatch: product.name }
              : it,
          );
          return { ...b, items: nextItems };
        }
        return {
          ...b,
          items: [
            ...b.items,
            { productId: product.id, slug: product.slug, nameMatch: product.name, qty: 1 },
          ],
        };
      }),
    );
    setProductSearch((prev) => ({ ...prev, [bundleId]: "" }));
  };

  const syncDevicesEnFromItems = (bundleId: string) => {
    setBundles((prev) =>
      prev.map((b) => {
        if (b.id !== bundleId) return b;
        const lines = b.items.map((it) => {
          const prod = resolveProductForBundleItem(it, catalogProducts, hiddenIds);
          return `${it.qty}x ${prod?.name || it.nameMatch}`;
        });
        return { ...b, devicesEn: lines.join("\n") };
      }),
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const payloadToSave: EditableBundle[] = bundles.map((b) => {
        const normalizedItems: BundleItemConfig[] = (b.items || [])
          .filter((it) => Number(it.qty) > 0)
          .map((it) => {
            const resolved = resolveProductForBundleItem(it, catalogProducts, hiddenIds);
            return {
              nameMatch: resolved?.name || it.nameMatch,
              qty: Math.max(1, Math.round(Number(it.qty) || 1)),
              productId: resolved?.id || it.productId,
              slug: resolved?.slug || it.slug,
            };
          });

        const updatedBundle: EditableBundle = {
          ...b,
          items: normalizedItems,
          devicesEn: splitBundleDevices(b.devicesEn).join("\n"),
          devicesAr: splitBundleDevices(b.devicesAr).join("\n"),
        };

        const { priceEgp, originalPrice, installSaving } = getComputedBundleTotals(updatedBundle);
        return withComputedInstallSaving(
          {
            ...updatedBundle,
            priceEgp,
            originalPrice,
          },
          installSaving,
        );
      });

      const { data, error } = await supabase.functions.invoke("admin-write", {
        body: {
          action: "update-site-info",
          token: adminToken,
          entries: [{ section: STORAGE_KEY.section, key: STORAGE_KEY.key, value: JSON.stringify(payloadToSave) }],
        },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message);
      setBundles(payloadToSave);
      toast({ title: "Bundles saved", description: "Composition, totals, and display text synced live." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Package className="h-5 w-5 text-primary" />Smart Home Bundles</h3>
        <Button onClick={addBundle} size="sm"><Plus className="h-4 w-4 mr-1" />Add Bundle</Button>
      </div>

      {bundles.length === 0 && (
        <div className="bg-muted/30 border border-dashed rounded-xl p-8 text-center text-sm text-muted-foreground">
          Default bundles are ready to edit. Add another bundle if you need a custom package.
        </div>
      )}

      {bundles.map((b) => {
        const { priceEgp, originalPrice, installSaving } = getComputedBundleTotals(b);
        const query = (productSearch[b.id] || "").trim().toLowerCase();
        const searchMatches = query
          ? publishedProducts
              .filter(
                (p) =>
                  p.name.toLowerCase().includes(query) ||
                  (p.slug || "").toLowerCase().includes(query) ||
                  (p.brand || "").toLowerCase().includes(query),
              )
              .slice(0, 12)
          : [];

        return (
          <div key={b.id} data-bundle-id={b.id} className="bg-card border rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground font-mono">{b.id}</span>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {priceEgp.toLocaleString()} EGP
                </span>
                <span className="text-xs text-muted-foreground line-through">
                  {originalPrice.toLocaleString()} EGP
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Save {installSaving.toLocaleString()} EGP
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeBundle(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Name (EN)</Label><Input value={b.nameEn} onChange={(e) => update(b.id, "nameEn", e.target.value)} /></div>
              <div><Label>Name (AR)</Label><Input value={b.nameAr} onChange={(e) => update(b.id, "nameAr", e.target.value)} /></div>
              <div><Label>Description (EN)</Label><Textarea rows={2} value={b.descEn} onChange={(e) => update(b.id, "descEn", e.target.value)} /></div>
              <div><Label>Description (AR)</Label><Textarea rows={2} value={b.descAr} onChange={(e) => update(b.id, "descAr", e.target.value)} /></div>
              <div>
                <Label>Price (EGP) <span className="text-[11px] font-normal text-muted-foreground">(computed from items)</span></Label>
                <Input type="number" value={priceEgp} readOnly className="bg-muted/50 cursor-not-allowed font-semibold" />
              </div>
              <div>
                <Label>Original price (EGP) <span className="text-[11px] font-normal text-muted-foreground">(round(Price × 1.2))</span></Label>
                <Input type="number" value={originalPrice} readOnly className="bg-muted/50 cursor-not-allowed" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Devices (EN, one per line)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => syncDevicesEnFromItems(b.id)}
                    className="h-6 px-2 text-[11px] text-primary"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Sync from items
                  </Button>
                </div>
                <Textarea rows={5} value={b.devicesEn} onChange={(e) => update(b.id, "devicesEn", e.target.value)} />
              </div>
              <div>
                <Label className="block mb-1">Devices (AR, one per line)</Label>
                <Textarea rows={5} value={b.devicesAr} onChange={(e) => update(b.id, "devicesAr", e.target.value)} />
              </div>
              <div><Label>Savings note (EN)</Label><Input value={b.savingsEn} onChange={(e) => update(b.id, "savingsEn", e.target.value)} /></div>
              <div><Label>Savings note (AR)</Label><Input value={b.savingsAr} onChange={(e) => update(b.id, "savingsAr", e.target.value)} /></div>
            </div>

            {/* Editable Bundle Composition (Single Source of Truth) */}
            <div className="border-t border-border pt-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="text-sm font-semibold">
                  Bundle Products Composition ({b.items.length} items)
                </Label>
                <span className="text-xs text-muted-foreground">
                  Drives public Price, Original (×1.2), Savings, Customize dialog, and Cart
                </span>
              </div>

              {b.items.length === 0 ? (
                <p className="text-xs text-muted-foreground border border-dashed rounded-lg p-3 text-center">
                  No products in this bundle yet. Search published products below to add items.
                </p>
              ) : (
                <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                  {b.items.map((it, idx) => {
                    const resolved = resolveProductForBundleItem(it, catalogProducts, hiddenIds);
                    const isHidden = resolved ? hiddenIds.has(resolved.id) : false;
                    const isOos = resolved ? (resolved.stock ?? 0) <= 0 : false;
                    const unitPrice = resolved ? Number(resolved.price) : 0;
                    const lineTotal = unitPrice * (Number(it.qty) || 0);

                    return (
                      <div key={`${it.productId || it.slug || it.nameMatch}-${idx}`} className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 p-2.5 bg-background/60">
                        <img
                          src={resolved?.image_url || "/placeholder.svg"}
                          alt={resolved?.name || it.nameMatch}
                          className="w-9 h-9 rounded object-contain bg-muted/30 border border-border/50 p-0.5 shrink-0"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium text-foreground truncate max-w-full">
                              {resolved?.name || it.nameMatch}
                            </span>
                            {!resolved ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/15 text-destructive font-semibold">
                                Not found
                              </span>
                            ) : isHidden || isOos ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {isHidden ? "Hidden" : "Out of stock"} (Stock: {resolved.stock})
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium">
                                Published · Stock {resolved.stock}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono truncate">
                            {resolved?.slug || it.slug || it.productId || "—"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ms-auto">
                          <div className="text-right min-w-[88px]">
                            <div className="text-xs font-semibold text-foreground">{lineTotal.toLocaleString()} EGP</div>
                            <div className="text-[10px] text-muted-foreground">{unitPrice.toLocaleString()} ea</div>
                          </div>
                          <Input
                            type="number"
                            min={1}
                            aria-label={`Quantity for ${resolved?.name || it.nameMatch}`}
                            value={it.qty}
                            onChange={(e) => updateBundleItemQty(b.id, idx, Number(e.target.value))}
                            className="w-16 h-8 text-center text-xs"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove ${resolved?.name || it.nameMatch}`}
                            onClick={() => removeBundleItem(b.id, idx)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Search & add published products */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={productSearch[b.id] || ""}
                  onChange={(e) => setProductSearch((prev) => ({ ...prev, [b.id]: e.target.value }))}
                  placeholder="Add published product by name or slug (hidden duplicates excluded)…"
                  className="pl-9 h-9 text-xs"
                />
                {searchMatches.length > 0 && (
                  <div className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-popover divide-y divide-border shadow-md">
                    {searchMatches.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProductToBundle(b.id, p)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{p.slug}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold">{Number(p.price).toLocaleString()} EGP</span>
                          <span className={`text-[10px] ${(p.stock ?? 0) > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                            Stock: {p.stock}
                          </span>
                          <span className="text-xs text-primary font-medium">+ Add</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {query && searchMatches.length === 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1 px-1">
                    No published product matched &ldquo;{productSearch[b.id]}&rdquo;.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={saving} size="lg" className="shadow-lg">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save bundles
        </Button>
      </div>
    </div>
  );
}
