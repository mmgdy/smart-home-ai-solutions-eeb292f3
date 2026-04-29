import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tag, Zap, Search, Filter, Percent, RotateCcw, Loader2, RefreshCcw, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Product {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  category?: { name: string } | null;
}

interface Props {
  adminToken: string;
}

export function FlashSaleEditor({ adminToken }: Props) {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [maxPrice, setMaxPrice] = useState(100000);
  const [showDiscountedOnly, setShowDiscountedOnly] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Action
  const [discountPct, setDiscountPct] = useState('');

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('id, name, brand, price, original_price, image_url, categories(name)')
      .order('brand', { ascending: true })
      .limit(1000);
    if (data) {
      setProducts(data as any);
      const uniqueBrands = Array.from(new Set(data.map((p: any) => p.brand).filter(Boolean))).sort() as string[];
      const uniqueCats = Array.from(new Set(data.map((p: any) => p.categories?.name).filter(Boolean))).sort() as string[];
      setBrands(uniqueBrands);
      setCategories(uniqueCats);
      const max = Math.max(...data.map((p: any) => p.price), 100000);
      setMaxPrice(max);
      setPriceRange([0, max]);
    }
    setLoading(false);
  };

  const filtered = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (brandFilter.length && !brandFilter.includes(p.brand || '')) return false;
    if (categoryFilter && (p as any).category?.name !== categoryFilter) return false;
    if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
    if (showDiscountedOnly && !p.original_price) return false;
    return true;
  });

  const allSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id));

  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selectedIds);
      filtered.forEach(p => next.delete(p.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filtered.forEach(p => next.add(p.id));
      setSelectedIds(next);
    }
  };

  const toggleProduct = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleBrand = (brand: string) => {
    setBrandFilter(prev =>
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const applyDiscount = async (mode: 'discount' | 'reset') => {
    if (selectedIds.size === 0) {
      toast({ title: 'Select at least one product', variant: 'destructive' });
      return;
    }
    if (mode === 'discount') {
      const pct = parseFloat(discountPct);
      if (!pct || pct <= 0 || pct >= 100) {
        toast({ title: 'Enter a discount % between 1 and 99', variant: 'destructive' });
        return;
      }
    }

    setApplying(true);
    const selectedProducts = products.filter(p => selectedIds.has(p.id));
    let success = 0;
    let failed = 0;

    for (const p of selectedProducts) {
      let updates: Record<string, any>;
      if (mode === 'discount') {
        const pct = parseFloat(discountPct);
        const newPrice = Math.round(p.price * (1 - pct / 100));
        updates = {
          price: newPrice,
          original_price: p.price,
        };
      } else {
        if (!p.original_price) continue;
        updates = {
          price: p.original_price,
          original_price: null,
        };
      }

      const { data, error } = await supabase.functions.invoke('admin-write', {
        body: { action: 'update-product', token: adminToken, id: p.id, updates },
      });
      if (error || !data?.success) failed++;
      else success++;
    }

    toast({
      title: mode === 'discount'
        ? `Applied ${discountPct}% discount to ${success} products`
        : `Reset ${success} products to original prices`,
      description: failed ? `${failed} failed` : undefined,
      variant: failed && !success ? 'destructive' : 'default',
    });

    setApplying(false);
    await loadProducts();
    setSelectedIds(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Flash Sale & Bulk Discounts
        </h2>
        <Button variant="outline" size="sm" onClick={loadProducts}>
          <RefreshCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-medium flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filter Products
        </h3>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Category filter */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All categories</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price range */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-xs text-muted-foreground">Price Range</Label>
              <span className="text-xs text-muted-foreground">
                {priceRange[0].toLocaleString()} – {priceRange[1].toLocaleString()} EGP
              </span>
            </div>
            <Slider
              min={0}
              max={maxPrice}
              step={100}
              value={priceRange}
              onValueChange={(v) => setPriceRange([v[0], v[1]])}
            />
          </div>
        </div>

        {/* Brand filter */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Brand</Label>
          <div className="flex flex-wrap gap-2">
            {brands.map(brand => (
              <button
                key={brand}
                onClick={() => toggleBrand(brand)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  brandFilter.includes(brand)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border hover:border-primary/50'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>

        {/* Show discounted only */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="discounted-only"
            checked={showDiscountedOnly}
            onCheckedChange={(v) => setShowDiscountedOnly(!!v)}
          />
          <Label htmlFor="discounted-only" className="text-sm cursor-pointer">Show discounted products only</Label>
        </div>
      </div>

      {/* Action Panel */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" />
          Apply to Selected{selectedIds.size > 0 && (
            <Badge variant="secondary">{selectedIds.size} selected</Badge>
          )}
        </h3>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Discount %</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="99"
                placeholder="e.g. 20"
                value={discountPct}
                onChange={e => setDiscountPct(e.target.value)}
                className="w-28"
              />
              <Percent className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          <Button
            onClick={() => applyDiscount('discount')}
            disabled={applying || selectedIds.size === 0 || !discountPct}
            className="gap-2"
          >
            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Apply Discount
          </Button>

          <Button
            variant="outline"
            onClick={() => applyDiscount('reset')}
            disabled={applying || selectedIds.size === 0}
            className="gap-2"
          >
            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Reset to Original Price
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Applying a discount sets original_price = current price, then reduces price by the percentage. Reset swaps them back.
        </p>
      </div>

      {/* Product List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-3 p-3 border-b border-border bg-muted/30 text-sm font-medium text-muted-foreground">
          <button onClick={toggleAll} className="flex-shrink-0">
            {allSelected
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : <Square className="w-4 h-4" />
            }
          </button>
          <span className="flex-1">Product ({filtered.length})</span>
          <span className="w-28 text-right hidden sm:block">Brand</span>
          <span className="w-28 text-right">Price</span>
          <span className="w-28 text-right hidden md:block">Original</span>
          <span className="w-20 text-right hidden md:block">Discount</span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No products match the filters</div>
        ) : (
          <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
            {filtered.map(p => {
              const discount = p.original_price
                ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
                : null;
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors ${
                    selectedIds.has(p.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  <Checkbox
                    checked={selectedIds.has(p.id)}
                    onCheckedChange={() => toggleProduct(p.id)}
                    className="flex-shrink-0"
                  />
                  {/* Image */}
                  <div className="w-8 h-8 rounded bg-muted flex-shrink-0 overflow-hidden">
                    {p.image_url
                      ? <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-muted" />
                    }
                  </div>
                  {/* Name */}
                  <span className="flex-1 text-sm truncate">{p.name}</span>
                  {/* Brand */}
                  <span className="w-28 text-xs text-muted-foreground text-right hidden sm:block truncate">{p.brand || '—'}</span>
                  {/* Price */}
                  <span className={`w-28 text-sm font-bold text-right ${p.original_price ? 'text-destructive' : ''}`}>
                    {p.price.toLocaleString()} EGP
                  </span>
                  {/* Original */}
                  <span className="w-28 text-xs text-muted-foreground line-through text-right hidden md:block">
                    {p.original_price ? `${p.original_price.toLocaleString()} EGP` : '—'}
                  </span>
                  {/* Discount badge */}
                  <span className="w-20 text-right hidden md:block">
                    {discount ? (
                      <span className="text-xs font-bold text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-full">
                        -{discount}%
                      </span>
                    ) : '—'}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
