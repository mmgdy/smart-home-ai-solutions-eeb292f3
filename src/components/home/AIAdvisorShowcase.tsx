import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, Sparkles } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useMotionPreferences } from '@/hooks/useMotionPreferences';
import { GlowBorderCard } from '@/components/vengeance/GlowBorderCard';
import { AnimatedButton } from '@/components/vengeance/AnimatedButton';

export function AIAdvisorShowcase() {
  const { isRTL } = useLanguage();
  const { reducedMotion } = useMotionPreferences();

  const exampleFlow = [
    {
      type: 'question',
      textEn: 'I have a 3-bedroom apartment in Cairo. I want to control lights, save electricity, and add security cameras.',
      textAr: 'عندي شقة ٣ غرف في القاهرة. عايز أتحكم في الإضاءة وأوفر كهرباء وأضيف كاميرات أمان.',
    },
    {
      type: 'answer',
      textEn: 'Based on your apartment, I recommend:\n\n🔆 12x SONOFF MINIR4 Switches — 11,880 EGP\n📷 2x Smart Security Cameras — 3,330 EGP\n⚡ Smart Energy Meter — 1,680 EGP\n🏠 Zigbee Bridge Pro — 1,500 EGP\n\nTotal: 18,390 EGP + certified installation & 1-year warranty!',
      textAr: 'بناءً على شقتك، أنصحك بـ:\n\n🔆 ١٢ مفتاح ذكي SONOFF MINIR4 — ١١,٨٨٠ ج.م\n📷 ٢ كاميرا مراقبة ذكية — ٣,٣٣٠ ج.م\n⚡ عداد طاقة ذكي — ١,٦٨٠ ج.م\n🏠 هاب Zigbee Pro — ١,٥٠٠ ج.م\n\nالإجمالي: ١٨,٣٩٠ ج.م + خيار التركيب المعتمد وضمان لمدة سنة!',
    },
  ];

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[78vw] h-[78vw] max-w-[900px] max-h-[900px] rounded-full border border-primary/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[48vw] h-[48vw] max-w-[560px] max-h-[560px] rounded-full border border-accent/10" />
        <motion.div
          className="azka-ambient-orb absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-primary/15 blur-3xl"
          animate={reducedMotion ? undefined : { scale: [1, 1.15, 1], opacity: [0.25, 0.45, 0.25] }}
          transition={reducedMotion ? undefined : { duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="azka-ambient-orb absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-accent/15 blur-3xl"
          animate={reducedMotion ? undefined : { scale: [1.15, 1, 1.15], opacity: [0.3, 0.5, 0.3] }}
          transition={reducedMotion ? undefined : { duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="container relative z-10 px-6 md:px-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Content */}
          <div>
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 mb-6"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">
                {isRTL ? 'الأول من نوعه في مصر' : 'First of its kind in Egypt'}
              </span>
            </motion.div>

            <motion.h2
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: reducedMotion ? 0 : 0.08 }}
              className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6"
            >
              {isRTL ? 'المستشار الذكي يبني لك خطة كاملة' : 'AI Advisor Builds Your Complete Plan'}
            </motion.h2>

            <motion.p
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: reducedMotion ? 0 : 0.14 }}
              className="text-muted-foreground text-base sm:text-lg mb-6 leading-relaxed"
            >
              {isRTL
                ? 'مش محتاج تفهم في التكنولوجيا. قول للمستشار الذكي عايز إيه وهو هيعملك خطة كاملة بالمنتجات والأسعار.'
                : "No technical knowledge needed. Tell the AI what you want and it'll create a complete plan with products and prices."}
            </motion.p>

            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: reducedMotion ? 0 : 0.2 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Link to="/ai-consultant">
                <AnimatedButton className="h-12 px-7">
                  <Bot className="h-4 w-4 shrink-0" />
                  <span>{isRTL ? 'ابدأ المستشار الذكي' : 'Start AI Advisor'}</span>
                  <ArrowRight
                    className={cn(
                      'h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1',
                      isRTL && 'rotate-180 group-hover:-translate-x-1',
                    )}
                  />
                </AnimatedButton>
              </Link>
            </motion.div>
          </div>

          {/* Right - Vengeance GlowBorderCard Chat Mockup */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: reducedMotion ? 0 : 0.15 }}
          >
            <GlowBorderCard colorPreset="azka" animationDuration={7} borderWidth="0.3rem" blurAmount="0.7rem" inset="-0.25rem">
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/70">
                  <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-lg shadow-primary/30">
                    <Bot className="h-4 w-4 text-[#070D16]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">AzkaSmart AI</span>
                    <span className="text-xs text-success font-medium">● Online</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className={cn('flex', isRTL ? 'justify-start' : 'justify-end')}>
                    <div className="max-w-[92%] sm:max-w-[85%] bg-primary/15 border border-primary/25 rounded-2xl rounded-br-sm px-3.5 sm:px-4 py-3">
                      <p className="text-xs sm:text-sm text-foreground whitespace-pre-line leading-relaxed">
                        {isRTL ? exampleFlow[0].textAr : exampleFlow[0].textEn}
                      </p>
                    </div>
                  </div>

                  <div className={cn('flex', isRTL ? 'justify-end' : 'justify-start')}>
                    <div className="w-full sm:max-w-[90%] bg-secondary/90 border border-border/60 rounded-2xl rounded-bl-sm px-3.5 sm:px-4 py-3.5">
                      <p className="text-xs sm:text-sm text-foreground whitespace-pre-line leading-relaxed break-words">
                        {isRTL ? exampleFlow[1].textAr : exampleFlow[1].textEn}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          to="/ai-consultant"
                          className="inline-flex items-center min-h-[38px] text-xs font-semibold px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                          {isRTL ? 'أضف للسلة' : 'Add to Cart'}
                        </Link>
                        <Link
                          to="/ai-consultant"
                          className="inline-flex items-center min-h-[38px] text-xs font-medium px-3.5 py-1.5 rounded-full bg-background/80 border border-border text-foreground hover:bg-background transition-colors"
                        >
                          {isRTL ? 'عدّل الخطة' : 'Modify Plan'}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </GlowBorderCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
