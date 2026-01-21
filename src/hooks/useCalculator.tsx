import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  PropertyType, 
  Room, 
  RoomType, 
  RoomFeature, 
  FeatureType,
  DeviceRecommendation,
  QuoteData,
  FloorPlanAnalysis,
  DEFAULT_ROOM_FEATURES,
  FEATURE_TYPES
} from '@/types/calculator';

interface CalculatorState {
  // Current step (1-4)
  step: number;
  
  // Quote data
  propertyType: PropertyType | null;
  rooms: Room[];
  devices: DeviceRecommendation[];
  floorPlanUrl: string | null;
  aiAnalysis: FloorPlanAnalysis | null;
  
  // Contact info
  email: string;
  phone: string;
  
  // Actions
  setStep: (step: number) => void;
  setPropertyType: (type: PropertyType) => void;
  addRoom: (type: RoomType, name: string) => void;
  removeRoom: (roomId: string) => void;
  updateRoomFeature: (roomId: string, featureType: FeatureType, enabled: boolean, quantity?: number) => void;
  setFloorPlanUrl: (url: string | null) => void;
  setAiAnalysis: (analysis: FloorPlanAnalysis | null) => void;
  applyAiAnalysis: () => void;
  setContactInfo: (email: string, phone: string) => void;
  generateDevices: () => void;
  getQuoteData: () => QuoteData;
  reset: () => void;
  
  // Calculated values
  getSubtotal: () => number;
  getInstallationFee: () => number;
  getTotal: () => number;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const createDefaultFeatures = (roomType: RoomType): RoomFeature[] => {
  const defaultFeatures = DEFAULT_ROOM_FEATURES[roomType] || [];
  return FEATURE_TYPES.map(ft => ({
    id: generateId(),
    type: ft.type,
    enabled: defaultFeatures.includes(ft.type),
    quantity: 1,
  }));
};

export const useCalculator = create<CalculatorState>()(
  persist(
    (set, get) => ({
      step: 1,
      propertyType: null,
      rooms: [],
      devices: [],
      floorPlanUrl: null,
      aiAnalysis: null,
      email: '',
      phone: '',

      setStep: (step) => set({ step }),

      setPropertyType: (type) => set({ propertyType: type, step: 2 }),

      addRoom: (type, name) => {
        const room: Room = {
          id: generateId(),
          type,
          name,
          features: createDefaultFeatures(type),
        };
        set((state) => ({ rooms: [...state.rooms, room] }));
      },

      removeRoom: (roomId) => {
        set((state) => ({ 
          rooms: state.rooms.filter(r => r.id !== roomId) 
        }));
      },

      updateRoomFeature: (roomId, featureType, enabled, quantity = 1) => {
        set((state) => ({
          rooms: state.rooms.map(room => {
            if (room.id !== roomId) return room;
            return {
              ...room,
              features: room.features.map(f => 
                f.type === featureType ? { ...f, enabled, quantity } : f
              ),
            };
          }),
        }));
      },

      setFloorPlanUrl: (url) => set({ floorPlanUrl: url }),

      setAiAnalysis: (analysis) => set({ aiAnalysis: analysis }),

      applyAiAnalysis: () => {
        const { aiAnalysis } = get();
        if (!aiAnalysis) return;

        const newRooms: Room[] = [];
        
        aiAnalysis.roomsDetected.forEach(detected => {
          for (let i = 0; i < detected.count; i++) {
            const roomName = detected.count > 1 
              ? `${detected.name} ${i + 1}` 
              : detected.name;
            
            const suggestedFeatures = aiAnalysis.suggestedFeatures.find(
              sf => sf.roomType === detected.type
            )?.features || DEFAULT_ROOM_FEATURES[detected.type] || [];

            const room: Room = {
              id: generateId(),
              type: detected.type,
              name: roomName,
              features: FEATURE_TYPES.map(ft => ({
                id: generateId(),
                type: ft.type,
                enabled: suggestedFeatures.includes(ft.type),
                quantity: 1,
              })),
            };
            newRooms.push(room);
          }
        });

        set({ rooms: newRooms, step: 3 });
      },

      setContactInfo: (email, phone) => set({ email, phone }),

      generateDevices: () => {
        const { rooms } = get();
        const devices: DeviceRecommendation[] = [];

        rooms.forEach(room => {
          room.features
            .filter(f => f.enabled)
            .forEach(feature => {
              const featureInfo = FEATURE_TYPES.find(ft => ft.type === feature.type);
              if (!featureInfo) return;

              devices.push({
                productId: generateId(),
                productName: featureInfo.nameEn,
                brand: 'SONOFF',
                price: featureInfo.basePrice,
                quantity: feature.quantity,
                roomId: room.id,
                roomName: room.name,
                featureType: feature.type,
              });
            });
        });

        set({ devices, step: 4 });
      },

      getQuoteData: () => {
        const state = get();
        return {
          propertyType: state.propertyType!,
          rooms: state.rooms,
          devices: state.devices,
          subtotal: state.getSubtotal(),
          installationFee: state.getInstallationFee(),
          total: state.getTotal(),
          email: state.email,
          phone: state.phone,
          floorPlanUrl: state.floorPlanUrl || undefined,
          aiAnalysis: state.aiAnalysis || undefined,
        };
      },

      reset: () => set({
        step: 1,
        propertyType: null,
        rooms: [],
        devices: [],
        floorPlanUrl: null,
        aiAnalysis: null,
        email: '',
        phone: '',
      }),

      getSubtotal: () => {
        const { devices } = get();
        return devices.reduce((sum, d) => sum + (d.price * d.quantity), 0);
      },

      getInstallationFee: () => {
        const subtotal = get().getSubtotal();
        // Installation is 15% of subtotal, minimum 500 EGP
        return Math.max(500, Math.round(subtotal * 0.15));
      },

      getTotal: () => {
        return get().getSubtotal() + get().getInstallationFee();
      },
    }),
    {
      name: 'smart-home-calculator',
      partialize: (state) => ({
        propertyType: state.propertyType,
        rooms: state.rooms,
        devices: state.devices,
        step: state.step,
        email: state.email,
        phone: state.phone,
        floorPlanUrl: state.floorPlanUrl,
      }),
    }
  )
);
