import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Play, Search, Camera, X, Loader2, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import heroBg from '@/assets/hero-bg.jpg';
import { useSiteInfo } from '@/hooks/useSiteInfo';
import { supabase } from '@/integrations/supabase/client';
import { Hub } from '@/components/ui/hairline';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';

const HERO_VIDEO = '/hero-loop.mp4';

const SEARCH_HINTS_EN = [
  'Smart bulbs for your living room…',
  'Zigbee motion sensors…',
  'Smart plugs with energy monitoring…',
  'WiFi thermostat…',
  'SONOFF switches…',
  'Smart home security cameras…',
  'Voice-controlled lighting…',
  'Smart door locks…',
];
const SEARCH_HINTS_AR = [
  'لمبات ذكية لغرفة المعيشة…',
  'حساسات حركة Zigbee…',
  'مقابس ذكية مع قياس الطاقة…',
  'ترموستات واي فاي…',
  'مفاتيح SONOFF…',
  'كاميرات أمان ذكية…',
  'إضاءة بالأوامر الصوتية…',
  'أقفال أبواب ذكية…',
];

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function HeroSection() {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { get } = useSiteInfo();
  const { reducedMotion } = useMotionPreferences();
  const [figureReadout, setFigureReadout] = useState<string>('');

  const headline = get('hero', isRTL ? 'headline_ar' : 'headline_en',
    isRTL ? 'اشعر بسحر البيت الذكي' : 'Feel the magic of a Smarter Home');
  const subheadline = get('hero', isRTL ? 'subheadline_ar' : 'subheadline_en',
    isRTL
      ? 'إضاءة، أمان، تحكم — بضغطة واحدة. منتجات أصلية، تركيب احترافي، ودفع آمن بالبطاقة.'
      : 'Lighting, security, control — in one tap. Genuine products, expert installation, secure card payment.');
  const ctaLabel = get('hero', isRTL ? 'cta_ar' : 'cta_en',
    isRTL ? 'ابدأ بناء بيتك الذكي' : 'Start Building Your Smart Home');

  const steps = [
    { num: '01', label: isRTL ? 'احكيلنا عن بيتك' : 'Tell us about your home' },
    { num: '02', label: isRTL ? 'استلم خطتك' : 'Get your plan' },
    { num: '03', label: isRTL ? 'اشترِ الأجهزة' : 'Order devices' },
    { num: '04', label: isRTL ? 'احجز التركيب' : 'Book install' },
  ];

  // Typewriter search bar state
  const hints = isRTL ? SEARCH_HINTS_AR : SEARCH_HINTS_EN;
  const [hintIdx, setHintIdx] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isFocused || searchValue) { setTypedText(''); return; }
    const target = hints[hintIdx];
    let i = 0;
    setTypedText('');
    typingTimerRef.current = setInterval(() => {
      i++;
      setTypedText(target.slice(0, i));
      if (i >= target.length) {
        clearInterval(typingTimerRef.current!);
        pauseTimerRef.current = setTimeout(() => {
          setHintIdx((prev) => (prev + 1) % hints.length);
        }, 2000);
      }
    }, 48);
    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, [hintIdx, hints, isFocused, searchValue]);

  const handleSearch = useCallback((q: string) => {
    const query = q.trim();
    if (query) navigate(`/products?q=${encodeURIComponent(query)}`);
  }, [navigate]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch(searchValue);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImageLoading(true);
    try {
      const base64 = await toBase64(file);
      const { data, error } = await supabase.functions.invoke('search-by-image', {
        body: { imageBase64: base64, mimeType: file.type },
      });
      if (error || !data?.success) throw new Error(data?.error || 'Failed to analyse image');
      if (data.query) {
        navigate(`/products?q=${encodeURIComponent(data.query)}`);
      }
    } catch {
      // fall back to products page with no query
      navigate('/products');
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden">
      {/* Video background */}
      <div className="absolute inset-0">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster={heroBg}
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
        <img src={heroBg} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover -z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070D16]/85 via-[#070D16]/65 to-background/95" />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-warning/15 mix-blend-overlay" />
        <motion.div
          aria-hidden
          className="azka-hairline-ambient absolute -top-40 -right-32 h-[60vw] w-[60vw] rounded-full bg-gradient-to-br from-primary/30 via-cyan-500/15 to-transparent blur-3xl"
          animate={reducedMotion ? undefined : { scale: [1, 1.1, 1], opacity: [0.55, 0.85, 0.55] }}
          transition={reducedMotion ? undefined : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="azka-hairline-ambient absolute -bottom-40 -left-32 h-[55vw] w-[55vw] rounded-full bg-gradient-to-tr from-warning/25 via-primary/10 to-transparent blur-3xl"
          animate={reducedMotion ? undefined : { scale: [1.1, 1, 1.1], opacity: [0.45, 0.75, 0.45] }}
          transition={reducedMotion ? undefined : { duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="container relative z-10 px-4 md:px-12 pt-24 md:pt-32 pb-24 md:pb-32">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10">
            <div className="text-center lg:text-start min-w-0">
              {/* Badge */}
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#070D16]/75 backdrop-blur-md border border-teal-400/30 mb-6 md:mb-8 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.4)]"
              >
                <span className="relative flex h-2 w-2">
                  {!reducedMotion && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  )}
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-xs sm:text-sm font-medium text-white">
                  {isRTL ? 'منزلك الذكي يبدأ من هنا' : 'Your smart home starts here'}
                </span>
              </motion.div>

              {/* Main headline */}
              <motion.h1
                initial={reducedMotion ? false : { opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="font-display text-3xl sm:text-5xl md:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.12] sm:leading-[1.08] mb-4 md:mb-6"
              >
                <span className="block text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)]">
                  {headline}
                </span>
              </motion.h1>

              <motion.p
                initial={reducedMotion ? false : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 }}
                className="text-sm sm:text-base md:text-xl text-slate-200 max-w-2xl mx-auto lg:mx-0 mb-6 md:mb-8 leading-relaxed font-medium drop-shadow-[0_1px_8px_rgba(0,0,0,0.4)]"
              >
                {subheadline}
              </motion.p>

              {/* Animated search bar */}
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.35 }}
                className="max-w-xl mx-auto lg:mx-0 mb-6 md:mb-8"
              >
                <div className={cn(
                  'flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl bg-background/85 backdrop-blur-xl border shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)] transition-shadow',
                  isFocused ? 'border-primary shadow-[0_8px_40px_-8px_hsl(var(--primary)/0.5)]' : 'border-border/60'
                )}>
                  <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="relative flex-1 min-w-0">
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      onKeyDown={handleKey}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      className="w-full bg-transparent text-foreground text-sm outline-none placeholder-transparent h-9"
                      aria-label={isRTL ? 'ابحث عن منتجات' : 'Search products'}
                    />
                    {/* Typewriter placeholder */}
                    {!searchValue && (
                      <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden">
                        <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap truncate">
                          {typedText}
                          {typedText.length < hints[hintIdx].length && (
                            <span className="inline-block w-0.5 h-3.5 bg-muted-foreground/60 ml-px align-middle animate-pulse" />
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  {searchValue && (
                    <button
                      onClick={() => setSearchValue('')}
                      className="min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0"
                      aria-label={isRTL ? 'مسح البحث' : 'Clear search'}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {/* Image upload button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageLoading}
                    className="flex-shrink-0 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 p-1.5 flex items-center justify-center rounded-lg bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground transition-colors"
                    title={isRTL ? 'بحث بالصورة' : 'Search by image'}
                    aria-label={isRTL ? 'بحث بالصورة' : 'Search by image'}
                  >
                    {imageLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <Button
                    size="sm"
                    className="flex-shrink-0 rounded-xl h-11 lg:h-8 px-4 text-xs sm:text-sm font-medium"
                    onClick={() => handleSearch(searchValue)}
                  >
                    {isRTL ? 'بحث' : 'Search'}
                  </Button>
                </div>
                <p className="text-xs text-slate-200/90 font-medium mt-2.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                  {isRTL
                    ? 'أو ارفع صورة غرفتك للبحث عن المنتجات المناسبة'
                    : 'Or upload a room photo to find matching smart devices'}
                </p>
              </motion.div>

              {/* CTAs */}
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.45 }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start flex-wrap gap-3 sm:gap-4 mb-2 lg:mb-0"
              >
                <Link to="/bundles" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-full group glow-primary shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.7)]"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    {ctaLabel}
                    <ArrowRight className={cn(
                      'ml-2 h-5 w-5 transition-transform group-hover:translate-x-1',
                      isRTL && 'rotate-180 mr-2 ml-0 group-hover:-translate-x-1'
                    )} />
                  </Button>
                </Link>
                <Link to="/products" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-7 text-sm sm:text-base font-medium rounded-full border-white/30 bg-[#070D16]/60 backdrop-blur-md hover:bg-[#070D16]/80 text-white"
                  >
                    <Play className="mr-2 h-4 w-4 fill-current" />
                    {isRTL ? 'تصفح المنتجات' : 'Browse Products'}
                  </Button>
                </Link>
                {/* AI Home Designer link */}
                <Link to="/home-designer" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-7 text-sm sm:text-base font-medium rounded-full border-primary/60 bg-[#070D16]/60 backdrop-blur-md hover:bg-primary/25 text-white"
                  >
                    <Sparkles className="mr-2 h-4 w-4 text-emerald-400" />
                    {isRTL ? 'AI يرسم أجهزة على صورة بيتك' : 'AI Home Designer'}
                  </Button>
                </Link>
                <Link to="/calculator" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto h-12 sm:h-14 px-6 sm:px-7 text-sm sm:text-base font-medium rounded-full border-warning/50 bg-[#070D16]/60 backdrop-blur-md hover:bg-warning/20 text-white"
                  >
                    <Calculator className="mr-2 h-4 w-4 text-warning" />
                    {isRTL ? 'حاسبة التكلفة' : 'Cost Calculator'}
                  </Button>
                </Link>
              </motion.div>
            </div>

            {/* Interactive Hairline Hero Stage */}
            <motion.div
              data-testid="hero-hairline-stage"
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="relative w-full max-w-[300px] sm:max-w-[360px] lg:max-w-[440px] mx-auto rounded-3xl azka-navy-stage border border-teal-400/25 p-4 sm:p-5 shadow-[0_24px_60px_-15px_rgba(7,13,22,0.85)] backdrop-blur-xl"
            >
              <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-teal-300/90 mb-2">
                <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                  <span className={cn('h-1.5 w-1.5 rounded-full bg-teal-400 shrink-0', !reducedMotion && 'animate-pulse')} />
                  <span className="truncate">{isRTL ? 'منظومة أزكاسمارت المتكاملة' : 'AzkaSmart Mesh Hub'}</span>
                </span>
                <span className="text-slate-400 font-mono text-[10px] shrink-0">Matter · Zigbee · Wi-Fi</span>
              </div>
              <Hub
                variant="navy"
                intensity={0.75}
                play={!reducedMotion}
                label={isRTL ? 'شبكة أجهزة المنزل الذكي التفاعلية' : 'Interactive smart home hub network'}
                onRead={setFigureReadout}
                containerClassName="rounded-2xl bg-[#070D16]"
              />
              <div className="mt-2 min-h-[2.25rem] flex items-center justify-between gap-2 border-t border-white/10 pt-2 text-[11px] text-slate-300">
                <span className="truncate">
                  {figureReadout || (isRTL ? 'حرّك المؤشر لاستكشاف العقد الذكية' : 'Move pointer to inspect smart nodes')}
                </span>
                <span className="shrink-0 text-teal-400 font-semibold">
                  {isRTL ? 'تفاعلي' : 'Interactive'}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Steps indicator */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mt-8 lg:mt-10"
          >
            {steps.map((step) => (
              <motion.div
                key={step.num}
                whileHover={reducedMotion ? undefined : { y: -4 }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-[#070D16]/70 backdrop-blur-md border border-teal-400/20"
              >
                <span className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center text-xs font-bold text-primary-foreground shadow-lg">
                  {step.num}
                </span>
                <span className="text-xs md:text-sm text-white/90 font-medium text-start">
                  {step.label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Trust strip */}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.9 }}
        className="absolute bottom-0 left-0 right-0 border-t border-border/40 bg-background/60 backdrop-blur-xl z-10"
      >
        <div className="container px-6 md:px-12 py-3">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-foreground/80">
            <span className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full bg-success', !reducedMotion && 'animate-pulse')} />
              {isRTL ? '١٠٠٠+ منزل ذكي في مصر' : '1,000+ Smart Homes'}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              {isRTL ? 'دفع آمن بالبطاقة' : 'Secure Card Payment'}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning" />
              {isRTL ? 'ضمان رسمي' : 'Official Warranty'}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              {isRTL ? 'تركيب احترافي' : 'Pro Installation'}
            </span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
