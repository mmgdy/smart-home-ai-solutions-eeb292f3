import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb, Thermometer, Lock, Camera, Music, Tv, Plug, Wifi, Power,
  Mic, Settings, ChevronRight, Home, Plus, Sun, Moon, Cloud, Volume2,
} from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Ecosystem = {
  id: string;
  name: string;
  tagline: string;
  tagline_ar: string;
  color: string;
  accent: string;
  brandPatterns: string[]; // for product matching
  strengths: string[];
  strengths_ar: string[];
};

const ECOSYSTEMS: Ecosystem[] = [
  {
    id: 'home-assistant',
    name: 'Home Assistant',
    tagline: 'Open-source, total control, runs locally.',
    tagline_ar: 'مفتوح المصدر، تحكم كامل، يعمل محلياً.',
    color: '#18BCF2',
    accent: '#0F172A',
    brandPatterns: ['sonoff', 'ewelink', 'aqara', 'tuya', 'zigbee', 'zwave', 'shelly'],
    strengths: ['Local control', 'Works offline', 'Unifies every brand', 'Powerful automations'],
    strengths_ar: ['تحكم محلي', 'يعمل بدون إنترنت', 'يدمج كل العلامات', 'أتمتة قوية'],
  },
  {
    id: 'alexa',
    name: 'Amazon Alexa',
    tagline: 'Voice-first. Huge skill ecosystem.',
    tagline_ar: 'يعتمد على الصوت. مكتبة مهارات ضخمة.',
    color: '#00CAFF',
    accent: '#1B1F3B',
    brandPatterns: ['echo', 'amazon', 'alexa', 'ring', 'philips'],
    strengths: ['Best voice control', 'Routines & flash briefings', 'Multi-room audio', 'Drop-in & intercom'],
    strengths_ar: ['أفضل تحكم صوتي', 'روتينات وأخبار', 'صوت متعدد الغرف', 'اتصال داخلي'],
  },
  {
    id: 'google-home',
    name: 'Google Home',
    tagline: 'Clean, smart, deeply tied to Google.',
    tagline_ar: 'بسيط وذكي ومرتبط بجوجل.',
    color: '#4285F4',
    accent: '#202124',
    brandPatterns: ['nest', 'google', 'chromecast'],
    strengths: ['Beautiful UI', 'Nest cameras & thermostats', 'YouTube & Chromecast', 'Smart suggestions'],
    strengths_ar: ['واجهة جميلة', 'كاميرات وثرموستات Nest', 'يوتيوب وكروم كاست', 'اقتراحات ذكية'],
  },
  {
    id: 'ewelink',
    name: 'eWeLink',
    tagline: 'The Sonoff family. Affordable Wi-Fi devices.',
    tagline_ar: 'عائلة Sonoff. أجهزة واي فاي اقتصادية.',
    color: '#1E88E5',
    accent: '#0B1220',
    brandPatterns: ['ewelink', 'sonoff'],
    strengths: ['Cheapest entry', 'Wi-Fi switches & relays', 'Simple scenes', 'LAN mode'],
    strengths_ar: ['أرخص بداية', 'مفاتيح ومرحلات واي فاي', 'مشاهد بسيطة', 'وضع LAN'],
  },
  {
    id: 'tuya',
    name: 'Tuya Smart',
    tagline: 'Massive catalog, white-label everything.',
    tagline_ar: 'كتالوج ضخم، يدعم كل العلامات.',
    color: '#FF4800',
    accent: '#1A1A1A',
    brandPatterns: ['tuya', 'moes', 'smart life'],
    strengths: ['Widest device support', 'Zigbee + Wi-Fi', 'Energy monitoring', 'Cheap hardware'],
    strengths_ar: ['أوسع دعم للأجهزة', 'زيجبي + واي فاي', 'مراقبة الطاقة', 'أجهزة اقتصادية'],
  },
  {
    id: 'aqara',
    name: 'Aqara Home',
    tagline: 'Premium Zigbee 3.0. Apple HomeKit lover.',
    tagline_ar: 'زيجبي 3.0 مميز. صديق Apple HomeKit.',
    color: '#7BC242',
    accent: '#0E1A0B',
    brandPatterns: ['aqara', 'xiaomi', 'mi home'],
    strengths: ['Best battery sensors', 'Beautiful hardware', 'HomeKit native', 'Matter ready'],
    strengths_ar: ['أفضل حساسات بطارية', 'تصميم أنيق', 'متوافق HomeKit', 'يدعم Matter'],
  },
];

export default function AppSimulator() {
  const { isRTL } = useLanguage();
  const [active, setActive] = useState<Ecosystem>(ECOSYSTEMS[0]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const orFilter = active.brandPatterns
        .map((p) => `brand.ilike.%${p}%,name.ilike.%${p}%`)
        .join(',');
      const { data } = await supabase
        .from('products')
        .select('id, name, slug, price, image_url, brand')
        .or(orFilter)
        .limit(8);
      if (!cancelled) setProducts(data ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [active.id]);

  return (
    <Layout>
      <Helmet>
        <title>Smart Home App Simulator — Compare Home Assistant, Alexa, Google Home & more</title>
        <meta name="description" content="Try the look and feel of Home Assistant, Alexa, Google Home, eWeLink, Tuya, and Aqara apps side-by-side, then see which products work with each." />
      </Helmet>

      <section className="pt-28 pb-12 bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="outline" className="mb-4">{isRTL ? 'محاكي التطبيقات' : 'App Simulator'}</Badge>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              {isRTL ? 'جرّب كل تطبيق منزل ذكي قبل ما تختار' : 'Try every smart home app before you commit'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {isRTL
                ? 'تصفّح محاكاة حقيقية لـ Home Assistant و Alexa و Google Home و eWeLink و Tuya و Aqara، وشوف المنتجات اللي بتشتغل مع كل واحد.'
                : 'Explore realistic simulations of Home Assistant, Alexa, Google Home, eWeLink, Tuya, and Aqara — and see the products that work with each.'}
            </p>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="container px-4">
          {/* Ecosystem picker */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {ECOSYSTEMS.map((e) => (
              <button
                key={e.id}
                onClick={() => setActive(e)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium border transition-all',
                  active.id === e.id
                    ? 'text-white border-transparent shadow-lg scale-105'
                    : 'bg-card text-foreground border-border hover:bg-muted'
                )}
                style={active.id === e.id ? { backgroundColor: e.color } : undefined}
              >
                {e.name}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-[420px_1fr] gap-10 items-start">
            {/* Phone mockup */}
            <div className="flex justify-center">
              <PhoneFrame>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                    className="h-full w-full"
                  >
                    {renderAppUI(active)}
                  </motion.div>
                </AnimatePresence>
              </PhoneFrame>
            </div>

            {/* Info + products */}
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: active.color }}
                  />
                  <h2 className="text-3xl font-display font-bold">{active.name}</h2>
                </div>
                <p className="text-muted-foreground text-lg mb-6">
                  {isRTL ? active.tagline_ar : active.tagline}
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(isRTL ? active.strengths_ar : active.strengths).map((s) => (
                    <div key={s} className="flex items-center gap-2 text-sm">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: active.color }}
                      />
                      {s}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4">
                  {isRTL ? 'منتجات تشتغل مع ' : 'Products that work with '}
                  <span style={{ color: active.color }}>{active.name}</span>
                </h3>
                {loading ? (
                  <div className="text-muted-foreground text-sm">{isRTL ? 'جارٍ التحميل...' : 'Loading...'}</div>
                ) : products.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">
                    {isRTL ? 'لا توجد منتجات متاحة حالياً.' : 'No matching products yet.'}{' '}
                    <Link to="/products" className="text-primary underline">
                      {isRTL ? 'تصفح كل المنتجات' : 'Browse all products'}
                    </Link>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {products.map((p) => (
                      <Link
                        key={p.id}
                        to={`/products/${p.slug}`}
                        className="group rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all"
                      >
                        <div className="aspect-square bg-muted overflow-hidden">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Home className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-xs font-medium line-clamp-2 mb-1">{p.name}</p>
                          <p className="text-sm font-bold" style={{ color: active.color }}>
                            {p.price ? `${Number(p.price).toLocaleString()} EGP` : '—'}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                <div className="mt-6">
                  <Button asChild>
                    <Link to="/ai-consultant">
                      {isRTL ? 'مش عارف تختار؟ كلّم المستشار الذكي' : 'Not sure? Ask the AI consultant'}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

/* ---------- Phone frame ---------- */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-[320px] h-[640px] rounded-[44px] bg-zinc-900 p-3 shadow-2xl border border-zinc-800">
      <div className="absolute left-1/2 -translate-x-1/2 top-2 w-28 h-6 bg-zinc-900 rounded-b-2xl z-20" />
      <div className="w-full h-full rounded-[34px] overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}

/* ---------- Per-app UIs ---------- */
function renderAppUI(e: Ecosystem) {
  switch (e.id) {
    case 'home-assistant': return <HomeAssistantUI />;
    case 'alexa': return <AlexaUI />;
    case 'google-home': return <GoogleHomeUI />;
    case 'ewelink': return <EWeLinkUI />;
    case 'tuya': return <TuyaUI />;
    case 'aqara': return <AqaraUI />;
    default: return null;
  }
}

function StatusBar({ dark = true }: { dark?: boolean }) {
  return (
    <div className={cn('flex justify-between items-center px-6 pt-3 pb-1 text-[11px] font-semibold', dark ? 'text-white' : 'text-zinc-900')}>
      <span>9:41</span>
      <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /><span className="w-5 h-2.5 border rounded-sm" /></span>
    </div>
  );
}

function HomeAssistantUI() {
  const initial = [
    { icon: Lightbulb, name: 'Living Lights', state: 'On · 80%', on: true, color: '#FFC247' },
    { icon: Thermometer, name: 'Climate', state: '24°C', on: true, color: '#18BCF2' },
    { icon: Lock, name: 'Front Door', state: 'Locked', on: true, color: '#22C55E' },
    { icon: Camera, name: 'Cam Garage', state: 'Live', on: true, color: '#F43F5E' },
    { icon: Plug, name: 'TV Plug', state: 'On · 38W', on: true, color: '#A855F7' },
    { icon: Power, name: 'AC Bedroom', state: 'Off', on: false, color: '#64748B' },
  ];
  const [tiles, setTiles] = useState(initial);
  const toggle = (i: number) =>
    setTiles((prev) => prev.map((t, idx) => idx === i
      ? { ...t, on: !t.on, state: !t.on ? (t.name.includes('Lights') ? 'On · 80%' : t.name.includes('Climate') ? '24°C' : t.name.includes('Door') ? 'Locked' : t.name.includes('Cam') ? 'Live' : t.name.includes('Plug') ? 'On · 38W' : 'On') : 'Off' }
      : t));
  return (
    <div className="h-full w-full bg-[#0B1220] text-white">
      <StatusBar />
      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-400">Welcome home</p>
          <h2 className="text-xl font-bold">Living Room</h2>
        </div>
        <Settings className="w-5 h-5 text-zinc-400" />
      </div>
      <div className="px-4 grid grid-cols-2 gap-3">
        {tiles.map((t, i) => (
          <button
            key={t.name}
            onClick={() => toggle(i)}
            className={cn('text-left rounded-2xl p-3 border transition-all active:scale-95', t.on ? 'bg-white/10 border-white/10' : 'bg-white/5 border-white/5')}
          >
            <t.icon className="w-5 h-5 mb-2" style={{ color: t.on ? t.color : '#64748B' }} />
            <p className="text-xs font-semibold">{t.name}</p>
            <p className="text-[10px] text-zinc-400">{t.state}</p>
          </button>
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-[#0F172A] border-t border-white/5 flex justify-around py-3 text-[10px]">
        <span className="text-[#18BCF2]">Overview</span>
        <span className="text-zinc-500">Energy</span>
        <span className="text-zinc-500">Logbook</span>
        <span className="text-zinc-500">Settings</span>
      </div>
    </div>
  );
}

function AlexaUI() {
  const [listening, setListening] = useState(false);
  const [routines, setRoutines] = useState([
    { icon: Sun, label: 'Morning Routine', sub: 'Lights + News + Coffee', active: false },
    { icon: Moon, label: 'Goodnight', sub: 'Lock doors, dim lights', active: false },
    { icon: Volume2, label: 'Play Quran', sub: 'Echo Living Room', active: false },
  ]);
  return (
    <div className="h-full w-full bg-gradient-to-b from-[#0E1F2F] to-[#0B1220] text-white">
      <StatusBar />
      <div className="px-4 pt-2 pb-3">
        <p className="text-xs text-cyan-400">Good evening, Ahmed</p>
        <h2 className="text-xl font-bold">Alexa</h2>
      </div>
      <div className="px-6 flex justify-center my-4">
        <button
          onClick={() => setListening((v) => !v)}
          className={cn(
            'w-40 h-40 rounded-full bg-gradient-to-br from-[#00CAFF] to-[#1A6CE0] flex items-center justify-center transition-all active:scale-95',
            listening ? 'shadow-[0_0_80px_rgba(0,202,255,0.8)] animate-pulse' : 'shadow-[0_0_60px_rgba(0,202,255,0.4)]'
          )}
        >
          <Mic className="w-12 h-12 text-white" />
        </button>
      </div>
      <p className="text-center text-xs text-zinc-400 mb-4">
        {listening ? 'Listening… "Alexa, goodnight"' : 'Tap to speak · "Alexa, goodnight"'}
      </p>
      <div className="px-4 space-y-2">
        {routines.map((r, i) => (
          <button
            key={r.label}
            onClick={() => setRoutines((prev) => prev.map((x, idx) => idx === i ? { ...x, active: !x.active } : x))}
            className={cn(
              'w-full flex items-center gap-3 rounded-xl p-3 transition-all active:scale-[0.98]',
              r.active ? 'bg-[#00CAFF]/25 border border-[#00CAFF]/50' : 'bg-white/5 border border-transparent'
            )}
          >
            <div className={cn('w-9 h-9 rounded-full flex items-center justify-center', r.active ? 'bg-[#00CAFF]' : 'bg-[#00CAFF]/20')}>
              <r.icon className={cn('w-4 h-4', r.active ? 'text-white' : 'text-[#00CAFF]')} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold">{r.label}</p>
              <p className="text-[10px] text-zinc-400">{r.active ? 'Running…' : r.sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </button>
        ))}
      </div>
    </div>
  );
}

function GoogleHomeUI() {
  const chipsInit = [
    { icon: Lightbulb, label: 'Lights', color: '#FBBC04' },
    { icon: Thermometer, label: 'Climate', color: '#34A853' },
    { icon: Camera, label: 'Cameras', color: '#EA4335' },
    { icon: Tv, label: 'TV', color: '#4285F4' },
  ];
  const [selected, setSelected] = useState<string | null>(null);
  const [favs, setFavs] = useState([
    { name: 'Nest Thermostat', state: '23°C · Cooling', icon: Thermometer, on: true },
    { name: 'Living Room Cam', state: 'Recording', icon: Camera, on: true },
  ]);
  return (
    <div className="h-full w-full bg-white text-zinc-900">
      <StatusBar dark={false} />
      <div className="px-4 pt-2 pb-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">Home</p>
          <h2 className="text-xl font-bold">My House</h2>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#4285F4] flex items-center justify-center text-white text-xs font-bold">A</div>
      </div>
      <div className="px-4 grid grid-cols-2 gap-3 mb-4">
        {chipsInit.map((c) => (
          <button
            key={c.label}
            onClick={() => setSelected((s) => s === c.label ? null : c.label)}
            className={cn('text-left rounded-2xl p-4 transition-all active:scale-95', selected === c.label ? 'ring-2 ring-offset-2' : 'bg-zinc-100')}
            style={selected === c.label ? { backgroundColor: `${c.color}15`, boxShadow: `0 0 0 2px ${c.color}` } : undefined}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: `${c.color}22` }}>
              <c.icon className="w-5 h-5" style={{ color: c.color }} />
            </div>
            <p className="text-sm font-semibold">{c.label}</p>
            <p className="text-[10px] text-zinc-500">{selected === c.label ? 'All on' : '3 devices'}</p>
          </button>
        ))}
      </div>
      <div className="px-4">
        <p className="text-xs font-semibold text-zinc-500 mb-2">FAVORITES</p>
        <div className="space-y-2">
          {favs.map((d, i) => (
            <button
              key={d.name}
              onClick={() => setFavs((p) => p.map((x, idx) => idx === i ? { ...x, on: !x.on } : x))}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-50 border border-zinc-100 active:scale-[0.98] transition-all"
            >
              <d.icon className="w-5 h-5 text-[#4285F4]" />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">{d.name}</p>
                <p className="text-[10px] text-zinc-500">{d.on ? d.state : 'Off'}</p>
              </div>
              <div className={cn('w-8 h-5 rounded-full relative transition-colors', d.on ? 'bg-[#4285F4]' : 'bg-zinc-300')}>
                <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all', d.on ? 'right-0.5' : 'left-0.5')} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EWeLinkUI() {
  const initial = [
    { name: 'Sonoff Mini R3', state: 'On', icon: Power, on: true },
    { name: 'Wall Switch 2CH', state: 'Off', icon: Lightbulb, on: false },
    { name: 'TH16 Sensor', state: '26°C · 55%', icon: Thermometer, on: true },
    { name: 'Smart Plug S31', state: 'On · 12W', icon: Plug, on: true },
  ];
  const [devices, setDevices] = useState(initial);
  const [tab, setTab] = useState('All');
  return (
    <div className="h-full w-full bg-gradient-to-b from-[#1E88E5] to-[#0B5BB5] text-white">
      <StatusBar />
      <div className="px-4 pt-2 pb-3">
        <h2 className="text-xl font-bold">All Devices</h2>
        <p className="text-xs text-blue-100">8 online · 1 offline</p>
      </div>
      <div className="bg-white rounded-t-3xl h-full p-4 text-zinc-900 -mt-1">
        <div className="flex gap-2 mb-4 text-xs">
          {['All', 'Living', 'Bedroom', 'Kitchen'].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn('px-3 py-1 rounded-full transition-all active:scale-95', tab === t ? 'bg-[#1E88E5] text-white' : 'bg-zinc-100 text-zinc-600')}>{t}</button>
          ))}
        </div>
        <div className="space-y-2">
          {devices.map((d, i) => (
            <button
              key={d.name}
              onClick={() => setDevices((p) => p.map((x, idx) => idx === i ? { ...x, on: !x.on, state: !x.on ? (x.name.includes('TH16') ? '26°C · 55%' : x.name.includes('Plug') ? 'On · 12W' : 'On') : 'Off' } : x))}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-100 active:scale-[0.98] transition-all"
            >
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', d.on ? 'bg-[#1E88E5]/10' : 'bg-zinc-100')}>
                <d.icon className={cn('w-5 h-5', d.on ? 'text-[#1E88E5]' : 'text-zinc-400')} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">{d.name}</p>
                <p className="text-[10px] text-zinc-500">{d.state}</p>
              </div>
              <div className={cn('w-9 h-5 rounded-full relative', d.on ? 'bg-[#1E88E5]' : 'bg-zinc-300')}>
                <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all', d.on ? 'right-0.5' : 'left-0.5')} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TuyaUI() {
  const [devices, setDevices] = useState([
    { icon: Lightbulb, name: 'Ceiling Light', on: true },
    { icon: Plug, name: 'Smart Socket', on: true },
    { icon: Camera, name: 'Indoor Cam', on: true },
    { icon: Thermometer, name: 'Floor Heater', on: false },
  ]);
  return (
    <div className="h-full w-full bg-gradient-to-b from-[#FF4800] via-[#FF6A2A] to-white text-white">
      <StatusBar />
      <div className="px-4 pt-2 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-90">My Home</p>
          <h2 className="text-xl font-bold">Smart Life</h2>
        </div>
        <Plus className="w-5 h-5" />
      </div>
      <div className="px-4 grid grid-cols-3 gap-3 mb-4">
        {[
          { icon: Cloud, label: '26°C' },
          { icon: Sun, label: 'Clear' },
          { icon: Wifi, label: 'AQI 38' },
        ].map((s) => (
          <div key={s.label} className="bg-white/20 backdrop-blur-md rounded-2xl p-3 text-center">
            <s.icon className="w-5 h-5 mx-auto mb-1" />
            <p className="text-[11px] font-semibold">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-t-3xl flex-1 p-4 text-zinc-900">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-bold">My Devices</p>
          <span className="text-[10px] text-zinc-500">{devices.filter((d) => d.on).length} on · {devices.length} total</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {devices.map((d, i) => (
            <button
              key={d.name}
              onClick={() => setDevices((p) => p.map((x, idx) => idx === i ? { ...x, on: !x.on } : x))}
              className="text-left rounded-2xl border border-zinc-100 p-3 active:scale-95 transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <d.icon className={cn('w-5 h-5', d.on ? 'text-[#FF4800]' : 'text-zinc-400')} />
                <div className={cn('w-7 h-4 rounded-full relative', d.on ? 'bg-[#FF4800]' : 'bg-zinc-300')}>
                  <div className={cn('absolute top-0.5 w-3 h-3 bg-white rounded-full', d.on ? 'right-0.5' : 'left-0.5')} />
                </div>
              </div>
              <p className="text-[11px] font-semibold">{d.name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AqaraUI() {
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const scenes = [
    { icon: Sun, name: 'Good Morning' },
    { icon: Moon, name: 'Sleep' },
    { icon: Home, name: 'Arrive Home' },
    { icon: Lock, name: 'Leave Home' },
  ];
  return (
    <div className="h-full w-full bg-[#0E1A0B] text-white">
      <StatusBar />
      <div className="px-4 pt-2 pb-3">
        <p className="text-xs text-[#7BC242]">Home · All rooms</p>
        <h2 className="text-xl font-bold">Aqara Home</h2>
      </div>
      <div className="px-4 mb-4">
        <div className="rounded-3xl p-4 bg-gradient-to-br from-[#7BC242]/30 to-[#23311A] border border-white/5">
          <p className="text-[10px] text-zinc-300 mb-1">Living Room · Hub M3</p>
          <p className="text-3xl font-bold">24.5°<span className="text-base text-zinc-400">C</span></p>
          <div className="flex gap-3 mt-2 text-[10px] text-zinc-300">
            <span>💧 52%</span><span>🌫️ AQI 42</span><span>🔋 92%</span>
          </div>
        </div>
      </div>
      <div className="px-4">
        <p className="text-xs text-zinc-500 mb-2">SCENES {activeScene && <span className="text-[#7BC242]">· {activeScene} active</span>}</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {scenes.map((s) => (
            <button
              key={s.name}
              onClick={() => setActiveScene((cur) => cur === s.name ? null : s.name)}
              className={cn('text-left rounded-2xl border p-3 flex items-center gap-2 transition-all active:scale-95',
                activeScene === s.name ? 'bg-[#7BC242]/25 border-[#7BC242]/60' : 'bg-white/5 border-white/5')}
            >
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', activeScene === s.name ? 'bg-[#7BC242]' : 'bg-[#7BC242]/20')}>
                <s.icon className={cn('w-4 h-4', activeScene === s.name ? 'text-white' : 'text-[#7BC242]')} />
              </div>
              <p className="text-xs font-semibold">{s.name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}