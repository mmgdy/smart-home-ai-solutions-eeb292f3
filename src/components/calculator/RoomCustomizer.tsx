import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Plus, 
  Minus, 
  Lightbulb, 
  Wind, 
  Blinds, 
  ShieldCheck, 
  Zap, 
  Network,
  Sparkles,
  Info
} from 'lucide-react';
import { useCalculator } from '@/hooks/useCalculator';
import { 
  ROOM_TYPES, 
  MASTER_SOLUTIONS, 
  ZIGBEE_COORDINATOR, 
  SolutionCategory 
} from '@/types/calculator';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CATEGORIES: { id: SolutionCategory; nameEn: string; nameAr: string; icon: any }[] = [
  { id: 'lighting', nameEn: 'Lighting & Switches', nameAr: 'الإضاءة والمفاتيح', icon: Lightbulb },
  { id: 'climate', nameEn: 'Climate & AC', nameAr: 'التكييف والحرارة', icon: Wind },
  { id: 'curtains', nameEn: 'Motorized Curtains', nameAr: 'الستائر الذكية', icon: Blinds },
  { id: 'security', nameEn: 'Security & Access', nameAr: 'الأمان والتحكم بالدخول', icon: ShieldCheck },
  { id: 'energy', nameEn: 'Energy & Appliances', nameAr: 'الطاقة والأجهزة', icon: Zap },
];

export function RoomCustomizer() {
  const { 
    rooms, 
    updateRoomSolutionQuantity, 
    setStep, 
    generateDevices, 
    wiringType,
    getSubtotal,
    hasZigbeeDevices 
  } = useCalculator();
  const { isRTL, formatPrice } = useLanguage();
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<SolutionCategory>('lighting');

  if (rooms.length === 0) {
    return null;
  }

  const currentRoom = rooms[currentRoomIndex];
  const roomInfo = ROOM_TYPES.find(rt => rt.type === currentRoom.type);

  // Compute room total
  const roomSolutions = currentRoom.solutions || {};
  const roomTotal = Object.entries(roomSolutions).reduce((sum, [solId, qty]) => {
    const sol = MASTER_SOLUTIONS.find(s => s.id === solId);
    return sum + (sol ? sol.price * qty : 0);
  }, 0);

  const roomItemCount = Object.values(roomSolutions).reduce((sum, qty) => sum + qty, 0);

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

  // Filter solutions for current active category
  // If wiring is no_neutral, filter out switch_minir4 or show note
  const categorySolutions = MASTER_SOLUTIONS.filter(sol => {
    if (sol.category !== activeCategory) return false;
    if (wiringType === 'no_neutral' && sol.id === 'switch_minir4') {
      return false; // hide neutral switch if user explicitly chose no-neutral
    }
    if (wiringType === 'neutral' && sol.id === 'switch_no_neutral') {
      return false; // hide no-neutral switch if neutral is present
    }
    return true;
  });

  const projectSubtotal = getSubtotal();
  const includesZigbee = hasZigbeeDevices();

  return (
    <div className="space-y-8">
      {/* Step Header */}
      <div className="text-center max-w-2xl mx-auto">
        <motion.span 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold uppercase tracking-wider text-primary mb-3"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Step 3 of 4 • {isRTL ? `تخصيص الغرفة ${currentRoomIndex + 1} من ${rooms.length}` : `Customizing Room ${currentRoomIndex + 1} of ${rooms.length}`}
        </motion.span>
        
        <motion.h2 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="font-display text-3xl md:text-4xl font-bold flex items-center justify-center gap-3 text-foreground"
        >
          <span className="text-3xl">{roomInfo?.icon}</span>
          <span>{currentRoom.name}</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground mt-2 text-sm md:text-base"
        >
          {isRTL 
            ? 'اختر حلول الأتمتة والراحة لكل قسم. الأجهزة الموصى بها مضافة مسبقاً ويمكنك تعديل كمياتها بحرية.'
            : 'Select smart solutions for this zone. Pre-configured recommendations can be tuned to your exact needs.'
          }
        </motion.p>
      </div>

      {/* Room Quick Switcher Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {rooms.map((room, idx) => {
          const rInfo = ROOM_TYPES.find(rt => rt.type === room.type);
          const isCurrent = idx === currentRoomIndex;
          const count = Object.values(room.solutions || {}).reduce((s, q) => s + q, 0);

          return (
            <button
              key={room.id}
              onClick={() => setCurrentRoomIndex(idx)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 border",
                isCurrent
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : "bg-card hover:bg-muted text-muted-foreground border-border"
              )}
            >
              <span>{rInfo?.icon}</span>
              <span>{room.name}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                isCurrent ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Category Navigation (SONOFF Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 border-b border-border pb-4">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          // Count active items in this category for this room
          const activeCount = MASTER_SOLUTIONS
            .filter(s => s.category === cat.id)
            .reduce((sum, s) => sum + (roomSolutions[s.id] || 0), 0);

          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                isActive
                  ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                  : "border-border/60 bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">
                  {isRTL ? cat.nameAr : cat.nameEn}
                </p>
                {activeCount > 0 && (
                  <span className="text-[10px] text-primary font-semibold">
                    {activeCount} {isRTL ? 'محدد' : 'active'}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Solutions Cards Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentRoom.id}-${activeCategory}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {categorySolutions.map((sol) => {
            const qty = roomSolutions[sol.id] || 0;
            const isSelected = qty > 0;

            return (
              <div
                key={sol.id}
                className={cn(
                  "p-4 rounded-2xl border-2 transition-all flex flex-col justify-between relative",
                  isSelected
                    ? "border-primary/80 bg-primary/5 shadow-md shadow-primary/5"
                    : "border-border bg-card/60 hover:border-primary/30"
                )}
              >
                <div className="flex gap-3">
                  {/* Product Thumbnail */}
                  <div className="w-20 h-20 rounded-xl bg-white p-1.5 border border-border/60 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    <img
                      src={sol.imageUrl}
                      alt={sol.nameEn}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        sol.protocol === 'zigbee'
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                      )}>
                        {sol.protocol}
                      </span>
                      {sol.badge && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                          {sol.badge}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-foreground line-clamp-1">
                      {isRTL ? sol.nameAr : sol.nameEn}
                    </h4>

                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {isRTL ? sol.descriptionAr : sol.descriptionEn}
                    </p>

                    <div className="mt-2 text-primary font-bold text-sm">
                      {formatPrice(sol.price)} <span className="text-[11px] text-muted-foreground font-normal">{isRTL ? 'للقطعة' : '/ unit'}</span>
                    </div>
                  </div>
                </div>

                {/* Counter Footer */}
                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {qty > 0 ? (
                      <span className="font-semibold text-foreground">
                        {isRTL ? 'الإجمالي:' : 'Total:'} {formatPrice(sol.price * qty)}
                      </span>
                    ) : (
                      isRTL ? 'غير مضاف' : 'Not added'
                    )}
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => updateRoomSolutionQuantity(currentRoom.id, sol.id, Math.max(0, qty - 1))}
                      disabled={qty === 0}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <span className="w-7 text-center font-bold text-sm">
                      {qty}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-lg",
                        qty > 0 ? "border-primary text-primary" : ""
                      )}
                      onClick={() => updateRoomSolutionQuantity(currentRoom.id, sol.id, qty + 1)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Auto-Coordinator Alert (SONOFF Zigbee Bridge Pro rule) */}
      {includesZigbee && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-start gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Network className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs md:text-sm">
            <div className="flex items-center gap-2">
              <h5 className="font-bold text-amber-700 dark:text-amber-400">
                {isRTL ? 'منسق شبكة زيجبي المركزي مضاف تلقائياً (SONOFF Zigbee Bridge Pro)' : 'Auto-Coordinated Zigbee Bridge Pro'}
              </h5>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300">
                {formatPrice(ZIGBEE_COORDINATOR.price)}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 leading-relaxed">
              {isRTL 
                ? 'نظراً لاختيار أجهزة أو حساسات تعمل بتقنية الزيجبي اللاسلكية، قمنا تلقائياً بإضافة بوابة سونوف المركزية ZBBridge-P لربطها بشبكة الواي فاي المنزلية وضمان استقرار الإشارات.'
                : 'Since Zigbee sensors or devices were chosen, SONOFF Zigbee Bridge Pro is auto-included to coordinate the wireless mesh and bridge to your home Wi-Fi network.'
              }
            </p>
          </div>
        </motion.div>
      )}

      {/* Bottom Bar: Room & Project Status */}
      <div className="p-4 rounded-2xl bg-card border border-border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div>
            <span className="text-xs text-muted-foreground block">
              {isRTL ? `أجهزة ${currentRoom.name}:` : `${currentRoom.name} Devices:`}
            </span>
            <span className="font-bold text-base text-foreground">
              {roomItemCount} {isRTL ? 'أجهزة' : 'items'} • {formatPrice(roomTotal)}
            </span>
          </div>

          <div className="h-8 w-px bg-border hidden sm:block" />

          <div>
            <span className="text-xs text-muted-foreground block">
              {isRTL ? 'إجمالي مشروع المنزل الذكي:' : 'Total Project Hardware:'}
            </span>
            <span className="font-bold text-lg text-primary">
              {formatPrice(projectSubtotal)}
            </span>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <Button
            variant="outline"
            onClick={handlePrev}
            className="gap-2"
          >
            {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {isRTL ? 'السابق' : 'Back'}
          </Button>

          <Button
            onClick={handleNext}
            className="gap-2 px-6 font-bold shadow-md shadow-primary/20"
          >
            {currentRoomIndex < rooms.length - 1 ? (
              <>
                {isRTL ? 'الغرفة التالية' : 'Next Room'}
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {isRTL ? 'عرض المقايسة الفنية وعرض السعر' : 'View Detailed Quote & BOM'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
