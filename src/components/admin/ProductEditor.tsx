import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Upload, Search, X, Save, Image as ImageIcon, Video, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getProductImage } from "@/lib/productImage";

interface Props {
  adminToken: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  original_price: number | null;
  category_id: string | null;
  brand: string | null;
  protocol: string | null;
  image_url: string | null;
  stock: number;
  featured: boolean | null;
  video_url: string | null;
}

interface Category { id: string; name: string; }

const blank: Partial<Product> = {
  name: "", slug: "", description: "", price: 0, original_price: null,
  category_id: null, brand: "", protocol: "", image_url: "", stock: 10,
  featured: false, video_url: "",
};

export function ProductEditor({ adminToken }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Product>>(blank);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: c }, { data: vizData }] = await Promise.all([
      supabase.from("products").select("id, name, slug, description, price, original_price, category_id, brand, protocol, image_url, stock, featured, video_url").order("updated_at", { ascending: false }).limit(500),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("site_info").select("value").eq("section", "products").eq("key", "hidden_ids").maybeSingle(),
    ]);
    setProducts((p as any) ?? []);
    setCategories((c as any) ?? []);
    try { setHiddenIds(vizData?.value ? JSON.parse(vizData.value) : []); } catch { setHiddenIds([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) ||
             (p.brand ?? "").toLowerCase().includes(q) ||
             (p.slug ?? "").toLowerCase().includes(q),
    );
  }, [products, search]);

  const openNew = () => { setEditing({ ...blank }); setOpen(true); };
  const openEdit = (p: Product) => { setEditing({ ...p }); setOpen(true); };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `manual/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        upsert: true, contentType: file.type, cacheControl: "31536000",
      });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setEditing((prev) => ({ ...prev, image_url: data.publicUrl }));
      toast({ title: "Image uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (file: File) => {
    setVideoUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `manual/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("product-videos").upload(path, file, {
        upsert: true, contentType: file.type, cacheControl: "31536000",
      });
      if (error) throw error;
      const { data } = supabase.storage.from("product-videos").getPublicUrl(path);
      setEditing((prev) => ({ ...prev, video_url: data.publicUrl }));
      toast({ title: "Video uploaded" });
    } catch (e: any) {
      toast({ title: "Video upload failed", description: e.message, variant: "destructive" });
    } finally {
      setVideoUploading(false);
    }
  };

  const save = async () => {
    if (!editing.name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const isNew = !editing.id;
      const action = isNew ? "create-product" : "update-product";
      const body = isNew
        ? { action, token: adminToken, product: editing }
        : { action, token: adminToken, id: editing.id, updates: editing };
      const { data, error } = await supabase.functions.invoke("admin-write", { body });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Failed");
      toast({ title: isNew ? "Product created" : "Product saved" });
      setOpen(false);
      await load();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const del = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-write", {
        body: { action: "delete-product", token: adminToken, id: p.id },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Failed");
      toast({ title: "Deleted" });
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const toggleVisibility = async (p: Product) => {
    setTogglingId(p.id);
    const isHidden = hiddenIds.includes(p.id);
    const newHiddenIds = isHidden
      ? hiddenIds.filter((id) => id !== p.id)
      : [...hiddenIds, p.id];
    try {
      const { data, error } = await supabase.functions.invoke("admin-write", {
        body: { action: "update-site-info", token: adminToken, entries: [{ section: "products", key: "hidden_ids", value: JSON.stringify(newHiddenIds) }] },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Failed");
      setHiddenIds(newHiddenIds);
      toast({ title: isHidden ? "Product published" : "Product hidden" });
    } catch (e: any) {
      toast({ title: "Failed to update visibility", description: e.message, variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, brand, slug…" className="pl-9" />
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Product</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
            {filtered.slice(0, 200).map((p) => {
              const isHidden = hiddenIds.includes(p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 hover:bg-muted/40">
                  <img
                    src={getProductImage(p as any)}
                    alt={p.name}
                    className="w-14 h-14 rounded-lg object-cover bg-muted flex-shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{p.name}</p>
                      {isHidden ? (
                        <span className="text-xs bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-full shrink-0">Hidden</span>
                      ) : (
                        <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full shrink-0">Published</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.brand || "No brand"} • {p.price} EGP • Stock: {p.stock}
                      {p.featured ? " • ⭐ Featured" : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleVisibility(p)}
                    disabled={togglingId === p.id}
                    className="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
                    title={isHidden ? "Click to publish" : "Click to hide"}
                  >
                    {togglingId === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isHidden ? (
                      <EyeOff className="h-4 w-4 text-orange-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-green-600" />
                    )}
                  </button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => del(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="p-8 text-center text-muted-foreground">No products match.</p>}
            {filtered.length > 200 && (
              <p className="p-3 text-center text-xs text-muted-foreground">Showing first 200 of {filtered.length}. Refine your search to see more.</p>
            )}
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <Label>Image</Label>
              <div className="flex items-center gap-3">
                <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border">
                  {editing.image_url ? (
                    <img src={editing.image_url} alt="" className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Input value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://… or upload" />
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    Upload
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Name *</Label>
              <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Slug (auto if empty)</Label>
              <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Brand</Label>
              <Input value={editing.brand ?? ""} onChange={(e) => setEditing({ ...editing, brand: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Price (EGP) *</Label>
              <Input type="number" value={editing.price ?? 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
            </div>

            <div className="space-y-2">
              <Label>Original Price (EGP)</Label>
              <Input type="number" value={editing.original_price ?? ""} onChange={(e) => setEditing({ ...editing, original_price: e.target.value ? Number(e.target.value) : null })} />
            </div>

            <div className="space-y-2">
              <Label>Stock</Label>
              <Input type="number" value={editing.stock ?? 0} onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })} />
            </div>

            <div className="space-y-2">
              <Label>Protocol</Label>
              <Input value={editing.protocol ?? ""} onChange={(e) => setEditing({ ...editing, protocol: e.target.value })} placeholder="WiFi, Zigbee, Z-Wave…" />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editing.category_id ?? "none"} onValueChange={(v) => setEditing({ ...editing, category_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Uncategorized —</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Video (YouTube URL or upload from computer)</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={editing.video_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, video_url: e.target.value })}
                  placeholder="https://youtube.com/… or upload ↓"
                  className="flex-1"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/ogg,video/quicktime"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => videoInputRef.current?.click()} disabled={videoUploading}>
                  {videoUploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Video className="h-4 w-4 mr-1" />}
                  Upload
                </Button>
              </div>
              {editing.video_url && /\.(mp4|webm|ogg|mov)(\?|$)/i.test(editing.video_url) && (
                <video src={editing.video_url} className="w-full rounded-lg mt-1 max-h-32" controls />
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Description</Label>
              <Textarea rows={4} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>

            <div className="flex items-center gap-3 md:col-span-2">
              <Switch checked={!!editing.featured} onCheckedChange={(v) => setEditing({ ...editing, featured: v })} />
              <Label>Featured on homepage</Label>
            </div>

            {editing.id && (
              <div className="md:col-span-2 p-3 bg-muted/40 rounded-lg text-sm text-muted-foreground flex items-center gap-2">
                <Eye className="h-4 w-4" />
                To show/hide this product from customers, use the eye icon in the product list.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}><X className="h-4 w-4 mr-2" />Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
