import { useEffect, useState } from 'react';
import { Loader2, Sparkles, Merge, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Suggestion {
  key: string;
  items: Array<{ id: string; name: string; brand: string | null; price: number; stock: number; image_url: string | null; parent_id: string | null }>;
}

interface AllProduct {
  id: string;
  name: string;
  brand: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  parent_id: string | null;
  variant_axis: string | null;
  variant_label: string | null;
}

export function VariantsManager({ adminToken }: { adminToken: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [allProducts, setAllProducts] = useState<AllProduct[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [masterId, setMasterId] = useState<string | null>(null);
  const [axis, setAxis] = useState<'channels' | 'color'>('channels');
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [merging, setMerging] = useState(false);

  const loadAll = async () => {
    const { data } = await supabase
      .from('products')
      .select('id,name,brand,price,stock,image_url,parent_id,variant_axis,variant_label')
      .order('brand')
      .order('name');
    setAllProducts((data as AllProduct[]) || []);
  };

  useEffect(() => { loadAll(); }, []);

  // Strip variant tokens to derive a base key for grouping suggestions
  const stripTokens = (s: string) =>
    s.toLowerCase()
      .replace(/\b(\d+)\s*(w|watt|watts|m|cm|mm|amp|a|gang|ch|channel|key|button|buttons|way|ways)\b/g, '')
      .replace(/\b(black|white|gold|silver|gray|grey|red|blue|green|brown|beige|champagne|rose|pink)\b/g, '')
      .replace(/\b(1|2|3|4|5|6)[\s-]?(gang|channel|ch|button|key|way)\b/g, '')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  // Suggestions are computed client-side from already-loaded allProducts — no edge call needed.
  const computeSuggestions = (products: AllProduct[]): Suggestion[] => {
    const groups: Record<string, AllProduct[]> = {};
    for (const p of products) {
      if (p.parent_id) continue;
      const key = `${(p.brand || '').toLowerCase()}::${stripTokens(p.name)}`;
      if (!key.split('::')[1]) continue;
      (groups[key] ||= []).push(p);
    }
    return Object.entries(groups)
      .filter(([, items]) => items.length >= 2)
      .map(([key, items]) => ({ key, items }));
  };

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('products')
        .select('id,name,brand,price,stock,image_url,parent_id,variant_axis,variant_label')
        .is('parent_id', null);
      setSuggestions(computeSuggestions((data as AllProduct[]) || []));
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const callRpc = async (fn: string, params: Record<string, any>) => {
    const { data, error } = await supabase.rpc(fn as any, params);
    if (error) throw error;
    const result = data as any;
    if (!result?.success) throw new Error(result?.error || 'Failed');
    return result;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const adoptSuggestion = (s: Suggestion) => {
    const ids = s.items.map((i) => i.id);
    setSelectedIds(ids);
    setMasterId(ids[0]);
    setLabels({});
  };

  const handleMerge = async () => {
    if (!masterId || selectedIds.length < 2) {
      toast({ title: 'Pick a master + at least 2 products', variant: 'destructive' });
      return;
    }
    setMerging(true);
    try {
      await callRpc('admin_merge_variants', {
        p_token: adminToken,
        p_master_id: masterId,
        p_variant_ids: selectedIds,
        p_axis: axis,
        p_labels: labels,
      });
      toast({ title: 'Merged ✓', description: `${selectedIds.length} products merged into one variant group.` });
      setSelectedIds([]);
      setMasterId(null);
      setLabels({});
      await Promise.all([loadAll(), fetchSuggestions()]);
    } catch (e: any) {
      toast({ title: 'Merge failed', description: e.message, variant: 'destructive' });
    } finally {
      setMerging(false);
    }
  };

  const handleUnmerge = async (id: string) => {
    try {
      await callRpc('admin_unmerge_variant', { p_token: adminToken, p_id: id });
      toast({ title: 'Unmerged' });
      await loadAll();
    } catch (e: any) {
      toast({ title: 'Failed', description: e.message, variant: 'destructive' });
    }
  };

  const filteredAll = allProducts.filter((p) => {
    if (p.parent_id) return false; // hide existing variant children from picker
    if (!search) return true;
    return (p.name + ' ' + (p.brand || '')).toLowerCase().includes(search.toLowerCase());
  });

  const selectedProducts = allProducts.filter((p) => selectedIds.includes(p.id));

  const existingGroups = allProducts.filter((p) => p.parent_id);

  return (
    <div className="space-y-8">
      {/* Auto-suggest */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Auto-detect duplicate groups</h3>
            <p className="text-xs text-muted-foreground">Strips color/wattage/channel tokens to find candidates.</p>
          </div>
          <Button onClick={fetchSuggestions} disabled={loading} size="sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Scan catalog'}
          </Button>
        </div>
        {suggestions.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">No suggestions yet — click Scan.</p>
        )}
        <div className="space-y-3">
          {suggestions.map((s) => (
            <div key={s.key} className="rounded-xl border border-border p-3">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="text-xs text-muted-foreground truncate">{s.key}</div>
                <Button size="sm" variant="outline" onClick={() => adoptSuggestion(s)}>Use these</Button>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {s.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/40">
                    {it.image_url && <img src={it.image_url} alt="" className="w-8 h-8 rounded object-cover" />}
                    <div className="flex-1 truncate">{it.name}</div>
                    <span className="text-xs text-muted-foreground">{it.price} EGP</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Manual merge */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-4"><Merge className="w-4 h-4 text-primary" /> Manual merge</h3>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label className="text-xs">Variant axis</Label>
            <Select value={axis} onValueChange={(v) => setAxis(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="channels">Channels (1/2/3 gang)</SelectItem>
                <SelectItem value="color">Color</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Search to add products</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" className="pl-8" />
            </div>
          </div>
        </div>

        {/* Picker */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="border border-border rounded-xl p-2 max-h-72 overflow-y-auto">
            <p className="text-xs text-muted-foreground px-2 py-1">All standalone products</p>
            {filteredAll.slice(0, 60).map((p) => (
              <button
                key={p.id}
                onClick={() => toggleSelect(p.id)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm hover:bg-muted/60 ${selectedIds.includes(p.id) ? 'bg-primary/10' : ''}`}
              >
                {p.image_url && <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover" />}
                <div className="flex-1 min-w-0">
                  <div className="truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.brand} · {p.price} EGP</div>
                </div>
              </button>
            ))}
          </div>

          <div className="border border-border rounded-xl p-2 max-h-72 overflow-y-auto">
            <p className="text-xs text-muted-foreground px-2 py-1">Selected ({selectedIds.length})</p>
            {selectedProducts.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">Pick 2+ products from the left.</p>
            )}
            {selectedProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 mb-1">
                {p.image_url && <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{p.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => setMasterId(p.id)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${masterId === p.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}
                    >
                      {masterId === p.id ? '★ Master' : 'Set master'}
                    </button>
                    <Input
                      value={labels[p.id] || ''}
                      onChange={(e) => setLabels({ ...labels, [p.id]: e.target.value })}
                      placeholder={axis === 'channels' ? 'e.g. 2 Gang' : 'e.g. Black'}
                      className="h-7 text-xs"
                    />
                  </div>
                </div>
                <button onClick={() => toggleSelect(p.id)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={handleMerge} disabled={merging || !masterId || selectedIds.length < 2}>
            {merging ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Merge className="w-4 h-4 mr-2" />}
            Merge into one product
          </Button>
        </div>
      </section>

      {/* Existing variant groups */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-4">Existing variants ({existingGroups.length})</h3>
        {existingGroups.length === 0 && (
          <p className="text-sm text-muted-foreground">No variants merged yet.</p>
        )}
        <div className="space-y-2">
          {existingGroups.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/40">
              {p.image_url && <img src={p.image_url} alt="" className="w-8 h-8 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.variant_axis} · {p.variant_label}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleUnmerge(p.id)}>Unmerge</Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}