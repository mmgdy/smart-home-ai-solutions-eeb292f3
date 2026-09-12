import React, { useState, useMemo, useEffect } from 'react';
import { cairoSupplierService, ProductAuditInfo } from '@/data/cairoSupplierService';
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
  Layers,
  Sparkles,
  Database,
  Code2,
  Copy,
  Check,
  Play
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CatalogAuditDashboardProps {
  token?: string | null;
}

export const CatalogAuditDashboard: React.FC<CatalogAuditDashboardProps> = ({ token }) => {
  const { toast } = useToast();
  const [stats, setStats] = useState(() => cairoSupplierService.getStats());
  const [allAudits, setAllAudits] = useState(() => cairoSupplierService.getAllAudits());
  const [liveDbCount, setLiveDbCount] = useState<number | null>(null);
  const [isRefreshingDb, setIsRefreshingDb] = useState(false);

  // Bulk action execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [executionStatus, setExecutionStatus] = useState<string>('');
  const [copiedSql, setCopiedSql] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');

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

  const brands = useMemo(() => {
    return Array.from(new Set(allAudits.map(a => a.brand).filter(Boolean))).sort();
  }, [allAudits]);

  const filtered = useMemo(() => {
    return allAudits.filter(a => {
      if (statusFilter === 'valid' && a.action_taken !== 'NO_CHANGE' && a.image_status !== 'VALID') return false;
      if (statusFilter === 'invalid_image' && a.image_status !== 'INVALID') return false;
      if (statusFilter === 'missing_desc' && a.description_status !== 'MISSING') return false;
      if (statusFilter === 'delete_candidates' && a.action_taken !== 'DELETE_CANDIDATE') return false;
      if (statusFilter === 'healed' && a.action_taken !== 'IMAGE_HEALED') return false;
      if (statusFilter === 'purged' && a.action_taken !== 'DELETED') return false;

      if (brandFilter !== 'all' && a.brand !== brandFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return a.product_name.toLowerCase().includes(q) || 
               (a.sku && a.sku.toLowerCase().includes(q)) ||
               (a.brand && a.brand.toLowerCase().includes(q));
      }
      return true;
    });
  }, [allAudits, statusFilter, brandFilter, search]);

  const deleteCandidates = useMemo(() => {
    return allAudits.filter(a => a.action_taken === 'DELETE_CANDIDATE');
  }, [allAudits]);

  const healedCandidates = useMemo(() => {
    return allAudits.filter(a => a.action_taken === 'IMAGE_HEALED');
  }, [allAudits]);

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
        const { data, error: delErr } = await supabase.functions.invoke('admin-write', {
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

  // Delete a single candidate product
  const handleDeleteSingle = async (productId: string, productName: string) => {
    if (!adminToken) {
      toast({ title: 'Authentication Required', variant: 'destructive' });
      return;
    }
    if (!confirm(`Delete "${productName}" from the database?`)) return;

    try {
      const { error } = await supabase.functions.invoke('admin-write', {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { action: 'delete-product', id: productId }
      });
      if (error) throw error;

      setAllAudits(prev => prev.map(a => a.product_id === productId ? { ...a, action_taken: 'DELETED', reason: 'Purged by admin' } : a));
      toast({ title: 'Product Deleted' });
      fetchLiveCount();
    } catch (err: any) {
      toast({ title: 'Deletion Failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleExportCSV = () => {
    const headers = ['Product ID', 'Product Name', 'Brand', 'SKU', 'Category', 'Price (EGP)', 'Image Status', 'Price Status', 'Description Status', 'Cairo Suppliers', 'Lowest Cairo Price', 'Action Taken', 'Reason'];
    const rows = filtered.map(a => [
      a.product_id,
      `"${(a.product_name || '').replace(/"/g, '""')}"`,
      `"${a.brand || ''}"`,
      `"${a.sku || ''}"`,
      `"${a.category || ''}"`,
      a.price,
      a.image_status,
      a.price_status,
      a.description_status,
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
            Product Catalog Audit Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete verification of all 808 products, live image health, selling prices, and Cairo/Egypt supplier intelligence.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Code2 className="w-4 h-4" />
                View SQL Migration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Supabase SQL Migration for Purge & Heal
                </DialogTitle>
                <DialogDescription>
                  You can copy and run this script directly in the Supabase Dashboard SQL Editor to execute the cleanup instantly.
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

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Export Audit CSV
          </Button>

          <Button variant="outline" size="sm" onClick={fetchLiveCount} disabled={isRefreshingDb} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isRefreshingDb ? 'animate-spin' : ''}`} />
            Sync DB Count
          </Button>
        </div>
      </div>

      {/* ACTION BANNER: EXECUTE PURGE & HEAL */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-background to-amber-500/5 shadow-sm">
        <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
              <h3 className="text-base font-semibold text-foreground">
                Action Required: {deleteCandidates.length} Invalid Products to Purge, 1 Product to Heal
              </h3>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              74 products have confirmed broken or soft-404 images from old hosts. 1 product (FIBARO HubPowerbank) has an active high-res replacement. Click below to execute the live database update safely through the admin API.
            </p>
            {isExecuting && (
              <div className="w-full mt-3 space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-primary">{executionStatus}</span>
                  <span>{executionProgress}%</span>
                </div>
                <Progress value={executionProgress} className="h-2" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <Button
              size="default"
              disabled={isExecuting || deleteCandidates.length === 0}
              onClick={handleExecutePurge}
              className="w-full md:w-auto gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Purging Products...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  {deleteCandidates.length > 0 ? `Delete ${deleteCandidates.length} Products & Heal 1` : 'All Cleaned & Healed'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* STATS METRIC GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-medium">Audited Catalog</div>
            <div className="text-2xl font-bold text-foreground mt-1">{stats.total_products_inspected}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">100% Inspected</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-primary/20">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-medium">Live DB Count</div>
            <div className="text-2xl font-bold text-primary mt-1">
              {liveDbCount !== null ? liveDbCount : '...'}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Target: 734 products</div>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Valid Products</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.valid_products}</div>
            <div className="text-[11px] text-emerald-600/70 mt-0.5">+1 Healed via supplier</div>
          </CardContent>
        </Card>

        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="text-xs text-red-700 dark:text-red-400 font-medium">Delete Candidates</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{deleteCandidates.length}</div>
            <div className="text-[11px] text-red-600/70 mt-0.5">Soft-404 or dead hosts</div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="text-xs text-primary font-medium">With Cairo Suppliers</div>
            <div className="text-2xl font-bold text-primary mt-1">{stats.products_with_cairo_suppliers}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{stats.total_cairo_sources_found} links mapped</div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/50">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground font-medium">Expected Clean</div>
            <div className="text-2xl font-bold text-foreground mt-1">{stats.final_products_remaining}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Active verified items</div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by product, model, SKU..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products ({allAudits.length})</SelectItem>
              <SelectItem value="delete_candidates">Delete Candidates ({deleteCandidates.length})</SelectItem>
              <SelectItem value="valid">Valid ({stats.valid_products})</SelectItem>
              <SelectItem value="healed">Healed Images ({stats.healed_images})</SelectItem>
              <SelectItem value="invalid_image">Invalid Image ({stats.invalid_images})</SelectItem>
              <SelectItem value="missing_desc">Missing Description ({stats.missing_descriptions})</SelectItem>
              <SelectItem value="purged">Purged ({allAudits.filter(a => a.action_taken === 'DELETED').length})</SelectItem>
            </SelectContent>
          </Select>

          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map(b => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AUDIT TABLE */}
      <div className="border rounded-xl overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b text-xs text-muted-foreground">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-3">Brand / SKU</th>
                <th className="py-3 px-3">Store Price</th>
                <th className="py-3 px-3">Image Status</th>
                <th className="py-3 px-3">Cairo Sources</th>
                <th className="py-3 px-3">Lowest Cairo Price</th>
                <th className="py-3 px-3">Audit Status</th>
                <th className="py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.slice(0, 100).map((a) => (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 max-w-[240px]">
                    <div className="font-medium text-foreground truncate" title={a.product_name}>
                      {a.product_name}
                    </div>
                    <div className="text-xs text-muted-foreground">{a.category}</div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="font-semibold text-xs">{a.brand}</span>
                    {a.sku && <div className="text-[11px] text-muted-foreground font-mono">{a.sku}</div>}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap font-medium">
                    {a.price ? `${a.price.toLocaleString()} EGP` : '—'}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {a.image_status === 'VALID' ? (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 gap-1 text-[11px]">
                        <CheckCircle2 className="w-3 h-3" /> Valid
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1 text-[11px]">
                        <XCircle className="w-3 h-3" /> {a.image_status}
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <Badge variant="secondary" className="gap-1 text-[11px]">
                      <Building2 className="w-3 h-3" /> {a.sources_count} Cairo Sources
                    </Badge>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap font-semibold text-primary">
                    {a.lowest_cairo_price ? `${a.lowest_cairo_price.toLocaleString()} EGP` : '—'}
                  </td>
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
                    ) : a.action_taken === 'NEEDS_REVIEW' ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-500/30 gap-1 text-[11px]">
                        <AlertTriangle className="w-3 h-3" /> Review
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 gap-1 text-[11px]">
                        <CheckCircle2 className="w-3 h-3" /> Valid
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {a.action_taken === 'DELETE_CANDIDATE' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSingle(a.product_id, a.product_name)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 text-xs gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </Button>
                    )}
                    {a.action_taken === 'DELETED' && (
                      <span className="text-xs text-muted-foreground italic">Purged</span>
                    )}
                    {a.action_taken === 'IMAGE_HEALED' && (
                      <span className="text-xs text-sky-600 font-medium">Ready</span>
                    )}
                    {a.action_taken === 'NO_CHANGE' && (
                      <span className="text-xs text-muted-foreground">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <div className="py-3 px-4 text-center text-xs text-muted-foreground bg-muted/20 border-t">
            Showing top 100 of {filtered.length} products. Use search or status filter to narrow down results.
          </div>
        )}
      </div>
    </div>
  );
};
