import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const LIGHTING_MODES = [
  {
    id: 'default',
    nameEn: 'Lighting Mode',
    nameAr: 'وضع الإضاءة',
    overlay: 'rgba(0,0,0,0)',
    brightness: 1,
    hue: 0,
  },
  {
    id: 'sleeping',
    nameEn: 'Sleeping Mode',
    nameAr: 'وضع النوم',
    overlay: 'rgba(20,20,50,0.6)',
    brightness: 0.3,
    hue: 240,
  },
  {
    id: 'cozy',
    nameEn: 'Cozy Mode',
    nameAr: 'وضع دافئ',
    overlay: 'rgba(255,150,50,0.3)',
    brightness: 0.85,
    hue: 30,
  },
  {
    id: 'relaxing',
    nameEn: 'Relaxing Mode',
    nameAr: 'وضع استرخاء',
    overlay: 'rgba(100,50,150,0.4)',
    brightness: 0.6,
    hue: 280,
  },
  {
    id: 'ambient',
    nameEn: 'Ambient Mode',
    nameAr: 'إضاءة محيطية',
    overlay: 'rgba(50,180,255,0.3)',
    brightness: 0.75,
    hue: 200,
  },
];

export function TrySmartLighting() {
  const { isRTL } = useLanguage();
  const [activeMode, setActiveMode] = useState(LIGHTING_MODES[0]);

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] transition-all duration-1000"
          style={{ 
            background: `hsl(${activeMode.hue}, 70%, 50%)`,
            opacity: 0.15 
          }}
        />
      </div>

      <div className="container px-6 md:px-12 relative z-10">
        <div className="text-center mb-12">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm tracking-[0.2em] uppercase text-primary font-medium block mb-3"
          >
            {isRTL ? 'جربها الآن' : 'Try It Now'}
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-3xl md:text-4xl lg:text-5xl font-bold"
          >
            {isRTL ? 'جرب أوضاع الإضاءة الذكية' : 'Try Smart Lighting Modes'}
          </motion.h2>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Room Image with Lighting Effect */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative aspect-video rounded-2xl overflow-hidden mb-8 shadow-2xl"
          >
            {/* Base room image */}
            <img
              src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&h=675&fit=crop"
              alt="Smart living room"
              className="w-full h-full object-cover transition-all duration-700"
              style={{
                filter: `brightness(${activeMode.brightness})`,
              }}
            />
            
            {/* Color overlay */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeMode.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 pointer-events-none"
                style={{ backgroundColor: activeMode.overlay }}
              />
            </AnimatePresence>

            {/* Mode label */}
            <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-sm font-medium">
                {isRTL ? activeMode.nameAr : activeMode.nameEn}
              </span>
            </div>

            {/* Light source indicators */}
            {activeMode.id !== 'default' && (
              <>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.8 }}
                  className="absolute top-8 left-1/4 w-2 h-2 rounded-full bg-yellow-300"
                  style={{ boxShadow: `0 0 20px 10px hsla(${activeMode.hue}, 70%, 60%, 0.5)` }}
                />
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.8 }}
                  transition={{ delay: 0.1 }}
                  className="absolute top-8 right-1/4 w-2 h-2 rounded-full bg-yellow-300"
                  style={{ boxShadow: `0 0 20px 10px hsla(${activeMode.hue}, 70%, 60%, 0.5)` }}
                />
              </>
            )}
          </motion.div>

          {/* Mode Selector Buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            {LIGHTING_MODES.map((mode, index) => (
              <motion.button
                key={mode.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setActiveMode(mode)}
                className={cn(
                  "px-5 py-3 rounded-full text-sm font-medium transition-all duration-300",
                  activeMode.id === mode.id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "bg-card border border-border hover:border-primary/50 hover:bg-primary/5"
                )}
              >
                {isRTL ? mode.nameAr : mode.nameEn}
              </motion.button>
            ))}
          </div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-muted-foreground mt-8 max-w-2xl mx-auto"
          >
            {isRTL 
              ? 'تحكم في إضاءة منزلك بلمسة واحدة. أنشئ أجواء مختلفة لكل مناسبة من خلال هاتفك أو الأوامر الصوتية.'
              : 'Control your home lighting with a single tap. Create different atmospheres for every occasion through your phone or voice commands.'
            }
          </motion.p>
        </div>
      </div>
    </section>
  );
}
