import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Sparkles, ShoppingBag, Search, Camera, X, Loader2, Calculator, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import heroBg from '@/assets/hero-bg.jpg';
import { useSiteInfo } from '@/hooks/useSiteInfo';
import { supabase } from '@/integrations/supabase/client';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';
import { BorderBeam } from '@/components/vengeance/BorderBeam';
import { AnimatedButton } from '@/components/vengeance/AnimatedButton';

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
    if (isFocused || searchValue) {
      setTypedText('');
      return;
    }
    const target = hints[hintIdx];
    if (reducedMotion) {
      setTypedText(target);
      return;
    }
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
  }, [hintIdx, hints, isFocused, searchValue, reducedMotion]);

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
      navigate('/products');
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <section
      data-testid="vengeance-hero"
      className="relative min-h-[100svh] flex items-center overflow-hidden bg-[#070D16] text-slate-50"
    >
      {/* Background Video & Azka Midnight Navy Aurora */}
      <div className="absolute inset-0">
        {!reducedMotion && (
          <video
            className="absolute inset-0 h-full w-full object-cover opacity-55"
            autoPlay
            muted
            loop
            playsInline
            poster={heroBg}
          >
            <source src={HERO_VIDEO} type="video/mp4" />
          </video>
        )}
        <img
          src={heroBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover -z-10 opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070D16]/88 via-[#070D16]/72 to-[#070D16]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(45,212,191,0.18),transparent_60%)]"
        />
        {/* Subtle architectural grid overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(circle at 50% 35%, black 25%, transparent 78%)',
          }}
        />
        <motion.div
          aria-hidden="true"
          className="azka-ambient-orb pointer-events-none absolute -top-36 -right-24 h-[48vw] w-[48vw] max-w-[620px] rounded-full bg-gradient-to-br from-teal-400/20 via-cyan-500/15 to-transparent blur-3xl"
          animate={reducedMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.45, 0.72, 0.45] }}
          transition={reducedMotion ? undefined : { duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden="true"
          className="azka-ambient-orb pointer-events-none absolute -bottom-36 -left-24 h-[45vw] w-[45vw] max-w-[560px] rounded-full bg-gradient-to-tr from-blue-500/20 via-violet-500/10 to-transparent blur-3xl"
          animate={reducedMotion ? undefined : { scale: [1.08, 1, 1.08], opacity: [0.4, 0.65, 0.4] }}
          transition={reducedMotion ? undefined : { duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="container relative z-10 px-4 md:px-12 pt-24 md:pt-32 pb-24 md:pb-28">
        <div className="max-w-5xl mx-auto text-center">
          {/* Gradient-Ring Eyebrow Pill */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="azka-gradient-ring inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0D1726]/80 backdrop-blur-xl mb-6 md:mb-8 shadow-[0_0_32px_-8px_rgba(45,212,191,0.5)]"
          >
            <span className="relative flex h-2 w-2">
              {!reducedMotion && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              )}
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400" />
            </span>
            <span className="text-xs sm:text-sm font-medium text-slate-100">
              {isRTL ? 'منزلك الذكي يبدأ من هنا' : 'Your smart home starts here'}
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: reducedMotion ? 0 : 0.08 }}
            className="font-display text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.12] sm:leading-[1.08] mb-4 md:mb-6"
          >
            <span className="block text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
              {headline}
            </span>
          </motion.h1>

          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.16 }}
            className="text-sm sm:text-base md:text-xl text-slate-300 max-w-2xl mx-auto mb-6 md:mb-8 leading-relaxed font-normal"
          >
            {subheadline}
          </motion.p>

          {/* Vengeance BorderBeam AI Search Bar */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.24 }}
            className="max-w-xl mx-auto mb-7 md:mb-9"
          >
            <div
              className={cn(
                'relative overflow-hidden flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-[#0C1524]/90 backdrop-blur-2xl border transition-all shadow-[0_14px_40px_-10px_rgba(0,0,0,0.65)]',
                isFocused ? 'border-teal-400/70 shadow-[0_14px_45px_-10px_rgba(45,212,191,0.45)]' : 'border-slate-700/70',
              )}
            >
              <BorderBeam size={160} duration={10} borderWidth={1.5} colorFrom="#2DD4BF" colorTo="#3B82F6" />
              <Search className="h-5 w-5 text-slate-400 flex-shrink-0 relative z-10" />
              <div className="relative z-10 flex-1 min-w-0">
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={handleKey}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="w-full bg-transparent text-slate-100 text-sm outline-none placeholder-transparent h-9"
                  aria-label={isRTL ? 'ابحث عن منتجات' : 'Search products'}
                />
                {!searchValue && (
                  <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden">
                    <span className="text-xs sm:text-sm text-slate-400 whitespace-nowrap truncate">
                      {typedText}
                      {!reducedMotion && typedText.length < hints[hintIdx].length && (
                        <span className="inline-block w-0.5 h-3.5 bg-teal-400/70 ml-px align-middle animate-pulse" />
                      )}
                    </span>
                  </div>
                )}
              </div>
              {searchValue && (
                <button
                  type="button"
                  onClick={() => setSearchValue('')}
                  className="relative z-10 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 flex items-center justify-center text-slate-400 hover:text-white flex-shrink-0"
                  aria-label={isRTL ? 'مسح البحث' : 'Clear search'}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageLoading}
                className="relative z-10 flex-shrink-0 min-h-[44px] min-w-[44px] lg:min-h-8 lg:min-w-8 p-1.5 flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700/60"
                title={isRTL ? 'بحث بالصورة' : 'Search by image'}
                aria-label={isRTL ? 'بحث بالصورة' : 'Search by image'}
              >
                {imageLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <Button
                size="sm"
                className="relative z-10 flex-shrink-0 rounded-xl h-11 lg:h-9 px-4 text-xs sm:text-sm font-semibold bg-gradient-to-r from-teal-400 to-cyan-400 text-[#070D16] hover:from-teal-300 hover:to-cyan-300 border-0"
                onClick={() => handleSearch(searchValue)}
              >
                {isRTL ? 'بحث' : 'Search'}
              </Button>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-2.5">
              {isRTL
                ? 'أو ارفع صورة غرفتك للبحث عن المنتجات المناسبة'
                : 'Or upload a room photo to find matching smart devices'}
            </p>
          </motion.div>

          {/* Vengeance Primary CTA + Glass Secondary CTAs */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.3 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center flex-wrap gap-3 sm:gap-3.5 mb-10"
          >
            <Link to="/bundles" className="w-full sm:w-auto">
              <AnimatedButton className="w-full sm:w-auto min-h-[48px] h-12 sm:h-13 px-6 sm:px-8">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>{ctaLabel}</span>
                <ArrowRight
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1',
                    isRTL && 'rotate-180 group-hover:-translate-x-1',
                  )}
                />
              </AnimatedButton>
            </Link>

            <Link to="/ai-consultant" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto min-h-[48px] h-12 sm:h-13 px-5 sm:px-6 text-sm font-medium rounded-full border-teal-400/40 bg-[#0D1726]/75 backdrop-blur-xl hover:bg-teal-400/15 hover:border-teal-400/70 text-slate-100"
              >
                <Bot className="me-2 h-4 w-4 text-teal-400 shrink-0" />
                {isRTL ? 'المستشار الذكي AI' : 'AI Smart Advisor'}
              </Button>
            </Link>

            <Link to="/products" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto min-h-[48px] h-12 sm:h-13 px-5 sm:px-6 text-sm font-medium rounded-full border-slate-600/70 bg-[#0D1726]/70 backdrop-blur-xl hover:bg-slate-800/80 text-slate-100"
              >
                <ShoppingBag className="me-2 h-4 w-4 text-cyan-400 shrink-0" />
                {isRTL ? 'تصفح المنتجات' : 'Browse Products'}
              </Button>
            </Link>

            <Link to="/home-designer" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto min-h-[48px] h-12 sm:h-13 px-5 sm:px-6 text-sm font-medium rounded-full border-slate-600/70 bg-[#0D1726]/70 backdrop-blur-xl hover:bg-slate-800/80 text-slate-100"
              >
                <Sparkles className="me-2 h-4 w-4 text-sky-400 shrink-0" />
                {isRTL ? 'AI يرسم أجهزة على صورة بيتك' : 'AI Home Designer'}
              </Button>
            </Link>

            <Link to="/calculator" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto min-h-[48px] h-12 sm:h-13 px-5 sm:px-6 text-sm font-medium rounded-full border-slate-600/70 bg-[#0D1726]/70 backdrop-blur-xl hover:bg-slate-800/80 text-slate-100"
              >
                <Calculator className="me-2 h-4 w-4 text-amber-400 shrink-0" />
                {isRTL ? 'حاسبة التكلفة' : 'Cost Calculator'}
              </Button>
            </Link>
          </motion.div>

          {/* 4-Step Bento Journey Row */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: reducedMotion ? 0 : 0.38 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto"
          >
            {steps.map((step) => (
              <div
                key={step.num}
                className="flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl bg-[#0D1829]/80 backdrop-blur-xl border border-slate-700/60 hover:border-teal-400/50 transition-all shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]"
              >
                <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 via-cyan-400 to-blue-500 flex items-center justify-center text-xs font-bold text-[#070D16] shadow-md">
                  {step.num}
                </span>
                <span className="text-xs md:text-sm text-slate-100 font-medium text-start leading-snug">
                  {step.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom Trust Strip */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-slate-800/80 bg-[#070D16]/85 backdrop-blur-xl z-10">
        <div className="container px-6 md:px-12 py-3">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-300">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {isRTL ? '١٠٠٠+ منزل ذكي في مصر' : '1,000+ Smart Homes'}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              {isRTL ? 'دفع آمن بالبطاقة' : 'Secure Card Payment'}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              {isRTL ? 'ضمان رسمي' : 'Official Warranty'}
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400" />
              {isRTL ? 'تركيب احترافي' : 'Pro Installation'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
