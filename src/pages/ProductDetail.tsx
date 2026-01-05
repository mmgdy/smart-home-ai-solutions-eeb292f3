import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ShoppingCart, Loader2, Zap, Check } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/store';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const addItem = useCart((state) => state.addItem);
  const { toast } = useToast();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data as Product | null;
    },
    enabled: !!slug,
  });

  const handleAddToCart = () => {
    if (product) {
      addItem(product);
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="mb-4 font-display text-2xl font-bold">Product Not Found</h1>
          <p className="mb-8 text-muted-foreground">
            The product you're looking for doesn't exist.
          </p>
          <Link to="/products">
            <Button>Back to Products</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : null;

  return (
    <>
      <Helmet>
        <title>{product.name} | Baytzaki</title>
        <meta
          name="description"
          content={product.description || `Buy ${product.name} at Baytzaki`}
        />
      </Helmet>
      <Layout>
        <div className="container py-8 md:py-12">
          {/* Breadcrumb */}
          <Link
            to="/products"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Link>

          <div className="grid gap-12 lg:grid-cols-2">
            {/* Image */}
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-card">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Zap className="h-24 w-24 text-muted-foreground" />
                </div>
              )}

              {/* Badges */}
              <div className="absolute left-4 top-4 flex flex-col gap-2">
                {discount && (
                  <span className="rounded-full bg-destructive px-3 py-1 text-sm font-medium text-destructive-foreground">
                    Save {discount}%
                  </span>
                )}
                {product.featured && (
                  <span className="rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
                    Featured
                  </span>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-col">
              {/* Brand & Protocol */}
              <div className="mb-4 flex items-center gap-3">
                {product.brand && (
                  <span className="text-sm text-muted-foreground">{product.brand}</span>
                )}
                {product.protocol && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {product.protocol}
                    </span>
                  </>
                )}
              </div>

              {/* Name */}
              <h1 className="mb-4 font-display text-3xl font-bold text-foreground md:text-4xl">
                {product.name}
              </h1>

              {/* Description */}
              {product.description && (
                <p className="mb-6 text-lg text-muted-foreground">
                  {product.description}
                </p>
              )}

              {/* Price */}
              <div className="mb-8 flex items-center gap-4">
                <span className="font-display text-4xl font-bold text-foreground">
                  ${product.price.toFixed(2)}
                </span>
                {product.original_price && (
                  <span className="text-xl text-muted-foreground line-through">
                    ${product.original_price.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Stock */}
              <div className="mb-8 flex items-center gap-2">
                {product.stock > 0 ? (
                  <>
                    <Check className="h-5 w-5 text-success" />
                    <span className="text-success">In Stock ({product.stock} available)</span>
                  </>
                ) : (
                  <span className="text-destructive">Out of Stock</span>
                )}
              </div>

              {/* Add to Cart */}
              <Button
                size="lg"
                className="mb-8 gap-2 glow-primary"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                <ShoppingCart className="h-5 w-5" />
                Add to Cart
              </Button>

              {/* Specs */}
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
                    Specifications
                  </h3>
                  <dl className="space-y-3">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <dt className="text-muted-foreground">{key}</dt>
                        <dd className="font-medium text-foreground">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default ProductDetail;
