import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ArrowLeft, Wrench } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/useCart';
import { useLanguage } from '@/lib/i18n';
import { CompatibilityCheck } from '@/components/checkout/CompatibilityCheck';
import { Basket } from '@/components/ui/hairline';

const Cart = () => {
  const { items, activeBundleId, updateQuantity, removeItem, getTotal, clearCart } = useCart();
  const { t, formatPrice, isRTL } = useLanguage();

  const total = getTotal();
  const isBundleOrder = Boolean(activeBundleId);
  const regularInstallFee = total > 0 ? Math.max(1500, Math.round(total * 0.20)) : 0;
  const NextArrow = isRTL ? ArrowLeft : ArrowRight;

  if (items.length === 0) {
    return (
      <>
        <Helmet>
          <title>{`${t('cart') || 'Cart'} | AzkaSmart`}</title>
        </Helmet>
        <Layout>
          <div className="container pt-28 pb-20 text-center">
            <div className="mx-auto max-w-md">
              <div className="mx-auto mb-6 w-44 rounded-2xl azka-navy-stage border border-teal-400/20 p-3 shadow-lg">
                <Basket
                  variant="navy"
                  intensity={0.65}
                  label={isRTL ? 'سلة التسوق فارغة' : 'Empty shopping basket'}
                />
              </div>
              <h1 className="mb-3 font-display text-2xl font-bold text-foreground">
                {t('yourCartEmpty')}
              </h1>
              <p className="mb-8 text-sm text-muted-foreground">
                {t('cartEmptyDesc')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/products" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto h-11 gap-2">
                    {t('browseProducts')}
                    <NextArrow className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/bundles" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto h-11 gap-2">
                    {isRTL ? 'الباقات المميزة' : 'Featured Bundles'}
                    <NextArrow className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`${t('cart') || 'Cart'} (${items.length}) | AzkaSmart`}</title>
      </Helmet>
      <Layout>
        <div className="container pt-24 pb-12 md:pt-28 md:pb-16">
          <h1 className="mb-6 md:mb-8 font-display text-2xl sm:text-3xl font-bold text-foreground md:text-4xl scroll-mt-24">
            {t('shoppingCart')}
          </h1>

          <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
            {/* Cart Items Column with AI Compatibility Check */}
            <div className="space-y-6">
              {/* AI Compatibility Advisory Box */}
              <CompatibilityCheck items={items} />

              {/* Items List */}
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex gap-3 sm:gap-4 rounded-xl border border-border bg-card p-3.5 sm:p-4"
                  >
                    {/* Image */}
                    <div className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-muted/20 border border-border/40 p-2 flex items-center justify-center">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-1 min-w-0 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <Link to={`/products/${item.product.slug}`}>
                            <h3 className="font-display text-sm sm:text-base font-semibold text-foreground hover:text-primary transition-colors break-words leading-snug">
                              {item.product.name}
                            </h3>
                          </Link>
                          {item.product.brand && (
                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{item.product.brand}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={isRTL ? 'حذف المنتج' : 'Remove item'}
                          className="h-11 w-11 shrink-0 rounded-xl text-foreground/75 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeItem(item.product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-3 pt-2 flex flex-wrap items-center justify-between gap-2">
                        {/* Quantity */}
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={isRTL ? 'تقليل الكمية' : 'Decrease quantity'}
                            className="h-11 w-11 lg:h-9 lg:w-9 rounded-xl"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={isRTL ? 'زيادة الكمية' : 'Increase quantity'}
                            className="h-11 w-11 lg:h-9 lg:w-9 rounded-xl"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        {/* Price */}
                        <span className="font-display text-base sm:text-lg font-semibold text-foreground">
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  className="min-h-[44px] px-4 text-sm font-medium text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  onClick={clearCart}
                >
                  <Trash2 className="h-4 w-4 me-2" />
                  {t('clearCart')}
                </Button>
              </div>
            </div>

            {/* Order Summary Column */}
            <div className="h-fit rounded-xl border border-border bg-card p-6">
              <h2 className="mb-6 font-display text-xl font-semibold text-foreground">
                {t('orderSummary')}
              </h2>

              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('subtotal')}</span>
                  <span className="font-medium text-foreground">{formatPrice(total)}</span>
                </div>
                {isBundleOrder && (
                  <div className="flex justify-between items-center text-sm rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5" />
                      {isRTL ? 'التركيب الاحترافي المعتمد' : 'Certified Installation'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(regularInstallFee)}
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {isRTL ? 'مجاناً (عرض الباقة)' : 'FREE (Bundle)'}
                      </span>
                    </div>
                  </div>
                )}
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

              <Link to="/checkout">
                <Button className="mt-6 w-full gap-2 glow-primary" size="lg">
                  {t('proceedToCheckout')}
                  <NextArrow className="h-4 w-4" />
                </Button>
              </Link>

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
