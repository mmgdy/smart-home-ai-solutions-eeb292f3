import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, ShoppingCart, Loader2, Zap, Check, Shield, Truck, Award, Wifi, CreditCard } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/store';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const addItem = useCart((state) => state.addItem);
  const { toast } = useToast();
  const { t, formatPrice, isRTL } = useLanguage();

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
      toast({ title: t('addedToCart'), description: `${product.name} ${t('hasBeenAdded')}` });
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
          <h1 className="mb-4 font-display text-2xl font-bold">{t('productNotFound')}</h1>
          <p className="mb-8 text-muted-foreground">{t('productNotFoundDesc')}</p>
          <Link to="/products"><Button>{t('backToProducts')}</Button></Link>
        </div>
      </Layout>
    );
  }

  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : null;
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const trustBadges = [
    { icon: CreditCard, label: isRTL ? 'دفع آمن بالبطاقة' : 'Secure Card Payment' },
    { icon: Shield, label: isRTL ? 'ضمان ٢ سنة' : '2-Year Warranty' },
    { icon: Award, label: isRTL ? 'منتج أصلي' : 'Genuine Product' },
  ];

  const compatBadges = [
    product.protocol && product.protocol,
    product.specifications?.['connectivity'],
  ].filter(Boolean);

  return (
    <>
      <Helmet>
        <title>{product.name} | Baytzaki</title>
        <meta name="description" content={product.description || `Buy ${product.name} at Baytzaki - Smart Home Egypt`} />
      </Helmet>
      <Layout>
        <div className="container py-8 md:py-12 pt-24">
          <Link to="/products" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <BackArrow className="h-4 w-4" />
            {t('backToProducts')}
          </Link>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Image & Video */}
            <div className="space-y-4">
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-card">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Zap className="h-24 w-24 text-muted-foreground" />
                  </div>
                )}
                <div className={cn("absolute top-4 flex flex-col gap-2", isRTL ? "right-4" : "left-4")}>
                  {discount && (
                    <span className="rounded-full bg-destructive px-3 py-1 text-sm font-medium text-destructive-foreground">
                      {t('save')} {discount}%
                    </span>
                  )}
                  {product.featured && (
                    <span className="rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
                      {t('featured')}
                    </span>
                  )}
                </div>
              </div>

              {/* Installation Video */}
              {product.video_url && (
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="p-3 border-b border-border">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      🎬 {isRTL ? 'فيديو التركيب' : 'Installation Video'}
                    </h3>
                  </div>
                  <div className="aspect-video">
                    {isDirectVideo(product.video_url) ? (
                      <video
                        src={product.video_url}
                        className="w-full h-full"
                        controls
                        playsInline
                      />
                    ) : (
                      <iframe
                        src={getYouTubeEmbedUrl(product.video_url) ?? product.video_url}
                        title="Installation video"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col">
              <div className="mb-3 flex items-center gap-3">
                {product.brand && <span className="text-sm text-muted-foreground">{product.brand}</span>}
                {product.protocol && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{product.protocol}</span>
                  </>
                )}
              </div>

              <h1 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl">{product.name}</h1>

              {product.description && (
                <p className="mb-4 text-base text-muted-foreground">{product.description}</p>
              )}

              {/* Price */}
              <div className="mb-4 flex items-center gap-3 flex-wrap">
                <span className="font-display text-3xl font-bold text-foreground">{formatPrice(product.price)}</span>
                {product.original_price && (
                  <span className="text-lg text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
                )}
              </div>

              {/* Stock */}
              <div className="mb-4 flex items-center gap-2">
                {product.stock > 0 ? (
                  <>
                    <Check className="h-4 w-4 text-success" />
                    <span className="text-sm text-success">{t('inStock')} ({product.stock} {t('available')})</span>
                  </>
                ) : (
                  <span className="text-sm text-destructive">{t('outOfStock')}</span>
                )}
              </div>

              {/* Compatibility badges */}
              {compatBadges.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <Wifi className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{isRTL ? 'متوافق مع:' : 'Works with:'}</span>
                  {['Alexa', 'Google Home', product.protocol].filter(Boolean).map((badge) => (
                    <span key={badge} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">{badge}</span>
                  ))}
                </div>
              )}

              {/* Add to Cart + Trust badges */}
              <div className="mb-6">
                <Button size="lg" className="w-full md:w-auto gap-2 glow-primary rounded-full h-12 px-8 mb-4" onClick={handleAddToCart} disabled={product.stock === 0}>
                  <ShoppingCart className="h-5 w-5" />
                  {t('addToCart')}
                </Button>

                {/* Trust badges inline */}
                <div className="flex flex-wrap gap-4">
                  {trustBadges.map((badge) => (
                    <div key={badge.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <badge.icon className="h-3.5 w-3.5 text-primary" />
                      <span>{badge.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery info */}
              <div className="p-4 rounded-xl bg-card border border-border mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{isRTL ? 'التوصيل' : 'Delivery'}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isRTL ? 'القاهرة والجيزة: ٢-٣ أيام عمل | باقي المحافظات: ٤-٧ أيام عمل' : 'Cairo & Giza: 2-3 business days | Other cities: 4-7 business days'}
                </p>
              </div>

              {/* Specs */}
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-3 font-display text-base font-semibold text-foreground">{t('specifications')}</h3>
                  <dl className="space-y-2">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <dt className="text-muted-foreground">{key}</dt>
                        <dd className="font-medium text-foreground">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Bundle suggestion */}
              <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium text-foreground mb-1">
                  {isRTL ? '💡 وفّر أكثر مع الباقات' : '💡 Save more with bundles'}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  {isRTL ? 'اشترِ باقة كاملة واحصل على تركيب مجاني' : 'Buy a complete bundle and get free installation'}
                </p>
                <Link to="/bundles">
                  <Button variant="outline" size="sm" className="rounded-full text-xs h-7">
                    {isRTL ? 'عرض الباقات' : 'View Bundles'}
                    <ArrowRight className={cn("ml-1 h-3 w-3", isRTL && "rotate-180 mr-1 ml-0")} />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default ProductDetail;
