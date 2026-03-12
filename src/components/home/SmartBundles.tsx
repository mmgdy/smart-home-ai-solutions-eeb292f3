import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Wifi, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const bundles = [
  {
    id: 'studio',
    nameEn: 'Studio Apartment Kit',
    nameAr: 'باقة الاستوديو',
    priceEgp: 4500,
    originalPrice: 5800,
    devicesEn: ['4x Smart Switches', '1x IR AC Controller', '1x Smart Plug', '1x Motion Sensor'],
    devicesAr: ['٤ مفاتيح ذكية', '١ ريموت تكييف ذكي', '١ مقبس ذكي', '١ حساس حركة'],
    savingsEn: 'Save ~200 EGP/month on electricity',
    savingsAr: 'وفّر ~٢٠٠ ج.م/شهر من الكهرباء',
    difficulty: 1,
    badges: ['Alexa', 'Google', 'Zigbee'],
    popular: false,
  },
  {
    id: '3bed',
    nameEn: '3-Bedroom Apartment Kit',
    nameAr: 'باقة شقة ٣ غرف',
    priceEgp: 12500,
    originalPrice: 16000,
    devicesEn: ['12x Smart Switches', '2x IR AC Controllers', '4x Smart Plugs', '1x Zigbee Hub', '2x Motion Sensors', '1x Door Sensor'],
    devicesAr: ['١٢ مفتاح ذكي', '٢ ريموت تكييف', '٤ مقابس ذكية', '١ هاب Zigbee', '٢ حساس حركة', '١ حساس باب'],
    savingsEn: 'Save ~450 EGP/month on electricity',
    savingsAr: 'وفّر ~٤٥٠ ج.م/شهر من الكهرباء',
    difficulty: 2,
    badges: ['Alexa', 'Google', 'Zigbee', 'WiFi'],
    popular: true,
  },
  {
    id: 'villa-security',
    nameEn: 'Villa Security Kit',
    nameAr: 'باقة أمان الفيلا',
    priceEgp: 18500,
    originalPrice: 24000,
    devicesEn: ['4x Security Cameras', '1x Smart Door Lock', '6x Door/Window Sensors', '2x Motion Sensors', '1x Alarm Siren', '1x Zigbee Hub'],
    devicesAr: ['٤ كاميرات أمان', '١ قفل ذكي', '٦ حساسات أبواب/شبابيك', '٢ حساس حركة', '١ سارينة إنذار', '١ هاب Zigbee'],
    savingsEn: '24/7 protection for your family',
    savingsAr: 'حماية على مدار الساعة لعائلتك',
    difficulty: 2,
    badges: ['Alexa', 'Google', 'Zigbee'],
    popular: false,
  },
  {
    id: 'energy',
    nameEn: 'Energy Saving Kit',
    nameAr: 'باقة توفير الطاقة',
    priceEgp: 6800,
    originalPrice: 8500,
    devicesEn: ['6x Smart Switches', '2x Smart Plugs', '1x Energy Monitor', '2x IR AC Controllers', '1x Smart Hub'],
    devicesAr: ['٦ مفاتيح ذكية', '٢ مقابس ذكية', '١ عداد طاقة', '٢ ريموت تكييف', '١ هاب ذكي'],
    savingsEn: 'Save ~350 EGP/month on electricity',
    savingsAr: 'وفّر ~٣٥٠ ج.م/شهر من الكهرباء',
    difficulty: 1,
    badges: ['Alexa', 'Google', 'WiFi'],
    popular: false,
  },
];

export function SmartBundles() {
  const { isRTL, formatPrice } = useLanguage();

  return (
    <section className="py-20 bg-card/30">
      <div className="container px-6 md:px-12">
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-primary font-medium text-sm uppercase tracking-wider"
          >
            {isRTL ? 'وفّر أكثر مع الباقات' : 'Save More with Bundles'}
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl md:text-4xl font-bold text-foreground mt-2 mb-3"
          >
            {isRTL ? 'باقات المنزل الذكي الجاهزة' : 'Ready-Made Smart Home Bundles'}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-muted-foreground max-w-xl mx-auto"
          >
            {isRTL ? 'كل باقة تشمل التركيب المجاني والضمان' : 'Every bundle includes free installation & warranty'}
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {bundles.map((bundle, index) => {
            const discount = Math.round(((bundle.originalPrice - bundle.priceEgp) / bundle.originalPrice) * 100);
            return (
              <motion.div
                key={bundle.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "relative rounded-2xl border bg-card p-6 transition-all hover:border-primary/40",
                  bundle.popular ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
                )}
              >
                {bundle.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary rounded-full text-xs font-bold text-primary-foreground">
                    {isRTL ? 'الأكثر مبيعاً' : 'Most Popular'}
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground">
                      {isRTL ? bundle.nameAr : bundle.nameEn}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {isRTL ? 'صعوبة التركيب:' : 'Install difficulty:'}
                      </span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={cn(
                              "w-4 h-1.5 rounded-full",
                              level <= bundle.difficulty ? "bg-primary" : "bg-border"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl font-bold text-foreground">
                      {formatPrice(bundle.priceEgp)}
                    </div>
                    <div className="text-sm text-muted-foreground line-through">
                      {formatPrice(bundle.originalPrice)}
                    </div>
                    <span className="text-xs font-semibold text-success">-{discount}%</span>
                  </div>
                </div>

                {/* Devices list */}
                <div className="grid grid-cols-2 gap-1.5 mb-4">
                  {(isRTL ? bundle.devicesAr : bundle.devicesEn).map((device) => (
                    <div key={device} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-primary flex-shrink-0" />
                      <span>{device}</span>
                    </div>
                  ))}
                </div>

                {/* Savings */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 mb-4">
                  <Wifi className="h-3 w-3 text-success" />
                  <span className="text-xs font-medium text-success">
                    {isRTL ? bundle.savingsAr : bundle.savingsEn}
                  </span>
                </div>

                {/* Badges */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {bundle.badges.map((badge) => (
                      <span key={badge} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
                        {badge}
                      </span>
                    ))}
                  </div>
                  <Link to={`/bundles#${bundle.id}`}>
                    <Button size="sm" variant="outline" className="h-8 rounded-full text-xs group">
                      {isRTL ? 'التفاصيل' : 'Details'}
                      <ArrowRight className={cn("ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform", isRTL && "rotate-180 mr-1 ml-0")} />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link to="/bundles">
            <Button size="lg" variant="outline" className="rounded-full h-12 px-8">
              {isRTL ? 'عرض جميع الباقات' : 'View All Bundles'}
              <ArrowRight className={cn("ml-2 h-4 w-4", isRTL && "rotate-180 mr-2 ml-0")} />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
