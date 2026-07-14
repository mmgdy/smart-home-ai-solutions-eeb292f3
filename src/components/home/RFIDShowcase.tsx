import { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Wand2, Radio, Sparkles, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import rfidKeyless from '@/assets/rfid-keyless.jpg';
import rfidScene from '@/assets/rfid-scene.jpg';
import rfidTags from '@/assets/rfid-tags.jpg';

type Case = {
  id: 'keyless' | 'scene';
  eyebrow: string;
  eyebrowAr: string;
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  body: string;
  bodyAr: string;
  image: string;
  Icon: typeof KeyRound;
  moments: { en: string; ar: string }[];
};

const CASES: Case[] = [
  {
    id: 'keyless',
    eyebrow: 'Chapter I',
    eyebrowAr: 'الفصل الأول',
    title: 'The door remembers you.',
    titleAr: 'الباب يعرفك.',
    subtitle: 'Keyless entry, quietly',
    subtitleAr: 'دخول بدون مفتاح، بهدوء',
    body: 'A single tap of a matte black card unlocks the front door. Guests get their own moment — issued in seconds, revoked in one.',
    bodyAr: 'لمسة واحدة من كارت أنيق تفتح باب البيت. كل ضيف له لحظته الخاصة — يُعطى في ثواني ويُلغى بضغطة.',
    image: rfidKeyless,
    Icon: KeyRound,
    moments: [
      { en: 'Family fobs, no fumbling for keys', ar: 'فوب للعائلة، بدون بحث عن مفاتيح' },
      { en: 'One-time guest cards for the housekeeper', ar: 'كروت لمرة واحدة لعاملة المنزل' },
      { en: 'Auto-log of every entry, discreetly', ar: 'سجل تلقائي لكل دخول، بسرية' },
    ],
  },
  {
    id: 'scene',
    eyebrow: 'Chapter II',
    eyebrowAr: 'الفصل الثاني',
    title: 'A tag becomes a mood.',
    titleAr: 'تاج صغير يتحول لمشهد.',
    subtitle: 'Scenes on touch',
    subtitleAr: 'مشاهد بلمسة',
    body: 'Place a brass RFID coin on the console table. Tap once for Movie. Twice for Dinner. Long-press for Away — lights dim, curtains close, house exhales.',
    bodyAr: 'حط تاج نحاسي على الترابيزة. لمسة تشغل مشهد "سينما"، اتنين لـ"عشاء"، وضغطة طويلة لـ"خارج المنزل" — الإضاءة تخفت والستائر تنزل والبيت يهدأ.',
    image: rfidScene,
    Icon: Wand2,
    moments: [
      { en: 'Movie mode — one tap on the coffee table', ar: 'وضع السينما — لمسة على ترابيزة القهوة' },
      { en: 'Sleep scene — brush the nightstand', ar: 'مشهد النوم — لمسة على كومودينو السرير' },
      { en: 'Away scene — tap on the way out', ar: 'مشهد المغادرة — لمسة قبل الخروج' },
    ],
  },
];

export function RFIDShowcase() {
  const { isRTL } = useLanguage();
  const [active, setActive] = useState<Case['id']>('keyless');
  const current = CASES.find((c) => c.id === active)!;

  return (
    <section
      className="relative overflow-hidden py-24 md:py-32"
      style={{
        background:
          'radial-gradient(1200px 600px at 15% 10%, hsl(156 65% 12% / 0.9), transparent 60%), radial-gradient(900px 500px at 85% 90%, hsl(44 55% 20% / 0.35), transparent 55%), hsl(var(--background))',
      }}
    >
      {/* Grain overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.9'/></svg>\")",
        }}
      />

      {/* Gold marquee ticker at the top */}
      <div className="relative border-y border-[hsl(var(--gold)/0.25)] bg-[hsl(var(--emerald-deep)/0.4)] backdrop-blur-sm mb-16 md:mb-24 -mx-4">
        <div className="flex overflow-hidden">
          <div className="animate-marquee flex whitespace-nowrap py-3 text-[hsl(var(--gold-soft))]/80 font-serif-italic text-lg md:text-xl">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-8 px-6">
                {[
                  isRTL ? 'لمسة تفتح الباب' : 'A tap opens the door',
                  '·',
                  isRTL ? 'تاج يبدأ مشهد' : 'A tag begins a scene',
                  '·',
                  isRTL ? 'بدون تطبيق، بدون كلمة' : 'No app, no words',
                  '·',
                  isRTL ? 'الإيماءة هي الواجهة' : 'The gesture is the interface',
                  '·',
                ].map((t, j) => (
                  <span key={j} className="text-xl md:text-2xl">{t}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container relative z-10 px-4 md:px-8">
        {/* Broken-grid header */}
        <div className="grid grid-cols-12 gap-4 md:gap-6 mb-16 md:mb-24">
          <div className="col-span-12 md:col-span-3 md:pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-[hsl(var(--gold)/0.6)]" />
              <span className="text-[hsl(var(--gold))] uppercase tracking-[0.3em] text-[10px] md:text-xs">
                {isRTL ? 'مجموعة RFID' : 'The RFID Collection'}
              </span>
            </div>
            <p className="font-serif-italic text-foreground/60 leading-relaxed text-sm md:text-base">
              {isRTL
                ? 'الذكاء اللي ما يحتاجش شاشة. لمسة صغيرة، وبيتك يفهم.'
                : 'The kind of intelligence that needs no screen. A small gesture, and the house understands.'}
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="col-span-12 md:col-span-9 md:-mt-4"
          >
            <h2 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[7.5rem] leading-[0.95] tracking-tight">
              <span className="block text-foreground">
                {isRTL ? 'اللمسة' : 'The touch'}
              </span>
              <span className="block font-serif-italic text-[hsl(var(--gold))] md:pl-24 lg:pl-40">
                {isRTL ? 'قبل الكلمة.' : 'before the word.'}
              </span>
            </h2>
          </motion.div>
        </div>

        {/* Broken grid main composition */}
        <div className="grid grid-cols-12 gap-4 md:gap-6 relative">
          {/* Big image — offset */}
          <motion.div
            key={current.id + '-img'}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="col-span-12 md:col-span-7 md:col-start-1 relative"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm ring-1 ring-[hsl(var(--gold)/0.2)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
              <img
                src={current.image}
                alt={current.title}
                loading="lazy"
                width={1280}
                height={1600}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent" />

              {/* Animated RFID pulse hotspot */}
              <div className={cn(
                'absolute',
                current.id === 'keyless' ? 'top-[46%] right-[16%]' : 'bottom-[22%] left-[38%]'
              )}>
                <div className="relative">
                  <span className="absolute inset-0 rounded-full bg-[hsl(var(--gold)/0.5)] animate-rfid-ping" style={{ animationDelay: '0s' }} />
                  <span className="absolute inset-0 rounded-full bg-[hsl(var(--gold)/0.4)] animate-rfid-ping" style={{ animationDelay: '0.7s' }} />
                  <span className="absolute inset-0 rounded-full bg-[hsl(var(--gold)/0.3)] animate-rfid-ping" style={{ animationDelay: '1.4s' }} />
                  <span className="relative flex h-4 w-4 rounded-full bg-[hsl(var(--gold))] shadow-[0_0_20px_hsl(var(--gold)/0.9)]" />
                </div>
              </div>

              {/* Corner caption */}
              <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 text-[hsl(var(--gold-soft))]">
                <div className="text-[10px] uppercase tracking-[0.3em] opacity-70">
                  {isRTL ? current.eyebrowAr : current.eyebrow}
                </div>
                <div className="font-serif-italic text-xl md:text-2xl mt-1">
                  {isRTL ? current.subtitleAr : current.subtitle}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Small tags image — overlap */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="hidden md:block md:col-span-4 md:col-start-8 md:row-start-1 md:-mt-16 md:ml-[-4rem] relative z-10"
          >
            <div className="aspect-square overflow-hidden rounded-sm ring-1 ring-[hsl(var(--gold)/0.3)] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
              <img
                src={rfidTags}
                alt="RFID tags"
                loading="lazy"
                width={1280}
                height={1280}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-[hsl(var(--gold)/0.3)]" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--gold))]">
                {isRTL ? 'كارت · فوب · تاج' : 'Card · Fob · Coin'}
              </span>
            </div>
          </motion.div>

          {/* Text column */}
          <motion.div
            key={current.id + '-copy'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="col-span-12 md:col-span-5 md:col-start-8 md:mt-8"
          >
            <div className="border-l-2 border-[hsl(var(--gold)/0.5)] pl-6 md:pl-8">
              <span className="text-[hsl(var(--gold))] uppercase tracking-[0.3em] text-[10px] block mb-4">
                {isRTL ? current.eyebrowAr : current.eyebrow}
              </span>
              <h3 className="font-display text-3xl md:text-4xl lg:text-5xl leading-[1.05] mb-6 text-foreground">
                {isRTL ? current.titleAr : current.title}
              </h3>
              <p className="text-foreground/75 leading-relaxed text-base md:text-lg mb-8 font-light">
                {isRTL ? current.bodyAr : current.body}
              </p>

              <ul className="space-y-4 mb-10">
                {current.moments.map((m, i) => (
                  <motion.li
                    key={m.en}
                    initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.12, duration: 0.5 }}
                    className="flex items-start gap-4"
                  >
                    <span className="mt-1.5 flex-shrink-0 relative">
                      <span className="block h-2 w-2 rounded-full bg-[hsl(var(--gold))]" />
                      <span className="absolute inset-0 h-2 w-2 rounded-full bg-[hsl(var(--gold))] animate-ping opacity-40" />
                    </span>
                    <span className="text-foreground/85 font-light leading-relaxed">
                      {isRTL ? m.ar : m.en}
                    </span>
                  </motion.li>
                ))}
              </ul>

              <Link
                to="/products?q=RFID"
                className="group inline-flex items-center gap-3 border-b border-[hsl(var(--gold)/0.6)] pb-2 text-[hsl(var(--gold))] hover:text-[hsl(var(--gold-soft))] transition-colors"
              >
                <span className="font-serif-italic text-lg">
                  {isRTL ? 'شوف المجموعة' : 'See the collection'}
                </span>
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Chapter switcher — bottom */}
        <div className="mt-20 md:mt-28 grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 md:col-span-3 flex items-center gap-3">
            <Radio className="h-4 w-4 text-[hsl(var(--gold))]" />
            <span className="text-[hsl(var(--gold))] uppercase tracking-[0.3em] text-[10px]">
              {isRTL ? 'الفصول' : 'Chapters'}
            </span>
          </div>
          <div className="col-span-12 md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {CASES.map((c) => {
              const isActive = c.id === active;
              return (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  className={cn(
                    'group relative text-left p-6 md:p-8 rounded-sm border transition-all duration-500 overflow-hidden',
                    isActive
                      ? 'border-[hsl(var(--gold))] bg-[hsl(var(--emerald-deep)/0.6)]'
                      : 'border-[hsl(var(--gold)/0.15)] bg-[hsl(var(--card)/0.4)] hover:border-[hsl(var(--gold)/0.5)]'
                  )}
                >
                  {/* animated shimmer bar */}
                  {isActive && (
                    <motion.div
                      layoutId="rfid-active-bar"
                      className="absolute top-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[hsl(var(--gold))] to-transparent"
                    />
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <c.Icon className={cn('h-5 w-5', isActive ? 'text-[hsl(var(--gold))]' : 'text-foreground/40')} />
                        <span className={cn(
                          'uppercase tracking-[0.25em] text-[10px]',
                          isActive ? 'text-[hsl(var(--gold))]' : 'text-foreground/40'
                        )}>
                          {isRTL ? c.eyebrowAr : c.eyebrow}
                        </span>
                      </div>
                      <h4 className={cn(
                        'font-display text-2xl md:text-3xl leading-tight transition-colors',
                        isActive ? 'text-foreground' : 'text-foreground/60'
                      )}>
                        {isRTL ? c.subtitleAr : c.subtitle}
                      </h4>
                    </div>
                    <Sparkles className={cn(
                      'h-4 w-4 flex-shrink-0 transition-opacity',
                      isActive ? 'text-[hsl(var(--gold))] opacity-100' : 'opacity-0 group-hover:opacity-40'
                    )} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
