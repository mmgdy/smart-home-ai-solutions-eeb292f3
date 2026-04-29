import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Loader2, Sparkles, X, ShoppingCart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface DevicePlacement {
  type: string;
  emoji: string;
  x: number;
  y: number;
  room: string;
  label: string;
}

interface Analysis {
  roomsDetected: { type: string; name: string; count: number }[];
  devicePlacements: DevicePlacement[];
  notes?: string;
}

const ROOM_KEYWORDS: Record<string, string[]> = {
  bedroom:  ['switch', 'curtain', 'sensor'],
  living:   ['lighting', 'curtain', 'AC', 'switch'],
  kitchen:  ['plug', 'sensor', 'switch'],
  office:   ['switch', 'plug', 'lighting'],
  default:  ['switch', 'plug', 'lighting', 'sensor'],
};

function SuggestedProducts({ roomNames, formatPrice, isRTL, addItem }: {
  roomNames: string[];
  formatPrice: (n: number) => string;
  isRTL: boolean;
  addItem: (p: any) => void;
}) {
  const keywords = Array.from(new Set(
    roomNames.flatMap(r => {
      const key = Object.keys(ROOM_KEYWORDS).find(k => r.toLowerCase().includes(k)) ?? 'default';
      return ROOM_KEYWORDS[key];
    })
  )).slice(0, 5);

  const { data: products } = useQuery({
    queryKey: ['photo-designer-products', keywords.join(',')],
    queryFn: async () => {
      if (!keywords.length) return [];
      const orFilter = keywords.map(k => `name.ilike.%${k}%`).join(',');
      const { data } = await supabase
        .from('products')
        .select('id, name, price, image_url, slug, brand, original_price, category_id, images, protocol, specifications, stock, featured, created_at, updated_at, description')
        .or(orFilter)
        .limit(6);
      return data ?? [];
    },
    enabled: keywords.length > 0,
    staleTime: 300_000,
  });

  if (!products?.length) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <ShoppingCart className="h-4 w-4 text-primary" />
        {isRTL ? 'أجهزة مقترحة لمنزلك' : 'Suggested devices for your home'}
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {products.map((p: any) => (
          <div key={p.id} className="group">
            <Link to={`/products/${p.slug}`}>
              <div className="aspect-square rounded-xl overflow-hidden bg-muted border border-border group-hover:border-primary/50 transition-colors mb-1.5">
                <img
                  src={p.image_url || '/placeholder.svg'}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
                />
              </div>
            </Link>
            <p className="text-xs font-medium truncate">{p.name}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-primary font-bold">{formatPrice(p.price)}</p>
              <button
                onClick={() => addItem(p, 1)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
                title="Add to cart"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function AnnotatedPhoto({ imageUrl, devices, isRTL }: {
  imageUrl: string;
  devices: DevicePlacement[];
  isRTL: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="relative rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg">
      <img
        src={imageUrl}
        alt="Your home"
        className="w-full object-contain max-h-[420px]"
        draggable={false}
      />
      {devices.map((device, i) => (
        <div
          key={i}
          className="absolute cursor-pointer"
          style={{ left: `${device.x}%`, top: `${device.y}%`, transform: 'translate(-50%,-50%)' }}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          onTouchStart={() => setHovered(hovered === i ? null : i)}
        >
          <span className="absolute inset-0 rounded-full animate-ping bg-primary/40" style={{ animationDelay: `${i * 0.15}s` }} />
          <div className={cn(
            'relative w-9 h-9 rounded-full flex items-center justify-center text-base shadow-xl border-2 transition-transform duration-150',
            'bg-background/90 border-primary/80 hover:scale-125'
          )}>
            {device.emoji}
          </div>
          {hovered === i && (
            <div className={cn(
              'absolute z-30 bottom-full mb-2 whitespace-nowrap',
              'bg-card border border-border rounded-xl px-3 py-2 shadow-xl text-xs',
              device.x > 70 ? 'right-0' : 'left-1/2 -translate-x-1/2'
            )}>
              <p className="font-bold text-foreground">{device.label}</p>
              <p className="text-muted-foreground">{device.room}</p>
            </div>
          )}
        </div>
      ))}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-muted-foreground border border-border">
        {isRTL ? '💡 مرر على الأيقونات لمعرفة الجهاز' : '💡 Hover icons to see device details'}
      </div>
    </div>
  );
}

export function HomePhotoDesigner() {
  const { isRTL, formatPrice } = useLanguage();
  const { toast } = useToast();
  const { addItem } = useCart();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [activeTab, setActiveTab] = useState<'photo' | 'shop'>('photo');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: isRTL ? 'ملف غير صالح' : 'Invalid file', description: isRTL ? 'يرجى رفع صورة' : 'Please upload an image', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: isRTL ? 'الصورة كبيرة' : 'File too large', description: isRTL ? 'الحد الأقصى 10MB' : 'Max 10MB', variant: 'destructive' });
      return;
    }

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setAnalysis(null);

    setIsAnalyzing(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('analyze-floor-plan', {
        body: { imageBase64: base64, mimeType: file.type, mode: 'photo' },
      });

      if (error) throw error;

      if (data?.analysis) {
        setAnalysis(data.analysis);
        const count = data.analysis.devicePlacements?.length || 0;
        toast({
          title: isRTL ? '✅ اكتمل التحليل!' : '✅ Analysis complete!',
          description: isRTL
            ? `تم اقتراح ${count} جهاز ذكي لمنزلك`
            : `${count} smart devices suggested for your home`,
        });
      }
    } catch (err) {
      console.error(err);
      toast({ title: isRTL ? 'خطأ في التحليل' : 'Analysis failed', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setPreviewUrl(null);
    setAnalysis(null);
    setIsAnalyzing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const devicePlacements: DevicePlacement[] = analysis?.devicePlacements ?? [];
  const roomNames = analysis?.roomsDetected?.map(r => r.name) ?? [];

  return (
    <section className="py-20 bg-background">
      <div className="container px-6 md:px-12">
        {/* Heading */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-5"
          >
            <Camera className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              {isRTL ? 'مصمم المنزل الذكي بالذكاء الاصطناعي' : 'AI Smart Home Designer'}
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="font-display text-3xl md:text-4xl font-bold mb-3"
          >
            {isRTL ? 'صوّر غرفتك واجعلها ذكية' : 'Photo Your Room & Make It Smart'}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.14 }}
            className="text-muted-foreground max-w-xl mx-auto"
          >
            {isRTL
              ? 'ارفع صورة لأي غرفة في منزلك وسيضع الذكاء الاصطناعي الأجهزة الذكية في أماكنها المثالية'
              : 'Upload a photo of any room and AI will show exactly where to place every smart device'}
          </motion.p>
        </div>

        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Upload state */}
            {!previewUrl && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full group rounded-3xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all p-12 text-center"
                >
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                    <Camera className="h-10 w-10 text-primary" />
                  </div>
                  <p className="font-display text-lg font-semibold mb-2">
                    {isRTL ? 'ارفع صورة لأي غرفة' : 'Upload a room photo'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {isRTL
                      ? 'صالة، غرفة نوم، مطبخ، مكتب — أي غرفة تريد تحويلها'
                      : 'Living room, bedroom, kitchen, office — any room you want to transform'}
                  </p>
                  <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    <Upload className="h-4 w-4" />
                    {isRTL ? 'اختر صورة' : 'Choose Photo'}
                  </span>
                  <p className="text-xs text-muted-foreground mt-3">JPG, PNG, WEBP · max 10MB</p>
                </button>
              </motion.div>
            )}

            {/* Analyzing / Result state */}
            {previewUrl && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-5"
              >
                {/* Loading overlay or annotated photo */}
                {isAnalyzing ? (
                  <div className="rounded-2xl border border-border overflow-hidden relative">
                    <img src={previewUrl} alt="Your room" className="w-full object-contain max-h-[420px] opacity-50" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm">
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                      <p className="font-semibold">
                        {isRTL ? '🤖 الذكاء الاصطناعي يحلل منزلك...' : '🤖 AI is analyzing your home...'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isRTL ? 'يستغرق 10-20 ثانية' : 'Takes 10-20 seconds'}
                      </p>
                    </div>
                  </div>
                ) : analysis && devicePlacements.length > 0 ? (
                  <>
                    {/* Tab switcher */}
                    <div className="flex rounded-xl border border-border overflow-hidden">
                      {(['photo', 'shop'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={cn(
                            'flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors',
                            activeTab === tab
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-card text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {tab === 'photo'
                            ? <><Camera className="h-4 w-4" />{isRTL ? 'الأجهزة على صورتك' : 'Devices on Your Photo'}</>
                            : <><ShoppingCart className="h-4 w-4" />{isRTL ? 'تسوّق الأجهزة' : 'Shop Devices'}</>
                          }
                        </button>
                      ))}
                    </div>

                    {activeTab === 'photo' && (
                      <AnnotatedPhoto imageUrl={previewUrl} devices={devicePlacements} isRTL={isRTL} />
                    )}

                    {activeTab === 'shop' && (
                      <SuggestedProducts roomNames={roomNames} formatPrice={formatPrice} isRTL={isRTL} addItem={addItem} />
                    )}

                    {analysis.notes && (
                      <p className="text-xs text-center text-muted-foreground italic">{analysis.notes}</p>
                    )}
                  </>
                ) : (
                  <div className="rounded-2xl border border-border overflow-hidden">
                    <img src={previewUrl} alt="Your room" className="w-full object-contain max-h-[420px]" />
                  </div>
                )}

                {/* Action row */}
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={reset} className="gap-2">
                    <X className="h-4 w-4" />
                    {isRTL ? 'صورة جديدة' : 'New Photo'}
                  </Button>
                  {analysis && (
                    <Link to="/products" className="flex-1">
                      <Button className="w-full gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        {isRTL ? 'تسوّق جميع الأجهزة' : 'Shop All Devices'}
                        <ArrowRight className={cn('h-4 w-4', isRTL && 'rotate-180')} />
                      </Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
