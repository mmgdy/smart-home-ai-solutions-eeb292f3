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
import { getTextDirection, isolateBidiUnits } from '@/lib/bidi';

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
  const brandLabel = normalizeBrand(product.brand);
  const titleDir = getTextDirection(product.name);
  const descDir = getTextDirection(product.description);

  return (
    <Link to={`/products/${product.slug}`} className="block h-full">
      <article
        className={cn(
          'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/85 backdrop-blur-md transition-all duration-200 hover:border-primary/60 hover:shadow-[0_14px_34px_-16px_rgba(45,212,191,0.35)]',
          className,
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent opacity-60 group-hover:opacity-100 transition-opacity"
        />

        {/* Studio-framed Image Surface (clean integration for white & transparent photos) */}
        <div className="relative m-2.5 mb-0 aspect-square overflow-hidden rounded-xl azka-studio-surface flex items-center justify-center p-3 sm:p-4">
          <img
            src={getProductImage(product)}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = productPlaceholder; }}
            className={cn(
              'h-full w-full object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-sm',
              isOutOfStock && 'opacity-65 grayscale-[25%]',
            )}
          />

          {/* Status Badges */}
          <div
            className={cn(
              'absolute top-2.5 flex flex-col gap-1.5',
              isRTL ? 'right-2.5' : 'left-2.5',
            )}
          >
            {isOutOfStock && (
              <span className="rounded-full bg-destructive px-2.5 py-0.5 text-[11px] font-semibold text-destructive-foreground shadow-sm">
                {t('outOfStock')}
              </span>
            )}
            {discount > 0 && (
              <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-destructive-foreground shadow-sm">
                -{discount}%
              </span>
            )}
            {product.featured && (
              <span className="rounded-full bg-[#070D16] border border-teal-400/50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-300 shadow-sm">
                {t('featured')}
              </span>
            )}
          </div>

          {/* Protocol Badges */}
          {protocolTokens.length > 0 && (
            <div
              className={cn(
                'absolute bottom-2 flex flex-wrap items-center gap-1',
                isRTL ? 'right-2 left-2 flex-row-reverse' : 'left-2 right-2',
              )}
            >
              {protocolTokens.map(({ name, icon: Icon, bg, fg, description }) => (
                <span
                  key={name}
                  title={description}
                  aria-label={description}
                  dir="ltr"
                  style={{ unicodeBidi: 'isolate' }}
                  className={cn(
                    'inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-semibold shadow-sm backdrop-blur-sm',
                    bg,
                    fg,
                  )}
                >
                  <Icon className="h-3 w-3 shrink-0" strokeWidth={2.25} />
                  <span className="leading-none">{name}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-3 sm:p-3.5">
          {/* Brand & Protocol */}
          <div className="mb-1.5 flex items-center gap-1.5 flex-wrap text-xs">
            {brandLabel && (
              <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-medium text-foreground/75">
                {brandLabel}
              </span>
            )}
            {brandLabel && product.protocol?.trim() && (
              <span className="text-foreground/45" aria-hidden="true">•</span>
            )}
            {product.protocol?.trim() && (
              <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className="font-medium text-primary">
                {product.protocol.trim()}
              </span>
            )}
          </div>

          {/* Name (Bidi isolated so English model/titles never invert or put ... on wrong side) */}
          <h3
            dir={titleDir}
            style={{ unicodeBidi: 'isolate' }}
            className={cn(
              'mb-1.5 font-display text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug',
              isRTL && titleDir === 'ltr' ? 'text-right' : 'text-start',
            )}
          >
            {isolateBidiUnits(product.name)}
          </h3>

          {/* Description */}
          {product.description ? (
            <p
              dir={descDir}
              style={{ unicodeBidi: 'isolate' }}
              className={cn(
                'mb-3 flex-1 text-xs text-foreground/75 line-clamp-2 leading-relaxed',
                isRTL && descDir === 'ltr' ? 'text-right' : 'text-start',
              )}
            >
              {isolateBidiUnits(product.description)}
            </p>
          ) : (
            <div className="flex-1" />
          )}

          {/* Price Hierarchy */}
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className="font-display text-base sm:text-lg font-bold text-foreground">
              {formatPrice(product.price)}
            </span>
            {discount > 0 && product.original_price && (
              <span className="text-xs sm:text-sm font-medium azka-old-price">
                {formatPrice(product.original_price)}
              </span>
            )}
            {isOutOfStock && (
              <span className="rounded-full bg-destructive/15 border border-destructive/30 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                {t('outOfStock')}
              </span>
            )}
          </div>

          {/* Quantity + CTA */}
          <div className="mt-3 flex items-center gap-2">
            <div className="hidden lg:flex h-9 items-center rounded-full border border-border/80 bg-background/70 shrink-0">
              <button
                type="button"
                aria-label="Decrease quantity"
                className="grid h-9 w-8 place-items-center text-foreground/75 hover:text-foreground disabled:opacity-40"
                onClick={(e) => updateQuantity(e, quantity - 1)}
                disabled={isOutOfStock || quantity <= 1}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-7 text-center text-sm font-semibold text-foreground">{quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                className="grid h-9 w-8 place-items-center text-foreground/75 hover:text-foreground disabled:opacity-40"
                onClick={(e) => updateQuantity(e, quantity + 1)}
                disabled={isOutOfStock || quantity >= product.stock}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button
              size="sm"
              className="min-w-0 flex-1 h-11 lg:h-9 gap-1.5 rounded-full px-3 text-xs sm:text-sm font-semibold bg-gradient-to-r from-teal-400 to-cyan-400 text-[#070D16] hover:from-teal-300 hover:to-cyan-300 border-0 shadow-sm"
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
