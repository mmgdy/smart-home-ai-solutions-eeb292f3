import { motion } from 'framer-motion';
import { useCalculator } from '@/hooks/useCalculator';
import { PROPERTY_TYPES, PRESET_TEMPLATES, PropertyType, PresetTemplateId, WiringType } from '@/types/calculator';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, ChevronRight, ChevronLeft, Zap, Sparkles, Building2, Sliders } from 'lucide-react';

export function PropertyTypeSelector() {
  const { 
    propertyType, 
    setPropertyType, 
    presetTemplate, 
    setPresetTemplate, 
    wiringType, 
    setWiringType, 
    setStep 
  } = useCalculator();
  const { isRTL } = useLanguage();

  const handleSelectProperty = (type: PropertyType) => {
    let recommendedTemplate: PresetTemplateId = 'apartment_2bed';
    if (type === 'villa') recommendedTemplate = 'villa';
    else if (type === 'duplex') recommendedTemplate = 'apartment_3bed';
    else if (type === 'apartment') recommendedTemplate = 'apartment_2bed';
    else if (type === 'office') recommendedTemplate = 'custom';

    setPropertyType(type, recommendedTemplate);
  };

  return (
    <div className="space-y-12">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto">
        <motion.span 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold uppercase tracking-wider text-primary mb-3"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isRTL ? 'الخطوة الأولى • نموذج مخطط سونوف الذكي' : 'Step 1 of 4 • SONOFF Solution Planner'}
        </motion.span>
        <motion.h2 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground"
        >
          {isRTL ? 'اختر نوع العقار والمخطط الأنسب لك' : 'Select Your Space & Smart Living Plan'}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground mt-3 text-base"
        >
          {isRTL 
            ? 'ابدأ باختيار نموذج جاهز ومصمم هندسياً لاحتياجاتك، أو صمم نظامك غرفة بغرفة بحرية تامة.'
            : 'Start with an engineered ready-made package or design your smart setup room by room.'
          }
        </motion.p>
      </div>

      {/* Property Type Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            {isRTL ? '١. نوع العقار' : '1. Property Type'}
          </h3>
          <span className="text-xs text-muted-foreground">
            {isRTL ? 'حدد طبيعة المكان' : 'Select space type'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {PROPERTY_TYPES.map((pt, index) => {
            const isSelected = propertyType === pt.type;
            return (
              <motion.button
                key={pt.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
                onClick={() => handleSelectProperty(pt.type)}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all duration-200 text-left relative flex flex-col justify-between h-32 group",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/20"
                    : "border-border hover:border-primary/40 bg-card/60 hover:bg-card"
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{pt.icon}</span>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                    {isRTL ? pt.nameAr : pt.nameEn}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {pt.description}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Presets Grid (Inspired by planner.sonoff.tech) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            {isRTL ? '٢. نماذج الباقات الجاهزة (مستوحى من SONOFF Planner)' : '2. Pre-Engineered Solution Packages'}
          </h3>
          <span className="text-xs text-muted-foreground">
            {isRTL ? 'يمكنك تعديل الغرف لاحقاً' : 'Fully customizable in next steps'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRESET_TEMPLATES.map((tmpl) => {
            const isSelected = presetTemplate === tmpl.id;
            return (
              <div
                key={tmpl.id}
                onClick={() => setPresetTemplate(tmpl.id)}
                className={cn(
                  "p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/30"
                    : "border-border bg-card/80 hover:border-primary/50 hover:bg-card"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">{tmpl.icon}</span>
                    {isSelected ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> {isRTL ? 'تم الاختيار' : 'Selected'}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground font-medium">
                        {tmpl.defaultRooms.length > 0 
                          ? `${tmpl.defaultRooms.length} ${isRTL ? 'غرف مجهزة' : 'rooms pre-configured'}`
                          : (isRTL ? 'حر بالكامل' : 'Blank Canvas')
                        }
                      </span>
                    )}
                  </div>
                  <h4 className="font-display text-lg font-bold text-foreground">
                    {isRTL ? tmpl.nameAr : tmpl.nameEn}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {isRTL ? tmpl.descAr : tmpl.descEn}
                  </p>
                </div>

                {tmpl.defaultRooms.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap gap-1.5">
                    {tmpl.defaultRooms.slice(0, 4).map((r, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-muted text-[11px] text-muted-foreground font-medium">
                        {isRTL ? r.nameAr : r.nameEn}
                      </span>
                    ))}
                    {tmpl.defaultRooms.length > 4 && (
                      <span className="px-2 py-0.5 rounded bg-muted/60 text-[11px] text-muted-foreground font-medium">
                        +{tmpl.defaultRooms.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Electrical Wiring Configuration (SONOFF Neutral vs No-Neutral awareness) */}
      <div className="p-6 rounded-2xl border border-border/80 bg-muted/20 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <h3 className="font-display font-bold text-base text-foreground">
            {isRTL ? '٣. نوع التأسيس الكهربائي للعلب (سلك النيوترال المحايد)' : '3. Electrical Wiring Setup (Neutral Wire)'}
          </h3>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
          {isRTL 
            ? 'تتطلب المفاتيح الذكية التقليدية وجود سلك محايد (نيوترال) في العلب. إذا كانت شقتك قديمة أو تشطيب قائم بدون نيوترال في علب المفاتيح، سنختار تلقائياً أجهزة SONOFF المصممة للعمل بدون نيوترال.'
            : 'Standard smart switches require a neutral wire in wall boxes. If your home has legacy wiring without neutral, we automatically configure no-neutral switches.'
          }
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => setWiringType('neutral')}
            className={cn(
              "p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3",
              wiringType === 'neutral'
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border bg-card hover:border-primary/40"
            )}
          >
            <span className="text-xl">⚡</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">
                  {isRTL ? 'متوفر سلك نيوترال (المنازل الحديثة)' : 'Neutral Wire Available (Modern Homes)'}
                </span>
                {wiringType === 'neutral' && <Check className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isRTL 
                  ? 'يتيح استخدام SONOFF MINIR4 وجميع المفاتيح الحائطية بأعلى كفاءة واستقرار.'
                  : 'Allows SONOFF MINIR4 & all in-wall switches with maximum reliability.'
                }
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setWiringType('no_neutral')}
            className={cn(
              "p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3",
              wiringType === 'no_neutral'
                ? "border-amber-500 bg-amber-500/10 shadow-sm"
                : "border-border bg-card hover:border-amber-500/40"
            )}
          >
            <span className="text-xl">🔌</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">
                  {isRTL ? 'بدون سلك نيوترال (تشطيب قائم / مباني قديمة)' : 'No Neutral Wire (Retrofit / Older Homes)'}
                </span>
                {wiringType === 'no_neutral' && <Check className="w-4 h-4 text-amber-500" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isRTL 
                  ? 'سنستخدم مفاتيح SONOFF ZB M5 US المخصصة للعمل بسلك كهرباء واحد فقط بدون تكسير.'
                  : 'Automatically selects SONOFF ZB M5 no-neutral switches without wall modification.'
                }
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Continue CTA */}
      <div className="flex justify-end pt-4">
        <Button
          size="lg"
          onClick={() => setStep(2)}
          className="gap-2 px-8 font-bold shadow-lg shadow-primary/20"
        >
          {isRTL ? 'المتابعة لتحديد وتعديل الغرف' : 'Continue to Room Layout'}
          {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
