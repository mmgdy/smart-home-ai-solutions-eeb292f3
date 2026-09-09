import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Layout } from '@/components/layout/Layout';
import { useCalculator } from '@/hooks/useCalculator';
import { PropertyTypeSelector } from '@/components/calculator/PropertyTypeSelector';
import { RoomBuilder } from '@/components/calculator/RoomBuilder';
import { RoomCustomizer } from '@/components/calculator/RoomCustomizer';
import { QuoteSummaryWithCart } from '@/components/calculator/QuoteSummaryWithCart';
import { FloorPlanUploader } from '@/components/calculator/FloorPlanUploader';
import { useLanguage } from '@/lib/i18n';
import { Calculator as CalculatorIcon, Zap, FileText, Clock } from 'lucide-react';

const Calculator = () => {
  const { step, propertyType } = useCalculator();
  const { isRTL } = useLanguage();

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-12">
            <PropertyTypeSelector />
            {propertyType && <FloorPlanUploader />}
          </div>
        );
      case 2:
        return <RoomBuilder />;
      case 3:
        return <RoomCustomizer />;
      case 4:
        return <QuoteSummaryWithCart />;
      default:
        return <PropertyTypeSelector />;
    }
  };

  return (
    <>
      <Helmet>
        <title>{isRTL ? 'حاسبة المنزل الذكي | AzkaSmart' : 'Smart Home Calculator | AzkaSmart'}</title>
        <meta
          name="description"
          content={isRTL 
            ? 'احسب تكلفة منزلك الذكي في ثوانٍ. احصل على عرض سعر فوري مع توصيات مخصصة.'
            : 'Calculate your smart home cost in seconds. Get instant quotes with personalized recommendations.'
          }
        />
      </Helmet>
      <Layout>
        {/* Hero Section */}
        <section className="relative pt-32 pb-16 overflow-hidden">
          <div className="absolute inset-0 hero-gradient opacity-50" />
          <div className="container relative z-10 px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-3xl mx-auto"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <CalculatorIcon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {isRTL ? 'حاسبة المنازل الذكية الأولى في مصر 🇪🇬' : 'Egypt\'s First Smart Home Calculator 🇪🇬'}
                </span>
              </div>
              
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                {isRTL ? (
                  <>احسب تكلفة منزلك الذكي في <span className="text-gradient">ثوانٍ</span></>
                ) : (
                  <>Calculate Your Smart Home Cost in <span className="text-gradient">Seconds</span></>
                )}
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8">
                {isRTL 
                  ? 'احصل على عرض فني ومالي دقيق وشامل لمنزلك الذكي فوراً. بدون رسوم خفية، وبدون الحاجة لخبرة تقنية.'
                  : 'Get an accurate, comprehensive technical and financial quote for your smart home instantly. No hidden fees, no technical expertise needed.'
                }
              </p>

              {/* Features */}
              <div className="flex flex-wrap justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>{isRTL ? 'مؤتمت بالكامل 100%' : '100% Automated'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>{isRTL ? 'تصدير PDF فوري' : 'Instant PDF Export'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{isRTL ? 'مجاني للاستخدام' : 'Free to Use'}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Calculator Section */}
        <section className="py-12 md:py-20">
          <div className="container px-6 md:px-12">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-5xl mx-auto"
            >
              {renderStep()}
            </motion.div>
          </div>
        </section>

        {/* How It Works - Only show on step 1 */}
        {step === 1 && (
          <section className="py-16 bg-card/50">
            <div className="container px-6 md:px-12">
              <div className="text-center mb-12">
                <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
                  {isRTL ? 'كيف تعمل الحاسبة؟' : 'How It Works'}
                </h2>
                <p className="text-muted-foreground">
                  {isRTL ? '٤ خطوات بسيطة' : '4 Simple Steps'}
                </p>
              </div>

              <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                {[
                  { step: 1, icon: '🏠', titleEn: 'Choose Property', titleAr: 'اختر نوع وحدتك', descEn: 'Select apartment, villa, duplex, or office', descAr: 'شقة، فيلا، دوبلكس، أو مكتب' },
                  { step: 2, icon: '🚪', titleEn: 'Add Rooms', titleAr: 'حدد الغرف', descEn: 'Define the rooms in your property', descAr: 'أضف الغرف وحدد عددها' },
                  { step: 3, icon: '⚡', titleEn: 'Customize', titleAr: 'تخصيص ذكي', descEn: 'Select smart features for each room', descAr: 'اختر المميزات لكل غرفة' },
                  { step: 4, icon: '📋', titleEn: 'Get Quote', titleAr: 'استلم العرض', descEn: 'Download your detailed quote', descAr: 'حمل عرض مفصل بصيغة PDF' },
                ].map((item, index) => (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl mx-auto mb-4">
                      {item.icon}
                    </div>
                    <h3 className="font-bold mb-2">{isRTL ? item.titleAr : item.titleEn}</h3>
                    <p className="text-sm text-muted-foreground">{isRTL ? item.descAr : item.descEn}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}
      </Layout>
    </>
  );
};

export default Calculator;
