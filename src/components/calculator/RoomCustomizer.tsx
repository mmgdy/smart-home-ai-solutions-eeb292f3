import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useCalculator } from '@/hooks/useCalculator';
import { ROOM_TYPES, FEATURE_TYPES, FeatureType } from '@/types/calculator';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export function RoomCustomizer() {
  const { rooms, updateRoomFeature, setStep, generateDevices } = useCalculator();
  const { isRTL, formatPrice } = useLanguage();
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);

  if (rooms.length === 0) {
    return null;
  }

  const currentRoom = rooms[currentRoomIndex];
  const roomInfo = ROOM_TYPES.find(rt => rt.type === currentRoom.type);

  const handleNext = () => {
    if (currentRoomIndex < rooms.length - 1) {
      setCurrentRoomIndex(currentRoomIndex + 1);
    } else {
      generateDevices();
    }
  };

  const handlePrev = () => {
    if (currentRoomIndex > 0) {
      setCurrentRoomIndex(currentRoomIndex - 1);
    } else {
      setStep(2);
    }
  };

  const enabledCount = currentRoom.features.filter(f => f.enabled).length;
  const roomTotal = currentRoom.features
    .filter(f => f.enabled)
    .reduce((sum, f) => {
      const featureInfo = FEATURE_TYPES.find(ft => ft.type === f.type);
      return sum + (featureInfo?.basePrice || 0) * f.quantity;
    }, 0);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <motion.span 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm tracking-[0.2em] uppercase text-primary font-medium block mb-3"
        >
          Step 3 of 4 • {isRTL ? `غرفة ${currentRoomIndex + 1} من ${rooms.length}` : `Room ${currentRoomIndex + 1} of ${rooms.length}`}
        </motion.span>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-display text-3xl md:text-4xl font-bold flex items-center justify-center gap-3"
        >
          <span className="text-4xl">{roomInfo?.icon}</span>
          {currentRoom.name}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground mt-3"
        >
          {isRTL 
            ? 'اختر المميزات الذكية لهذه الغرفة'
            : 'Select smart features for this room'
          }
        </motion.p>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${((currentRoomIndex + 1) / rooms.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Features Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentRoom.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {currentRoom.features.map((feature, index) => {
            const featureInfo = FEATURE_TYPES.find(ft => ft.type === feature.type);
            if (!featureInfo) return null;

            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all",
                  feature.enabled
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{featureInfo.icon}</span>
                    <div>
                      <h4 className="font-medium text-sm">
                        {isRTL ? featureInfo.nameAr : featureInfo.nameEn}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(featureInfo.basePrice)}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={feature.enabled}
                    onCheckedChange={(checked) => 
                      updateRoomFeature(currentRoom.id, feature.type, checked)
                    }
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Room Summary */}
      <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
        <div>
          <span className="text-sm text-muted-foreground">
            {isRTL ? 'مميزات محددة' : 'Features selected'}
          </span>
          <p className="font-bold text-lg">{enabledCount} {isRTL ? 'مميزة' : 'features'}</p>
        </div>
        <div className={cn("text-right", isRTL && "text-left")}>
          <span className="text-sm text-muted-foreground">
            {isRTL ? 'تقدير الغرفة' : 'Room estimate'}
          </span>
          <p className="font-bold text-lg text-primary">{formatPrice(roomTotal)}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={handlePrev}
          className="gap-2"
        >
          {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {isRTL ? 'السابق' : 'Back'}
        </Button>
        <Button
          onClick={handleNext}
          className="gap-2"
        >
          {currentRoomIndex < rooms.length - 1 ? (
            <>
              {isRTL ? 'الغرفة التالية' : 'Next Room'}
              {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              {isRTL ? 'عرض السعر' : 'View Quote'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
