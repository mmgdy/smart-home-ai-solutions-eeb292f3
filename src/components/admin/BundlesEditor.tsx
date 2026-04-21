import { useEffect, useState } from "react";
import { Loader2, Save, Plus, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { adminEditableBundles } from "@/lib/bundles";

interface Bundle {
  id: string;
  nameEn: string; nameAr: string;
  descEn: string; descAr: string;
  priceEgp: number; originalPrice: number;
  devicesEn: string; devicesAr: string; // newline-separated
  savingsEn: string; savingsAr: string;
}

const STORAGE_KEY = { section: "bundles", key: "list" };

export function BundlesEditor({ adminToken }: { adminToken: string }) {
  const { toast } = useToast();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_info")
        .select("value").eq("section", STORAGE_KEY.section).eq("key", STORAGE_KEY.key).maybeSingle();
      try {
        const parsed = data?.value ? JSON.parse(data.value) : [];
        setBundles(Array.isArray(parsed) && parsed.length ? parsed : adminEditableBundles());
      } catch { setBundles(adminEditableBundles()); }
      setLoading(false);
    })();
  }, []);

  const addBundle = () => setBundles(prev => [...prev, {
    id: crypto.randomUUID(),
    nameEn: "New Bundle", nameAr: "باقة جديدة",
    descEn: "", descAr: "",
    priceEgp: 0, originalPrice: 0,
    devicesEn: "", devicesAr: "",
    savingsEn: "", savingsAr: "",
  }]);

  const removeBundle = (id: string) => setBundles(prev => prev.filter(b => b.id !== id));
  const update = (id: string, field: keyof Bundle, value: any) =>
    setBundles(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));

  const save = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-write", {
        body: {
          action: "update-site-info", token: adminToken,
          entries: [{ section: STORAGE_KEY.section, key: STORAGE_KEY.key, value: JSON.stringify(bundles) }],
        },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message);
      toast({ title: "Bundles saved", description: "Live on the site." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
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

      {bundles.map((b) => (
        <div key={b.id} className="bg-card border rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground font-mono">{b.id.slice(0, 8)}</span>
            <Button variant="ghost" size="sm" onClick={() => removeBundle(b.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Name (EN)</Label><Input value={b.nameEn} onChange={(e) => update(b.id, "nameEn", e.target.value)} /></div>
            <div><Label>Name (AR)</Label><Input value={b.nameAr} onChange={(e) => update(b.id, "nameAr", e.target.value)} /></div>
            <div><Label>Description (EN)</Label><Textarea rows={2} value={b.descEn} onChange={(e) => update(b.id, "descEn", e.target.value)} /></div>
            <div><Label>Description (AR)</Label><Textarea rows={2} value={b.descAr} onChange={(e) => update(b.id, "descAr", e.target.value)} /></div>
            <div><Label>Price (EGP)</Label><Input type="number" value={b.priceEgp} onChange={(e) => update(b.id, "priceEgp", Number(e.target.value))} /></div>
            <div><Label>Original price (EGP)</Label><Input type="number" value={b.originalPrice} onChange={(e) => update(b.id, "originalPrice", Number(e.target.value))} /></div>
            <div><Label>Devices (EN, one per line)</Label><Textarea rows={4} value={b.devicesEn} onChange={(e) => update(b.id, "devicesEn", e.target.value)} /></div>
            <div><Label>Devices (AR, one per line)</Label><Textarea rows={4} value={b.devicesAr} onChange={(e) => update(b.id, "devicesAr", e.target.value)} /></div>
            <div><Label>Savings note (EN)</Label><Input value={b.savingsEn} onChange={(e) => update(b.id, "savingsEn", e.target.value)} /></div>
            <div><Label>Savings note (AR)</Label><Input value={b.savingsAr} onChange={(e) => update(b.id, "savingsAr", e.target.value)} /></div>
          </div>
        </div>
      ))}

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={saving} size="lg" className="shadow-lg">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save bundles
        </Button>
      </div>
    </div>
  );
}
