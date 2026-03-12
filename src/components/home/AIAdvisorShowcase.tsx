import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, MessageSquare, Package, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function AIAdvisorShowcase() {
  const { isRTL } = useLanguage();

  const exampleFlow = [
    {
      type: 'question',
      textEn: 'I have a 3-bedroom apartment in Cairo. I want to control lights, save electricity, and add security cameras.',
      textAr: 'عندي شقة ٣ غرف في القاهرة. عايز أتحكم في الإضاءة وأوفر كهرباء وأضيف كاميرات أمان.',
    },
    {
      type: 'answer',
      textEn: 'Based on your apartment, I recommend:\n\n🔆 12x SONOFF Smart Switches — ٣,٦٠٠ EGP\n📷 4x TP-Link Cameras — ٤,٨٠٠ EGP\n⚡ Smart Energy Monitor — ١,٢٠٠ EGP\n🏠 Zigbee Hub — ٩٠٠ EGP\n\nTotal: ١٠,٥٠٠ EGP with free installation!',
      textAr: 'بناءً على شقتك، أنصحك بـ:\n\n🔆 ١٢ مفتاح ذكي SONOFF — ٣,٦٠٠ ج.م\n📷 ٤ كاميرات TP-Link — ٤,٨٠٠ ج.م\n⚡ عداد طاقة ذكي — ١,٢٠٠ ج.م\n🏠 هاب Zigbee — ٩٠٠ ج.م\n\nالإجمالي: ١٠,٥٠٠ ج.م مع تركيب مجاني!',
    },
  ];

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] rounded-full border border-primary/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] rounded-full border border-primary/3" />
      </div>

      <div className="container relative z-10 px-6 md:px-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6"
            >
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-primary">
                {isRTL ? 'الأول من نوعه في مصر' : 'First of its kind in Egypt'}
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6"
            >
              {isRTL ? 'المستشار الذكي يبني لك خطة كاملة' : 'AI Advisor Builds Your Complete Plan'}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-muted-foreground text-lg mb-4 leading-relaxed"
            >
              {isRTL
                ? 'مش محتاج تفهم في التكنولوجيا. قول للمستشار الذكي عايز إيه وهو هيعملك خطة كاملة بالمنتجات والأسعار.'
                : "No technical knowledge needed. Tell the AI what you want and it'll create a complete plan with products and prices."}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Link to="/ai-consultant">
                <Button size="lg" className="h-12 px-6 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 group glow-primary">
                  <Bot className="mr-2 h-4 w-4" />
                  {isRTL ? 'ابدأ المستشار الذكي' : 'Start AI Advisor'}
                  <ArrowRight className={cn("ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform", isRTL && "rotate-180 mr-2 ml-0")} />
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Right - Chat mockup */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl border border-border p-4 md:p-6 shadow-lg"
          >
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground">Baytzaki AI</span>
                <span className="text-xs text-success ml-2">● Online</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* User message */}
              <div className={cn("flex", isRTL ? "justify-start" : "justify-end")}>
                <div className="max-w-[85%] bg-primary/10 rounded-2xl rounded-br-sm px-4 py-3">
                  <p className="text-sm text-foreground whitespace-pre-line">
                    {isRTL ? exampleFlow[0].textAr : exampleFlow[0].textEn}
                  </p>
                </div>
              </div>

              {/* AI response */}
              <div className={cn("flex", isRTL ? "justify-end" : "justify-start")}>
                <div className="max-w-[85%] bg-secondary rounded-2xl rounded-bl-sm px-4 py-3">
                  <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                    {isRTL ? exampleFlow[1].textAr : exampleFlow[1].textEn}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {isRTL ? 'أضف للسلة' : 'Add to Cart'}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {isRTL ? 'عدّل الخطة' : 'Modify Plan'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
