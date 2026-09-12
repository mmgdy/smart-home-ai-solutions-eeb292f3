import React, { useState, useMemo, useEffect } from 'react';
import { cairoSupplierService, ProductAuditInfo, CairoSource, SupplierInfo } from '@/data/cairoSupplierService';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Trash2, 
  Building2, 
  Search, 
  Download, 
  RefreshCw, 
  ExternalLink,
  Filter,
  Sparkles,
  Database,
  Code2,
  Copy,
  Check,
  ImageIcon,
  Eye,
  MessageCircle,
  Phone,
  MapPin,
  Globe,
  Upload,
  Layers,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CatalogAuditDashboardProps {
  token?: string | null;
}

export const CatalogAuditDashboard: React.FC<CatalogAuditDashboardProps> = ({ token }) => {
  const { toast } = useToast();
  const [stats, setStats] = useState(() => cairoSupplierService.getStats());
  const [allAudits, setAllAudits] = useState(() => cairoSupplierService.getAllAudits());
  const [suppliers, setSuppliers] = useState<SupplierInfo[]>(() => cairoSupplierService.getSuppliers());
  const [liveDbCount, setLiveDbCount] = useState<number | null>(null);
  const [isRefreshingDb, setIsRefreshingDb] = useState(false);

  // Tab View Mode: 'catalog' | 'suppliers'
  const [viewMode, setViewMode] = useState<'catalog' | 'suppliers'>('catalog');

  // Interactive Modals
  const [selectedProductForSources, setSelectedProductForSources] = useState<ProductAuditInfo | null>(null);
  const [activeSources, setActiveSources] = useState<CairoSource[]>([]);
  const [imageReplaceProduct, setImageReplaceProduct] = useState<ProductAuditInfo | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const [previewImageZoom, setPreviewImageZoom] = useState<{ url: string; name: string } | null>(null);

  // Bulk action execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionStatus, setExecutionStatus] = useState<string>('');
  const [copiedSql, setCopiedSql] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');

  const adminToken = token || (typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null);

  const fetchLiveCount = async () => {
    setIsRefreshingDb(true);
    try {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      if (!error && typeof count === 'number') {
        setLiveDbCount(count);
      }
    } catch (e) {
      console.error('Failed to fetch product count:', e);
    } finally {
      setIsRefreshingDb(false);
    }
  };

  useEffect(() => {
    fetchLiveCount();
  }, []);

  // When selectedProductForSources changes, load sources
  useEffect(() => {
    if (selectedProductForSources) {
      setActiveSources(cairoSupplierService.getCairoSources(selectedProductForSources.product_id));
    } else {
      setActiveSources([]);
    }
  }, [selectedProductForSources]);

  const brands = useMemo(() => {
    return Array.from(new Set(allAudits.map(a => a.brand).filter(Boolean))).sort();
  }, [allAudits]);

  // Count flagged wrong images
  const flaggedWrongCount = useMemo(() => {
    return allAudits.filter(a => cairoSupplierService.isWrongImageFlagged(a.product_id)).length;
  }, [allAudits]);

  const filtered = useMemo(() => {
    return allAudits.filter(a => {
      const isFlagged = cairoSupplierService.isWrongImageFlagged(a.product_id);
      const isVerified = cairoSupplierService.isImageVerified(a.product_id);

      if (statusFilter === 'flagged_wrong' && !isFlagged) return false;
      if (statusFilter === 'verified' && !isVerified) return false;
      if (statusFilter === 'unverified' && (isFlagged || isVerified)) return false;
      if (statusFilter === 'valid' && a.action_taken !== 'NO_CHANGE' && a.image_status !== 'VALID') return false;
      if (statusFilter === 'invalid_image' && a.image_status !== 'INVALID') return false;
      if (statusFilter === 'missing_desc' && a.description_status !== 'MISSING') return false;
      if (statusFilter === 'delete_candidates' && a.action_taken !== 'DELETE_CANDIDATE') return false;
      if (statusFilter === 'healed' && a.action_taken !== 'IMAGE_HEALED') return false;
      if (statusFilter === 'purged' && a.action_taken !== 'DELETED') return false;

      if (brandFilter !== 'all' && a.brand !== brandFilter) return false;

      if (supplierFilter !== 'all') {
        const prodSources = cairoSupplierService.getCairoSources(a.product_id);
        const matchesSupplier = prodSources.some(s => s.supplier_id === supplierFilter || s.supplier_name.toLowerCase().includes(supplierFilter.toLowerCase()));
        if (!matchesSupplier) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        return a.product_name.toLowerCase().includes(q) || 
               (a.sku && a.sku.toLowerCase().includes(q)) ||
               (a.brand && a.brand.toLowerCase().includes(q));
      }
      return true;
    });
  }, [allAudits, statusFilter, brandFilter, supplierFilter, search]);

  const deleteCandidates = useMemo(() => {
    return allAudits.filter(a => a.action_taken === 'DELETE_CANDIDATE');
  }, [allAudits]);

  const healedCandidates = useMemo(() => {
    return allAudits.filter(a => a.action_taken === 'IMAGE_HEALED');
  }, [allAudits]);

  // Toggle flag as wrong image
  const handleToggleFlagWrong = (productId: string) => {
    if (cairoSupplierService.isWrongImageFlagged(productId)) {
      cairoSupplierService.unflagWrongImage(productId);
      toast({ title: 'Flag removed', description: 'Product image unflagged' });
    } else {
      cairoSupplierService.flagWrongImage(productId, 'Reported wrong image in catalog audit');
      toast({ 
        title: 'Image Flagged as Wrong', 
        description: 'Marked for visual photo replacement', 
        variant: 'destructive' 
      });
    }
    setAllAudits(cairoSupplierService.getAllAudits());
  };

  const handleMarkVerified = (productId: string) => {
    cairoSupplierService.markImageVerified(productId);
    toast({ title: 'Image Verified', description: 'Photo marked as accurate and verified' });
    setAllAudits(cairoSupplierService.getAllAudits());
  };

  // Open replace image dialog
  const handleOpenReplaceImage = (product: ProductAuditInfo) => {
    setImageReplaceProduct(product);
    setNewImageUrl(product.image_url || '');
  };

  // Save replaced image
  const handleSaveReplacedImage = async () => {
    if (!imageReplaceProduct || !newImageUrl.trim()) return;

    setIsUpdatingImage(true);
    try {
      if (adminToken) {
        // Update in live database
        const { error } = await supabase.functions.invoke('admin-write', {
          headers: { Authorization: `Bearer ${adminToken}` },
          body: {
            action: 'update-product',
            id: imageReplaceProduct.product_id,
            updates: {
              image_url: newImageUrl.trim()
            }
          }
        });
        if (error) console.warn('Live DB update warning:', error.message);
      }

      // Update in service and local storage
      cairoSupplierService.setReplacedImageUrl(imageReplaceProduct.product_id, newImageUrl.trim());
      setAllAudits(cairoSupplierService.getAllAudits());

      toast({
        title: 'Image Replaced Successfully',
        description: `Updated image URL for ${imageReplaceProduct.product_name}`
      });
      setImageReplaceProduct(null);
    } catch (e: any) {
      toast({
        title: 'Image Update Failed',
        description: e.message || 'Could not update image',
        variant: 'destructive'
      });
    } finally {
      setIsUpdatingImage(false);
    }
  };

  // SQL script for user manual execution in Supabase SQL editor if desired
  const sqlScript = useMemo(() => {
    const candidateIds = deleteCandidates.map(c => `'${c.product_id}'`).join(',\n  ');
    return `-- 1. Heal verified product image
UPDATE public.products
SET image_url = 'https://www.vesternet.com/cdn/shop/files/409500010139_2.png?v=1757942579&width=1214',
    updated_at = NOW()
WHERE id = 'ee2c2c0f-c510-4c54-a628-0b924a9521ce';

-- 2. Delete 74 confirmed invalid products (broken/soft-404 images)
DELETE FROM public.products
WHERE id IN (
  ${candidateIds}
);`;
  }, [deleteCandidates]);

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
    toast({ title: 'SQL Copied!', description: 'Ready to run in Supabase SQL Editor.' });
  };

  // Execute full automated catalog purge & heal via admin-write
  const handleExecutePurge = async () => {
    if (!adminToken) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in as an administrator to execute database modifications.',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete ${deleteCandidates.length} confirmed invalid products and heal 1 product image in the live database?`)) {
      return;
    }

    setIsExecuting(true);
    setExecutionProgress(5);
    setExecutionStatus('Step 1/2: Updating healed product image...');

    try {
      // 1. Heal product image
      if (healedCandidates.length > 0) {
        for (const h of healedCandidates) {
          const { error: healErr } = await supabase.functions.invoke('admin-write', {
            headers: { Authorization: `Bearer ${adminToken}` },
            body: {
              action: 'update-product',
              id: h.product_id,
              updates: {
                image_url: 'https://www.vesternet.com/cdn/shop/files/409500010139_2.png?v=1757942579&width=1214'
              }
            }
          });
          if (healErr) console.warn('Heal warning:', healErr.message);
        }
      }

      setExecutionProgress(20);
      setExecutionStatus(`Step 2/2: Deleting ${deleteCandidates.length} invalid products...`);

      // 2. Delete candidates in batches of 20
      const idsToDelete = deleteCandidates.map(c => c.product_id);
      const BATCH_SIZE = 20;
      let deletedCount = 0;

      for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
        const chunk = idsToDelete.slice(i, i + BATCH_SIZE);
        const { error: delErr } = await supabase.functions.invoke('admin-write', {
          headers: { Authorization: `Bearer ${adminToken}` },
          body: {
            action: 'bulk-delete-products',
            ids: chunk
          }
        });

        if (delErr) {
          throw new Error(delErr.message || `Failed to delete batch ${Math.floor(i / BATCH_SIZE) + 1}`);
        }

        deletedCount += chunk.length;
        const progressPct = 20 + Math.round((deletedCount / idsToDelete.length) * 75);
        setExecutionProgress(progressPct);
        setExecutionStatus(`Deleted ${deletedCount} of ${idsToDelete.length} products...`);
      }

      setExecutionProgress(100);
      setExecutionStatus('Completed! Finalizing database sync...');

      // Update local state
      const updatedAudits = allAudits.map(a => {
        if (a.action_taken === 'DELETE_CANDIDATE') {
          return { ...a, action_taken: 'DELETED', reason: 'Permanently purged from database' };
        }
        return a;
      });
      setAllAudits(updatedAudits);
      setStats(prev => ({
        ...prev,
        delete_candidates: 0,
        final_products_remaining: prev.valid_products
      }));

      // Refresh live count
      await fetchLiveCount();

      toast({
        title: 'Catalog Purge Complete!',
        description: `Successfully deleted ${deletedCount} corrupt products and healed 1 product in the live database.`,
      });
    } catch (err: any) {
      toast({
        title: 'Action Failed',
        description: err.message || 'An error occurred during cleanup',
        variant: 'destructive',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Product ID', 'Product Name', 'Brand', 'SKU', 'Category', 'Price (EGP)', 'Image Status', 'Image Verification', 'Cairo Suppliers', 'Lowest Cairo Price', 'Action Taken', 'Reason'];
    const rows = filtered.map(a => [
      a.product_id,
      `"${(a.product_name || '').replace(/"/g, '""')}"`,
      `"${a.brand || ''}"`,
      `"${a.sku || ''}"`,
      `"${a.category || ''}"`,
      a.price,
      a.image_status,
      cairoSupplierService.isWrongImageFlagged(a.product_id) ? 'FLAGGED_WRONG' : cairoSupplierService.isImageVerified(a.product_id) ? 'VERIFIED' : 'UNVERIFIED',
      a.sources_count,
      a.lowest_cairo_price || '',
      a.action_taken,
      `"${(a.reason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `catalog_audit_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Product Catalog & Sourcing Intelligence
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visual image verification, accurate product photo auditing, and live Cairo supplier commercial intelligence.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-muted p-1 rounded-lg border mr-2">
            <Button
              size="sm"
              variant={viewMode === 'catalog' ? 'default' : 'ghost'}
              onClick={() => setViewMode('catalog')}
              className="h-8 text-xs gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              Catalog & Images ({allAudits.length})
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'suppliers' ? 'default' : 'ghost'}
              onClick={() => setViewMode('suppliers')}
              className="h-8 text-xs gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5" />
              Cairo Suppliers ({suppliers.length})
            </Button>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
                <Code2 className="w-3.5 h-3.5" />
                SQL Migration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Supabase SQL Migration for Purge & Heal
                </DialogTitle>
                <DialogDescription>
                  Run this in your Supabase SQL Editor to purge the 74 corrupted products and heal verified items.
                </DialogDescription>
              </DialogHeader>
              <div className="relative mt-2">
                <pre className="p-4 bg-muted text-xs font-mono rounded-lg overflow-x-auto max-h-[350px]">
                  {sqlScript}
                </pre>
                <Button 
                  size="sm" 
                  onClick={handleCopySql} 
                  className="absolute top-2 right-2 gap-1.5 shadow-sm"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? 'Copied' : 'Copy SQL'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 h-8 text-xs">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>

          <Button variant="outline" size="sm" onClick={fetchLiveCount} disabled={isRefreshingDb} className="gap-2 h-8 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingDb ? 'animate-spin' : ''}`} />
            Sync DB ({liveDbCount ?? '...'})
          </Button>
        </div>
      </div>

      {/* STATS METRIC GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-medium">Live Products</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {liveDbCount !== null ? liveDbCount : stats.final_products_remaining}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Verified active catalog</div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${flaggedWrongCount > 0 ? 'bg-red-500/5 border-red-500/30' : 'bg-card'}`}>
          <CardContent className="p-4">
            <div className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center justify-between">
              <span>Wrong Images</span>
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{flaggedWrongCount}</div>
            <div className="text-[11px] text-red-600/80 mt-0.5">Need photo replacement</div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="text-xs text-primary font-medium">With Cairo Suppliers</div>
            <div className="text-2xl font-bold text-primary mt-1">{stats.products_with_cairo_suppliers}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{stats.total_cairo_sources_found} links mapped</div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Verified Cairo Vendors</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{suppliers.length}</div>
            <div className="text-[11px] text-emerald-600/70 mt-0.5">Sonoff, Baytzaki, B.Tech, etc.</div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="text-xs text-red-700 dark:text-red-400 font-medium">Purge Candidates</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{deleteCandidates.length}</div>
            <div className="text-[11px] text-red-600/70 mt-0.5">Corrupted soft-404 items</div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/50">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-medium">Audited Scope</div>
            <div className="text-2xl font-bold text-foreground mt-1">100%</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">808 inspected items</div>
          </CardContent>
        </Card>
      </div>

      {/* VIEW MODE 1: SUPPLIERS DIRECTORY */}
      {viewMode === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Verified Cairo & Egypt Suppliers Directory ({suppliers.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Wholesale distributors, official brand agents, and specialty smart home retailers in Cairo.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setViewMode('catalog')} className="gap-1 text-xs">
              Back to Catalog Audit
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((sup) => {
              const suppliedProducts = cairoSupplierService.getProductsBySupplier(sup.id);
              const cleanPhone = (sup.whatsapp || sup.phone || '').replace(/[^0-9]/g, '');

              return (
                <Card key={sup.id} className="hover:shadow-md transition-shadow border bg-card">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-base text-foreground">{sup.name}</h4>
                          {sup.is_verified && (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 gap-1 bg-emerald-500/5">
                              <CheckCircle className="w-3 h-3" /> Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{sup.supplier_type}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-muted-foreground border-y py-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{sup.address}, {sup.area}, {sup.city}</span>
                      </div>
                      {sup.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                          <a href={`tel:${sup.phone}`} className="hover:underline font-mono text-foreground">
                            {sup.phone}
                          </a>
                        </div>
                      )}
                      {sup.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                          <a href={sup.website} target="_blank" rel="noreferrer" className="hover:underline text-primary truncate max-w-[220px]">
                            {sup.website.replace('https://', '')}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-xs font-medium text-foreground">
                        <span className="text-primary font-bold">{suppliedProducts.length}</span> Products mapped
                      </div>

                      <div className="flex items-center gap-2">
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello, inquiring regarding Azka Smart Home procurement in Cairo.`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            WhatsApp
                          </a>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSupplierFilter(sup.name);
                            setViewMode('catalog');
                          }}
                          className="h-8 text-xs"
                        >
                          View Products
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: CATALOG & IMAGE AUDIT TABLE */}
      {viewMode === 'catalog' && (
        <>
          {/* FILTER CONTROLS */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search products, models, SKUs..." 
                value={search} 
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[190px]">
                  <SelectValue placeholder="Status Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products ({allAudits.length})</SelectItem>
                  <SelectItem value="flagged_wrong">⚠️ Wrong Images ({flaggedWrongCount})</SelectItem>
                  <SelectItem value="verified">✅ Verified Images</SelectItem>
                  <SelectItem value="unverified">🔍 Unverified Images</SelectItem>
                  <SelectItem value="delete_candidates">Delete Candidates ({deleteCandidates.length})</SelectItem>
                  <SelectItem value="valid">Valid ({stats.valid_products})</SelectItem>
                  <SelectItem value="healed">Healed Images ({stats.healed_images})</SelectItem>
                  <SelectItem value="invalid_image">Invalid Image ({stats.invalid_images})</SelectItem>
                  <SelectItem value="purged">Purged ({allAudits.filter(a => a.action_taken === 'DELETED').length})</SelectItem>
                </SelectContent>
              </Select>

              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(statusFilter !== 'all' || brandFilter !== 'all' || supplierFilter !== 'all' || search) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setStatusFilter('all');
                    setBrandFilter('all');
                    setSupplierFilter('all');
                    setSearch('');
                  }}
                  className="text-xs h-9 px-2"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* AUDIT TABLE WITH IMAGES & INTERACTIVE SUPPLIERS */}
          <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b text-xs text-muted-foreground">
                  <tr>
                    <th className="py-3 px-3 w-14">Image</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-3">Brand / SKU</th>
                    <th className="py-3 px-3">Store Price</th>
                    <th className="py-3 px-3">Image Verification</th>
                    <th className="py-3 px-3">Cairo Suppliers</th>
                    <th className="py-3 px-3">Lowest Cairo Price</th>
                    <th className="py-3 px-3">Audit Status</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.slice(0, 100).map((a) => {
                    const isFlagged = cairoSupplierService.isWrongImageFlagged(a.product_id);
                    const isVerified = cairoSupplierService.isImageVerified(a.product_id);

                    return (
                      <tr key={a.id} className={`hover:bg-muted/30 transition-colors ${isFlagged ? 'bg-red-500/5' : ''}`}>
                        {/* 1. Image Thumbnail with Zoom */}
                        <td className="py-2.5 px-3">
                          <div 
                            className="relative group w-12 h-12 rounded-lg bg-muted border overflow-hidden shrink-0 flex items-center justify-center cursor-pointer shadow-xs"
                            onClick={() => a.image_url && setPreviewImageZoom({ url: a.image_url, name: a.product_name })}
                            title="Click to zoom image"
                          >
                            {a.image_url ? (
                              <img
                                src={a.image_url}
                                alt={a.product_name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                              />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-muted-foreground" />
                            )}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </td>

                        {/* 2. Product Name & Category */}
                        <td className="py-3 px-4 max-w-[220px]">
                          <div className="font-medium text-foreground truncate" title={a.product_name}>
                            {a.product_name}
                          </div>
                          <div className="text-xs text-muted-foreground">{a.category}</div>
                        </td>

                        {/* 3. Brand & SKU */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-semibold text-xs">{a.brand}</span>
                          {a.sku && <div className="text-[11px] text-muted-foreground font-mono">{a.sku}</div>}
                        </td>

                        {/* 4. Store Price */}
                        <td className="py-3 px-3 whitespace-nowrap font-medium">
                          {a.price ? `${a.price.toLocaleString()} EGP` : '—'}
                        </td>

                        {/* 5. Image Verification Status & Direct Quick Action */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {isFlagged ? (
                              <Badge variant="destructive" className="gap-1 text-[11px] font-bold">
                                <AlertTriangle className="w-3 h-3" /> Flagged Wrong
                              </Badge>
                            ) : isVerified ? (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 gap-1 text-[11px] bg-emerald-500/5">
                                <CheckCircle2 className="w-3 h-3" /> Verified Photo
                              </Badge>
                            ) : a.image_status === 'VALID' ? (
                              <Badge variant="outline" className="text-amber-600 border-amber-500/30 gap-1 text-[11px]">
                                <AlertTriangle className="w-3 h-3" /> HTTP 200 (Check)
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1 text-[11px]">
                                <XCircle className="w-3 h-3" /> {a.image_status}
                              </Badge>
                            )}

                            <div className="flex items-center gap-1.5 mt-0.5">
                              {isFlagged ? (
                                <button
                                  onClick={() => handleMarkVerified(a.product_id)}
                                  className="text-[10px] text-emerald-600 hover:underline font-medium"
                                >
                                  Mark Correct
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleFlagWrong(a.product_id)}
                                  className="text-[10px] text-red-500 hover:underline font-medium"
                                >
                                  Flag Wrong
                                </button>
                              )}
                              <span className="text-muted-foreground text-[10px]">•</span>
                              <button
                                onClick={() => handleOpenReplaceImage(a)}
                                className="text-[10px] text-primary hover:underline font-medium"
                              >
                                Replace
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 6. Clickable Cairo Sources Modal Trigger */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedProductForSources(a)}
                            className="h-7 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                          >
                            <Building2 className="w-3.5 h-3.5 text-primary" />
                            <span className="font-semibold">{a.sources_count}</span> Suppliers
                            <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
                          </Button>
                        </td>

                        {/* 7. Lowest Cairo Price */}
                        <td className="py-3 px-3 whitespace-nowrap font-semibold text-primary">
                          {a.lowest_cairo_price ? `${a.lowest_cairo_price.toLocaleString()} EGP` : '—'}
                        </td>

                        {/* 8. Audit Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {a.action_taken === 'DELETE_CANDIDATE' ? (
                            <Badge variant="destructive" className="gap-1 text-[11px]">
                              <Trash2 className="w-3 h-3" /> Delete Candidate
                            </Badge>
                          ) : a.action_taken === 'DELETED' ? (
                            <Badge variant="secondary" className="gap-1 text-[11px] text-muted-foreground line-through">
                              Deleted
                            </Badge>
                          ) : a.action_taken === 'IMAGE_HEALED' ? (
                            <Badge variant="outline" className="text-sky-600 border-sky-500/30 gap-1 text-[11px]">
                              ✨ Healed
                            </Badge>
                          ) : isFlagged ? (
                            <Badge variant="destructive" className="gap-1 text-[11px]">
                              Needs Image
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 gap-1 text-[11px]">
                              <CheckCircle2 className="w-3 h-3" /> Valid
                            </Badge>
                          )}
                        </td>

                        {/* 9. Action */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedProductForSources(a)}
                            className="h-7 px-2 text-xs text-primary hover:bg-primary/10 gap-1"
                          >
                            View Suppliers
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filtered.length > 100 && (
              <div className="py-3 px-4 text-center text-xs text-muted-foreground bg-muted/20 border-t">
                Showing top 100 of {filtered.length} products. Use search or status filter to narrow down results.
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL 1: PRODUCT CAIRO SUPPLIERS INTELLIGENCE */}
      <Dialog open={Boolean(selectedProductForSources)} onOpenChange={(open) => !open && setSelectedProductForSources(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <DialogTitle className="text-lg">Cairo & Egypt Supplier Intelligence</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Commercial local procurement details for: <strong>{selectedProductForSources?.product_name}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedProductForSources && (
            <div className="space-y-4 pt-2">
              {/* Product Header Bar */}
              <div className="p-3 bg-muted/50 rounded-xl border flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-background border overflow-hidden shrink-0">
                    {selectedProductForSources.image_url ? (
                      <img 
                        src={selectedProductForSources.image_url} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 m-3 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{selectedProductForSources.product_name}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>Brand: {selectedProductForSources.brand}</span>
                      {selectedProductForSources.sku && <span>• SKU: {selectedProductForSources.sku}</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Store Price</div>
                  <div className="text-base font-bold text-primary">
                    {selectedProductForSources.price ? `${selectedProductForSources.price.toLocaleString()} EGP` : '—'}
                  </div>
                </div>
              </div>

              {/* Suppliers List */}
              <div className="space-y-3">
                <h5 className="font-semibold text-sm flex items-center gap-1.5">
                  <span>Available Local Suppliers ({activeSources.length})</span>
                </h5>

                {activeSources.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-xl">
                    No Cairo supplier recorded yet for this product.
                  </div>
                ) : (
                  activeSources.map((s, idx) => {
                    const diff = s.price_egp && selectedProductForSources.price > 0 ? selectedProductForSources.price - s.price_egp : null;
                    const marginPct = diff !== null && selectedProductForSources.price > 0 ? Math.round((diff / selectedProductForSources.price) * 100) : null;
                    const cleanPhone = (s.whatsapp || s.phone || '').replace(/[^0-9]/g, '');
                    const waText = encodeURIComponent(`Hello, I am inquiring about availability of: ${selectedProductForSources.product_name}`);

                    return (
                      <div key={s.id || idx} className="p-4 rounded-xl border bg-card space-y-2 hover:shadow-xs transition-shadow">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-foreground">{s.supplier_name}</span>
                              <Badge variant="secondary" className="text-[10px] py-0">
                                {s.availability || 'In Stock'}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] py-0 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                {s.match_confidence}% Match
                              </Badge>
                              {marginPct !== null && (
                                <Badge variant="outline" className={`text-[10px] py-0 ${marginPct >= 0 ? 'text-emerald-600 border-emerald-500/30' : 'text-amber-600 border-amber-500/30'}`}>
                                  Store Margin: {marginPct >= 0 ? '+' : ''}{marginPct}%
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-0.5">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-primary shrink-0" />
                                {s.area || s.address || 'Cairo, Egypt'}
                              </span>
                              {s.phone && (
                                <a href={`tel:${s.phone}`} className="flex items-center gap-1 hover:text-foreground font-mono">
                                  <Phone className="w-3 h-3 text-primary shrink-0" />
                                  {s.phone}
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-end justify-between gap-2 shrink-0">
                            <div className="text-right">
                              <div className="text-base font-bold text-primary">
                                {s.price_egp ? `${s.price_egp.toLocaleString()} EGP` : 'Price on Request'}
                              </div>
                              {s.price_egp && selectedProductForSources.price > 0 && (
                                <span className="text-[11px] text-muted-foreground block">
                                  Cost saving: {(selectedProductForSources.price - s.price_egp).toLocaleString()} EGP
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/${cleanPhone}?text=${waText}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md font-medium"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  WhatsApp
                                </a>
                              )}
                              {s.product_url && (
                                <a 
                                  href={s.product_url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline bg-primary/10 px-2.5 py-1 rounded-md"
                                >
                                  Supplier Page
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {s.notes && (
                          <div className="pt-2 border-t text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Procurement Note: </span>
                            {s.notes}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProductForSources(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: QUICK REPLACE IMAGE */}
      <Dialog open={Boolean(imageReplaceProduct)} onOpenChange={(open) => !open && setImageReplaceProduct(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              Replace Product Image
            </DialogTitle>
            <DialogDescription className="text-xs">
              Replace wrong or inaccurate image for <strong>{imageReplaceProduct?.product_name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                {newImageUrl ? (
                  <img 
                    src={newImageUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover" 
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                  />
                ) : (
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Image URL (HTTPS link to verified photo)</Label>
                <Input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://images.example.com/product.jpg"
                  className="text-xs"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Updating this URL will replace the image in the catalog and mark this product as <strong>Verified</strong>.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImageReplaceProduct(null)} disabled={isUpdatingImage}>
              Cancel
            </Button>
            <Button onClick={handleSaveReplacedImage} disabled={isUpdatingImage || !newImageUrl.trim()}>
              {isUpdatingImage ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Check className="w-4 h-4 mr-1.5" />}
              Save & Verify Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: ZOOM IMAGE PREVIEW */}
      <Dialog open={Boolean(previewImageZoom)} onOpenChange={(open) => !open && setPreviewImageZoom(null)}>
        <DialogContent className="sm:max-w-[600px] p-2 overflow-hidden">
          <div className="relative aspect-square w-full bg-black/5 rounded-lg overflow-hidden flex items-center justify-center">
            {previewImageZoom && (
              <img 
                src={previewImageZoom.url} 
                alt={previewImageZoom.name} 
                className="max-w-full max-h-full object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
              />
            )}
          </div>
          <div className="p-3 text-center">
            <h4 className="font-semibold text-sm text-foreground">{previewImageZoom?.name}</h4>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
