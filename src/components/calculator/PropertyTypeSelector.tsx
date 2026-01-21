import { motion } from 'framer-motion';
import { useCalculator } from '@/hooks/useCalculator';
import { PROPERTY_TYPES } from '@/types/calculator';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function PropertyTypeSelector() {
  const { setPropertyType, propertyType } = useCalculator();
  const { isRTL } = useLanguage();

  return (
    <div className="space-y-8">
      <div className="text-center">
        <motion.span 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm tracking-[0.2em] uppercase text-primary font-medium block mb-3"
        >
          Step 1 of 4
        </motion.span>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-display text-3xl md:text-4xl font-bold"
        >
          {isRTL ? 'اختر نوع العقار' : 'Select Property Type'}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground mt-3"
        >
          {isRTL 
            ? 'اختر نوع المبنى لبدء تقدير منزلك الذكي المخصص'
            : 'Choose your building type to start your custom smart home estimate'
          }
        </motion.p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {PROPERTY_TYPES.map((pt, index) => (
          <motion.button
            key={pt.type}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
            onClick={() => setPropertyType(pt.type)}
            className={cn(
              "group relative p-6 rounded-2xl border-2 transition-all duration-300 text-left",
              propertyType === pt.type
                ? "border-primary bg-primary/5 shadow-lg"
                : "border-border hover:border-primary/50 hover:bg-card"
            )}
          >
            <div className="text-4xl mb-4">{pt.icon}</div>
            <h3 className="font-display text-xl font-bold mb-2">
              {isRTL ? pt.nameAr : pt.nameEn}
            </h3>
            <p className="text-sm text-muted-foreground">
              {pt.description}
            </p>
            
            <div className={cn(
              "absolute bottom-4 text-primary font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity",
              isRTL ? "left-6" : "right-6"
            )}>
              {isRTL ? '← ابدأ الآن' : 'Start now →'}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
