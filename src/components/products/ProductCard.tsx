import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Product } from '@/types/store';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { getProductImage, productPlaceholder } from '@/lib/productImage';
import { parseProtocols } from '@/lib/protocolIcon';
import { normalizeBrand } from '@/lib/brands';

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

  const isOutOfStock = (product.stock ?? 0) <= 0;

  const hasDiscount = Boolean(product.original_price && product.original_price > product.price);
  const discount = hasDiscount
    ? Math.round(((product.original_price! - product.price) / product.original_price!) * 100)
    : 0;

  const protocolTokens = parseProtocols(product.protocol);

  return (
    <Link to={`/products/${product.slug}`}>
      <article
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/85 backdrop-blur-md transition-all duration-200 hover:border-primary/55 hover:shadow-[0_14px_34px_-16px_rgba(45,212,191,0.35)]",
          className
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-60 group-hover:opacity-100 transition-opacity"
        />
        {/* Image - Clean centered display showing whole product without cropping */}
        <div className="relative aspect-square overflow-hidden bg-slate-50 dark:bg-white/[0.04] flex items-center justify-center p-3 sm:p-4 border-b border-border/40">
          <img
            src={getProductImage(product)}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = productPlaceholder; }}
            className={cn(
              "h-full w-full object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-sm",
              isOutOfStock && "opacity-65 grayscale-[25%]"
            )}
          />

          {/* Badges */}
          <div className={cn(
            "absolute top-2.5 sm:top-3 flex flex-col gap-1.5 sm:gap-2",
            isRTL ? "right-2.5 sm:right-3" : "left-2.5 sm:left-3"
          )}>
            {isOutOfStock && (
              <span className="rounded-full bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground shadow-sm">
                {t('outOfStock')}
              </span>
            )}
            {discount > 0 && (
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

          {/* Protocol badges */}
          {protocolTokens.length > 0 && (
            <div
              className={cn(
                "absolute bottom-2.5 sm:bottom-3 flex flex-wrap items-center gap-1 sm:gap-1.5",
                isRTL ? "right-2.5 left-2.5 sm:right-3 sm:left-3 flex-row-reverse" : "left-2.5 right-2.5 sm:left-3 sm:right-3"
              )}
            >
              {protocolTokens.map(({ name, icon: Icon, bg, fg, description }) => (
                <span
                  key={name}
                  title={description}
                  aria-label={description}
                  className={cn(
                    'inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs lg:text-[11px] font-medium shadow-sm backdrop-blur-sm',
                    bg,
                    fg
                  )}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                  <span className="leading-none">{name}</span>
                </span>
              ))}
            </div>
          )}

        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-3">
          {/* Brand & Protocol */}
          <div className="mb-2 flex items-center gap-2">
            {normalizeBrand(product.brand) && (
              <span className="text-xs text-muted-foreground">{normalizeBrand(product.brand)}</span>
            )}
            {normalizeBrand(product.brand) && product.protocol?.trim() && (
              <span className="text-muted-foreground">•</span>
            )}
            {product.protocol?.trim() && (
              <span className="text-xs text-primary">{product.protocol.trim()}</span>
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
            <span className="font-display text-sm sm:text-base font-bold text-foreground">
              {formatPrice(product.price)}
            </span>
            {discount > 0 && product.original_price && (
              <span className="text-xs sm:text-sm text-muted-foreground line-through">
                {formatPrice(product.original_price)}
              </span>
            )}
            {isOutOfStock && (
              <span className="rounded-full bg-destructive/15 border border-destructive/30 px-2 py-0.5 text-xs lg:text-[11px] font-semibold text-destructive">
                {t('outOfStock')}
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="hidden lg:flex h-9 items-center rounded-full border border-border bg-background shrink-0">
              <button
                type="button"
                aria-label="Decrease quantity"
                className="grid h-9 w-8 place-items-center text-muted-foreground hover:text-foreground"
                onClick={(e) => updateQuantity(e, quantity - 1)}
                disabled={isOutOfStock || quantity <= 1}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-7 text-center text-sm font-medium text-foreground">{quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                className="grid h-9 w-8 place-items-center text-muted-foreground hover:text-foreground"
                onClick={(e) => updateQuantity(e, quantity + 1)}
                disabled={isOutOfStock || quantity >= product.stock}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button
              size="sm"
              className="min-w-0 flex-1 h-11 lg:h-9 gap-1.5 rounded-full px-3 text-xs sm:text-sm font-medium"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="h-4 w-4 shrink-0" />
              <span className="truncate">{t('addToCart')}</span>
            </Button>
          </div>
        </div>
      </article>
    </Link>
  );
}
