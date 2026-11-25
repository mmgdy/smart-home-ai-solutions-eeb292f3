import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Layers, Loader2, Search, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DependencyRelationType, ProductDependencyRecord } from "@/lib/productDependencies";

export interface DependencyCandidateProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  image_url: string | null;
  brand: string | null;
  protocol: string | null;
}

interface ProductDependenciesEditorProps {
  currentProductId?: string;
  allProducts: DependencyCandidateProduct[];
  hiddenIds: Set<string>;
  dependencies: ProductDependencyRecord[];
  loading?: boolean;
  onChange: (next: ProductDependencyRecord[]) => void;
}

function normalizeSortOrder(list: ProductDependencyRecord[]): ProductDependencyRecord[] {
  return list.map((item, idx) => ({ ...item, sort_order: idx }));
}

export function ProductDependenciesEditor({
  currentProductId,
  allProducts,
  hiddenIds,
  dependencies,
  loading = false,
  onChange,
}: ProductDependenciesEditorProps) {
  const [search, setSearch] = useState("");

  const productById = useMemo(
    () => new Map(allProducts.map((p) => [p.id, p])),
    [allProducts],
  );

  const selectedIdSet = useMemo(
    () => new Set(dependencies.map((d) => d.dependent_product_id)),
    [dependencies],
  );

  const searchMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allProducts
      .filter(
        (p) =>
          p.id !== currentProductId &&
          !selectedIdSet.has(p.id) &&
          !hiddenIds.has(p.id) &&
          (p.name.toLowerCase().includes(q) ||
            (p.slug || "").toLowerCase().includes(q) ||
            (p.brand || "").toLowerCase().includes(q)),
      )
      .slice(0, 12);
  }, [allProducts, currentProductId, hiddenIds, search, selectedIdSet]);

  const addDependency = (product: DependencyCandidateProduct) => {
    if (selectedIdSet.has(product.id) || product.id === currentProductId) return;
    const next = normalizeSortOrder([
      ...dependencies,
      {
        dependent_product_id: product.id,
        relation_type: "recommended",
        sort_order: dependencies.length,
        default_checked: false,
      },
    ]);
    onChange(next);
    setSearch("");
  };

  const removeDependency = (idx: number) => {
    onChange(normalizeSortOrder(dependencies.filter((_, i) => i !== idx)));
  };

  const moveDependency = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= dependencies.length) return;
    const copy = [...dependencies];
    const [moved] = copy.splice(idx, 1);
    copy.splice(target, 0, moved);
    onChange(normalizeSortOrder(copy));
  };

  const updateField = (
    idx: number,
    patch: Partial<Pick<ProductDependencyRecord, "relation_type" | "default_checked">>,
  ) => {
    const next = dependencies.map((d, i) => (i === idx ? { ...d, ...patch } : d));
    onChange(normalizeSortOrder(next));
  };

  return (
    <div
      data-testid="product-dependencies-editor"
      className="md:col-span-2 border-t border-border pt-4 mt-2 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-medium flex items-center gap-2 text-sm">
            <Layers className="h-4 w-4 text-primary" />
            Dependent products (Complete your setup)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {dependencies.length > 0
              ? `Manual override active (${dependencies.length} item${dependencies.length === 1 ? "" : "s"}) — overrides automatic ecosystem suggestions.`
              : "No manual dependencies set — automatic ecosystem suggestions are shown on the storefront."}
          </p>
        </div>
        {dependencies.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([])}
            className="h-8 text-xs text-muted-foreground"
          >
            Clear manual list (use auto)
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading manual dependencies…
        </div>
      ) : (
        <>
          {dependencies.length > 0 && (
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {dependencies.map((dep, idx) => {
                const prod = productById.get(dep.dependent_product_id);
                const isHidden = prod ? hiddenIds.has(prod.id) : false;
                const isOos = prod ? (prod.stock ?? 0) <= 0 : true;
                return (
                  <div
                    key={dep.dependent_product_id}
                    data-testid="admin-dependent-row"
                    className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 p-2.5 bg-muted/20"
                  >
                    <img
                      src={prod?.image_url || "/placeholder.svg"}
                      alt={prod?.name || dep.dependent_product_id}
                      className="w-9 h-9 rounded object-contain bg-background border border-border/50 p-0.5 shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium text-foreground truncate max-w-[260px]">
                          {prod?.name || `Unknown (${dep.dependent_product_id.slice(0, 8)})`}
                        </span>
                        {prod && (isHidden || isOos) && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {isHidden ? "Hidden (excluded)" : "Out of stock"}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">
                        {prod ? `${prod.slug} • ${Number(prod.price).toLocaleString()} EGP` : dep.dependent_product_id}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Select
                        value={dep.relation_type}
                        onValueChange={(val) =>
                          updateField(idx, { relation_type: val as DependencyRelationType })
                        }
                      >
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="required">required</SelectItem>
                          <SelectItem value="recommended">recommended</SelectItem>
                          <SelectItem value="accessory">accessory</SelectItem>
                        </SelectContent>
                      </Select>

                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none px-1">
                        <Checkbox
                          checked={dep.default_checked}
                          disabled={!prod || isHidden || isOos}
                          onCheckedChange={(v) => updateField(idx, { default_checked: Boolean(v) })}
                        />
                        <span>Default</span>
                      </label>

                      <div className="flex items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Move dependency up"
                          disabled={idx === 0}
                          onClick={() => moveDependency(idx, -1)}
                          className="h-7 w-7"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Move dependency down"
                          disabled={idx === dependencies.length - 1}
                          onClick={() => moveDependency(idx, 1)}
                          className="h-7 w-7"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${prod?.name || "dependent"}`}
                          onClick={() => removeDependency(idx)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Search & add products by name or slug */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Add dependent product (published catalog)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by name or slug to add…"
                className="pl-9 h-9 text-xs"
              />
            </div>
            {searchMatches.length > 0 && (
              <div className="max-h-52 overflow-y-auto rounded-lg border border-border bg-popover divide-y divide-border shadow-md">
                {searchMatches.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addDependency(p)}
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
            {search.trim() && searchMatches.length === 0 && (
              <p className="text-[11px] text-muted-foreground px-1">
                No matching published product found for &ldquo;{search}&rdquo;.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
