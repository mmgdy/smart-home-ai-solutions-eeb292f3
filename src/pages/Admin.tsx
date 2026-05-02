import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Loader2, CheckCircle, AlertCircle, Image, FileText, Sparkles, Download, Filter, DollarSign, CreditCard, Package, Settings, Globe, RefreshCw, Link2, Users, Tag, Zap } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PaymentSettings } from '@/components/admin/PaymentSettings';
import { OrdersManagement } from '@/components/admin/OrdersManagement';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { SiteSettings } from '@/components/admin/SiteSettings';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { ProductScraper } from '@/components/admin/ProductScraper';
import { ProductEditor } from '@/components/admin/ProductEditor';
import { SiteInfoEditor } from '@/components/admin/SiteInfoEditor';
import { BulkImporter } from '@/components/admin/BulkImporter';
import { UsersManagement } from '@/components/admin/UsersManagement';
import { BundlesEditor } from '@/components/admin/BundlesEditor';
import { CouponEditor } from '@/components/admin/CouponEditor';
import { FlashSaleEditor } from '@/components/admin/FlashSaleEditor';

interface ProductExport {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  price: number;
  original_price: number | null;
  stock: number;
  protocol: string | null;
  description: string | null;
  image_url: string | null;
  category_name: string | null;
  featured: boolean;
}

export default function Admin() {
  const { isLoading: authLoading, isAuthenticated, token, login, logout } = useAdminAuth();
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceProgress, setEnhanceProgress] = useState(0);
  const [enhanceResults, setEnhanceResults] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStats, setExportStats] = useState<{ total: number; categories: string[]; brands: string[] } | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [priceUpdateResults, setPriceUpdateResults] = useState<any[]>([]);
  const [priceUpdateProgress, setPriceUpdateProgress] = useState(0);
  const [selectedPriceBrands, setSelectedPriceBrands] = useState<string[]>(['SONOFF', 'MOES', 'TP-Link', 'Lezn', 'Akubela']);
  const [isMarketSyncing, setIsMarketSyncing] = useState(false);
  const [marketSyncResults, setMarketSyncResults] = useState<any[]>([]);
  const [marketSyncProgress, setMarketSyncProgress] = useState(0);
  const { toast } = useToast();

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated || !token) {
    return <AdminLogin onLogin={login} />;
  }

  // Fetch export stats on mount
  const fetchExportStats = async () => {
    const { data: products } = await supabase
      .from('products')
      .select('brand, categories(name)')
      .order('brand');
    
    if (products) {
      const brands = [...new Set(products.map(p => p.brand).filter(Boolean))] as string[];
      const categories = [...new Set(products.map(p => (p.categories as any)?.name).filter(Boolean))] as string[];
      setExportStats({ total: products.length, categories, brands });
    }
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      let query = supabase
        .from('products')
        .select('id, name, slug, brand, price, original_price, stock, protocol, description, image_url, featured, categories(name)')
        .order('brand')
        .order('name');

      const { data: products, error } = await query;
      if (error) throw error;

      let filteredProducts = products || [];
      
      if (selectedCategories.length > 0) {
        filteredProducts = filteredProducts.filter(p => 
          selectedCategories.includes((p.categories as any)?.name)
        );
      }
      
      if (selectedBrands.length > 0) {
        filteredProducts = filteredProducts.filter(p => 
          selectedBrands.includes(p.brand || '')
        );
      }

      filteredProducts.sort((a, b) => {
        const catA = (a.categories as any)?.name || 'Uncategorized';
        const catB = (b.categories as any)?.name || 'Uncategorized';
        if (catA !== catB) return catA.localeCompare(catB);
        
        const brandA = a.brand || 'Other';
        const brandB = b.brand || 'Other';
        if (brandA !== brandB) return brandA.localeCompare(brandB);
        
        return a.name.localeCompare(b.name);
      });

      const headers = [
        'Category', 'Brand', 'Product Name', 'Price (EGP)', 'Original Price (EGP)',
        'Discount %', 'Stock', 'Protocol', 'Featured', 'Product URL', 'Image URL', 'Description'
      ];

      const rows = filteredProducts.map(p => {
        const discount = p.original_price && p.original_price > p.price 
          ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0;
        
        return [
          (p.categories as any)?.name || 'Uncategorized', p.brand || 'Other', p.name,
          p.price, p.original_price || '', discount || '', p.stock, p.protocol || '',
          p.featured ? 'Yes' : 'No', `https://baytzaki.com/products/${p.slug}`,
          p.image_url || '', (p.description || '').replace(/"/g, '""').replace(/\n/g, ' ')
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => 
          row.map(cell => 
            typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
              ? `"${cell}"` : cell
          ).join(',')
        )
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const dateStr = new Date().toISOString().split('T')[0];
      const filterStr = selectedCategories.length > 0 || selectedBrands.length > 0 ? '-filtered' : '-all';
      link.download = `baytzaki-products${filterStr}-${dateStr}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: 'Export Complete', description: `Exported ${filteredProducts.length} products to CSV` });
    } catch (error: any) {
      toast({ title: 'Export Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setResult(null);

    try {
      const response = await fetch('/products-import.csv');
      if (!response.ok) throw new Error('Failed to fetch CSV file');
      
      const csvContent = await response.text();
      const { data, error } = await supabase.functions.invoke('import-products', { body: { csvContent, token } });
      if (error) throw error;

      setResult(data);
      toast({ title: 'Import Complete', description: `Successfully imported ${data.inserted} products` });
    } catch (error: any) {
      setResult({ error: error.message });
      toast({ title: 'Import Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFindImages = async () => {
    setIsEnhancing(true);
    setEnhanceResults([]);
    setEnhanceProgress(0);

    try {
      const batchSize = 5;
      const totalBatches = 2;
      
      for (let i = 0; i < totalBatches; i++) {
        const { data, error } = await supabase.functions.invoke('enhance-products', {
          body: { action: 'find-missing-images', batchSize, token }
        });

        if (error) throw error;
        if (data?.results) setEnhanceResults(prev => [...prev, ...data.results]);
        setEnhanceProgress(((i + 1) / totalBatches) * 100);
        if (!data?.results?.length || data.results.length < batchSize) break;
      }

      toast({ title: 'Image Search Complete', description: 'Product images have been updated' });
    } catch (error: any) {
      toast({ title: 'Image Search Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerateDescriptions = async () => {
    setIsEnhancing(true);
    setEnhanceResults([]);
    setEnhanceProgress(0);

    try {
      const batchSize = 10;
      const totalBatches = 5;
      
      for (let i = 0; i < totalBatches; i++) {
        const { data, error } = await supabase.functions.invoke('enhance-products', {
          body: { action: 'generate-descriptions', batchSize, token }
        });

        if (error) throw error;
        if (data?.results) setEnhanceResults(prev => [...prev, ...data.results]);
        setEnhanceProgress(((i + 1) / totalBatches) * 100);
      }

      toast({ title: 'Description Generation Complete', description: 'Product descriptions have been updated' });
    } catch (error: any) {
      toast({ title: 'Description Generation Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleUpdatePrices = async () => {
    setIsUpdatingPrices(true);
    setPriceUpdateResults([]);
    setPriceUpdateProgress(0);

    try {
      const batchSize = 3;
      const totalBatches = 10;
      
      for (let i = 0; i < totalBatches; i++) {
        const { data, error } = await supabase.functions.invoke('update-prices-amazon', {
          body: { batchSize, brands: selectedPriceBrands.length > 0 ? selectedPriceBrands : undefined, token }
        });

        if (error) throw error;
        if (data?.results) setPriceUpdateResults(prev => [...prev, ...data.results]);
        setPriceUpdateProgress(((i + 1) / totalBatches) * 100);
        if (!data?.results?.length || data.results.length < batchSize) break;
      }

      toast({ title: 'Price Update Complete', description: 'Product prices have been checked against Amazon Egypt' });
    } catch (error: any) {
      toast({ title: 'Price Update Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsUpdatingPrices(false);
    }
  };

  const togglePriceBrand = (brand: string) => {
    setSelectedPriceBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const handleMarketSync = async (syncAction: 'discover-products' | 'update-prices' | 'full-sync') => {
    setIsMarketSyncing(true);
    setMarketSyncResults([]);
    setMarketSyncProgress(0);

    try {
      if (syncAction === 'full-sync') {
        const { data, error } = await supabase.functions.invoke('market-sync', {
          body: { action: 'full-sync', token }
        });
        if (error) throw error;
        if (data?.results) setMarketSyncResults(data.results);
        setMarketSyncProgress(100);
      } else {
        const totalBatches = 5;
        for (let i = 0; i < totalBatches; i++) {
          const { data, error } = await supabase.functions.invoke('market-sync', {
            body: { action: syncAction, batchSize: 10, token }
          });
          if (error) throw error;
          if (data?.results) setMarketSyncResults(prev => [...prev, ...data.results]);
          setMarketSyncProgress(((i + 1) / totalBatches) * 100);
          if (!data?.results?.length) break;
        }
      }

      toast({ title: 'Market Sync Complete', description: `${syncAction.replace(/-/g, ' ')} finished successfully` });
    } catch (error: any) {
      toast({ title: 'Market Sync Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsMarketSyncing(false);
    }
  };

  return (
    <Layout>
      <Helmet>
        <title>Admin - Product Management</title>
      </Helmet>

      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-display font-bold mb-8">Admin Dashboard</h1>
        
        <Tabs defaultValue="orders" className="max-w-6xl" onValueChange={(v) => v === 'export' && fetchExportStats()}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="orders"><Package className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Orders</span></TabsTrigger>
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Users</span></TabsTrigger>
            <TabsTrigger value="products"><Package className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Products</span></TabsTrigger>
            <TabsTrigger value="bundles"><Package className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Bundles</span></TabsTrigger>
            <TabsTrigger value="bulk"><Globe className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Bulk Import</span></TabsTrigger>
            <TabsTrigger value="site-info"><Globe className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Site Info</span></TabsTrigger>
            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Site</span></TabsTrigger>
            <TabsTrigger value="prices"><DollarSign className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Prices</span></TabsTrigger>
            <TabsTrigger value="payment"><CreditCard className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Payment</span></TabsTrigger>
            <TabsTrigger value="export"><Download className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Export</span></TabsTrigger>
            <TabsTrigger value="import"><Upload className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Import</span></TabsTrigger>
            <TabsTrigger value="images"><Image className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Images</span></TabsTrigger>
            <TabsTrigger value="market-sync"><Globe className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Market</span></TabsTrigger>
            <TabsTrigger value="scraper"><Link2 className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Import URL</span></TabsTrigger>
            <TabsTrigger value="coupons"><Tag className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Coupons</span></TabsTrigger>
            <TabsTrigger value="flash-sale"><Zap className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Discounts</span></TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6"><UsersManagement adminToken={token} /></TabsContent>
          <TabsContent value="bundles" className="mt-6"><BundlesEditor adminToken={token} /></TabsContent>

          <TabsContent value="bulk" className="mt-6">
            <BulkImporter adminToken={token} />
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <OrdersManagement adminToken={token} />
            </div>
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <ProductEditor adminToken={token} />
          </TabsContent>

          <TabsContent value="site-info" className="mt-6">
            <SiteInfoEditor adminToken={token} />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <SiteSettings adminToken={token} onLogout={logout} />
          </TabsContent>

          <TabsContent value="payment" className="mt-6">
            <PaymentSettings />
          </TabsContent>

          <TabsContent value="prices" className="mt-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Update Prices from Amazon Egypt
              </h2>
              <p className="text-muted-foreground mb-6">
                Uses AI-powered search to find current prices on Amazon Egypt, Noon, and Jumia.
              </p>

              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-medium">Select Brands to Update:</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {['SONOFF', 'MOES', 'TP-Link', 'Lezn', 'Akubela', 'Aruba'].map(brand => (
                    <div key={brand} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`price-brand-${brand}`} 
                        checked={selectedPriceBrands.includes(brand)}
                        onCheckedChange={() => togglePriceBrand(brand)}
                      />
                      <Label htmlFor={`price-brand-${brand}`} className="text-sm cursor-pointer">{brand}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button onClick={handleUpdatePrices} disabled={isUpdatingPrices} size="lg" className="w-full">
                {isUpdatingPrices ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Searching Amazon Egypt...</>
                ) : (
                  <><DollarSign className="w-5 h-5 mr-2" />Update Prices from Amazon Egypt</>
                )}
              </Button>

              {isUpdatingPrices && (
                <div className="mt-4">
                  <Progress value={priceUpdateProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">Processing... {Math.round(priceUpdateProgress)}%</p>
                </div>
              )}
            </div>

            {priceUpdateResults.length > 0 && (
              <div className="mt-6 bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Results ({priceUpdateResults.length} products checked)</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {priceUpdateResults.map((item, i) => (
                    <div key={i} className={`p-3 rounded-lg text-sm ${
                      item.status === 'updated' ? 'bg-green-500/10' :
                      item.status === 'no_price_found' ? 'bg-yellow-500/10' : 'bg-red-500/10'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate flex-1">{item.productName}</span>
                        <span className={`text-xs capitalize ml-2 ${
                          item.status === 'updated' ? 'text-green-600' : 
                          item.status === 'no_price_found' ? 'text-yellow-600' : 'text-red-600'
                        }`}>{item.status.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Current: {item.currentPrice} EGP</span>
                        {item.amazonPrice && (
                          <><span>→</span><span className="text-green-600 font-medium">Amazon: {item.amazonPrice} EGP</span></>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="export" className="mt-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Export Products to CSV
              </h2>
              <p className="text-muted-foreground mb-6">
                Export all products organized by category and brand.
              </p>

              {exportStats && (
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-4">Total Products: <span className="text-primary">{exportStats.total}</span></p>
                  
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Filter className="w-4 h-4" />
                      <span className="text-sm font-medium">Filter by Category:</span>
                      {selectedCategories.length > 0 && (
                        <button onClick={() => setSelectedCategories([])} className="text-xs text-primary hover:underline">Clear</button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {exportStats.categories.map(cat => (
                        <div key={cat} className="flex items-center space-x-2">
                          <Checkbox id={`cat-${cat}`} checked={selectedCategories.includes(cat)} onCheckedChange={() => toggleCategory(cat)} />
                          <Label htmlFor={`cat-${cat}`} className="text-sm cursor-pointer">{cat}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Filter className="w-4 h-4" />
                      <span className="text-sm font-medium">Filter by Brand:</span>
                      {selectedBrands.length > 0 && (
                        <button onClick={() => setSelectedBrands([])} className="text-xs text-primary hover:underline">Clear</button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {exportStats.brands.map(brand => (
                        <div key={brand} className="flex items-center space-x-2">
                          <Checkbox id={`brand-${brand}`} checked={selectedBrands.includes(brand)} onCheckedChange={() => toggleBrand(brand)} />
                          <Label htmlFor={`brand-${brand}`} className="text-sm cursor-pointer">{brand}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <Button onClick={handleExportCSV} disabled={isExporting} size="lg" className="w-full">
                {isExporting ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Exporting...</>
                ) : (
                  <><Download className="w-5 h-5 mr-2" />{selectedCategories.length > 0 || selectedBrands.length > 0 ? 'Export Filtered Products' : 'Export All Products'}</>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="import" className="mt-6">
            <div className="bg-card border border-border rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Import Products from CSV</h2>
              <p className="text-muted-foreground mb-6">This will import products from the uploaded CSV file with smart price conversion.</p>
              
              <Button onClick={handleImport} disabled={isImporting} size="lg" className="w-full">
                {isImporting ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Importing Products...</>
                ) : (
                  <><Upload className="w-5 h-5 mr-2" />Start Import</>
                )}
              </Button>
            </div>

            {result && (
              <div className={`bg-card border rounded-xl p-6 ${result.error ? 'border-destructive' : 'border-primary'}`}>
                {result.error ? (
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-destructive">Import Failed</h3>
                      <p className="text-muted-foreground">{result.error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-primary">Import Successful</h3>
                      <p className="text-muted-foreground">Parsed: {result.total_parsed} | Imported: {result.inserted}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="images" className="mt-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Image className="w-5 h-5 text-primary" />
                Find Missing Product Images
              </h2>
              <p className="text-muted-foreground mb-6">Uses AI to find official product images from manufacturers.</p>
              
              <Button onClick={handleFindImages} disabled={isEnhancing} size="lg" className="w-full">
                {isEnhancing ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Searching for Images...</>
                ) : (
                  <><Sparkles className="w-5 h-5 mr-2" />Find Missing Images</>
                )}
              </Button>

              {isEnhancing && (
                <div className="mt-4">
                  <Progress value={enhanceProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">Processing... {Math.round(enhanceProgress)}%</p>
                </div>
              )}
            </div>

            {enhanceResults.length > 0 && (
              <div className="mt-6 bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Results ({enhanceResults.length} products)</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {enhanceResults.map((item, i) => (
                    <div key={i} className={`p-3 rounded-lg text-sm flex items-center justify-between ${
                      item.status === 'updated' ? 'bg-green-500/10 text-green-600' :
                      item.status === 'no_image_found' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-red-500/10 text-red-600'
                    }`}>
                      <span className="truncate flex-1">{item.name}</span>
                      <span className="ml-2 capitalize">{item.status.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="descriptions" className="mt-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Generate AI Descriptions
              </h2>
              <p className="text-muted-foreground mb-6">Uses AI to generate professional product descriptions.</p>
              
              <Button onClick={handleGenerateDescriptions} disabled={isEnhancing} size="lg" className="w-full">
                {isEnhancing ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating Descriptions...</>
                ) : (
                  <><Sparkles className="w-5 h-5 mr-2" />Generate AI Descriptions</>
                )}
              </Button>

              {isEnhancing && (
                <div className="mt-4">
                  <Progress value={enhanceProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">Processing... {Math.round(enhanceProgress)}%</p>
                </div>
              )}
            </div>

            {enhanceResults.length > 0 && (
              <div className="mt-6 bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Results ({enhanceResults.length} products)</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {enhanceResults.map((item, i) => (
                    <div key={i} className={`p-3 rounded-lg text-sm ${item.status === 'updated' ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate">{item.name}</span>
                        <span className={`text-xs capitalize ${item.status === 'updated' ? 'text-green-600' : 'text-yellow-600'}`}>{item.status}</span>
                      </div>
                      {item.description && <p className="text-muted-foreground text-xs">{item.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="market-sync" className="mt-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Egyptian Market Sync
              </h2>
              <p className="text-muted-foreground mb-6">
                AI-powered discovery of new smart home products and price updates from the Egyptian market (Amazon.eg, Noon, Jumia). Runs daily automatically.
              </p>

              <div className="grid gap-3 sm:grid-cols-3 mb-6">
                <Button
                  onClick={() => handleMarketSync('discover-products')}
                  disabled={isMarketSyncing}
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  <span className="text-sm font-medium">Discover Products</span>
                  <span className="text-xs text-muted-foreground">Find new products</span>
                </Button>

                <Button
                  onClick={() => handleMarketSync('update-prices')}
                  disabled={isMarketSyncing}
                  variant="outline"
                  className="h-auto py-4 flex flex-col gap-2"
                >
                  <DollarSign className="w-5 h-5" />
                  <span className="text-sm font-medium">Update Prices</span>
                  <span className="text-xs text-muted-foreground">Check current EGP prices</span>
                </Button>

                <Button
                  onClick={() => handleMarketSync('full-sync')}
                  disabled={isMarketSyncing}
                  className="h-auto py-4 flex flex-col gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span className="text-sm font-medium">Full Sync</span>
                  <span className="text-xs text-muted-foreground">All categories + prices</span>
                </Button>
              </div>

              {isMarketSyncing && (
                <div className="mb-4">
                  <Progress value={marketSyncProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Syncing market data... {Math.round(marketSyncProgress)}%
                  </p>
                </div>
              )}
            </div>

            {marketSyncResults.length > 0 && (
              <div className="mt-6 bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">
                  Results ({marketSyncResults.length} items)
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {marketSyncResults.filter(r => r.status === 'new_product_added' || r.status === 'added').length} new,
                    {' '}{marketSyncResults.filter(r => r.status === 'price_updated').length} price updates
                  </span>
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {marketSyncResults.map((item, i) => (
                    <div key={i} className={`p-3 rounded-lg text-sm ${
                      item.status === 'new_product_added' || item.status === 'added' ? 'bg-primary/10' :
                      item.status === 'price_updated' || item.status === 'updated' ? 'bg-accent/20' :
                      item.status === 'already_exists' || item.status === 'exists' || item.status === 'price_unchanged' ? 'bg-muted' :
                      'bg-destructive/10'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate flex-1">{item.name || item.category}</span>
                        <span className={`text-xs capitalize ml-2 ${
                          item.status === 'new_product_added' || item.status === 'added' ? 'text-primary' :
                          item.status === 'price_updated' || item.status === 'updated' ? 'text-accent-foreground' :
                          'text-muted-foreground'
                        }`}>{item.status?.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {item.brand && <span>{item.brand}</span>}
                        {item.category && <span>• {item.category}</span>}
                        {item.price && <span>• {item.price} EGP</span>}
                        {item.oldPrice && <span>• Was: {item.oldPrice} EGP → Now: {item.newPrice} EGP</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="scraper" className="mt-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <ProductScraper adminToken={token} />
            </div>
          </TabsContent>

          <TabsContent value="coupons" className="mt-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <CouponEditor adminToken={token} />
            </div>
          </TabsContent>

          <TabsContent value="flash-sale" className="mt-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <FlashSaleEditor adminToken={token} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
