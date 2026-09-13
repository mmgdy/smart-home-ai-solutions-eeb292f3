import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Filter, Loader2, X, LayoutGrid, LayoutList } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ProductCard } from '@/components/products/ProductCard';
import { SearchBar } from '@/components/products/SearchBar';
import { ProductFilters, defaultFilters, FilterState } from '@/components/products/ProductFilters';
import { SortSelect } from '@/components/products/SortSelect';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { Product, Category } from '@/types/store';
import { cairoSupplierService } from '@/data/cairoSupplierService';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category')
  );
  const [filters, setFilters] = useState<FilterState>({
    ...defaultFilters,
    priceRange: [0, 150000],
  });
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(32);
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    setVisibleCount(32);
  }, [selectedCategory, search, filters.brands, filters.protocols, filters.availability, filters.sortBy]);

  const { data: rawCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Category[];
    },
  });

  // Filter out any unwanted furniture categories
  const categories = useMemo(() => {
    const defaultCats: Category[] = [
      { id: '934d2c8e-8e1f-459e-8dd4-d93520719215', name: 'Smart Switches', slug: 'smart-switches', description: null, image_url: null, created_at: '' },
      { id: '0dc4982c-ac41-4201-aa69-3a7494ed0a7b', name: 'Smart Sensors', slug: 'smart-sensors', description: null, image_url: null, created_at: '' },
      { id: '161fef6c-d985-427e-a31f-f5735b0fa4c3', name: 'Smart Hubs', slug: 'smart-hubs', description: null, image_url: null, created_at: '' },
      { id: 'f6461e11-a1df-490f-b81f-34009d5e48e6', name: 'Smart Panels', slug: 'smart-panels', description: null, image_url: null, created_at: '' },
      { id: '61869110-4165-4bfe-80f1-af06217abd61', name: 'Smart Locks', slug: 'smart-locks', description: null, image_url: null, created_at: '' },
      { id: '1b122176-06c8-440f-8a46-4e0855cbedea', name: 'Smart Plugs', slug: 'smart-plugs', description: null, image_url: null, created_at: '' },
      { id: '2ded3f14-d5cb-47c6-a18b-1305ea346f67', name: 'Networking', slug: 'networking', description: null, image_url: null, created_at: '' },
      { id: 'c73bb3ed-3b43-4f83-8759-a283ec7bdcf9', name: 'Accessories', slug: 'accessories', description: null, image_url: null, created_at: '' },
    ];
    if (!rawCategories || rawCategories.length === 0) return defaultCats;
    return rawCategories.filter(
      (c) => c.slug !== 'art-furniture' && !c.name.toLowerCase().includes('furniture')
    );
  }, [rawCategories]);

  // Fresh sync from external sources (725 authentic smart home devices)
  const products = useMemo<Product[]>(() => {
    return cairoSupplierService.getCleanSmartHomeCatalog();
  }, []);
  const isLoading = false;

  // Derive available brands/protocols from loaded products
  const availableBrands = useMemo(() => {
    if (!products) return [];
    return [...new Set(products.map((p) => p.brand).filter(Boolean))] as string[];
  }, [products]);

  const availableProtocols = useMemo(() => {
    if (!products) return [];
    return [...new Set(products.map((p) => p.protocol).filter(Boolean))] as string[];
  }, [products]);

  const maxPrice = useMemo(() => {
    if (!products) return 150000;
    return Math.max(...products.map((p) => p.price), 150000);
  }, [products]);

  // Apply all filters, search, sorting
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let result = [...products];

    // Category filter
    if (selectedCategory) {
      if (selectedCategory === 'lighting') {
        result = result.filter(
          (p) =>
            p.category?.slug === 'smart-switches' ||
            p.name.toLowerCase().includes('switch') ||
            p.name.toLowerCase().includes('light') ||
            p.name.toLowerCase().includes('dimmer')
        );
      } else if (selectedCategory === 'security') {
        result = result.filter(
          (p) =>
            p.category?.slug === 'smart-locks' ||
            p.category?.slug === 'smart-sensors' ||
            p.name.toLowerCase().includes('lock') ||
            p.name.toLowerCase().includes('camera') ||
            p.name.toLowerCase().includes('sensor')
        );
      } else if (selectedCategory === 'energy') {
        result = result.filter(
          (p) =>
            p.category?.slug === 'smart-plugs' ||
            p.name.toLowerCase().includes('plug') ||
            p.name.toLowerCase().includes('meter') ||
            p.name.toLowerCase().includes('power')
        );
      } else if (selectedCategory === 'climate') {
        result = result.filter(
          (p) =>
            p.name.toLowerCase().includes('thermostat') ||
            p.name.toLowerCase().includes('temperature') ||
            p.name.toLowerCase().includes('ac ') ||
            p.name.toLowerCase().includes('remote')
        );
      } else if (selectedCategory === 'curtains') {
        result = result.filter(
          (p) =>
            p.name.toLowerCase().includes('curtain') ||
            p.name.toLowerCase().includes('blind') ||
            p.name.toLowerCase().includes('roller') ||
            p.name.toLowerCase().includes('motor')
        );
      } else {
        const cat = categories?.find((c) => c.slug === selectedCategory || c.id === selectedCategory);
        result = result.filter(
          (p) =>
            p.category?.slug === selectedCategory ||
            p.category_id === selectedCategory ||
            (cat && p.category_id === cat.id)
        );
      }
    }

    // Text search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower) ||
          p.brand?.toLowerCase().includes(searchLower) ||
          p.protocol?.toLowerCase().includes(searchLower)
      );
    }

    // Price range
    result = result.filter(
      (p) => p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
    );

    // Brands
    if (filters.brands.length > 0) {
      result = result.filter((p) => p.brand && filters.brands.includes(p.brand));
    }

    // Protocols
    if (filters.protocols.length > 0) {
      result = result.filter((p) => p.protocol && filters.protocols.includes(p.protocol));
    }

    // Availability
    if (filters.availability === 'in-stock') {
      result = result.filter((p) => p.stock > 0);
    } else if (filters.availability === 'out-of-stock') {
      result = result.filter((p) => p.stock === 0);
    }

    // Sorting
    switch (filters.sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'featured':
      default:
        result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
    }

    return result;
  }, [products, categories, search, selectedCategory, filters]);

  const handleCategoryChange = useCallback((slug: string | null) => {
    setSelectedCategory(slug);
    if (slug) {
      setSearchParams((prev) => {
        prev.set('category', slug);
        return prev;
      });
    } else {
      setSearchParams((prev) => {
        prev.delete('category');
        return prev;
      });
    }
  }, [setSearchParams]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (value) {
      setSearchParams((prev) => { prev.set('q', value); return prev; });
    } else {
      setSearchParams((prev) => { prev.delete('q'); return prev; });
    }
  }, [setSearchParams]);

  const activeFilterCount =
    (selectedCategory ? 1 : 0) +
    filters.brands.length +
    filters.protocols.length +
    (filters.availability !== 'all' ? 1 : 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice ? 1 : 0);

  return (
    <>
      <Helmet>
        <title>{t('smartHomeProducts')} | AzkaSmart</title>
        <meta
          name="description"
          content="Browse our collection of premium smart home products. Find smart lighting, security cameras, thermostats, and more from top brands like SONOFF, MOES, TP-Link."
        />
      </Helmet>
      <Layout>
        <div className="container py-24 md:py-28">
          {/* Header */}
          <div className="mb-8">
            <h1 className="mb-2 font-display text-2xl font-bold text-foreground md:text-3xl">
              {t('smartHomeProducts')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('discoverPremium')}</p>
          </div>

          {/* Search, Sort & Filter Bar */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <SearchBar
              value={search}
              onChange={handleSearchChange}
              className="flex-1 md:max-w-md"
            />

            <div className="flex items-center gap-3">
              <SortSelect
                value={filters.sortBy}
                onChange={(sortBy) => setFilters((f) => ({ ...f, sortBy }))}
              />

              {/* Mobile filter button */}
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2 lg:hidden relative">
                    <Filter className="h-4 w-4" />
                    {isRTL ? 'فلاتر' : 'Filters'}
                    {activeFilterCount > 0 && (
                      <span className={cn(
                        "absolute -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground",
                        isRTL ? "-left-2" : "-right-2",
                      )}>
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side={isRTL ? 'right' : 'left'} className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>{isRTL ? 'الفلاتر' : 'Filters'}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    {/* Category buttons in mobile */}
                    <div className="mb-6">
                      <h4 className="mb-3 font-display font-semibold text-foreground text-sm">{t('categories')}</h4>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={selectedCategory === null ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() => { handleCategoryChange(null); }}
                        >
                          {t('allProducts')}
                        </Button>
                        {categories?.map((category) => (
                          <Button
                            key={category.id}
                            variant={selectedCategory === category.slug ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => { handleCategoryChange(category.slug); }}
                          >
                            {category.name}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <ProductFilters
                      filters={filters}
                      onFiltersChange={setFilters}
                      availableBrands={availableBrands}
                      availableProtocols={availableProtocols}
                      maxPrice={maxPrice}
                      isMobile
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block space-y-6">
              {/* Categories */}
              <div>
                <h3 className="mb-4 font-display font-semibold text-foreground">{t('categories')}</h3>
                <div className="space-y-1">
                  <Button
                    variant={selectedCategory === null ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-sm"
                    size="sm"
                    onClick={() => handleCategoryChange(null)}
                  >
                    {t('allProducts')}
                  </Button>
                  {categories?.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.slug ? 'secondary' : 'ghost'}
                      className="w-full justify-start text-sm"
                      size="sm"
                      onClick={() => handleCategoryChange(category.slug)}
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Filters */}
              <ProductFilters
                filters={filters}
                onFiltersChange={setFilters}
                availableBrands={availableBrands}
                availableProtocols={availableProtocols}
                maxPrice={maxPrice}
              />
            </aside>

            {/* Products Grid */}
            <div>
              {/* Active filters bar */}
              {(selectedCategory || search || activeFilterCount > 0) && (
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('activeFilters')}</span>
                  {selectedCategory && (
                    <Button variant="secondary" size="sm" className="gap-1 h-7" onClick={() => handleCategoryChange(null)}>
                      {categories?.find((c) => c.slug === selectedCategory)?.name}
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  {search && (
                    <Button variant="secondary" size="sm" className="gap-1 h-7" onClick={() => handleSearchChange('')}>
                      "{search}"
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  {filters.brands.map((brand) => (
                    <Button
                      key={brand}
                      variant="secondary"
                      size="sm"
                      className="gap-1 h-7"
                      onClick={() => setFilters((f) => ({ ...f, brands: f.brands.filter((b) => b !== brand) }))}
                    >
                      {brand}
                      <X className="h-3 w-3" />
                    </Button>
                  ))}
                  {filters.protocols.map((protocol) => (
                    <Button
                      key={protocol}
                      variant="secondary"
                      size="sm"
                      className="gap-1 h-7"
                      onClick={() => setFilters((f) => ({ ...f, protocols: f.protocols.filter((p) => p !== protocol) }))}
                    >
                      {protocol}
                      <X className="h-3 w-3" />
                    </Button>
                  ))}
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredProducts.length > 0 ? (
                <>
                  <p className="mb-6 text-sm text-muted-foreground">
                    {t('showing')} {Math.min(visibleCount, filteredProducts.length)} of {filteredProducts.length} {filteredProducts.length !== 1 ? t('productsPlural') : t('product')}
                  </p>
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredProducts.slice(0, visibleCount).map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>

                  {visibleCount < filteredProducts.length && (
                    <div className="mt-8 flex justify-center">
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setVisibleCount((prev) => prev + 32)}
                        className="px-8 font-medium border-primary/30 hover:bg-primary/5 text-foreground"
                      >
                        {isRTL ? 'عرض المزيد من المنتجات' : 'Load More Products'} ({filteredProducts.length - visibleCount} {isRTL ? 'متبقي' : 'remaining'})
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
                  <p className="text-muted-foreground">{t('noProducts')}</p>
                  <Button
                    variant="ghost"
                    className="mt-4"
                    onClick={() => {
                      handleSearchChange('');
                      handleCategoryChange(null);
                      setFilters({ ...defaultFilters, priceRange: [0, maxPrice] });
                    }}
                  >
                    {isRTL ? 'مسح جميع الفلاتر' : 'Clear all filters'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Products;
