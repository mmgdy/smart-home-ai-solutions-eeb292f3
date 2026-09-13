import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, Upload, Search, X, Save, Image as ImageIcon, Video, Eye, EyeOff, Sparkles, Percent, CheckSquare, Square, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getProductImage } from "@/lib/productImage";
import { CairoSourcesViewer } from "@/components/admin/CairoSourcesViewer";
import { cairoSupplierService } from "@/data/cairoSupplierService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

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
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string[] | null;
  tags?: string[] | null;
}

interface Category { id: string; name: string; }

const blank: Partial<Product> = {
  name: "", slug: "", description: "", price: 0, original_price: null,
  category_id: null, brand: "", protocol: "", image_url: "", stock: 10,
  featured: false, video_url: "", seo_title: "", seo_description: "",
  seo_keywords: [], tags: [],
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [flagVersion, setFlagVersion] = useState(0);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [discountPct, setDiscountPct] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const fetchAllProducts = async () => {
    const pageSize = 1000;
    const rows: Product[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, description, price, original_price, category_id, brand, protocol, image_url, stock, featured, video_url, seo_title, seo_description, seo_keywords, tags")
        .order("updated_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      rows.push(...((data as any) ?? []));
      if (!data || data.length < pageSize) break;
    }
    return rows;
  };

  const load = async () => {
    setLoading(true);
    const [p, { data: c }, { data: vizData }] = await Promise.all([
      fetchAllProducts(),
      supabase.from("categories").select("id, name").order("name"),
      supabase.from("site_info").select("value").eq("section", "products").eq("key", "hidden_ids").maybeSingle(),
    ]);
    setProducts(p ?? []);
    setCategories((c as any) ?? []);
    try { setHiddenIds(vizData?.value ? JSON.parse(vizData.value) : []); } catch { setHiddenIds([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const refreshMissingPhotos = async () => {
    setPhotoBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-products', {
        body: { action: 'find-missing-images', batchSize: 8, token: adminToken },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || 'Refresh failed');
      const results: any[] = data.results || [];
      const updated = results.filter((r) => r.success && r.image_updated).length;
      const failed = results.filter((r) => !r.success).length;
      toast({
        title: 'Photo refresh complete',
        description: `Updated ${updated} • Skipped ${failed}. Re-run to process more.`,
      });
      await load();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Refresh failed', description: e?.message || String(e) });
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleVerifyAllValidImages = () => {
    const count = cairoSupplierService.verifyAllValidImages();
    setFlagVersion(v => v + 1);
    toast({
      title: 'Valid images verified',
      description: `Verified ${count} valid product images with confirmed HTTP 200 photos.`,
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (brandFilter !== "all" && (p.brand ?? "") !== brandFilter) return false;
      const audit = cairoSupplierService.getProductAudit(p.id);
      const isFlagged = cairoSupplierService.isWrongImageFlagged(p.id);
      const isVerified = cairoSupplierService.isImageVerified(p.id);

      if (statusFilter === "flagged_wrong" && !isFlagged) return false;
      if (statusFilter === "verified" && !isVerified) return false;
      if (statusFilter === "unverified" && (isFlagged || isVerified)) return false;
      if (statusFilter === "valid" && audit?.image_status !== "VALID") return false;
      if (statusFilter === "invalid_image" && audit?.image_status !== "INVALID") return false;
      if (statusFilter === "delete_candidate" && audit?.action_taken !== "DELETE_CANDIDATE") return false;
      if (statusFilter === "no_cairo" && (audit?.sources_count ?? 0) > 0) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q) ||
        (p.slug ?? "").toLowerCase().includes(q) ||
        (audit?.sku && audit.sku.toLowerCase().includes(q));
    });
  }, [products, search, brandFilter, statusFilter, flagVersion]);

  const allBrands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).sort() as string[],
    [products],
  );

  const visibleSlice = filtered;
  const allVisibleSelected = visibleSlice.length > 0 && visibleSlice.every((p) => selectedIds.has(p.id));

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };
  const toggleSelectAllVisible = () => {
    const next = new Set(selectedIds);
    if (allVisibleSelected) visibleSlice.forEach((p) => next.delete(p.id));
    else visibleSlice.forEach((p) => next.add(p.id));
    setSelectedIds(next);
  };
  const clearSelection = () => setSelectedIds(new Set());

  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  const bulkInvoke = async (body: any, successMsg: string) => {
    setBulkBusy(true);
    setBulkProgress(null);
    try {
      if (Array.isArray(body.ids) && body.ids.length > 40) {
        const allIds: string[] = body.ids;
        const BATCH_SIZE = 40;
        let processed = 0;
        setBulkProgress({ current: 0, total: allIds.length });

        for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
          const chunk = allIds.slice(i, i + BATCH_SIZE);
          const { data, error } = await supabase.functions.invoke("admin-write", {
            headers: { Authorization: "Bearer " + adminToken },
            body: { ...body, ids: chunk },
          });
          if (error || !data?.success) {
            throw new Error(data?.error || error?.message || `Failed at batch ${Math.floor(i / BATCH_SIZE) + 1}`);
          }
          processed += chunk.length;
          setBulkProgress({ current: processed, total: allIds.length });
        }
      } else {
        const { data, error } = await supabase.functions.invoke("admin-write", { headers: { Authorization: "Bearer " + adminToken }, body });
        if (error || !data?.success) throw new Error(data?.error || error?.message || "Failed");
      }
      toast({ title: successMsg });
      clearSelection();
      await load();
    } catch (e: any) {
      toast({ title: "Bulk action failed", description: e.message, variant: "destructive" });
    } finally {
      setBulkBusy(false);
      setBulkProgress(null);
    }
  };

  const bulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} products? This cannot be undone.`)) return;
    bulkInvoke({ action: "bulk-delete-products", ids: Array.from(selectedIds) },
      `${selectedIds.size} products deleted`);
  };
  const bulkVisibility = (hidden: boolean) => {
    if (selectedIds.size === 0) return;
    bulkInvoke({ action: "bulk-set-visibility", ids: Array.from(selectedIds), hidden },
      hidden ? `Hidden ${selectedIds.size} products` : `Published ${selectedIds.size} products`);
  };
  const bulkFeature = (featured: boolean) => {
    if (selectedIds.size === 0) return;
    bulkInvoke({ action: "bulk-update-products", ids: Array.from(selectedIds), updates: { featured } },
      featured ? `Featured ${selectedIds.size} products` : `Unfeatured ${selectedIds.size} products`);
  };
  const bulkDiscount = () => {
    const pct = parseFloat(discountPct);
    if (!pct || pct <= 0 || pct >= 100) {
      toast({ title: "Enter discount % between 1 and 99", variant: "destructive" }); return;
    }
    bulkInvoke({ action: "bulk-apply-discount", ids: Array.from(selectedIds), mode: "discount", pct },
      `Applied ${pct}% off to ${selectedIds.size} products`);
  };
  const bulkResetDiscount = () =>
    bulkInvoke({ action: "bulk-apply-discount", ids: Array.from(selectedIds), mode: "reset" },
      `Reset prices for ${selectedIds.size} products`);

  const aiGenerateSEO = async () => {
    if (!editing.id) {
      toast({ title: "Save the product first to generate SEO", variant: "destructive" });
      return;
    }
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-write", {
        headers: { Authorization: "Bearer " + adminToken },
        body: { action: "ai-generate-seo", id: editing.id },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Failed");
      setEditing((prev) => ({
        ...prev,
        seo_title: data.seo.seo_title,
        seo_description: data.seo.seo_description,
        seo_keywords: data.seo.seo_keywords,
        tags: data.seo.tags,
      }));
      toast({ title: "SEO generated" });
    } catch (e: any) {
      toast({ title: "AI SEO failed", description: e.message, variant: "destructive" });
    } finally {
      setAiBusy(false);
    }
  };

  const openNew = () => { setEditing({ ...blank }); setOpen(true); };
  const openEdit = (p: Product) => { setEditing({ ...p }); setOpen(true); };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `manual/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("admin-write", {
        headers: { Authorization: "Bearer " + adminToken },
        body: { action: "upload-file", bucket: "product-images", filename: path, base64, mimeType: file.type },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Upload failed");
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
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("admin-write", {
        headers: { Authorization: "Bearer " + adminToken },
        body: { action: "upload-file", bucket: "product-videos", filename: path, base64, mimeType: file.type },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Upload failed");
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
        ? { action, product: editing }
        : { action, id: editing.id, updates: editing };
      const { data, error } = await supabase.functions.invoke("admin-write", {
        headers: { Authorization: "Bearer " + adminToken },
        body: isNew
          ? { action, product: editing }
          : { action, id: editing.id, updates: editing },
      });
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
        headers: { Authorization: "Bearer " + adminToken },
        body: { action: "delete-product", id: p.id },
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
        headers: { Authorization: "Bearer " + adminToken },
        body: { action: "update-site-info", entries: [{ section: "products", key: "hidden_ids", value: JSON.stringify(newHiddenIds) }] },
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
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Audit Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="flagged_wrong">⚠️ Wrong Images</SelectItem>
              <SelectItem value="verified">✅ Verified Images</SelectItem>
              <SelectItem value="unverified">🔍 Unverified Images</SelectItem>
              <SelectItem value="valid">Validated HTTP</SelectItem>
              <SelectItem value="invalid_image">❌ Invalid Images</SelectItem>
              <SelectItem value="delete_candidate">🗑️ Delete Candidates</SelectItem>
            </SelectContent>
          </Select>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Brand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {allBrands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Product</Button>
      </div>

      {/* Bulk action bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border bg-muted/30">
        <button onClick={toggleSelectAllVisible} className="flex items-center gap-2 text-sm font-medium">
          {allVisibleSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
          Select all ({visibleSlice.length})
        </button>
        {selectedIds.size > 0 && (
          <Badge variant="secondary" className="ml-1">{selectedIds.size} selected</Badge>
        )}
        <div className="flex-1" />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10 font-medium" onClick={handleVerifyAllValidImages}>
            <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-500" />
            Verify Valid Photos
          </Button>
          <Button size="sm" variant="outline" onClick={refreshMissingPhotos} disabled={photoBusy}>
            {photoBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Refresh missing photos
          </Button>
          <Input
            type="number" min="1" max="99" placeholder="%"
            value={discountPct} onChange={(e) => setDiscountPct(e.target.value)}
            className="w-20 h-9"
          />
          <Button size="sm" variant="outline" onClick={bulkDiscount}
            disabled={bulkBusy || selectedIds.size === 0 || !discountPct}>
            <Percent className="h-4 w-4 mr-1" />Discount
          </Button>
          <Button size="sm" variant="outline" onClick={bulkResetDiscount}
            disabled={bulkBusy || selectedIds.size === 0}>Reset price</Button>
          <Button size="sm" variant="outline" onClick={() => bulkVisibility(false)} disabled={bulkBusy || selectedIds.size === 0}>
            <Eye className="h-4 w-4 mr-1" />Publish
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkVisibility(true)} disabled={bulkBusy || selectedIds.size === 0}>
            <EyeOff className="h-4 w-4 mr-1" />Hide
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkFeature(true)} disabled={bulkBusy || selectedIds.size === 0}>
            ⭐ Feature
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkFeature(false)} disabled={bulkBusy || selectedIds.size === 0}>
            Unfeature
          </Button>
          <Button size="sm" variant="destructive" onClick={bulkDelete} disabled={bulkBusy || selectedIds.size === 0}>
            {bulkBusy && bulkProgress ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1" />
            )}
            {bulkBusy && bulkProgress ? `Deleting (${bulkProgress.current}/${bulkProgress.total})...` : 'Delete'}
          </Button>
          {bulkBusy && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
      </div>

      {statusFilter === 'unverified' && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Viewing products with unverified images. You can automatically verify all valid HTTP 200 photos in one click.</span>
          </div>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium" onClick={handleVerifyAllValidImages}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Verify All Valid Images
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
            {visibleSlice.map((p) => {
              const isHidden = hiddenIds.includes(p.id);
              const isSelected = selectedIds.has(p.id);
              const audit = cairoSupplierService.getProductAudit(p.id);
              const sources = cairoSupplierService.getCairoSources(p.id);
              const isFlagged = cairoSupplierService.isWrongImageFlagged(p.id);
              const isVerified = cairoSupplierService.isImageVerified(p.id);

              return (
                <div key={p.id} className={`flex items-center gap-3 p-3 hover:bg-muted/40 ${isSelected ? "bg-primary/5" : ""}`}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(p.id)}
                    className="shrink-0"
                  />
                  <img
                    src={getProductImage(p as any)}
                    alt={p.name}
                    className="w-14 h-14 rounded-lg object-cover bg-muted flex-shrink-0 cursor-pointer"
                    onClick={() => openEdit(p)}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg"; }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate cursor-pointer hover:underline" onClick={() => openEdit(p)}>{p.name}</p>
                      {isHidden ? (
                        <span className="text-xs bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-full shrink-0">Hidden</span>
                      ) : (
                        <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full shrink-0">Published</span>
                      )}

                      {/* Honest Image Verification Status */}
                      {isFlagged ? (
                        <span className="text-[11px] bg-red-500/10 text-red-600 border border-red-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                          <AlertTriangle className="w-3 h-3 text-red-500" /> Flagged Wrong Image
                        </span>
                      ) : isVerified ? (
                        <span className="text-[11px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Verified Photo
                        </span>
                      ) : audit?.image_status === 'VALID' ? (
                        <span className="text-[11px] bg-amber-500/10 text-amber-600 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500" /> Unverified (HTTP 200)
                        </span>
                      ) : (
                        <span className="text-[11px] bg-red-500/10 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                          <XCircle className="w-3 h-3" /> Invalid Image
                        </span>
                      )}

                      {/* Flag / Unflag quick action */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFlagged) {
                            cairoSupplierService.unflagWrongImage(p.id);
                          } else {
                            cairoSupplierService.flagWrongImage(p.id, 'Reported wrong image');
                          }
                          setFlagVersion(v => v + 1);
                        }}
                        className="text-[10px] text-muted-foreground hover:text-red-500 underline"
                      >
                        {isFlagged ? "Mark OK" : "Flag wrong"}
                      </button>

                      {/* Clickable Cairo Sources to open supplier details */}
                      {sources.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditing({ ...p });
                            setOpen(true);
                            setTimeout(() => {
                              const cairoTab = document.querySelector('[value="cairo"]') as HTMLButtonElement;
                              cairoTab?.click();
                            }, 60);
                          }}
                          className="text-[11px] bg-primary/10 text-primary hover:bg-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-colors"
                          title="Click to view full supplier intelligence"
                        >
                          <Building2 className="w-3 h-3" /> {sources.length} Cairo Sources
                          {audit?.lowest_cairo_price ? ` • min ${audit.lowest_cairo_price.toLocaleString()} EGP` : ''}
                          <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                        </button>
                      )}

                      {audit?.action_taken === 'DELETE_CANDIDATE' && (
                        <span className="text-[11px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">
                          Delete Candidate
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate pt-0.5">
                      {p.brand || "No brand"} {audit?.sku ? `• SKU: ${audit.sku}` : ''} • {p.price} EGP • Stock: {p.stock}
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
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Edit Product" : "New Product"}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="details">Product Details</TabsTrigger>
              <TabsTrigger value="cairo" className="flex items-center gap-1.5 font-medium">
                <Building2 className="w-4 h-4 text-primary" /> Sourcing, Live Sources & Sync
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details">
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

            {/* SEO + Tags */}
            <div className="md:col-span-2 border-t border-border pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> SEO & Tags
                </h3>
                <Button type="button" size="sm" variant="outline" onClick={aiGenerateSEO} disabled={aiBusy || !editing.id}>
                  {aiBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Auto-fill with AI
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>SEO Title <span className="text-xs text-muted-foreground">(≤60 chars)</span></Label>
                  <Input
                    maxLength={70}
                    value={editing.seo_title ?? ""}
                    onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })}
                    placeholder="Brand + Product + Benefit | AzkaSmart"
                  />
                  <p className="text-xs text-muted-foreground">{(editing.seo_title ?? "").length}/60</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>SEO Description <span className="text-xs text-muted-foreground">(≤155 chars)</span></Label>
                  <Textarea
                    rows={2} maxLength={170}
                    value={editing.seo_description ?? ""}
                    onChange={(e) => setEditing({ ...editing, seo_description: e.target.value })}
                    placeholder="Compelling pitch with key benefit, 'Egypt', and a CTA."
                  />
                  <p className="text-xs text-muted-foreground">{(editing.seo_description ?? "").length}/155</p>
                </div>
                <div className="space-y-2">
                  <Label>SEO Keywords <span className="text-xs text-muted-foreground">(comma-separated)</span></Label>
                  <Input
                    value={(editing.seo_keywords ?? []).join(", ")}
                    onChange={(e) => setEditing({
                      ...editing,
                      seo_keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })}
                    placeholder="smart switch, zigbee, egypt"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tags <span className="text-xs text-muted-foreground">(comma-separated)</span></Label>
                  <Input
                    value={(editing.tags ?? []).join(", ")}
                    onChange={(e) => setEditing({
                      ...editing,
                      tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })}
                    placeholder="lighting, energy-saving, premium"
                  />
                </div>
              </div>
            </div>

            {editing.id && (
              <div className="md:col-span-2 p-3 bg-muted/40 rounded-lg text-sm text-muted-foreground flex items-center gap-2">
                <Eye className="h-4 w-4" />
                To show/hide this product from customers, use the eye icon in the product list.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="cairo" className="space-y-4">
          {editing.id ? (
            <CairoSourcesViewer 
              productId={editing.id} 
              productName={editing.name ?? ''} 
              currentPrice={editing.price ?? 0}
              currentStock={editing.stock ?? 10}
              currentDescription={editing.description ?? ''}
              brand={editing.brand ?? ''}
              protocol={editing.protocol ?? ''}
              onApplyPrice={(newPrice) => {
                setEditing(prev => ({ ...prev, price: newPrice }));
              }}
              onApplyStock={(newStock) => {
                setEditing(prev => ({ ...prev, stock: newStock }));
              }}
              onApplyDescription={(newDesc) => {
                setEditing(prev => ({ ...prev, description: newDesc }));
              }}
            />
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm border border-dashed rounded-xl">
              Please save the product first before attaching Cairo supplier sources.
            </div>
          )}
        </TabsContent>
      </Tabs>

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
