import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Wifi, ShoppingCart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { normalizeBundles } from '@/lib/bundles';
import { supabase } from '@/integrations/supabase/client';

const allBundles = [
  {
    id: 'studio',
    nameEn: 'Studio Apartment Smart Kit',
    nameAr: 'باقة الاستوديو الذكية',
    descEn: 'Perfect for small apartments and studios. Control lights, AC, and save on electricity.',
    descAr: 'مثالية للشقق الصغيرة والاستوديو. تحكم في الإضاءة والتكييف ووفر في الكهرباء.',
    priceEgp: 4500,
    originalPrice: 5800,
    devicesEn: ['4x SONOFF Smart Switches', '1x Tuya IR AC Controller', '1x Smart Plug with Energy Monitor', '1x Motion Sensor', '1x Zigbee Mini Hub'],
    devicesAr: ['٤ مفاتيح ذكية SONOFF', '١ ريموت تكييف Tuya', '١ مقبس ذكي مع عداد طاقة', '١ حساس حركة', '١ هاب Zigbee صغير'],
    savingsEn: 'Save ~200 EGP/month on electricity',
    savingsAr: 'وفّر ~٢٠٠ ج.م/شهر من الكهرباء',
    difficulty: 1,
    badges: ['Alexa', 'Google', 'Zigbee'],
    installTimeEn: '2-3 hours',
    installTimeAr: '٢-٣ ساعات',
  },
  {
    id: '2bed',
    nameEn: '2-Bedroom Apartment Kit',
    nameAr: 'باقة شقة غرفتين',
    descEn: 'Smart lighting, climate control, and basic security for a 2-bedroom apartment.',
    descAr: 'إضاءة ذكية، تحكم في المناخ، وأمان أساسي لشقة غرفتين.',
    priceEgp: 8500,
    originalPrice: 11000,
    devicesEn: ['8x Smart Switches', '2x IR AC Controllers', '2x Smart Plugs', '1x Zigbee Hub', '1x Door Sensor', '1x Motion Sensor'],
    devicesAr: ['٨ مفاتيح ذكية', '٢ ريموت تكييف', '٢ مقابس ذكية', '١ هاب Zigbee', '١ حساس باب', '١ حساس حركة'],
    savingsEn: 'Save ~350 EGP/month on electricity',
    savingsAr: 'وفّر ~٣٥٠ ج.م/شهر من الكهرباء',
    difficulty: 2,
    badges: ['Alexa', 'Google', 'Zigbee', 'WiFi'],
    installTimeEn: '3-4 hours',
    installTimeAr: '٣-٤ ساعات',
  },
  {
    id: '3bed',
    nameEn: '3-Bedroom Apartment Kit',
    nameAr: 'باقة شقة ٣ غرف',
    descEn: 'Complete smart home solution with lighting, climate, security sensors, and energy monitoring.',
    descAr: 'حل شامل للمنزل الذكي مع إضاءة وتكييف وحساسات أمان ومراقبة الطاقة.',
    priceEgp: 12500,
    originalPrice: 16000,
    devicesEn: ['12x Smart Switches', '3x IR AC Controllers', '4x Smart Plugs', '1x Zigbee Hub', '2x Motion Sensors', '2x Door Sensors', '1x Energy Monitor'],
    devicesAr: ['١٢ مفتاح ذكي', '٣ ريموت تكييف', '٤ مقابس ذكية', '١ هاب Zigbee', '٢ حساس حركة', '٢ حساس باب', '١ عداد طاقة'],
    savingsEn: 'Save ~450 EGP/month on electricity',
    savingsAr: 'وفّر ~٤٥٠ ج.م/شهر من الكهرباء',
    difficulty: 2,
    badges: ['Alexa', 'Google', 'Zigbee', 'WiFi'],
    installTimeEn: '4-5 hours',
    installTimeAr: '٤-٥ ساعات',
  },
  {
    id: 'villa-security',
    nameEn: 'Villa Security Kit',
    nameAr: 'باقة أمان الفيلا',
    descEn: 'Comprehensive security system with cameras, smart locks, and intrusion detection.',
    descAr: 'نظام أمان شامل مع كاميرات وأقفال ذكية وكشف التسلل.',
    priceEgp: 18500,
    originalPrice: 24000,
    devicesEn: ['4x TP-Link Security Cameras', '1x Smart Door Lock', '6x Door/Window Sensors', '2x Motion Sensors', '1x Alarm Siren', '1x Zigbee Hub'],
    devicesAr: ['٤ كاميرات أمان TP-Link', '١ قفل ذكي', '٦ حساسات أبواب/شبابيك', '٢ حساس حركة', '١ سارينة إنذار', '١ هاب Zigbee'],
    savingsEn: '24/7 protection for your family',
    savingsAr: 'حماية على مدار الساعة لعائلتك',
    difficulty: 3,
    badges: ['Alexa', 'Google', 'Zigbee'],
    installTimeEn: '5-6 hours',
    installTimeAr: '٥-٦ ساعات',
  },
  {
    id: 'energy',
    nameEn: 'Energy Saving Kit',
    nameAr: 'باقة توفير الطاقة',
    descEn: 'Focused on reducing your electricity bill with smart scheduling and monitoring.',
    descAr: 'تركيز على تقليل فاتورة الكهرباء مع الجدولة الذكية والمراقبة.',
    priceEgp: 6800,
    originalPrice: 8500,
    devicesEn: ['6x Smart Switches with Timer', '2x Smart Plugs', '1x Whole-Home Energy Monitor', '2x IR AC Controllers', '1x Smart Hub'],
    devicesAr: ['٦ مفاتيح ذكية مع تايمر', '٢ مقابس ذكية', '١ عداد طاقة للبيت كله', '٢ ريموت تكييف', '١ هاب ذكي'],
    savingsEn: 'Save ~350 EGP/month on electricity',
    savingsAr: 'وفّر ~٣٥٠ ج.م/شهر من الكهرباء',
    difficulty: 1,
    badges: ['Alexa', 'Google', 'WiFi'],
    installTimeEn: '2-3 hours',
    installTimeAr: '٢-٣ ساعات',
  },
  {
    id: 'villa-full',
    nameEn: 'Full Villa Smart Home',
    nameAr: 'فيلا ذكية بالكامل',
    descEn: 'The ultimate smart villa with lighting, security, climate, curtains, and full automation.',
    descAr: 'الفيلا الذكية المتكاملة مع إضاءة وأمان وتكييف وستائر وأتمتة كاملة.',
    priceEgp: 45000,
    originalPrice: 60000,
    devicesEn: ['24x Smart Switches', '6x Security Cameras', '1x Smart Door Lock', '4x IR AC Controllers', '2x Motorized Curtain Motors', '8x Door/Window Sensors', '4x Motion Sensors', '1x Energy Monitor', '2x Zigbee Hubs', '1x Alarm System'],
    devicesAr: ['٢٤ مفتاح ذكي', '٦ كاميرات أمان', '١ قفل ذكي', '٤ ريموت تكييف', '٢ موتور ستائر', '٨ حساسات أبواب/شبابيك', '٤ حساسات حركة', '١ عداد طاقة', '٢ هاب Zigbee', '١ نظام إنذار'],
    savingsEn: 'Save ~800 EGP/month + total security',
    savingsAr: 'وفّر ~٨٠٠ ج.م/شهر + أمان شامل',
    difficulty: 3,
    badges: ['Alexa', 'Google', 'Zigbee', 'WiFi', 'Matter'],
    installTimeEn: '1-2 days',
    installTimeAr: '١-٢ يوم',
  },
];

const Bundles = () => {
  const { isRTL, formatPrice } = useLanguage();
  const [bundles, setBundles] = useState(normalizeBundles(allBundles as any));

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('site_info')
        .select('value')
        .eq('section', 'bundles')
        .eq('key', 'list')
        .maybeSingle();
      if (!data?.value) return;
      try {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed) && parsed.length) setBundles(normalizeBundles(parsed));
      } catch {
        // Keep built-in bundles as fallback.
      }
    })();
  }, []);

  return (
    <>
      <Helmet>
        <title>{isRTL ? 'باقات المنزل الذكي | بيتزكي' : 'Smart Home Bundles | Baytzaki'}</title>
        <meta name="description" content="Ready-made smart home bundles for Egyptian homes. Studio, apartment, and villa kits with free installation and official warranty." />
      </Helmet>
      <Layout>
        <div className="pt-24 pb-20">
          {/* Header */}
          <div className="container px-6 md:px-12 text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {isRTL ? 'تركيب مجاني + ضمان' : 'Free Installation + Warranty'}
              </span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-display text-3xl md:text-5xl font-bold mb-4"
            >
              {isRTL ? 'باقات المنزل الذكي' : 'Smart Home Bundles'}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-muted-foreground max-w-2xl mx-auto"
            >
              {isRTL
                ? 'كل باقة مصممة خصيصاً للمنازل المصرية. تشمل جميع الأجهزة + التركيب المجاني + ضمان ٢ سنة.'
                : 'Every bundle designed for Egyptian homes. Includes all devices + free installation + 2-year warranty.'}
            </motion.p>
          </div>

          {/* Bundles grid */}
          <div className="container px-6 md:px-12">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {bundles.map((bundle, index) => {
                const discount = Math.round(((bundle.originalPrice - bundle.priceEgp) / bundle.originalPrice) * 100);
                return (
                  <motion.div
                    key={bundle.id}
                    id={bundle.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition-all flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-display text-lg font-bold text-foreground">
                        {isRTL ? bundle.nameAr : bundle.nameEn}
                      </h3>
                      <span className="text-xs font-bold text-success bg-success/10 px-2 py-1 rounded-full">
                        -{discount}%
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {isRTL ? bundle.descAr : bundle.descEn}
                    </p>

                    {/* Price */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-display text-2xl font-bold text-foreground">{formatPrice(bundle.priceEgp)}</span>
                      <span className="text-sm text-muted-foreground line-through">{formatPrice(bundle.originalPrice)}</span>
                    </div>

                    {/* Devices */}
                    <div className="space-y-1.5 mb-4 flex-1">
                      {(isRTL ? bundle.devicesAr : bundle.devicesEn).map((device) => (
                        <div key={device} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Check className="h-3 w-3 text-primary flex-shrink-0" />
                          <span>{device}</span>
                        </div>
                      ))}
                    </div>

                    {/* Savings & install time */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 mb-3">
                      <Wifi className="h-3 w-3 text-success flex-shrink-0" />
                      <span className="text-xs font-medium text-success">
                        {isRTL ? bundle.savingsAr : bundle.savingsEn}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <span>⏱ {isRTL ? bundle.installTimeAr : bundle.installTimeEn}</span>
                      <div className="flex gap-1">
                        {bundle.badges.map((b) => (
                          <span key={b} className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-medium">{b}</span>
                        ))}
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="flex gap-2">
                      <Link to="/ai-consultant" className="flex-1">
                        <Button className="w-full rounded-full h-10 text-sm">
                          <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                          {isRTL ? 'اطلب الآن' : 'Order Now'}
                        </Button>
                      </Link>
                      <a href="https://wa.me/201234567890" target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full">
                          💬
                        </Button>
                      </a>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Custom solution CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 text-center p-8 rounded-2xl bg-card border border-border max-w-3xl mx-auto"
            >
              <h3 className="font-display text-xl font-bold mb-2">
                {isRTL ? 'مش لاقي الباقة المناسبة؟' : "Can't find the right bundle?"}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                {isRTL ? 'المستشار الذكي هيعملك خطة مخصصة لبيتك' : 'The AI Advisor will create a custom plan for your home'}
              </p>
              <Link to="/ai-consultant">
                <Button size="lg" className="rounded-full h-12 px-8 glow-primary">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isRTL ? 'ابدأ المستشار الذكي' : 'Start AI Advisor'}
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Bundles;
