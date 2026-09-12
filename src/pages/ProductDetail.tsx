import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, ArrowRight, ShoppingCart, Loader2, Zap, Check, Shield, Truck, 
  Award, Wifi, CreditCard, Globe, ExternalLink, Building2, MessageCircle, 
  Phone, Search, FileText, ShoppingBag, Youtube 
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/store';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n';
import { parseProtocols } from '@/lib/protocolIcon';
import { getProductImage, productPlaceholder } from '@/lib/productImage';
import { cairoSupplierService, CairoSource } from '@/data/cairoSupplierService';
import { cn } from '@/lib/utils';

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

interface WebSource {
  title: string;
  url: string;
  snippet: string;
  source: string;
  score: number;
}

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const addItem = useCart((state) => state.addItem);
  const { toast } = useToast();
  const { t, formatPrice, isRTL } = useLanguage();

  const { data: master, isLoading } = useQuery({
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

  // Fetch variants if this is a master product
  const { data: variants } = useQuery({
    queryKey: ['product-variants', master?.id],
    queryFn: async () => {
      if (!master) return [] as Product[];
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('parent_id', master.id)
        .order('price');
      if (error) throw error;
      return (data as Product[]) || [];
    },
    enabled: !!master?.id,
  });

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const activeProduct = useMemo<Product | null>(() => {
    if (!master) return null;
    if (variants && variants.length > 0) {
      const sel = variants.find((v) => v.id === selectedVariantId);
      return sel ?? variants[0];
    }
    return master;
  }, [master, variants, selectedVariantId]);

  const protocolTokens = useMemo(() => parseProtocols(activeProduct?.protocol), [activeProduct?.protocol]);

  // Find web sources for this product
  const { data: webSources, isLoading: sourcesLoading, isError: sourcesError } = useQuery<WebSource[]>({
    queryKey: ['web-sources', activeProduct?.id, isRTL ? 'ar' : 'en'],
    queryFn: async () => {
      if (!activeProduct) return [];
      const { data, error } = await supabase.functions.invoke('find-web-sources', {
        body: {
          brand: activeProduct.brand ?? undefined,
          name: activeProduct.name,
          protocol: activeProduct.protocol ?? undefined,
          locale: isRTL ? 'ar' : 'en',
        },
      });
      if (error) throw error;
      const payload = data as { success?: boolean; sources?: WebSource[] };
      return payload?.sources ?? [];
    },
    enabled: !!activeProduct?.id,
    staleTime: 1000 * 60 * 30, // 30 min cache
    retry: 1,
  });

  const cairoSources = useMemo<CairoSource[]>(() => {
    if (!activeProduct?.id) return [];
    return cairoSupplierService.getCairoSources(activeProduct.id);
  }, [activeProduct?.id]);

  const handleAddToCart = () => {
    if (activeProduct) {
      addItem(activeProduct);
      toast({ title: t('addedToCart'), description: `${activeProduct.name} ${t('hasBeenAdded')}` });
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

  if (!master || !activeProduct) {
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

  const product = activeProduct;
  const hasVariants = !!variants && variants.length > 0;
  const variantAxis = hasVariants ? (variants![0].variant_axis || master.variant_axis) : null;

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
        <title>{product.seo_title || `${product.name} | AzkaSmart`}</title>
        <meta
          name="description"
          content={product.seo_description || product.description || `Buy ${product.name} at AzkaSmart — Smart Home Egypt. Fast nationwide delivery.`}
        />
        {product.seo_keywords && product.seo_keywords.length > 0 && (
          <meta name="keywords" content={product.seo_keywords.join(", ")} />
        )}
        <link rel="canonical" href={`https://azkasmart.com/product/${product.slug}`} />
        {/* Open Graph */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={product.seo_title || product.name} />
        <meta property="og:description" content={product.seo_description || product.description || `Buy ${product.name} at AzkaSmart`} />
        {product.image_url && <meta property="og:image" content={product.image_url} />}
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        {/* Product structured data */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.seo_description || product.description || undefined,
          image: product.image_url || undefined,
          brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
          sku: (product as any).sku || product.id,
          ...(webSources && webSources.length > 0
            ? { sameAs: webSources.slice(0, 5).map((s) => s.url) }
            : {}),
          offers: {
            "@type": "Offer",
            priceCurrency: "EGP",
            price: product.price,
            availability: product.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          },
        })}</script>
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
                <img
                  src={getProductImage(product)}
                  alt={product.name}
                  loading="lazy"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = productPlaceholder; }}
                  className="h-full w-full object-cover"
                />
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

                {/* Protocol badges overlay */}
                {protocolTokens.length > 0 && (
                  <div
                    className={cn(
                      "absolute bottom-4 flex flex-wrap items-center gap-1.5",
                      isRTL ? "right-4 left-4 flex-row-reverse" : "left-4 right-4"
                    )}
                  >
                    {protocolTokens.map(({ name, icon: Icon, bg, fg, description }) => (
                      <span
                        key={name}
                        title={description}
                        aria-label={description}
                        className={cn(
                          'inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium shadow-md backdrop-blur-sm',
                          bg,
                          fg
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2.25} />
                        <span className="leading-none">{name}</span>
                      </span>
                    ))}
                  </div>
                )}
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
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {product.brand && <span className="text-sm text-muted-foreground">{product.brand}</span>}
                {product.brand && protocolTokens.length > 0 && <span className="text-muted-foreground">•</span>}
                {protocolTokens.map(({ name, icon: Icon, bg, fg, description }) => (
                  <span
                    key={name}
                    title={description}
                    aria-label={description}
                    className={cn(
                      'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium',
                      bg,
                      fg
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                    <span className="leading-none">{name}</span>
                  </span>
                ))}
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

              {/* Variant selector */}
              {hasVariants && (
                <div className="mb-5">
                  <p className="text-sm font-medium mb-2">
                    {variantAxis === 'color'
                      ? (isRTL ? 'اللون' : 'Color')
                      : variantAxis === 'channels'
                        ? (isRTL ? 'عدد المفاتيح' : 'Channels')
                        : (isRTL ? 'الخيار' : 'Option')}
                    : <span className="text-muted-foreground font-normal">{product.variant_label}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variants!.map((v) => {
                      const isSelected = v.id === product.id;
                      const oos = v.stock === 0;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariantId(v.id)}
                          disabled={oos}
                          className={cn(
                            "px-3 py-1.5 rounded-full border text-sm transition",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border hover:border-primary/50",
                            oos && "opacity-40 line-through cursor-not-allowed"
                          )}
                        >
                          {v.variant_label || v.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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

              {/* External Sources & Local Cairo Suppliers */}
              <div className="mt-4 rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-base font-semibold text-foreground">
                      {isRTL ? 'المصادر الخارجية والتوريد المحلي' : 'External Sources & Local Suppliers'}
                    </h3>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {isRTL ? 'بيانات معتمدة ومباشرة' : 'Direct Verified Links'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {isRTL 
                    ? 'يمكنك الاطلاع على الموردين المحليين المعتمدين في مصر، الأسعار المباشرة، أو تصفح المتاجر والمواصفات الفنية.' 
                    : 'Access verified local Egyptian suppliers, live pricing, and direct technical specifications.'}
                </p>

                {/* 1. Verified Local Egyptian / Cairo Suppliers */}
                {cairoSources && cairoSources.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      <span>{isRTL ? `الموردون المعتمدون في مصر (${cairoSources.length})` : `Verified Egyptian Suppliers (${cairoSources.length})`}</span>
                    </div>
                    <ul className="space-y-2">
                      {cairoSources.map((src) => {
                        const cleanPhone = (src.whatsapp || src.phone || '').replace(/[^0-9]/g, '');
                        const waText = encodeURIComponent(
                          isRTL 
                            ? `مرحباً، أستفسر عن توفر وسعر: ${product.name}`
                            : `Hello, inquiring about availability for: ${product.name}`
                        );
                        const targetUrl = src.product_url || src.supplier_url || `https://www.google.com/search?q=${encodeURIComponent(`${src.supplier_name} ${product.name}`)}`;

                        return (
                          <li key={src.id} className="rounded-lg border border-border/70 bg-background/60 p-3 hover:border-primary/40 transition">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-foreground">{src.supplier_name}</span>
                                  <Badge variant="outline" className="text-[10px] py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                                    {isRTL ? 'متوفر بمصر' : src.availability || 'In Stock'}
                                  </Badge>
                                  {src.area && (
                                    <span className="text-[11px] text-muted-foreground">({src.area})</span>
                                  )}
                                </div>
                                {src.price_egp && (
                                  <p className="text-xs font-semibold text-primary mt-1">
                                    {isRTL ? 'السعر التقديري: ' : 'Supplier Price: '}
                                    {src.price_egp.toLocaleString()} EGP
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {cleanPhone && (
                                  <a
                                    href={`https://wa.me/${cleanPhone}?text=${waText}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 rounded-md font-medium transition"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>WhatsApp</span>
                                  </a>
                                )}
                                {targetUrl && (
                                  <a
                                    href={targetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline bg-primary/10 hover:bg-primary/15 px-2.5 py-1.5 rounded-md transition"
                                  >
                                    <span>{isRTL ? 'فتح المصدر' : 'Open Source'}</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* 2. Web Crawled Sources (if returned by edge function) */}
                {sourcesLoading && (
                  <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    {t('webSourcesLoading')}
                  </div>
                )}

                {!sourcesLoading && webSources && webSources.length > 0 && (
                  <div className="space-y-2 pt-1 border-t">
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5 text-primary" />
                      <span>{isRTL ? 'مصادر الويب الإضافية' : 'Additional Web References'}</span>
                    </div>
                    <ul className="space-y-2">
                      {webSources.map((src) => {
                        let host = '';
                        try {
                          host = new URL(src.url).hostname.replace(/^www\./, '');
                        } catch {
                          host = src.source;
                        }
                        const favicon = `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
                        return (
                          <li key={src.url}>
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="group flex items-start gap-3 rounded-lg border border-border/60 bg-background/50 p-2.5 transition hover:border-primary/40 hover:bg-background"
                            >
                              <img
                                src={favicon}
                                alt=""
                                loading="lazy"
                                width={18}
                                height={18}
                                className="mt-0.5 h-4.5 w-4.5 shrink-0 rounded"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="truncate text-xs font-medium text-foreground group-hover:text-primary">
                                    {src.title}
                                  </p>
                                  <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary" />
                                </div>
                                <p className="text-[10px] text-muted-foreground">{host}</p>
                              </div>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* 3. Guaranteed Direct Marketplaces & Reference Hub */}
                <div className="pt-2 border-t space-y-2">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                    <span>{isRTL ? 'روابط فحص ومقارنة خارجية مباشرة' : 'Direct External Market & Spec Links'}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <a
                      href={`https://www.amazon.eg/s?k=${encodeURIComponent(`${product.brand || ''} ${product.name}`.trim())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background/60 hover:border-amber-500/40 hover:bg-amber-500/5 text-xs font-medium transition group"
                    >
                      <span className="flex items-center gap-1.5 text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400">
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                        Amazon Egypt
                      </span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-amber-600" />
                    </a>

                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(`${product.brand || ''} ${product.name} specifications datasheet manual`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background/60 hover:border-primary/40 hover:bg-primary/5 text-xs font-medium transition group"
                    >
                      <span className="flex items-center gap-1.5 text-foreground group-hover:text-primary">
                        <FileText className="w-3.5 h-3.5 text-primary" />
                        {isRTL ? 'المواصفات والكتالوج' : 'Datasheet & Specs'}
                      </span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
                    </a>

                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${product.brand || ''} ${product.name} smart home review`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background/60 hover:border-red-500/40 hover:bg-red-500/5 text-xs font-medium transition group"
                    >
                      <span className="flex items-center gap-1.5 text-foreground group-hover:text-red-600 dark:group-hover:text-red-400">
                        <Youtube className="w-3.5 h-3.5 text-red-500" />
                        {isRTL ? 'فيديوهات ومراجعات' : 'Video Reviews'}
                      </span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-red-600" />
                    </a>
                  </div>
                </div>
              </div>

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
