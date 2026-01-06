import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const Cart = () => {
  const { items, updateQuantity, removeItem, getTotal, clearCart } = useCart();
  const { t, formatPrice, isRTL } = useLanguage();

  const total = getTotal();
  const NextArrow = isRTL ? ArrowLeft : ArrowRight;

  if (items.length === 0) {
    return (
      <>
        <Helmet>
          <title>{t('cart')} | Baytzaki</title>
        </Helmet>
        <Layout>
          <div className="container py-20 text-center">
            <div className="mx-auto max-w-md">
              <ShoppingBag className="mx-auto mb-6 h-16 w-16 text-muted-foreground" />
              <h1 className="mb-4 font-display text-2xl font-bold text-foreground">
                {t('yourCartEmpty')}
              </h1>
              <p className="mb-8 text-muted-foreground">
                {t('cartEmptyDesc')}
              </p>
              <Link to="/products">
                <Button className="gap-2">
                  {t('browseProducts')}
                  <NextArrow className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('cart')} ({items.length}) | Baytzaki</title>
      </Helmet>
      <Layout>
        <div className="container py-8 md:py-12">
          <h1 className="mb-8 font-display text-3xl font-bold text-foreground md:text-4xl">
            {t('shoppingCart')}
          </h1>

          <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
            {/* Cart Items */}
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex gap-4 rounded-xl border border-border bg-card p-4"
                >
                  {/* Image */}
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {item.product.image_url ? (
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link to={`/products/${item.product.slug}`}>
                          <h3 className="font-display font-semibold text-foreground hover:text-primary transition-colors">
                            {item.product.name}
                          </h3>
                        </Link>
                        {item.product.brand && (
                          <p className="text-sm text-muted-foreground">{item.product.brand}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-auto flex items-center justify-between">
                      {/* Quantity */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Price */}
                      <span className="font-display text-lg font-semibold text-foreground">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={clearCart}
              >
                {t('clearCart')}
              </Button>
            </div>

            {/* Order Summary */}
            <div className="h-fit rounded-xl border border-border bg-card p-6">
              <h2 className="mb-6 font-display text-xl font-semibold text-foreground">
                {t('orderSummary')}
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('subtotal')}</span>
                  <span className="font-medium text-foreground">{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('shipping')}</span>
                  <span className="font-medium text-foreground">{t('calculatedAtCheckout')}</span>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex justify-between">
                    <span className="font-display text-lg font-semibold text-foreground">{t('total')}</span>
                    <span className="font-display text-xl font-bold text-foreground">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
              </div>

              <Button className="mt-6 w-full gap-2 glow-primary" size="lg">
                {t('proceedToCheckout')}
                <NextArrow className="h-4 w-4" />
              </Button>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                {t('secureCheckout')}
              </p>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Cart;
