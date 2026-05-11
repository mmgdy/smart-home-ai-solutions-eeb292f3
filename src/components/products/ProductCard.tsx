import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Product } from '@/types/store';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { productPlaceholder } from '@/lib/productImage';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const addItem = useCart((state) => state.addItem);
  const { toast } = useToast();
  const { t, formatPrice, isRTL } = useLanguage();
  const [quantity, setQuantity] = useState(1);

  const updateQuantity = (e: React.MouseEvent, next: number) => {
    e.preventDefault();
    e.stopPropagation();
    setQuantity(Math.max(1, Math.min(product.stock || 1, next)));
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, quantity);
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
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={product.image_url || productPlaceholder}
            alt={product.name}
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = productPlaceholder; }}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

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

        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-3">
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
          <h3 className="mb-1 font-display text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {/* Description */}
          {product.description && (
            <p className="mb-2 flex-1 text-xs text-muted-foreground line-clamp-2">
              {product.description}
            </p>
          )}

          {/* Price */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display text-base font-bold text-foreground">
              {formatPrice(product.price)}
            </span>
            {product.original_price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.original_price)}
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="flex h-9 items-center rounded-full border border-border bg-background">
              <button type="button" className="grid h-9 w-8 place-items-center text-muted-foreground hover:text-foreground" onClick={(e) => updateQuantity(e, quantity - 1)} disabled={quantity <= 1}>
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-7 text-center text-sm font-medium text-foreground">{quantity}</span>
              <button type="button" className="grid h-9 w-8 place-items-center text-muted-foreground hover:text-foreground" onClick={(e) => updateQuantity(e, quantity + 1)} disabled={product.stock === 0 || quantity >= product.stock}>
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button size="sm" className="min-w-0 flex-1 gap-1.5 rounded-full" onClick={handleAddToCart} disabled={product.stock === 0}>
              <ShoppingCart className="h-4 w-4" />
              <span className="truncate">{t('addToCart')}</span>
            </Button>
          </div>
        </div>
      </article>
    </Link>
  );
}
