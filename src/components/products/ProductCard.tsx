import { Link } from 'react-router-dom';
import { ShoppingCart, Zap } from 'lucide-react';
import { Product } from '@/types/store';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const addItem = useCart((state) => state.addItem);
  const { toast } = useToast();
  const { t, formatPrice, isRTL } = useLanguage();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product);
    toast({
      title: t('addedToCart'),
      description: `${product.name} ${t('hasBeenAdded')}`,
    });
  };

  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : null;

  return (
    <Link to={`/products/${product.slug}`}>
      <article
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10",
          className
        )}
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Zap className="h-12 w-12 text-muted-foreground" />
            </div>
          )}

          {/* Badges */}
          <div className={cn(
            "absolute top-3 flex flex-col gap-2",
            isRTL ? "right-3" : "left-3"
          )}>
            {discount && (
              <span className="rounded-full bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground">
                -{discount}%
              </span>
            )}
            {product.featured && (
              <span className="rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                {t('featured')}
              </span>
            )}
          </div>

          {/* Quick add button */}
          <Button
            size="icon"
            className={cn(
              "absolute bottom-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
              isRTL ? "left-3" : "right-3"
            )}
            onClick={handleAddToCart}
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          {/* Brand & Protocol */}
          <div className="mb-2 flex items-center gap-2">
            {product.brand && (
              <span className="text-xs text-muted-foreground">{product.brand}</span>
            )}
            {product.protocol && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-primary">{product.protocol}</span>
              </>
            )}
          </div>

          {/* Name */}
          <h3 className="mb-2 font-display text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {/* Description */}
          {product.description && (
            <p className="mb-4 flex-1 text-sm text-muted-foreground line-clamp-2">
              {product.description}
            </p>
          )}

          {/* Price */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-xl font-bold text-foreground">
              {formatPrice(product.price)}
            </span>
            {product.original_price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.original_price)}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
