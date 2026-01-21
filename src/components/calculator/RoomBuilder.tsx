import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCalculator } from '@/hooks/useCalculator';
import { ROOM_TYPES, RoomType } from '@/types/calculator';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function RoomBuilder() {
  const { rooms, addRoom, removeRoom, setStep, propertyType } = useCalculator();
  const { isRTL } = useLanguage();
  const [showRoomPicker, setShowRoomPicker] = useState(false);

  const roomCounts = rooms.reduce((acc, room) => {
    acc[room.type] = (acc[room.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleAddRoom = (type: RoomType) => {
    const roomInfo = ROOM_TYPES.find(rt => rt.type === type)!;
    const count = (roomCounts[type] || 0) + 1;
    const name = count > 1 
      ? `${isRTL ? roomInfo.nameAr : roomInfo.nameEn} ${count}` 
      : (isRTL ? roomInfo.nameAr : roomInfo.nameEn);
    addRoom(type, name);
    setShowRoomPicker(false);
  };

  const handleRemoveLastOfType = (type: RoomType) => {
    const roomsOfType = rooms.filter(r => r.type === type);
    if (roomsOfType.length > 0) {
      removeRoom(roomsOfType[roomsOfType.length - 1].id);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <motion.span 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm tracking-[0.2em] uppercase text-primary font-medium block mb-3"
        >
          Step 2 of 4
        </motion.span>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-display text-3xl md:text-4xl font-bold"
        >
          {isRTL ? 'حدد الغرف والمساحات' : 'Define Your Rooms'}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground mt-3"
        >
          {isRTL 
            ? 'أضف الغرف الموجودة في منزلك وحدد عددها'
            : 'Add the rooms in your home and specify quantities'
          }
        </motion.p>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {ROOM_TYPES.map((rt, index) => {
          const count = roomCounts[rt.type] || 0;
          return (
            <motion.div
              key={rt.type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * index }}
              className={cn(
                "relative p-4 rounded-xl border-2 transition-all",
                count > 0 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/30"
              )}
            >
              <div className="text-center mb-3">
                <span className="text-2xl">{rt.icon}</span>
                <h4 className="font-medium text-sm mt-1">
                  {isRTL ? rt.nameAr : rt.nameEn}
                </h4>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleRemoveLastOfType(rt.type)}
                  disabled={count === 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-bold">{count}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleAddRoom(rt.type)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Selected Rooms Summary */}
      {rooms.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-card border border-border"
        >
          <h4 className="font-medium mb-3">
            {isRTL ? 'الغرف المحددة' : 'Selected Rooms'} ({rooms.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {rooms.map((room) => {
              const roomInfo = ROOM_TYPES.find(rt => rt.type === room.type);
              return (
                <div
                  key={room.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-sm"
                >
                  <span>{roomInfo?.icon}</span>
                  <span>{room.name}</span>
                  <button
                    onClick={() => removeRoom(room.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={() => setStep(1)}
          className="gap-2"
        >
          {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {isRTL ? 'السابق' : 'Back'}
        </Button>
        <Button
          onClick={() => setStep(3)}
          disabled={rooms.length === 0}
          className="gap-2"
        >
          {isRTL ? 'التالي' : 'Continue'}
          {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
