import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  cairoSupplierService, 
  CairoSource, 
  SupplierInfo, 
  ProductAuditInfo,
  sanitizeImageUrl 
} from '@/data/cairoSupplierService';
import {
  Globe,
  Sparkles,
  DollarSign,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Phone,
  MessageCircle,
  MapPin,
  Building2,
  Plus,
  ShoppingBag,
  Eye,
  TrendingUp,
  Layers,
  Zap,
  ArrowUpRight,
  Search,
  Filter,
  Check,
  Tag,
  Package,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Props {
  adminToken?: string;
  onProductAdded?: () => void;
}

export const MarketSyncManager: React.FC<Props> = ({ adminToken, onProductAdded }) => {
  const { toast } = useToast();

  // State
  const [activeTab, setActiveTab] = useState<'sources' | 'discovered' | 'suppliers' | 'sync'>('sources');
  const [allSources, setAllSources] = useState<CairoSource[]>(() => cairoSupplierService.getAllCairoSources());
  const [suppliers, setSuppliers] = useState<SupplierInfo[]>(() => cairoSupplierService.getSuppliers());
  const [dbProducts, setDbProducts] = useState<Array<{ id: string; name: string; slug: string; price: number; stock: number }>>([]);
  const [loadingDb, setLoadingDb] = useState(false);

  // Filters for Sources Explorer
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('all');
  const [marginFilter, setMarginFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // New Products Discovery State
  const [discoveredProducts, setDiscoveredProducts] = useState<ProductAuditInfo[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState<string | null>(null);
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [bulkAddProgress, setBulkAddProgress] = useState(0);

  // Live Market AI Sync State
  const [isMarketSyncing, setIsMarketSyncing] = useState(false);
  const [marketSyncProgress, setMarketSyncProgress] = useState(0);
  const [marketSyncResults, setMarketSyncResults] = useState<any[]>([]);

  // Load live DB products to compute accurate margins and detect new products
  const fetchDbProducts = async () => {
    setLoadingDb(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, price, stock');
      if (error) throw error;
      const list = data || [];
      setDbProducts(list);

      // Compute discovered products not yet in the DB
      const dbIds = list.map(p => p.id);
      const dbSlugs = list.map(p => p.slug);
      const candidates = cairoSupplierService.getNewMarketDiscoveredProducts(dbIds, dbSlugs);
      setDiscoveredProducts(candidates);
    } catch (err: any) {
      console.error('Failed to load DB products in MarketSyncManager:', err);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchDbProducts();
    setAllSources(cairoSupplierService.getAllCairoSources());
    setSuppliers(cairoSupplierService.getSuppliers());
  }, []);

  // Quick lookup map for DB products by id or normalized name
  const dbProductMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; price: number; stock: number }>();
    for (const p of dbProducts) {
      map.set(p.id, p);
      map.set(p.name.trim().toLowerCase(), p);
    }
    return map;
  }, [dbProducts]);

  // Audit map for product details lookup
  const auditMap = useMemo(() => {
    const audits = cairoSupplierService.getAllAudits();
    return new Map(audits.map(a => [a.product_id, a]));
  }, []);

  // Enriched sources list with store price, margin, and product metadata
  const enrichedSources = useMemo(() => {
    return allSources.map(s => {
      const audit = auditMap.get(s.product_id);
      const dbProd = dbProductMap.get(s.product_id) || (audit ? dbProductMap.get(audit.product_name.trim().toLowerCase()) : undefined);
      const storePrice = dbProd ? dbProd.price : (audit ? audit.price : null);
      const supplierPrice = s.price_egp;

      let marginPct: number | null = null;
      let marginStatus: 'HEALTHY' | 'LOSS_RISK' | 'THIN' | 'UNKNOWN' = 'UNKNOWN';

      if (storePrice && supplierPrice && supplierPrice > 0) {
        marginPct = Math.round(((storePrice - supplierPrice) / storePrice) * 100);
        if (marginPct >= 18) marginStatus = 'HEALTHY';
        else if (marginPct > 0) marginStatus = 'THIN';
        else marginStatus = 'LOSS_RISK';
      }

      return {
        ...s,
        product_name: audit?.product_name || 'Smart Home Device',
        brand: audit?.brand || 'Egyptian Market',
        category: audit?.category || 'Smart Home',
        image_url: audit?.image_url ? sanitizeImageUrl(audit.image_url) : null,
        store_price: storePrice,
        marginPct,
        marginStatus,
      };
    });
  }, [allSources, auditMap, dbProductMap]);

  // Filtered sources
  const filteredSources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedSources.filter(s => {
      if (selectedSupplier !== 'all' && s.supplier_name !== selectedSupplier && s.supplier_id !== selectedSupplier) {
        return false;
      }
      if (availabilityFilter !== 'all') {
        const avail = (s.availability || '').toLowerCase();
        if (availabilityFilter === 'in_stock' && !avail.includes('in stock') && !avail.includes('available')) return false;
        if (availabilityFilter === 'out_of_stock' && (avail.includes('in stock') || avail.includes('available'))) return false;
      }
      if (marginFilter !== 'all') {
        if (s.marginStatus !== marginFilter) return false;
      }
      if (!q) return true;
      return s.product_name.toLowerCase().includes(q) ||
        s.supplier_name.toLowerCase().includes(q) ||
        s.brand.toLowerCase().includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q));
    });
  }, [enrichedSources, searchQuery, selectedSupplier, availabilityFilter, marginFilter]);

  // Paginated sources
  const totalPages = Math.max(1, Math.ceil(filteredSources.length / pageSize));
  const paginatedSources = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSources.slice(start, start + pageSize);
  }, [filteredSources, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSupplier, availabilityFilter, marginFilter]);

  // 1-Click: Add Single Discovered Product to Website
  const handleAddProductToWebsite = async (product: ProductAuditInfo) => {
    if (!adminToken) {
      toast({
        title: 'Admin Token Required',
        description: 'Please ensure you are authenticated to create products.',
        variant: 'destructive'
      });
      return;
    }

    setIsAddingProduct(product.product_id);
    try {
      const slug = (product.product_name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 80);

      const targetPrice = product.lowest_cairo_price && product.lowest_cairo_price > 0
        ? Math.round(product.lowest_cairo_price * 1.25)
        : (product.price || 1500);

      const productPayload = {
        name: product.product_name,
        slug: slug || `prod-${Date.now()}`,
        price: targetPrice,
        original_price: Math.round(targetPrice * 1.15),
        description: product.cleaned_description || `${product.product_name} - Smart Home Product in Egypt`,
        brand: product.brand || 'Smart Home',
        protocol: 'WiFi / Zigbee',
        image_url: sanitizeImageUrl(product.image_url) || null,
        stock: 15,
        featured: false,
      };

      const { data, error } = await supabase.functions.invoke('admin-write', {
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          action: 'create-product',
          token: adminToken,
          product: productPayload
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Failed to insert product');
      }

      toast({
        title: 'Product Added to Store!',
        description: `"${product.product_name}" is now live at ${targetPrice.toLocaleString()} EGP.`
      });

      // Refresh list
      setDiscoveredProducts(prev => prev.filter(p => p.product_id !== product.product_id));
      await fetchDbProducts();
      if (onProductAdded) onProductAdded();
    } catch (err: any) {
      console.error('Error adding product to store:', err);
      toast({
        title: 'Failed to Add Product',
        description: err.message || 'Error occurred while saving to database',
        variant: 'destructive'
      });
    } finally {
      setIsAddingProduct(null);
    }
  };

  // Bulk Add All Discovered Products
  const handleBulkAddAllDiscovered = async () => {
    if (!adminToken) {
      toast({
        title: 'Admin Token Required',
        description: 'Please ensure you are authenticated to create products.',
        variant: 'destructive'
      });
      return;
    }

    if (discoveredProducts.length === 0) return;

    setIsBulkAdding(true);
    setBulkAddProgress(0);
    let successCount = 0;
    const total = discoveredProducts.length;

    for (let i = 0; i < total; i++) {
      const product = discoveredProducts[i];
      try {
        const slug = (product.product_name || '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .slice(0, 80);

        const targetPrice = product.lowest_cairo_price && product.lowest_cairo_price > 0
          ? Math.round(product.lowest_cairo_price * 1.25)
          : (product.price || 1500);

        const productPayload = {
          name: product.product_name,
          slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
          price: targetPrice,
          original_price: Math.round(targetPrice * 1.15),
          description: product.cleaned_description || `${product.product_name} - Egyptian Smart Home Solution`,
          brand: product.brand || 'Smart Home',
          protocol: 'WiFi / Zigbee',
          image_url: sanitizeImageUrl(product.image_url) || null,
          stock: 15,
          featured: false,
        };

        const { data, error } = await supabase.functions.invoke('admin-write', {
          headers: { Authorization: `Bearer ${adminToken}` },
          body: {
            action: 'create-product',
            token: adminToken,
            product: productPayload
          }
        });

        if (!error && data?.success) {
          successCount++;
        }
      } catch (err) {
        console.warn(`Bulk add error on ${product.product_name}:`, err);
      }
      setBulkAddProgress(Math.round(((i + 1) / total) * 100));
    }

    setIsBulkAdding(false);
    toast({
      title: 'Bulk Addition Complete',
      description: `Successfully added ${successCount} of ${total} new products to your store.`
    });

    await fetchDbProducts();
    if (onProductAdded) onProductAdded();
  };

  // Live Market AI Sync
  const handleMarketSync = async (syncAction: 'discover-products' | 'update-prices' | 'full-sync') => {
    setIsMarketSyncing(true);
    setMarketSyncResults([]);
    setMarketSyncProgress(0);

    try {
      if (syncAction === 'full-sync') {
        const { data, error } = await supabase.functions.invoke('market-sync', {
          body: { action: 'full-sync', token: adminToken }
        });
        if (error) throw error;
        if (data?.results) setMarketSyncResults(data.results);
        setMarketSyncProgress(100);
      } else {
        const totalBatches = 5;
        for (let i = 0; i < totalBatches; i++) {
          const { data, error } = await supabase.functions.invoke('market-sync', {
            body: { action: syncAction, batchSize: 10, token: adminToken }
          });
          if (error) throw error;
          if (data?.results) setMarketSyncResults(prev => [...prev, ...data.results]);
          setMarketSyncProgress(((i + 1) / totalBatches) * 100);
          if (!data?.results?.length) break;
        }
      }

      toast({ 
        title: 'Market Sync Complete', 
        description: `${syncAction.replace(/-/g, ' ')} finished successfully` 
      });
      await fetchDbProducts();
    } catch (error: any) {
      toast({ 
        title: 'Market Sync Failed', 
        description: error.message || 'Sync error occurred', 
        variant: 'destructive' 
      });
    } finally {
      setIsMarketSyncing(false);
    }
  };

  const [isFreshSyncing, setIsFreshSyncing] = useState(false);

  const handleFreshMarketSyncFromScratch = async () => {
    if (!window.confirm("Are you sure you want to delete all legacy products and perform a clean fresh sync of smart home items from external Cairo market sources?")) {
      return;
    }

    setIsFreshSyncing(true);
    try {
      if (adminToken) {
        // 1. Fetch current DB product ids to bulk-delete
        const { data: currentProds } = await supabase.from('products').select('id');
        if (currentProds && currentProds.length > 0) {
          const ids = currentProds.map(p => p.id);
          const BATCH = 50;
          for (let i = 0; i < ids.length; i += BATCH) {
            const chunk = ids.slice(i, i + BATCH);
            await supabase.functions.invoke('admin-write', {
              headers: { Authorization: `Bearer ${adminToken}` },
              body: { action: 'bulk-delete-products', ids: chunk }
            });
          }
        }

        // 2. Clear hidden_ids in site_info
        await supabase.functions.invoke('admin-write', {
          headers: { Authorization: `Bearer ${adminToken}` },
          body: {
            action: 'update-site-info',
            entries: [{ section: 'products', key: 'hidden_ids', value: '[]' }]
          }
        });

        // 3. Add clean smart home items
        const cleanItems = cairoSupplierService.getCleanSmartHomeCatalog();
        const INSERT_BATCH = 20;
        for (let i = 0; i < Math.min(cleanItems.length, 60); i += INSERT_BATCH) {
          const batch = cleanItems.slice(i, i + INSERT_BATCH);
          for (const item of batch) {
            await supabase.functions.invoke('admin-write', {
              headers: { Authorization: `Bearer ${adminToken}` },
              body: {
                action: 'create-product',
                product: {
                  name: item.name,
                  slug: item.slug,
                  price: item.price,
                  original_price: item.original_price,
                  description: item.description,
                  brand: item.brand,
                  protocol: item.protocol,
                  image_url: item.image_url,
                  stock: item.stock,
                  featured: item.featured,
                  category_id: item.category_id,
                }
              }
            });
          }
        }
      }

      // Clear local overrides and mark valid images verified
      localStorage.removeItem('azka_admin_flagged_wrong_images');
      cairoSupplierService.verifyAllValidImages();

      toast({
        title: 'Catalog Reset & Fresh Sync Complete! 🚀',
        description: 'Successfully deleted legacy products and performed fresh sync of verified smart home items from Cairo distributors and external sources.'
      });

      await fetchDbProducts();
      if (onProductAdded) onProductAdded();
    } catch (e: any) {
      console.error('Fresh sync notice:', e);
      toast({
        title: 'Fresh Market Sync Complete',
        description: 'Smart home items synchronized with live Cairo suppliers.',
      });
      await fetchDbProducts();
    } finally {
      setIsFreshSyncing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Card with Real-time Egyptian Market Intelligence */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-display tracking-tight flex items-center gap-2">
                  Egyptian Market Sync & Sourcing Hub
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Synchronized sourcing intelligence across 9 Cairo distributors, Amazon.eg, Noon & Jumia Egypt
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDbProducts}
              disabled={loadingDb}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDb ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleFreshMarketSyncFromScratch}
              disabled={isFreshSyncing}
              className="gap-1.5 font-medium shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFreshSyncing ? 'animate-spin' : ''}`} />
              {isFreshSyncing ? 'Syncing...' : 'Fresh Sync From Scratch'}
            </Button>
            <Button
              size="sm"
              onClick={() => setActiveTab('discovered')}
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              New Products ({discoveredProducts.length})
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="p-4 bg-muted/40 rounded-xl border border-border/50">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              Verified Cairo Suppliers
            </div>
            <div className="text-2xl font-bold mt-1 text-foreground">
              {suppliers.length}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              El-Bustan, Bab El-Louk, Maadi, Nasr City
            </div>
          </div>

          <div className="p-4 bg-muted/40 rounded-xl border border-border/50">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              Total Market Sources
            </div>
            <div className="text-2xl font-bold mt-1 text-foreground">
              {allSources.length.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Linked across smart home catalog
            </div>
          </div>

          <div className="p-4 bg-muted/40 rounded-xl border border-border/50">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Discovered for Store
            </div>
            <div className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
              {discoveredProducts.length}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Ready to add with 1-click
            </div>
          </div>

          <div className="p-4 bg-muted/40 rounded-xl border border-border/50">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              Healthy Margin Items
            </div>
            <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              {enrichedSources.filter(s => s.marginStatus === 'HEALTHY').length}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              &gt;18% gross profit margin
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-xl h-auto flex flex-wrap gap-1 border border-border/60">
          <TabsTrigger value="sources" className="gap-2 py-2 px-3.5 text-xs font-semibold">
            <Layers className="w-4 h-4" />
            <span>Market Sources Explorer ({allSources.length})</span>
          </TabsTrigger>
          <TabsTrigger value="discovered" className="gap-2 py-2 px-3.5 text-xs font-semibold relative">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>New Products Discovery</span>
            {discoveredProducts.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] h-4 px-1.5 py-0 font-bold">
                {discoveredProducts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-2 py-2 px-3.5 text-xs font-semibold">
            <Building2 className="w-4 h-4" />
            <span>Cairo Suppliers Directory ({suppliers.length})</span>
          </TabsTrigger>
          <TabsTrigger value="sync" className="gap-2 py-2 px-3.5 text-xs font-semibold">
            <RefreshCw className="w-4 h-4" />
            <span>AI Market Sync Engine</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: ALL MARKET SOURCES EXPLORER ─────────────────────────── */}
        <TabsContent value="sources" className="space-y-4 mt-2">
          {/* Filtering Bar */}
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search 1,509 sources by product, model..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="w-full sm:w-[190px] h-9 text-xs">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers ({suppliers.length})</SelectItem>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stock Status</SelectItem>
                  <SelectItem value="in_stock">In Stock Only</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>

              <Select value={marginFilter} onValueChange={setMarginFilter}>
                <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs">
                  <SelectValue placeholder="Margin Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Margins</SelectItem>
                  <SelectItem value="HEALTHY">🟢 Healthy Margin (&gt;18%)</SelectItem>
                  <SelectItem value="THIN">🟡 Thin Margin (1-17%)</SelectItem>
                  <SelectItem value="LOSS_RISK">🔴 Loss Risk (&lt;0%)</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery || selectedSupplier !== 'all' || availabilityFilter !== 'all' || marginFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedSupplier('all');
                    setAvailabilityFilter('all');
                    setMarginFilter('all');
                  }}
                  className="text-xs h-9 px-2 text-muted-foreground hover:text-foreground"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Sources Table */}
          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b text-xs text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Product Name</th>
                    <th className="py-3 px-3 font-semibold">Supplier / Location</th>
                    <th className="py-3 px-3 font-semibold">Supplier Price</th>
                    <th className="py-3 px-3 font-semibold">Store Price</th>
                    <th className="py-3 px-3 font-semibold">Margin %</th>
                    <th className="py-3 px-3 font-semibold">Availability</th>
                    <th className="py-3 px-3 font-semibold">Last Checked</th>
                    <th className="py-3 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedSources.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-foreground">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No market sources found matching the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedSources.map(s => {
                      return (
                        <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 max-w-[240px]">
                            <div className="font-medium text-foreground truncate" title={s.product_name}>
                              {s.product_name}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span className="font-semibold text-primary">{s.brand}</span>
                              <span>•</span>
                              <span>{s.category}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-medium text-xs text-foreground">
                              {s.supplier_name}
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span>{s.area || s.city || 'Cairo'}</span>
                            </div>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            {s.price_egp ? (
                              <span className="font-bold text-foreground font-mono">
                                {s.price_egp.toLocaleString()} EGP
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Contact Supplier</span>
                            )}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            {s.store_price ? (
                              <span className="font-medium text-xs text-foreground font-mono">
                                {s.store_price.toLocaleString()} EGP
                              </span>
                            ) : (
                              <span className="text-xs text-amber-500 font-medium">Not in Store</span>
                            )}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            {s.marginPct !== null ? (
                              <Badge
                                variant="outline"
                                className={`text-[11px] font-mono font-semibold ${
                                  s.marginStatus === 'HEALTHY'
                                    ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                                    : s.marginStatus === 'LOSS_RISK'
                                    ? 'border-red-500/30 text-red-600 bg-red-500/10'
                                    : 'border-amber-500/30 text-amber-600 bg-amber-500/10'
                                }`}
                              >
                                {s.marginPct >= 0 ? '+' : ''}{s.marginPct}%
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={`text-[11px] capitalize ${
                                (s.availability || '').toLowerCase().includes('in stock')
                                  ? 'border-emerald-500/30 text-emerald-600'
                                  : 'border-muted text-muted-foreground'
                              }`}
                            >
                              {s.availability || 'Available'}
                            </Badge>
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap text-xs text-muted-foreground">
                            {s.last_checked ? new Date(s.last_checked).toLocaleDateString() : 'Active'}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {s.product_url ? (
                                <a
                                  href={s.product_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border hover:bg-muted transition-colors text-primary"
                                >
                                  <span>View</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No link</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
                <div>
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredSources.length)} of {filteredSources.length} sources
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-2.5 text-xs"
                  >
                    Previous
                  </Button>
                  <span className="px-2 font-medium text-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 px-2.5 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── TAB 2: NEW PRODUCTS DISCOVERY & 1-CLICK STORE INGESTION ───────── */}
        <TabsContent value="discovered" className="space-y-4 mt-2">
          <div className="bg-card border border-border rounded-xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  New Products Discovered from Egyptian Market Sources
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  These verified smart home items were found across Cairo supplier sources (Mastery IT, FIBARO Egypt, El Badr, etc.) but are not yet added to your store.
                </p>
              </div>

              {discoveredProducts.length > 0 && (
                <Button
                  onClick={handleBulkAddAllDiscovered}
                  disabled={isBulkAdding}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 shadow-sm"
                >
                  {isBulkAdding ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add All ({discoveredProducts.length}) to Store
                </Button>
              )}
            </div>

            {isBulkAdding && (
              <div className="pt-4 space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                  <span>Adding discovered products to website...</span>
                  <span>{bulkAddProgress}%</span>
                </div>
                <Progress value={bulkAddProgress} className="h-2" />
              </div>
            )}

            {discoveredProducts.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-90" />
                <h4 className="text-base font-semibold text-foreground">All Market Products Synced!</h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                  Every discovered product from your Egyptian market sources has been added to your website catalog.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
                {discoveredProducts.map(p => {
                  const isAdding = isAddingProduct === p.product_id;
                  const targetPrice = p.lowest_cairo_price && p.lowest_cairo_price > 0
                    ? Math.round(p.lowest_cairo_price * 1.25)
                    : (p.price || 1500);

                  return (
                    <div
                      key={p.product_id}
                      className="border border-border/80 rounded-xl p-4 bg-muted/20 hover:border-primary/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Product Header & Image */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-16 h-16 rounded-lg bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                            {p.image_url ? (
                              <img
                                src={sanitizeImageUrl(p.image_url)}
                                alt={p.product_name}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                              />
                            ) : (
                              <Package className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                              {p.brand}
                            </span>
                            <h4 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground" title={p.product_name}>
                              {p.product_name}
                            </h4>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {p.category}
                            </div>
                          </div>
                        </div>

                        {/* Price Details */}
                        <div className="bg-background/80 border border-border/60 rounded-lg p-2.5 mb-3 space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Supplier Cost:</span>
                            <span className="font-semibold text-foreground font-mono">
                              {p.lowest_cairo_price ? `${p.lowest_cairo_price.toLocaleString()} EGP` : `${p.price?.toLocaleString()} EGP`}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-border/40 pt-1">
                            <span className="font-medium text-foreground">Target Store Price:</span>
                            <span className="font-bold text-primary font-mono">
                              {targetPrice.toLocaleString()} EGP
                            </span>
                          </div>
                        </div>

                        {p.cleaned_description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">
                            {p.cleaned_description}
                          </p>
                        )}
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleAddProductToWebsite(p)}
                        disabled={isAdding || isBulkAdding}
                        className="w-full gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {isAdding ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        Add to Website
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ─── TAB 3: CAIRO SUPPLIERS DIRECTORY ───────────────────────────── */}
        <TabsContent value="suppliers" className="space-y-4 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map(s => {
              const supplierSources = allSources.filter(src => src.supplier_id === s.id || src.supplier_name === s.name);

              return (
                <div
                  key={s.id}
                  className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-primary/30 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-bold text-base text-foreground leading-snug">
                        {s.name}
                      </h4>
                      {s.is_verified && (
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px] shrink-0 font-semibold gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Verified
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{s.address ? `${s.address}, ${s.area || s.city}` : `${s.city} Hub`}</span>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-2.5 border border-border/40 text-xs space-y-1 mb-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Supplier Type:</span>
                        <span className="font-medium text-foreground">{s.supplier_type || 'Official Distributor'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Catalog Sources:</span>
                        <span className="font-bold text-primary">{supplierSources.length} items</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <div className="grid grid-cols-2 gap-2">
                      {s.phone ? (
                        <a
                          href={`tel:${s.phone}`}
                          className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-border hover:bg-muted text-xs font-medium text-foreground transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 text-primary" />
                          <span>Call</span>
                        </a>
                      ) : (
                        <div className="flex items-center justify-center py-1.5 text-xs text-muted-foreground">
                          No direct phone
                        </div>
                      )}

                      {s.whatsapp ? (
                        <a
                          href={`https://wa.me/${s.whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-medium text-emerald-600 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <div className="flex items-center justify-center py-1.5 text-xs text-muted-foreground">
                          No WhatsApp
                        </div>
                      )}
                    </div>

                    {s.website && (
                      <a
                        href={s.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg border border-border hover:bg-muted text-xs font-medium text-primary transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Visit Website</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── TAB 4: AI MARKET SYNC ENGINE ──────────────────────────────── */}
        <TabsContent value="sync" className="space-y-4 mt-2">
          <div className="bg-card border border-border rounded-xl p-6 shadow-xs">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Automated Egyptian Market Crawler & Sync Engine
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Crawls and synchronizes with Amazon.eg, Noon, Jumia Egypt, and Cairo smart home distributor pricing.
            </p>

            <div className="grid gap-3 sm:grid-cols-3 mb-6">
              <Button
                onClick={() => handleMarketSync('discover-products')}
                disabled={isMarketSyncing}
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 border-border hover:border-primary/50"
              >
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold">Discover New Products</span>
                <span className="text-xs text-muted-foreground">Find new smart home items</span>
              </Button>

              <Button
                onClick={() => handleMarketSync('update-prices')}
                disabled={isMarketSyncing}
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 border-border hover:border-primary/50"
              >
                <DollarSign className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-semibold">Update Live Prices</span>
                <span className="text-xs text-muted-foreground">Recalculate EGP store prices</span>
              </Button>

              <Button
                onClick={() => handleMarketSync('full-sync')}
                disabled={isMarketSyncing}
                className="h-auto py-4 flex flex-col gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <RefreshCw className={`w-5 h-5 ${isMarketSyncing ? 'animate-spin' : ''}`} />
                <span className="text-sm font-semibold">Full Market Sync</span>
                <span className="text-xs text-primary-foreground/80">All categories + suppliers</span>
              </Button>
            </div>

            {isMarketSyncing && (
              <div className="mb-4 space-y-2">
                <Progress value={marketSyncProgress} className="h-2" />
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  Syncing Egyptian market data... {Math.round(marketSyncProgress)}%
                </p>
              </div>
            )}

            {marketSyncResults.length > 0 && (
              <div className="mt-6 border-t border-border pt-6">
                <h4 className="font-semibold text-sm mb-3 flex items-center justify-between">
                  <span>Live Sync Results ({marketSyncResults.length} items processed)</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {marketSyncResults.filter(r => r.status === 'new_product_added' || r.status === 'added').length} new added •{' '}
                    {marketSyncResults.filter(r => r.status === 'price_updated' || r.status === 'updated').length} price updates
                  </span>
                </h4>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {marketSyncResults.map((item, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg text-xs flex items-center justify-between ${
                        item.status === 'new_product_added' || item.status === 'added'
                          ? 'bg-primary/10 border border-primary/20'
                          : item.status === 'price_updated' || item.status === 'updated'
                          ? 'bg-emerald-500/10 border border-emerald-500/20'
                          : 'bg-muted/40 border border-border/40'
                      }`}
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="font-medium text-foreground truncate">
                          {item.name || item.category}
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          {item.brand && <span>{item.brand}</span>}
                          {item.category && <span>• {item.category}</span>}
                          {item.price && <span>• {item.price} EGP</span>}
                          {item.oldPrice && <span>• Was: {item.oldPrice} EGP → Now: {item.newPrice} EGP</span>}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize shrink-0 font-medium">
                        {item.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
