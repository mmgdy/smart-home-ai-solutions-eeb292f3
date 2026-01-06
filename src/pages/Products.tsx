import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, Filter, Loader2, X } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { ProductCard } from '@/components/products/ProductCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Product, Category } from '@/types/store';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category')
  );
  const [showFilters, setShowFilters] = useState(false);
  const { t } = useLanguage();

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
    queryKey: ['products', selectedCategory],
    queryFn: async () => {
      let query = supabase.from('products').select('*').order('featured', { ascending: false });

      if (selectedCategory) {
        const category = categories?.find((c) => c.slug === selectedCategory);
        if (category) {
          query = query.eq('category_id', category.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
    enabled: !categories || categories.length > 0,
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!search) return products;

    const searchLower = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.brand?.toLowerCase().includes(searchLower)
    );
  }, [products, search]);

  const handleCategoryChange = (slug: string | null) => {
    setSelectedCategory(slug);
    if (slug) {
      setSearchParams({ category: slug });
    } else {
      setSearchParams({});
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('smartHomeProducts')} | Baytzaki</title>
        <meta
          name="description"
          content="Browse our collection of premium smart home products. Find smart lighting, security cameras, thermostats, and more from top brands."
        />
      </Helmet>
      <Layout>
        <div className="container py-8 md:py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="mb-2 font-display text-3xl font-bold text-foreground md:text-4xl">
              {t('smartHomeProducts')}
            </h1>
            <p className="text-muted-foreground">
              {t('discoverPremium')}
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 md:max-w-md">
              <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('searchProducts')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-10"
              />
            </div>

            <Button
              variant="outline"
              className="gap-2 md:hidden"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              {t('filters')}
            </Button>
          </div>

          <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
            {/* Categories Sidebar */}
            <aside
              className={cn(
                'space-y-2',
                showFilters ? 'block' : 'hidden lg:block'
              )}
            >
              <h3 className="mb-4 font-display font-semibold text-foreground">
                {t('categories')}
              </h3>

              <Button
                variant={selectedCategory === null ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => handleCategoryChange(null)}
              >
                {t('allProducts')}
              </Button>

              {categories?.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.slug ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => handleCategoryChange(category.slug)}
                >
                  {category.name}
                </Button>
              ))}
            </aside>

            {/* Products Grid */}
            <div>
              {/* Active filters */}
              {(selectedCategory || search) && (
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('activeFilters')}</span>
                  {selectedCategory && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleCategoryChange(null)}
                    >
                      {categories?.find((c) => c.slug === selectedCategory)?.name}
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  {search && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1"
                      onClick={() => setSearch('')}
                    >
                      "{search}"
                      <X className="h-3 w-3" />
                    </Button>
                  )}
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
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
                  <p className="text-muted-foreground">{t('noProducts')}</p>
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
