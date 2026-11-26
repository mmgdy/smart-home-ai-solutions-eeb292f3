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
import { useLanguage } from '@/lib/i18n';
import { normalizeBrand } from '@/lib/brands';
import { getPublicShopCategories, sortCategories } from '@/lib/categories';
import { fetchHiddenProductIds, filterPublicProducts } from '@/lib/productVisibility';
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
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return sortCategories((data ?? []) as Category[]);
    },
  });

  const { data: hiddenIds, isLoading: hiddenLoading } = useQuery({
    queryKey: ['hidden-product-ids'],
    queryFn: fetchHiddenProductIds,
    staleTime: 30 * 1000,
  });

  const { data: rawProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const pageSize = 1000;
      const rows: any[] = [];
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from('products')
          .select('*, categories(*)')
          .is('parent_id', null)
          .neq('is_published', false)
          .order('featured', { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < pageSize) break;
      }
      return rows;
    },
  });

  const isLoading = productsLoading || hiddenLoading;

  const products = useMemo<Product[]>(() => {
    if (!rawProducts || hiddenIds === undefined) return [];
    return filterPublicProducts(rawProducts as any[], hiddenIds)
      .map((p) => ({
        ...p,
        brand: normalizeBrand(p.brand),
        category: p.categories || p.category,
        images: Array.isArray(p.images) && p.images.length > 0 ? p.images : p.image_url ? [p.image_url] : [],
      })) as Product[];
  }, [rawProducts, hiddenIds]);

  // Public shop category filter: ONLY active categories (never Uncategorized) with >= 1 published product, in sort_order
  const categories = useMemo(
    () => getPublicShopCategories(rawCategories ?? [], products),
    [rawCategories, products]
  );

  // Derive available brands/protocols from loaded products
  const availableBrands = useMemo(() => {
    if (!products) return [];
    return [...new Set(products.map((p) => normalizeBrand(p.brand)).filter(Boolean))].sort((a, b) =>
      String(a).localeCompare(String(b))
    ) as string[];
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

    // Category filter (real DB category match takes priority over legacy solution shortcuts)
    if (selectedCategory) {
      const matchedRealCat = rawCategories?.find(
        (c) => c.slug === selectedCategory || c.id === selectedCategory
      );
      if (matchedRealCat) {
        result = result.filter(
          (p) =>
            p.category_id === matchedRealCat.id ||
            p.category?.slug === matchedRealCat.slug
        );
      } else if (selectedCategory === 'lighting') {
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
        result = result.filter(
          (p) =>
            p.category?.slug === selectedCategory ||
            p.category_id === selectedCategory
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
  }, [products, rawCategories, categories, search, selectedCategory, filters]);

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
                  <Button variant="outline" className="gap-2 lg:hidden relative h-11 px-4 shrink-0">
                    <Filter className="h-4 w-4" />
                    {isRTL ? 'الفلاتر' : 'Filters'}
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
                <SheetContent side={isRTL ? 'right' : 'left'} className="w-[88vw] max-w-sm flex flex-col p-0">
                  <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
                    <SheetTitle>{isRTL ? 'الفلاتر' : 'Filters'}</SheetTitle>
                  </SheetHeader>
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    {/* Category buttons in mobile */}
                    <div className="mb-6">
                      <h4 className="mb-3 font-display font-semibold text-foreground text-sm">{t('categories')}</h4>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={selectedCategory === null ? 'secondary' : 'ghost'}
                          size="sm"
                          className="min-h-[40px]"
                          onClick={() => { handleCategoryChange(null); }}
                        >
                          {t('allProducts')}
                        </Button>
                        {categories?.map((category) => (
                          <Button
                            key={category.id}
                            variant={selectedCategory === category.slug ? 'secondary' : 'ghost'}
                            size="sm"
                            className="min-h-[40px]"
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
                  <div className="p-4 border-t border-border bg-background/95 backdrop-blur">
                    <Button
                      className="w-full h-11 rounded-full font-semibold"
                      onClick={() => setMobileFiltersOpen(false)}
                    >
                      {isRTL
                        ? `تطبيق الفلاتر (${filteredProducts.length})`
                        : `Apply Filters (${filteredProducts.length})`}
                    </Button>
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
                      {rawCategories?.find((c) => c.slug === selectedCategory || c.id === selectedCategory)?.name || selectedCategory}
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
                <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border bg-card overflow-hidden p-3 sm:p-4 space-y-3 animate-pulse"
                    >
                      <div className="aspect-square rounded-lg bg-muted" />
                      <div className="h-3 w-1/3 rounded bg-muted" />
                      <div className="h-4 w-4/5 rounded bg-muted" />
                      <div className="h-5 w-1/2 rounded bg-muted" />
                      <div className="h-10 w-full rounded-lg bg-muted" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length > 0 ? (
                <>
                  <p className="mb-6 text-sm text-muted-foreground">
                    {isRTL
                      ? `عرض ${Math.min(visibleCount, filteredProducts.length)} من ${filteredProducts.length} منتج`
                      : `Showing ${Math.min(visibleCount, filteredProducts.length)} of ${filteredProducts.length} ${filteredProducts.length !== 1 ? 'products' : 'product'}`}
                  </p>
                  <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
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
