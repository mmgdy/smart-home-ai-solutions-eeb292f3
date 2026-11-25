import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, ArrowRight, ShoppingCart, Loader2, Check, Shield, Truck, 
  Award, CreditCard, Maximize2, X, ChevronLeft, ChevronRight, Minus, Plus 
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
import { normalizeBrand } from '@/lib/brands';
import { sanitizeProductDescription, stripDescriptionHtml } from '@/lib/sanitizeDescription';
import { CompleteYourSetup } from '@/components/products/CompleteYourSetup';
import { cairoSupplierService } from '@/data/cairoSupplierService';
import { cn } from '@/lib/utils';

const SPEC_KEY_LABELS: Record<string, string> = {
  warranty: 'Warranty',
  installation: 'Installation Service',
  installation_service: 'Installation Service',
  mounting: 'Mounting Type',
  stockstatus: 'Stock Status',
  stock_status: 'Stock Status',
  neutral_required: 'Neutral Wire Required',
  neutral_wire_required: 'Neutral Wire Required',
  neutral_note: 'Wiring Note',
  wiring_note: 'Wiring Note',
  lock_type: 'Lock Type',
  door_thickness: 'Door Thickness',
  emergency_power: 'Emergency Power',
  rfid_frequency: 'RFID Frequency',
  fail_safe: 'Fail-Safe',
  bracket_required: 'Compatible Bracket',
  compatible_bracket: 'Compatible Bracket',
  power_supply_recommended: 'Recommended Power Supply',
  recommended_power_supply: 'Recommended Power Supply',
  voltage: 'Voltage',
  protocol: 'Protocol',
  brand: 'Brand',
  model: 'Model',
  categories: 'Categories',
  variants: 'Available Variants',
  antenna_gain: 'Antenna Gain',
  firmware_flashing: 'Firmware Flashing',
  usb_extension_cable: 'USB Extension Cable',
  wifi: 'Wi-Fi',
  'wi-fi': 'Wi-Fi',
  'wi‑fi': 'Wi-Fi',
  os: 'Operating System',
  id: 'Card Standard',
  ip_rating: 'IP Rating',
  em_card_frequency: 'EM Card Frequency',
};

const SPEC_VALUE_LABELS: Record<string, string> = {
  in_stock: 'In Stock',
  out_of_stock: 'Out of Stock',
  included: 'Included',
};

const HIDDEN_SPEC_KEYS = /^(source|sync_source|smartzoom_id|smartzoom_slug|cairo_sources|supplier_name|supplier_url|wholesale_price|stockstatus|stock_status|stock status|categories|brand|protocol)$/i;

/**
 * Identifies template-generated / auto-enriched specifications that were injected
 * by the legacy product enricher rather than entered as real hardware specs.
 */
function isTemplateGeneratedSpec(rawKey: string, rawVal: unknown, product: Product): boolean {
  const lowerKey = rawKey.trim().toLowerCase();
  if (HIDDEN_SPEC_KEYS.test(lowerKey)) return true;

  const strVal = rawVal === null || rawVal === undefined ? '' : String(rawVal).trim();

  if (lowerKey === 'model') {
    if (/^\d+$/.test(strVal)) return true;
    const slugLower = (product.slug || '').trim().toLowerCase();
    if (slugLower && strVal.toLowerCase() === slugLower) return true;
  }

  if (lowerKey === 'warranty') {
    return /official warranty in egypt/i.test(strVal);
  }

  if (lowerKey === 'installation' || lowerKey === 'installation_service' || lowerKey === 'installation service') {
    return /certified installation available/i.test(strVal);
  }

  if (lowerKey === 'neutral_required' || lowerKey === 'neutral_wire_required' || lowerKey === 'neutral wire required') {
    return typeof rawVal === 'boolean' || /^(yes|no|true|false)$/i.test(strVal);
  }

  if (lowerKey === 'neutral_note' || lowerKey === 'wiring_note' || lowerKey === 'wiring note') {
    return strVal.includes('سلك محايد') || strVal.includes('نيوترال');
  }

  if (lowerKey === 'lock_type' || lowerKey === 'lock type') {
    return /^(smart_biometric_lock|smart biometric lock|magnetic_lock|magnetic lock|drop_bolt|drop bolt lock|electric_strike|electric strike lock)$/i.test(strVal);
  }

  if (lowerKey === 'door_thickness' || lowerKey === 'door thickness') {
    return /^38\s*[-–]\s*70\s*mm$/i.test(strVal);
  }

  if (lowerKey === 'emergency_power' || lowerKey === 'emergency power') {
    return /^usb type-c \+ physical mechanical keys$/i.test(strVal);
  }

  if (lowerKey === 'rfid_frequency' || lowerKey === 'rfid frequency') {
    return /^(125khz \(em-marine\)|13\.56mhz \(mifare ic\))$/i.test(strVal);
  }

  if (lowerKey === 'fail_safe' || lowerKey === 'fail-safe') {
    return rawVal === true || /^(yes|true)$/i.test(strVal);
  }

  if (lowerKey === 'bracket_required' || lowerKey === 'compatible_bracket' || lowerKey === 'compatible bracket') {
    return /zl-bracket/i.test(strVal);
  }

  if (lowerKey === 'power_supply_recommended' || lowerKey === 'recommended_power_supply' || lowerKey === 'recommended power supply') {
    return /12v 5a power supply/i.test(strVal);
  }

  if (lowerKey === 'voltage') {
    return /^12v dc$/i.test(strVal);
  }

  return false;
}

function formatSpecKey(rawKey: string, rawVal?: unknown): string {
  const trimmed = rawKey.trim();
  if (trimmed === 'Installation' && String(rawVal).toLowerCase().includes('din rail')) {
    return 'Mounting Type';
  }
  const lower = trimmed.toLowerCase();
  if (SPEC_KEY_LABELS[lower]) return SPEC_KEY_LABELS[lower];

  // Convert snake_case or camelCase/PascalCase into human-readable Title Case
  const spaced = trimmed
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  return spaced
    .split(' ')
    .map((word) => {
      if (/^(USB|RFID|IP|OS|RAM|ROM|EM|RJ45|RS485|DC|AC|LED|LCD|PoE|UHF|NFC|IR|RF)$/i.test(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function formatSpecValue(rawKey: string, value: unknown, product: Product): string | null {
  if (value === null || value === undefined || value === '') return null;
  const lowerKey = rawKey.trim().toLowerCase();

  if (lowerKey === 'brand') {
    return normalizeBrand(String(value));
  }

  if (lowerKey === 'stockstatus' || lowerKey === 'stock_status' || lowerKey === 'stock status') {
    return (product.stock ?? 0) > 0 ? 'In Stock' : 'Out of Stock';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => {
        const s = String(item).trim();
        if (s.toLowerCase() === 'sonoff') return 'SONOFF';
        if (s.toLowerCase() === 'ewelink' || s.toLowerCase() === 'ewelink products') return 'eWeLink';
        return s;
      })
      .filter(Boolean);
    return cleaned.length > 0 ? cleaned.join(', ') : null;
  }

  const strVal = String(value).trim();
  if (strVal === 'true') return 'Yes';
  if (strVal === 'false') return 'No';
  if (SPEC_VALUE_LABELS[strVal.toLowerCase()]) {
    return SPEC_VALUE_LABELS[strVal.toLowerCase()];
  }

  // Clean up any corrupted UTF-8 replacement character in neutral_note
  if (lowerKey === 'neutral_note' || lowerKey === 'wiring note') {
    if (strVal.includes('لا يتطلب')) {
      return 'لا يتطلب سلك محايد (نيوترال) - مثالي للمباني القديمة بدون نيوترال في العلب.';
    }
    if (strVal.includes('يتطلب سلك محايد')) {
      return 'يتطلب سلك محايد (نيوترال) في العلبة الكهربائية لضمان التغذية المستقرة.';
    }
  }

  return strVal;
}

function getFormattedSpecifications(product: Product): Array<[string, string]> {
  if (!product.specifications || typeof product.specifications !== 'object') return [];
  const map = new Map<string, string>();

  for (const [rawKey, rawVal] of Object.entries(product.specifications)) {
    if (isTemplateGeneratedSpec(rawKey, rawVal, product)) continue;
    const label = formatSpecKey(rawKey, rawVal);
    const formattedVal = formatSpecValue(rawKey, rawVal, product);
    if (!formattedVal) continue;

    // If duplicate key (e.g. "warranty" and "Warranty"), prefer the more descriptive entered string
    if (map.has(label)) {
      const existing = map.get(label)!;
      if (formattedVal.length > existing.length) {
        map.set(label, formattedVal);
      }
    } else {
      map.set(label, formattedVal);
    }
  }

  return Array.from(map.entries());
}

function getProductWarrantyBadgeLabel(product: Product, isRTL: boolean): string {
  const specs = (product.specifications ?? {}) as Record<string, unknown>;
  const rawWarrRaw = String(specs['Warranty'] || specs['warranty'] || '');
  const rawWarr = /official warranty in egypt/i.test(rawWarrRaw) ? '' : rawWarrRaw;

  const yearMatch = rawWarr.match(/(\d+)\s*-?\s*year/i);
  if (yearMatch) {
    const yrs = parseInt(yearMatch[1], 10);
    if (isRTL) {
      return yrs === 1 ? 'ضمان سنة واحدة' : yrs === 2 ? 'ضمان سنتين' : `ضمان ${yrs} سنوات`;
    }
    return `${yrs}-Year Warranty`;
  }

  const monthMatch = rawWarr.match(/(\d+)\s*-?\s*month/i);
  if (monthMatch) {
    const mos = parseInt(monthMatch[1], 10);
    if (mos % 12 === 0) {
      const yrs = mos / 12;
      if (isRTL) {
        return yrs === 1 ? 'ضمان سنة واحدة' : yrs === 2 ? 'ضمان سنتين' : `ضمان ${yrs} سنوات`;
      }
      return `${yrs}-Year Warranty`;
    }
    return isRTL ? `ضمان ${mos} شهر` : `${mos}-Month Warranty`;
  }

  const brand = (normalizeBrand(product.brand) || '').toLowerCase();
  if (brand === 'tp-link' || brand === 'akubela') {
    return isRTL ? 'ضمان سنتين' : '2-Year Warranty';
  }
  return isRTL ? 'ضمان سنة واحدة' : '1-Year Warranty';
}

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
        let { data } = await supabase
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
  const [quantity, setQuantity] = useState(1);

  // Sync selected variant with master when slug changes
  useEffect(() => {
    if (master?.id) {
      setSelectedVariantId(master.id);
      setSelectedImage(null);
      setQuantity(1);
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
      setQuantity(1);
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
    () => parseProtocols(activeProduct?.protocol),
    [activeProduct?.protocol]
  );

  const handleAddToCart = () => {
    if (activeProduct) {
      addItem(activeProduct, quantity);
      toast({ title: t('addedToCart'), description: `${activeProduct.name} ${t('hasBeenAdded')}` });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8 md:py-12 pt-24 pb-24 lg:pb-12" aria-busy="true">
          <div className="h-5 w-32 rounded bg-muted animate-pulse mb-6" />
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="aspect-[4/3] sm:aspect-square rounded-2xl bg-muted animate-pulse" />
            <div className="space-y-4">
              <div className="h-4 w-28 rounded bg-muted animate-pulse" />
              <div className="h-8 w-4/5 rounded bg-muted animate-pulse" />
              <div className="h-9 w-40 rounded bg-muted animate-pulse" />
              <div className="h-12 w-full md:w-56 rounded-full bg-muted animate-pulse" />
              <div className="space-y-2 pt-4">
                <div className="h-4 w-full rounded bg-muted animate-pulse" />
                <div className="h-4 w-11/12 rounded bg-muted animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!master || !activeProduct) {
    return (
      <Layout>
        <div className="container pt-28 pb-20 text-center">
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

  const hasDiscount = Boolean(product.original_price && product.original_price > product.price);
  const discount = hasDiscount
    ? Math.round(((product.original_price! - product.price) / product.original_price!) * 100)
    : 0;
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const displayBrand = normalizeBrand(product.brand);
  const warrantyBadgeLabel = getProductWarrantyBadgeLabel(product, isRTL);
  const trustBadges = [
    { icon: CreditCard, label: isRTL ? 'دفع آمن بالبطاقة' : 'Secure Card Payment' },
    { icon: Shield, label: warrantyBadgeLabel },
    { icon: Award, label: isRTL ? 'منتج أصلي' : 'Genuine Product' },
  ];

  const formattedSpecs = getFormattedSpecifications(product);
  const hasArabicDescription = isRTL && Boolean(product.description_ar && product.description_ar.trim().length > 0);
  const activeDescriptionRaw = hasArabicDescription ? product.description_ar : product.description;
  const sanitizedDescriptionHtml = sanitizeProductDescription(activeDescriptionRaw);
  const plainDescriptionText = stripDescriptionHtml(activeDescriptionRaw);

  return (
    <>
      <Helmet>
        <title>{product.seo_title || `${product.name} | AzkaSmart`}</title>
        <meta
          name="description"
          content={product.seo_description || plainDescriptionText || `Buy ${product.name} at AzkaSmart — Smart Home Egypt. Fast nationwide delivery.`}
        />
        {product.seo_keywords && product.seo_keywords.length > 0 && (
          <meta name="keywords" content={product.seo_keywords.join(", ")} />
        )}
        <link rel="canonical" href={`https://azkasmart.com/product/${product.slug}`} />
        {/* Open Graph */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={product.seo_title || product.name} />
        <meta property="og:description" content={product.seo_description || plainDescriptionText || `Buy ${product.name} at AzkaSmart`} />
        {product.image_url && <meta property="og:image" content={product.image_url} />}
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        {/* Product structured data */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.seo_description || plainDescriptionText || undefined,
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
        <div className="container py-6 md:py-12 pt-20 md:pt-24 pb-28 lg:pb-12">
          <Link to="/products" className="mb-4 md:mb-8 inline-flex items-center gap-2 min-h-[44px] lg:min-h-0 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <BackArrow className="h-4 w-4" />
            {t('backToProducts')}
          </Link>

          <div className="grid gap-5 lg:gap-8 lg:grid-cols-2">
            {/* Image & Video */}
            <div className="space-y-3 sm:space-y-4">
              {/* Main Product Image Container - Displays whole picture with object-contain */}
              <div className="relative aspect-[4/3] sm:aspect-square max-h-[250px] sm:max-h-none overflow-hidden rounded-2xl border border-border bg-card/60 flex items-center justify-center p-3 sm:p-8 group shadow-sm">
                <img
                  src={selectedImage || getProductImage(product)}
                  alt={product.name}
                  loading="eager"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = productPlaceholder; }}
                  className="h-full w-full object-contain max-h-[220px] sm:max-h-[460px] transition-transform duration-300 group-hover:scale-[1.03] cursor-zoom-in drop-shadow-sm"
                  onClick={() => setLightboxOpen(true)}
                />

                {/* Click to view whole picture full-size button */}
                <button
                  type="button"
                  onClick={() => setLightboxOpen(true)}
                  className="absolute bottom-3 end-3 p-2.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:p-2 flex items-center justify-center rounded-xl bg-background/80 hover:bg-background text-foreground/80 hover:text-foreground backdrop-blur-md border border-border/60 shadow-sm transition-all opacity-90 lg:opacity-0 group-hover:opacity-100"
                  title={isRTL ? "عرض الصورة كاملة مكبرة" : "View whole picture full size"}
                  aria-label={isRTL ? "عرض الصورة كاملة مكبرة" : "View whole picture full size"}
                >
                  <Maximize2 className="h-4 w-4" />
                </button>

                <div className={cn("absolute top-3 sm:top-4 flex flex-col gap-2 pointer-events-none", isRTL ? "right-3 sm:right-4" : "left-3 sm:left-4")}>
                  {product.stock <= 0 && (
                    <span className="rounded-full bg-destructive px-3 py-1 text-xs sm:text-sm font-semibold text-destructive-foreground shadow-sm">
                      {t('outOfStock')}
                    </span>
                  )}
                  {discount > 0 && (
                    <span className="rounded-full bg-destructive px-3 py-1 text-xs sm:text-sm font-medium text-destructive-foreground shadow-sm">
                      {t('save')} {discount}%
                    </span>
                  )}
                  {product.featured && (
                    <span className="rounded-full bg-primary px-3 py-1 text-xs sm:text-sm font-medium text-primary-foreground shadow-sm">
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
                          loading="lazy"
                          decoding="async"
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
              <div className="mb-2 sm:mb-3 flex flex-wrap items-center gap-2">
                {displayBrand && <span className="text-sm text-foreground/80 font-medium">{displayBrand}</span>}
                {displayBrand && protocolTokens.length > 0 && <span className="text-muted-foreground">•</span>}
                {protocolTokens.map(({ name, icon: Icon, bg, fg, description }) => (
                  <span
                    key={name}
                    title={description}
                    aria-label={description}
                    className={cn(
                      'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs lg:text-[11px] font-medium',
                      bg,
                      fg
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                    <span className="leading-none">{name}</span>
                  </span>
                ))}
              </div>

              <h1 className="mb-3 font-display text-xl sm:text-2xl font-bold text-foreground md:text-3xl leading-snug">{product.name}</h1>

              {/* Price & Stock — shown immediately under title on mobile (order-1) so it stays above the fold, while keeping desktop visual order (lg:order-3) */}
              <div className="order-1 lg:order-3">
                {/* Price */}
                <div className="mb-3 sm:mb-4 flex items-center gap-3 flex-wrap">
                  <span className="font-display text-2xl sm:text-3xl font-bold text-foreground">{formatPrice(product.price)}</span>
                  {discount > 0 && product.original_price && (
                    <span className="text-base sm:text-lg text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
                  )}
                </div>

                {/* Stock */}
                <div className="mb-4 flex items-center gap-2">
                  {product.stock > 0 ? (
                    <>
                      <Check className="h-4 w-4 text-success" />
                      <span className="text-sm text-success font-medium">{t('inStock')} ({product.stock} {t('available')})</span>
                    </>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-destructive/15 border border-destructive/30 px-3 py-1 text-xs font-semibold text-destructive">
                      {t('outOfStock')}
                    </span>
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
                              "min-h-[44px] lg:min-h-0 px-3.5 py-1.5 rounded-full border text-sm transition font-medium",
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

                {/* Quantity Stepper + Add to Cart + Trust badges */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 items-center rounded-full border border-border bg-card shrink-0">
                      <button
                        type="button"
                        aria-label={isRTL ? 'تقليل الكمية' : 'Decrease quantity'}
                        className="grid h-12 w-11 place-items-center text-foreground/80 hover:text-foreground disabled:opacity-40"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={product.stock <= 0 || quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-foreground">{quantity}</span>
                      <button
                        type="button"
                        aria-label={isRTL ? 'زيادة الكمية' : 'Increase quantity'}
                        className="grid h-12 w-11 place-items-center text-foreground/80 hover:text-foreground disabled:opacity-40"
                        onClick={() => setQuantity((q) => Math.min(product.stock || 1, q + 1))}
                        disabled={product.stock <= 0 || quantity >= product.stock}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <Button
                      size="lg"
                      className="flex-1 md:flex-none gap-2 glow-primary rounded-full h-12 px-6 sm:px-8 text-sm sm:text-base font-semibold"
                      onClick={handleAddToCart}
                      disabled={product.stock === 0}
                    >
                      <ShoppingCart className="h-5 w-5 shrink-0" />
                      {t('addToCart')}
                    </Button>
                  </div>

                  {/* Trust badges inline */}
                  <div className="flex flex-wrap gap-3 sm:gap-4">
                    {trustBadges.map((badge) => (
                      <div key={badge.label} className="flex items-center gap-1.5 text-xs text-foreground/80 font-medium">
                        <badge.icon className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{badge.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {sanitizedDescriptionHtml && (
                <div
                  dir={hasArabicDescription ? "rtl" : "auto"}
                  className={cn(
                    "order-2 lg:order-2 product-description mb-5 text-sm sm:text-base text-foreground/85 whitespace-pre-line break-words leading-relaxed",
                    hasArabicDescription && "text-right",
                    "[&_p]:mb-3 [&_p:last-child]:mb-0",
                    "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-4 [&_h3]:mb-2",
                    "[&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-foreground [&_h4]:mt-3 [&_h4]:mb-1.5",
                    "[&_ul]:list-disc [&_ul]:ps-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:ps-5 [&_ol]:my-2 [&_li]:my-1",
                    "[&_strong]:font-semibold [&_strong]:text-foreground [&_b]:font-semibold [&_b]:text-foreground",
                    "[&_a]:text-primary [&_a]:underline [&_a:hover]:opacity-80",
                    "[&_img]:max-w-full [&_img]:h-auto [&_img]:my-3 [&_img]:rounded-xl [&_img]:block"
                  )}
                  dangerouslySetInnerHTML={{ __html: sanitizedDescriptionHtml }}
                />
              )}

              <div className="order-3 lg:order-4">
                {/* Delivery info */}
                <div className="p-4 rounded-xl bg-card border border-border mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-foreground">{isRTL ? 'التوصيل' : 'Delivery'}</span>
                  </div>
                  <p className="text-xs text-foreground/80 mt-1 leading-relaxed">
                    {isRTL ? 'القاهرة والجيزة: ٢-٣ أيام عمل | باقي المحافظات: ٤-٧ أيام عمل' : 'Cairo & Giza: 2-3 business days | Other cities: 4-7 business days'}
                  </p>
                </div>

                {/* Specs */}
                {formattedSpecs.length > 0 && (
                  <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                    <h3 className="mb-3 font-display text-base font-semibold text-foreground">{t('specifications')}</h3>
                    <dl className="divide-y divide-border/50">
                      {formattedSpecs.map(([label, val]) => {
                        const isMostlyLatin = /[A-Za-z]/.test(val) && /^[A-Za-z0-9]/.test(val.trim());
                        return (
                          <div key={label} className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-4 py-2.5 first:pt-0 last:pb-0 text-sm">
                            <dt className="text-foreground/70 font-medium shrink-0">{label}</dt>
                            <dd
                              dir={isMostlyLatin ? 'ltr' : 'auto'}
                              style={{ unicodeBidi: 'isolate' }}
                              className="font-medium text-foreground sm:text-end break-words"
                            >
                              {val}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </div>
                )}

                {/* Bundle suggestion */}
                <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium text-foreground mb-1">
                    {isRTL ? '💡 وفّر أكثر مع الباقات' : '💡 Save more with bundles'}
                  </p>
                  <p className="text-xs text-foreground/80 mb-2.5 leading-relaxed">
                    {isRTL ? 'اشترِ باقة كاملة بأسعار حقيقية مع خصم مميز وتركيب معتمد' : 'Buy a complete bundle with package discounts & certified installation'}
                  </p>
                  <Link to="/bundles">
                    <Button variant="outline" size="sm" className="rounded-full text-xs h-9 px-4">
                      {isRTL ? 'عرض الباقات' : 'View Bundles'}
                      <ArrowRight className={cn("ml-1 h-3 w-3", isRTL && "rotate-180 mr-1 ml-0")} />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <CompleteYourSetup mainProduct={product} mainQuantity={quantity} />
        </div>

        {/* Sticky bottom price + Add to Cart bar on mobile (< lg) */}
        <div
          data-testid="mobile-sticky-add-to-cart"
          className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background/95 backdrop-blur-xl border-t border-border px-3 py-2.5 shadow-[0_-8px_30px_rgba(0,0,0,0.18)]"
        >
          <div className="container px-0 flex items-center justify-between gap-2.5">
            <div className="min-w-0 shrink-0">
              <div className="font-display text-base sm:text-lg font-bold text-foreground leading-tight">
                {formatPrice(product.price * quantity)}
              </div>
              {discount > 0 && product.original_price && (
                <div className="text-xs text-muted-foreground line-through leading-tight">
                  {formatPrice(product.original_price * quantity)}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-1 justify-end">
              <div className="flex h-11 items-center rounded-full border border-border bg-card shrink-0">
                <button
                  type="button"
                  aria-label={isRTL ? 'تقليل الكمية' : 'Decrease quantity'}
                  className="grid h-11 w-9 place-items-center text-foreground/80 hover:text-foreground disabled:opacity-40"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={product.stock <= 0 || quantity <= 1}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-semibold text-foreground">{quantity}</span>
                <button
                  type="button"
                  aria-label={isRTL ? 'زيادة الكمية' : 'Increase quantity'}
                  className="grid h-11 w-9 place-items-center text-foreground/80 hover:text-foreground disabled:opacity-40"
                  onClick={() => setQuantity((q) => Math.min(product.stock || 1, q + 1))}
                  disabled={product.stock <= 0 || quantity >= product.stock}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <Button
                className="h-11 flex-1 max-w-[190px] rounded-full gap-1.5 px-4 text-xs sm:text-sm font-semibold glow-primary"
                onClick={handleAddToCart}
                disabled={product.stock <= 0}
              >
                <ShoppingCart className="h-4 w-4 shrink-0" />
                <span className="truncate">{t('addToCart')}</span>
              </Button>
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
