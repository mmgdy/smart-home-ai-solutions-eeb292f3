import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/store';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function FeaturedProducts() {
  const { t, isRTL } = useLanguage();

  const { data: products, isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('featured', true)
        .limit(4);

      if (error) throw error;
      return data as Product[];
    },
  });

  return (
    <section className="py-20">
      <div className="container">
        {/* Header */}
        <div className="mb-12 flex items-end justify-between">
          <div>
            <h2 className="mb-2 font-display text-3xl font-bold text-foreground md:text-4xl">
              {t('featuredProducts')}
            </h2>
            <p className="text-muted-foreground">
              {t('featuredProductsDesc')}
            </p>
          </div>
          <Link to="/products" className="hidden md:block">
            <Button variant="ghost" className="gap-2">
              {t('viewAll')} <ArrowRight className={cn("h-4 w-4", isRTL && "rotate-180")} />
            </Button>
          </Link>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
            <p className="text-muted-foreground">{t('noFeaturedProducts')}</p>
          </div>
        )}

        {/* Mobile CTA */}
        <div className="mt-8 text-center md:hidden">
          <Link to="/products">
            <Button variant="outline" className="gap-2">
              {t('viewAllProducts')} <ArrowRight className={cn("h-4 w-4", isRTL && "rotate-180")} />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
