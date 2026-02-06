import { useState, useMemo, useCallback } from 'react';
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
  const { t, isRTL } = useLanguage();

  const { data: categories } = useQuery({
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

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('featured', { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

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
      const category = categories?.find((c) => c.slug === selectedCategory);
      if (category) {
        result = result.filter((p) => p.category_id === category.id);
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
        <title>{t('smartHomeProducts')} | Baytzaki</title>
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
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
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
                    {t('showing')} {filteredProducts.length} {filteredProducts.length !== 1 ? t('productsPlural') : t('product')}
                  </p>
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
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
