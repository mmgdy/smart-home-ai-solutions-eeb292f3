import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, ArrowRight, ShoppingCart, Loader2, Check, Shield, Truck, 
  Award, Wifi, CreditCard, Maximize2, X, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/store';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n';
import { parseProtocols } from '@/lib/protocolIcon';
import { getProductImage, productPlaceholder } from '@/lib/productImage';
import { cairoSupplierService } from '@/data/cairoSupplierService';
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

  const { data: master, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      try {
        let { data, error } = await supabase
          .from('products')
          .select('*, categories(*)')
          .eq('slug', slug)
          .maybeSingle();

        if (!data && slug) {
          const res = await supabase
            .from('products')
            .select('*, categories(*)')
            .eq('id', slug)
            .maybeSingle();
          if (res.data) data = res.data;
        }

        if (data) {
          return {
            ...data,
            category: (data as any).categories || (data as any).category,
            images: Array.isArray((data as any).images) && (data as any).images.length > 0
              ? (data as any).images
              : (data as any).image_url ? [(data as any).image_url] : [],
          } as Product;
        }
      } catch (err) {
        console.warn('DB query failed:', err);
      }

      const cleanProd = cairoSupplierService.getProductBySlug(slug || '') || cairoSupplierService.getProductById(slug || '');
      return cleanProd || null;
    },
    enabled: !!slug,
  });

  // Fetch all variants in this product family (both master and child variants)
  const familyMasterId = master?.parent_id || master?.id;
  const { data: familyVariants = [] } = useQuery({
    queryKey: ['product-family-variants', familyMasterId],
    queryFn: async () => {
      if (!familyMasterId) return [] as Product[];
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`id.eq.${familyMasterId},parent_id.eq.${familyMasterId}`)
        .order('price');
      if (error) throw error;
      return (data as Product[]) || [];
    },
    enabled: !!familyMasterId,
  });

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Sync selected variant with master when slug changes
  useEffect(() => {
    if (master?.id) {
      setSelectedVariantId(master.id);
      setSelectedImage(null);
    }
  }, [master?.id]);

  const hasVariants = familyVariants.length > 1;

  const activeProduct = useMemo<Product | null>(() => {
    if (!master) return null;
    if (hasVariants) {
      const sel = familyVariants.find((v) => v.id === selectedVariantId);
      if (sel) return sel;
      return familyVariants.find((v) => v.id === master.id) || familyVariants[0];
    }
    return master;
  }, [master, familyVariants, selectedVariantId, hasVariants]);

  // When variant changes, update selected image if it has its own image
  useEffect(() => {
    if (activeProduct) {
      const primary = getProductImage(activeProduct);
      setSelectedImage(primary);
    }
  }, [activeProduct?.id]);

  // Aggregate all unique product images (master, variants, multi-angle shots)
  const allImages = useMemo(() => {
    if (!activeProduct) return [];
    const set = new Set<string>();
    if (activeProduct.image_url) set.add(activeProduct.image_url);
    if (Array.isArray(activeProduct.images)) {
      activeProduct.images.forEach((img) => {
        if (img && typeof img === 'string') set.add(img);
      });
    }
    familyVariants.forEach((v) => {
      if (v.image_url) set.add(v.image_url);
      if (Array.isArray(v.images)) {
        v.images.forEach((img) => {
          if (img && typeof img === 'string') set.add(img);
        });
      }
    });
    const list = Array.from(set).filter(Boolean);
    return list.length > 0 ? list : [productPlaceholder];
  }, [activeProduct, familyVariants]);

  const protocolTokens = useMemo(
    () => parseProtocols(activeProduct?.protocol, activeProduct?.name),
    [activeProduct?.protocol, activeProduct?.name]
  );

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
  const variantAxis = hasVariants
    ? (activeProduct.variant_axis || master.variant_axis || familyVariants[0]?.variant_axis)
    : null;

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
              {/* Main Product Image Container - Displays whole picture with object-contain */}
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-card/60 flex items-center justify-center p-4 sm:p-8 group shadow-sm">
                <img
                  src={selectedImage || getProductImage(product)}
                  alt={product.name}
                  loading="eager"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = productPlaceholder; }}
                  className="h-full w-full object-contain max-h-[460px] transition-transform duration-300 group-hover:scale-[1.03] cursor-zoom-in drop-shadow-sm"
                  onClick={() => setLightboxOpen(true)}
                />

                {/* Click to view whole picture full-size button */}
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="absolute bottom-3 end-3 p-2 rounded-xl bg-background/80 hover:bg-background text-foreground/80 hover:text-foreground backdrop-blur-md border border-border/60 shadow-sm transition-all opacity-0 group-hover:opacity-100"
                  title={isRTL ? "عرض الصورة كاملة مكبرة" : "View whole picture full size"}
                >
                  <Maximize2 className="h-4 w-4" />
                </button>

                <div className={cn("absolute top-4 flex flex-col gap-2 pointer-events-none", isRTL ? "right-4" : "left-4")}>
                  {discount && (
                    <span className="rounded-full bg-destructive px-3 py-1 text-sm font-medium text-destructive-foreground shadow-sm">
                      {t('save')} {discount}%
                    </span>
                  )}
                  {product.featured && (
                    <span className="rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground shadow-sm">
                      {t('featured')}
                    </span>
                  )}
                </div>

                {/* Protocol badges overlay */}
                {protocolTokens.length > 0 && (
                  <div
                    className={cn(
                      "absolute bottom-4 flex flex-wrap items-center gap-1.5 pointer-events-none",
                      isRTL ? "right-4 left-14 flex-row-reverse" : "left-4 right-14"
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

              {/* Multi-angle & Gallery Thumbnails */}
              {allImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
                  {allImages.map((img, idx) => {
                    const isSelected = img === (selectedImage || getProductImage(product));
                    return (
                      <button
                        key={img + idx}
                        type="button"
                        onClick={() => setSelectedImage(img)}
                        className={cn(
                          "relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-xl border-2 overflow-hidden bg-card/60 p-1.5 transition-all flex items-center justify-center",
                          isSelected
                            ? "border-primary ring-2 ring-primary/20 shadow-md scale-105"
                            : "border-border/60 hover:border-border opacity-70 hover:opacity-100"
                        )}
                        title={isRTL ? `صورة ${idx + 1}` : `Image ${idx + 1}`}
                      >
                        <img
                          src={img}
                          alt={`${product.name} - ${idx + 1}`}
                          className="h-full w-full object-contain"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = productPlaceholder; }}
                        />
                      </button>
                    );
                  })}
                </div>
              )}

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
                        ? (isRTL ? 'عدد المفاتيح / الخيار' : 'Channels / Option')
                        : (isRTL ? 'الخيار' : 'Option')}
                    {activeProduct.variant_label && (
                      <span className="text-muted-foreground font-normal"> : {activeProduct.variant_label}</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {familyVariants.map((v) => {
                      const isSelected = v.id === product.id;
                      const oos = v.stock === 0;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariantId(v.id)}
                          disabled={oos}
                          className={cn(
                            "px-3.5 py-1.5 rounded-full border text-sm transition font-medium",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border hover:border-primary/50 text-foreground bg-card",
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
              {product.specifications &&
                Object.entries(product.specifications).filter(([k]) => !/source/i.test(k)).length > 0 && (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h3 className="mb-3 font-display text-base font-semibold text-foreground">{t('specifications')}</h3>
                  <dl className="space-y-2">
                    {Object.entries(product.specifications)
                      .filter(([key]) => !/source/i.test(key))
                      .map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <dt className="text-muted-foreground">{key}</dt>
                          <dd className="font-medium text-foreground">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </dd>
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

        {/* Fullscreen Picture Modal to see the entire photo in high-resolution detail */}
        {lightboxOpen && (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8 animate-in fade-in-0 duration-200"
            onClick={() => setLightboxOpen(false)}
          >
            <div
              className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="absolute -top-12 end-0 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>

              {/* Big Uncropped Picture */}
              <div className="w-full max-h-[78vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black/40 p-2">
                <img
                  src={selectedImage || getProductImage(product)}
                  alt={product.name}
                  className="max-h-[75vh] max-w-full object-contain drop-shadow-2xl select-none"
                />
              </div>

              {/* Prev / Next controls if multiple images */}
              {allImages.length > 1 && (
                <div className="flex items-center gap-3 mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-9 px-3 rounded-full"
                    onClick={() => {
                      const cur = selectedImage || getProductImage(product);
                      const curIdx = allImages.indexOf(cur);
                      const prevIdx = (curIdx - 1 + allImages.length) % allImages.length;
                      setSelectedImage(allImages[prevIdx]);
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="text-xs">{isRTL ? 'السابق' : 'Previous'}</span>
                  </Button>
                  <span className="text-xs text-white/70 font-medium">
                    {allImages.indexOf(selectedImage || getProductImage(product)) + 1} / {allImages.length}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-9 px-3 rounded-full"
                    onClick={() => {
                      const cur = selectedImage || getProductImage(product);
                      const curIdx = allImages.indexOf(cur);
                      const nextIdx = (curIdx + 1) % allImages.length;
                      setSelectedImage(allImages[nextIdx]);
                    }}
                  >
                    <span className="text-xs">{isRTL ? 'التالي' : 'Next'}</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Layout>
    </>
  );
};

export default ProductDetail;
