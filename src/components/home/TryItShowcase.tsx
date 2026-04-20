import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Moon, Sun, Film, ShieldCheck, Play } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

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
  const { isRTL } = useLanguage();
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = SCENES.find(s => s.id === activeId);

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
              ? 'بضغطة واحدة، البيت بأكمله يستجيب — اختر مشهد وشوف الأتمتة الحقيقية'
              : 'One tap, whole house responds — pick a scene and watch real automation in action'}
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
                  style={{ background: `linear-gradient(135deg, hsl(${active.accent} / 0.4), hsl(0 0% 0% / 0.6))` }}
                />
                <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-end">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-md"
                      style={{ background: `hsl(${active.accent} / 0.3)`, color: '#fff' }}
                    >
                      <active.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-display text-2xl md:text-3xl font-bold text-white">
                        {isRTL ? active.nameAr : active.nameEn}
                      </h3>
                      <p className="text-white/80 text-sm">{isRTL ? active.taglineAr : active.taglineEn}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {active.actions.map((a, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.12 }}
                        className="bg-black/40 backdrop-blur-md rounded-xl px-3 py-2 text-white text-xs md:text-sm border border-white/10"
                      >
                        {isRTL ? a.ar : a.en}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
