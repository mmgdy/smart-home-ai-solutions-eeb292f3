import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Moon, Sun, Film, ShieldCheck, Play, Sparkles, Wand2, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const SCENE_KEYWORDS: Record<string, string[]> = {
  morning:  ['curtain', 'lighting', 'switch', 'AC', 'coffee'],
  movie:    ['curtain', 'dimmer', 'lighting', 'remote', 'IR'],
  sleep:    ['lock', 'sensor', 'security', 'switch'],
  leaving:  ['lock', 'camera', 'plug', 'sensor'],
  guests:   ['lighting', 'switch', 'AC', 'speaker'],
};

function SceneProducts({ sceneId, isRTL, formatPrice }: { sceneId: string; isRTL: boolean; formatPrice: (n: number) => string }) {
  const keywords = SCENE_KEYWORDS[sceneId] ?? [];
  const { data: products } = useQuery({
    queryKey: ['scene-products', sceneId],
    queryFn: async () => {
      const orFilter = keywords.map(k => `name.ilike.%${k}%,description.ilike.%${k}%`).join(',');
      const { data } = await supabase
        .from('products')
        .select('id, name, price, image_url, slug')
        .or(orFilter)
        .gt('stock', 0)
        .limit(4);
      if (data && data.length > 0) return data;
      const { data: fallback } = await supabase
        .from('products')
        .select('id, name, price, image_url, slug')
        .gt('stock', 0)
        .limit(4);
      return fallback ?? [];
    },
    enabled: keywords.length > 0,
    staleTime: 120_000,
  });

  if (!products?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto mt-4 rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-base">
          {isRTL ? '🛒 المنتجات المطلوبة لهذا المشهد' : '🛒 Products to bring this scene to life'}
        </h3>
        <Link to="/products">
          <Button variant="outline" size="sm" className="rounded-full text-xs h-7">
            {isRTL ? 'عرض الكل' : 'View all'}
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {products.map((p) => (
          <Link key={p.id} to={`/products/${p.slug}`} className="group">
            <div className="aspect-square rounded-xl overflow-hidden bg-muted mb-2 border border-border group-hover:border-primary/50 transition-colors">
              <img
                src={p.image_url || '/placeholder.svg'}
                alt={p.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
              />
            </div>
            <p className="text-xs font-medium truncate">{p.name}</p>
            <p className="text-xs text-primary font-bold">{formatPrice(p.price)}</p>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

type Scene = {
  id: string;
  icon: any;
  nameEn: string;
  nameAr: string;
  taglineEn: string;
  taglineAr: string;
  bgImage: string;
  actions: { en: string; ar: string }[];
  accent: string; // hsl
};

const SCENES: Scene[] = [
  {
    id: 'morning',
    icon: Sun,
    nameEn: 'Good Morning',
    nameAr: 'صباح الخير',
    taglineEn: 'Sunrise wakes the house gently',
    taglineAr: 'استيقظ الصبح بإضاءة هادية',
    bgImage: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1400&q=80',
    actions: [
      { en: '☀️ Curtains open 80%', ar: '☀️ الستائر تفتح ٨٠٪' },
      { en: '💡 Bedroom lights warm 30%', ar: '💡 إضاءة دافئة ٣٠٪' },
      { en: '☕ Coffee maker starts', ar: '☕ ماكينة القهوة تشتغل' },
      { en: '❄️ AC sets to 23°C', ar: '❄️ التكييف على ٢٣°' },
    ],
    accent: '40 100% 60%',
  },
  {
    id: 'movie',
    icon: Film,
    nameEn: 'Movie Night',
    nameAr: 'ليلة فيلم',
    taglineEn: 'One tap turns your living room into a cinema',
    taglineAr: 'بضغطة، الصالة تبقى سينما',
    bgImage: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1400&q=80',
    actions: [
      { en: '🎬 Curtains close', ar: '🎬 الستائر تقفل' },
      { en: '💡 Lights dim to 5%', ar: '💡 الإضاءة ٥٪' },
      { en: '📺 TV turns on', ar: '📺 التلفزيون يفتح' },
      { en: '🔊 Surround sound active', ar: '🔊 الصوت المحيطي يشتغل' },
    ],
    accent: '270 100% 65%',
  },
  {
    id: 'sleep',
    icon: Moon,
    nameEn: 'Goodnight',
    nameAr: 'تصبح على خير',
    taglineEn: 'Lock down the house with one command',
    taglineAr: 'أمّن البيت كله بأمر واحد',
    bgImage: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=1400&q=80',
    actions: [
      { en: '🔒 All doors lock', ar: '🔒 الأبواب تتقفل' },
      { en: '💡 All lights off except hallway', ar: '💡 الإضاءة تطفي' },
      { en: '🛡️ Security armed', ar: '🛡️ الأمان مفعّل' },
      { en: '❄️ AC night mode 24°C', ar: '❄️ وضع نوم ٢٤°' },
    ],
    accent: '220 80% 50%',
  },
  {
    id: 'leaving',
    icon: ShieldCheck,
    nameEn: 'Leaving Home',
    nameAr: 'البيت فاضي',
    taglineEn: 'Save energy & secure everything automatically',
    taglineAr: 'وفّر طاقة وأمّن البيت تلقائياً',
    bgImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1400&q=80',
    actions: [
      { en: '⚡ All standby devices off', ar: '⚡ كل الأجهزة في الستاندباي تطفي' },
      { en: '🔒 Smart lock engaged', ar: '🔒 القفل الذكي يشتغل' },
      { en: '📷 Cameras start recording', ar: '📷 الكاميرات تبدأ تسجيل' },
      { en: '🚨 Motion alerts on', ar: '🚨 تنبيهات الحركة مفعّلة' },
    ],
    accent: '150 70% 45%',
  },
  {
    id: 'guests',
    icon: Coffee,
    nameEn: 'Welcoming Guests',
    nameAr: 'استقبال الضيوف',
    taglineEn: 'Set the perfect ambience the moment they arrive',
    taglineAr: 'هيّئ البيت لاستقبال الضيوف',
    bgImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80',
    actions: [
      { en: '💡 Living room bright 100%', ar: '💡 الصالة إضاءة كاملة' },
      { en: '🎵 Background music plays', ar: '🎵 موسيقى هادية' },
      { en: '❄️ AC drops to 22°C', ar: '❄️ التكييف على ٢٢°' },
      { en: '🔔 Guest WiFi active', ar: '🔔 واي فاي الضيوف يشتغل' },
    ],
    accent: '15 90% 60%',
  },
];

export function TryItShowcase() {
  const { isRTL, formatPrice } = useLanguage();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [triggered, setTriggered] = useState<Set<number>>(new Set());
  const [autoPlay, setAutoPlay] = useState(false);
  const active = SCENES.find(s => s.id === activeId);

  // Reset triggered when scene changes
  useEffect(() => {
    setTriggered(new Set());
    setAutoPlay(false);
  }, [activeId]);

  // Auto-play sequence
  useEffect(() => {
    if (!autoPlay || !active) return;
    setTriggered(new Set());
    const timers: number[] = [];
    active.actions.forEach((_, i) => {
      const t = window.setTimeout(() => {
        setTriggered(prev => new Set([...prev, i]));
      }, 400 + i * 700);
      timers.push(t);
    });
    const stop = window.setTimeout(() => setAutoPlay(false), 400 + active.actions.length * 700 + 500);
    timers.push(stop);
    return () => timers.forEach(clearTimeout);
  }, [autoPlay, active]);

  const toggleAction = (i: number) => {
    setTriggered(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <section className="py-16 md:py-24 bg-card/30 relative overflow-hidden">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-10">
          <span className="text-primary font-medium text-sm uppercase tracking-wider">
            {isRTL ? 'جرّب بنفسك' : 'Try It Live'}
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-2 mb-3">
            {isRTL ? 'مشاهد جاهزة لكل وقت من اليوم' : 'Ready-Made Scenes for Every Moment'}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {isRTL
              ? 'اختر مشهد، اضغط "تشغيل سحري" أو دوس على كل أمر بنفسك وشوف البيت يستجيب'
              : 'Pick a scene, hit "Magic Play" or tap each action yourself and watch the house respond'}
          </p>
        </div>

        {/* Scene picker */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-5xl mx-auto mb-8">
          {SCENES.map((s) => {
            const Icon = s.icon;
            const isActive = activeId === s.id;
            return (
              <motion.button
                key={s.id}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveId(isActive ? null : s.id)}
                className={cn(
                  'group relative rounded-2xl border p-4 text-left transition-all overflow-hidden',
                  isActive
                    ? 'border-primary/60 bg-primary/5 shadow-lg shadow-primary/20'
                    : 'border-border bg-card hover:border-primary/30'
                )}
                style={isActive ? { boxShadow: `0 0 30px hsl(${s.accent} / 0.25)` } : undefined}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-colors"
                  style={{ background: `hsl(${s.accent} / 0.15)`, color: `hsl(${s.accent})` }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-display font-bold text-sm leading-tight">
                  {isRTL ? s.nameAr : s.nameEn}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                  {isRTL ? s.taglineAr : s.taglineEn}
                </div>
                {!isActive && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="h-3 w-3" />
                    {isRTL ? 'جرّب' : 'Try'}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Active scene preview */}
        <AnimatePresence mode="wait">
          {active && (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-4xl mx-auto rounded-3xl overflow-hidden border border-border shadow-2xl"
            >
              <div
                className="relative aspect-[16/9] bg-cover bg-center"
                style={{ backgroundImage: `url(${active.bgImage})` }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: triggered.size > 0
                      ? `linear-gradient(135deg, hsl(${active.accent} / ${0.3 + triggered.size * 0.1}), hsl(0 0% 0% / ${0.7 - triggered.size * 0.05}))`
                      : `linear-gradient(135deg, hsl(${active.accent} / 0.4), hsl(0 0% 0% / 0.6))`,
                    transition: 'background 0.6s ease',
                  }}
                />

                {/* Magic sparkle burst when actions trigger */}
                <AnimatePresence>
                  {triggered.size > 0 && (
                    <motion.div
                      key={triggered.size}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 2] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8 }}
                      className="absolute inset-0 pointer-events-none flex items-center justify-center"
                    >
                      <div
                        className="w-32 h-32 rounded-full blur-2xl"
                        style={{ background: `hsl(${active.accent} / 0.6)` }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-end">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-md"
                      style={{ background: `hsl(${active.accent} / 0.3)`, color: '#fff' }}
                    >
                      <active.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-2xl md:text-3xl font-bold text-white">
                        {isRTL ? active.nameAr : active.nameEn}
                      </h3>
                      <p className="text-white/80 text-sm">{isRTL ? active.taglineAr : active.taglineEn}</p>
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setAutoPlay(true)}
                        disabled={autoPlay}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/95 text-foreground text-xs font-bold backdrop-blur-md shadow-lg disabled:opacity-50"
                        style={{ boxShadow: `0 0 20px hsl(${active.accent} / 0.6)` }}
                      >
                        <Wand2 className="h-3.5 w-3.5" style={{ color: `hsl(${active.accent})` }} />
                        {isRTL ? 'تشغيل سحري' : 'Magic Play'}
                      </motion.button>
                      {triggered.size > 0 && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileTap={{ scale: 0.9, rotate: -180 }}
                          onClick={() => setTriggered(new Set())}
                          className="p-2 rounded-full bg-white/20 text-white backdrop-blur-md"
                          aria-label="Reset"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </motion.button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {active.actions.map((a, i) => {
                      const isOn = triggered.has(i);
                      return (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + i * 0.08 }}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => toggleAction(i)}
                          className={cn(
                            'relative overflow-hidden text-left backdrop-blur-md rounded-xl px-3 py-2.5 text-xs md:text-sm border transition-all',
                            isOn
                              ? 'text-white border-white/40 font-semibold'
                              : 'bg-black/40 text-white/80 border-white/10 hover:border-white/30'
                          )}
                          style={isOn ? {
                            background: `linear-gradient(135deg, hsl(${active.accent} / 0.6), hsl(${active.accent} / 0.3))`,
                            boxShadow: `0 0 20px hsl(${active.accent} / 0.5), inset 0 0 20px hsl(${active.accent} / 0.2)`,
                          } : undefined}
                        >
                          <span className="relative z-10 flex items-center justify-between gap-2">
                            <span>{isRTL ? a.ar : a.en}</span>
                            <AnimatePresence>
                              {isOn && (
                                <motion.span
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  exit={{ scale: 0 }}
                                  className="flex-shrink-0"
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </span>
                          {/* Shimmer sweep on activation */}
                          {isOn && (
                            <motion.span
                              initial={{ x: '-100%' }}
                              animate={{ x: '200%' }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className="absolute inset-y-0 w-1/2 pointer-events-none"
                              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }}
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  <p className="text-white/60 text-[11px] mt-3 text-center">
                    {isRTL ? '👆 دوس على كل أمر لتشغيله — أو اضغط "تشغيل سحري"' : '👆 Tap each action to activate — or hit "Magic Play"'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Real products for the active scene */}
        {active && (
          <SceneProducts
            sceneId={active.id}
            isRTL={isRTL}
            formatPrice={formatPrice}
          />
        )}
      </div>
    </section>
  );
}
