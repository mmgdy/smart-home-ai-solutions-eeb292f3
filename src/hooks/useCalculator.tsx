import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  PropertyType, 
  PresetTemplateId,
  WiringType,
  Room, 
  RoomType, 
  DeviceRecommendation,
  QuoteData,
  FloorPlanAnalysis,
  MASTER_SOLUTIONS,
  ZIGBEE_COORDINATOR,
  PRESET_TEMPLATES,
  DEFAULT_ROOM_FEATURES,
  FEATURE_TYPES,
  FeatureType,
  RoomFeature
} from '@/types/calculator';

interface CalculatorState {
  // Current step (1-4)
  step: number;
  
  // Project setup
  propertyType: PropertyType | null;
  presetTemplate: PresetTemplateId;
  wiringType: WiringType;
  quoteNumber: string;
  quoteDate: string;
  
  // Rooms and BOM
  rooms: Room[];
  devices: DeviceRecommendation[];
  floorPlanUrl: string | null;
  aiAnalysis: FloorPlanAnalysis | null;
  
  // Client contact info
  customerName: string;
  email: string;
  phone: string;
  
  // Actions
  setStep: (step: number) => void;
  setPropertyType: (type: PropertyType, templateId?: PresetTemplateId) => void;
  setPresetTemplate: (templateId: PresetTemplateId) => void;
  setWiringType: (wiring: WiringType) => void;
  applyPresetTemplate: (templateId: PresetTemplateId) => void;
  addRoom: (type: RoomType, name: string, initialSolutions?: Record<string, number>) => void;
  removeRoom: (roomId: string) => void;
  renameRoom: (roomId: string, name: string) => void;
  updateRoomSolutionQuantity: (roomId: string, solutionId: string, quantity: number) => void;
  updateRoomFeature: (roomId: string, featureType: FeatureType, enabled: boolean, quantity?: number) => void;
  setFloorPlanUrl: (url: string | null) => void;
  setAiAnalysis: (analysis: FloorPlanAnalysis | null) => void;
  applyAiAnalysis: () => void;
  setContactInfo: (customerName: string, email: string, phone: string) => void;
  generateDevices: () => void;
  getQuoteData: () => QuoteData;
  reset: () => void;
  
  // Financial Calculations
  getSubtotal: () => number;
  getInstallationFee: () => number;
  getTotal: () => number;
  hasZigbeeDevices: () => boolean;
}

const generateId = () => Math.random().toString(36).substring(2, 10);

const generateQuoteNumber = () => {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(10000 + Math.random() * 90000);
  return `AZK-QT-${year}-${randomPart}`;
};

const createDefaultFeatures = (roomType: RoomType): RoomFeature[] => {
  const defaultFeatures = DEFAULT_ROOM_FEATURES[roomType] || [];
  return FEATURE_TYPES.map(ft => ({
    id: generateId(),
    type: ft.type,
    enabled: defaultFeatures.includes(ft.type),
    quantity: 1,
  }));
};

const buildRoomsFromTemplate = (templateId: PresetTemplateId, wiring: WiringType): Room[] => {
  const template = PRESET_TEMPLATES.find(t => t.id === templateId) || PRESET_TEMPLATES[1];
  return template.defaultRooms.map(dr => {
    // If wiring is no_neutral, convert switch_minir4 to switch_no_neutral
    const adaptedSolutions: Record<string, number> = {};
    for (const [solId, qty] of Object.entries(dr.solutions)) {
      if (wiring === 'no_neutral' && solId === 'switch_minir4') {
        adaptedSolutions['switch_no_neutral'] = qty;
      } else {
        adaptedSolutions[solId] = qty;
      }
    }

    return {
      id: generateId(),
      type: dr.type,
      name: dr.nameAr,
      solutions: adaptedSolutions,
      features: createDefaultFeatures(dr.type),
    };
  });
};

export const useCalculator = create<CalculatorState>()(
  persist(
    (set, get) => ({
      step: 1,
      propertyType: 'apartment',
      presetTemplate: 'apartment_2bed',
      wiringType: 'neutral',
      quoteNumber: generateQuoteNumber(),
      quoteDate: new Date().toISOString(),
      rooms: buildRoomsFromTemplate('apartment_2bed', 'neutral'),
      devices: [],
      floorPlanUrl: null,
      aiAnalysis: null,
      customerName: '',
      email: '',
      phone: '',

      setStep: (step) => set({ step }),

      setPropertyType: (type, templateId) => {
        const currentTemplate = templateId || get().presetTemplate;
        const currentWiring = get().wiringType;
        const newRooms = buildRoomsFromTemplate(currentTemplate, currentWiring);
        set({ 
          propertyType: type, 
          presetTemplate: currentTemplate,
          rooms: newRooms,
          step: 2 
        });
      },

      setPresetTemplate: (templateId) => {
        const wiring = get().wiringType;
        const newRooms = buildRoomsFromTemplate(templateId, wiring);
        set({ 
          presetTemplate: templateId,
          rooms: newRooms 
        });
      },

      setWiringType: (wiring) => {
        const { rooms } = get();
        // Adapt switches across existing rooms
        const updatedRooms = rooms.map(room => {
          const newSolutions = { ...room.solutions };
          if (wiring === 'no_neutral') {
            if (newSolutions['switch_minir4']) {
              newSolutions['switch_no_neutral'] = (newSolutions['switch_no_neutral'] || 0) + newSolutions['switch_minir4'];
              delete newSolutions['switch_minir4'];
            }
          } else {
            if (newSolutions['switch_no_neutral']) {
              newSolutions['switch_minir4'] = (newSolutions['switch_minir4'] || 0) + newSolutions['switch_no_neutral'];
              delete newSolutions['switch_no_neutral'];
            }
          }
          return { ...room, solutions: newSolutions };
        });

        set({ wiringType: wiring, rooms: updatedRooms });
      },

      applyPresetTemplate: (templateId) => {
        const wiring = get().wiringType;
        const newRooms = buildRoomsFromTemplate(templateId, wiring);
        set({ 
          presetTemplate: templateId,
          rooms: newRooms,
          step: 2 
        });
      },

      addRoom: (type, name, initialSolutions) => {
        const wiring = get().wiringType;
        const defaultSwitch = wiring === 'no_neutral' ? 'switch_no_neutral' : 'switch_minir4';
        const solutions = initialSolutions || { [defaultSwitch]: 2 };

        const room: Room = {
          id: generateId(),
          type,
          name,
          solutions,
          features: createDefaultFeatures(type),
        };
        set((state) => ({ rooms: [...state.rooms, room] }));
      },

      removeRoom: (roomId) => {
        set((state) => ({ 
          rooms: state.rooms.filter(r => r.id !== roomId) 
        }));
      },

      renameRoom: (roomId, name) => {
        set((state) => ({
          rooms: state.rooms.map(r => r.id === roomId ? { ...r, name } : r)
        }));
      },

      updateRoomSolutionQuantity: (roomId, solutionId, quantity) => {
        set((state) => ({
          rooms: state.rooms.map(room => {
            if (room.id !== roomId) return room;
            const updatedSolutions = { ...room.solutions };
            if (quantity <= 0) {
              delete updatedSolutions[solutionId];
            } else {
              updatedSolutions[solutionId] = quantity;
            }
            return { ...room, solutions: updatedSolutions };
          }),
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
        const { aiAnalysis, wiringType } = get();
        if (!aiAnalysis) return;

        const defaultSwitch = wiringType === 'no_neutral' ? 'switch_no_neutral' : 'switch_minir4';
        const newRooms: Room[] = [];
        
        aiAnalysis.roomsDetected.forEach(detected => {
          for (let i = 0; i < detected.count; i++) {
            const roomName = detected.count > 1 
              ? `${detected.name} ${i + 1}` 
              : detected.name;
            
            const suggestedFeatures = aiAnalysis.suggestedFeatures.find(
              sf => sf.roomType === detected.type
            )?.features || DEFAULT_ROOM_FEATURES[detected.type] || [];

            const initialSolutions: Record<string, number> = { [defaultSwitch]: 2 };
            if (suggestedFeatures.includes('smart_ac')) initialSolutions['wifi_ir_ac'] = 1;
            if (suggestedFeatures.includes('smart_curtains')) initialSolutions['curtain_motor'] = 1;
            if (suggestedFeatures.includes('smart_lock')) initialSolutions['smart_lock_lezn'] = 1;
            if (suggestedFeatures.includes('motion_sensor')) initialSolutions['motion_sensor_snzb03'] = 1;
            if (suggestedFeatures.includes('door_sensor')) initialSolutions['door_sensor_snzb04'] = 1;
            if (suggestedFeatures.includes('camera')) initialSolutions['camera_indoor_ptz'] = 1;
            if (suggestedFeatures.includes('water_leak_sensor')) initialSolutions['water_leak_snzb05'] = 1;
            if (suggestedFeatures.includes('smoke_detector')) initialSolutions['smoke_sensor_tuya'] = 1;

            const room: Room = {
              id: generateId(),
              type: detected.type,
              name: roomName,
              solutions: initialSolutions,
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

      setContactInfo: (customerName, email, phone) => set({ customerName, email, phone }),

      hasZigbeeDevices: () => {
        const { rooms } = get();
        return rooms.some(room => {
          return Object.entries(room.solutions).some(([solId, qty]) => {
            if (qty <= 0) return false;
            const sol = MASTER_SOLUTIONS.find(s => s.id === solId);
            return sol?.protocol === 'zigbee';
          });
        });
      },

      generateDevices: () => {
        const { rooms } = get();
        const devices: DeviceRecommendation[] = [];
        let zigbeeDeviceCount = 0;

        rooms.forEach(room => {
          Object.entries(room.solutions).forEach(([solId, qty]) => {
            if (qty <= 0) return;
            const sol = MASTER_SOLUTIONS.find(s => s.id === solId);
            if (!sol) return;

            if (sol.protocol === 'zigbee') {
              zigbeeDeviceCount += qty;
            }

            devices.push({
              productId: sol.productId,
              productName: sol.nameEn,
              productSlug: sol.productSlug,
              brand: sol.nameEn.startsWith('SONOFF') ? 'SONOFF' : 'AzkaSmart',
              price: sol.price,
              quantity: qty,
              roomId: room.id,
              roomName: room.name,
              solutionId: sol.id,
              category: sol.category,
              protocol: sol.protocol,
              imageUrl: sol.imageUrl,
              isCoordinator: false,
            });
          });
        });

        // 🧠 Auto-Coordinator Rule (planner.sonoff.tech engine):
        // If ANY Zigbee device is selected in the project, automatically include SONOFF Zigbee Bridge Pro
        if (zigbeeDeviceCount > 0) {
          devices.push({
            productId: ZIGBEE_COORDINATOR.productId,
            productName: ZIGBEE_COORDINATOR.nameEn,
            productSlug: ZIGBEE_COORDINATOR.productSlug,
            brand: 'SONOFF',
            price: ZIGBEE_COORDINATOR.price,
            quantity: 1,
            roomId: 'central_coordinator',
            roomName: 'Central Gateway / البوابة المركزية',
            solutionId: ZIGBEE_COORDINATOR.id,
            category: 'coordinator',
            protocol: 'zigbee',
            imageUrl: ZIGBEE_COORDINATOR.imageUrl,
            isCoordinator: true,
          });
        }

        set({ devices, step: 4 });
      },

      getQuoteData: () => {
        const state = get();
        const createdDate = new Date();
        const validDate = new Date(createdDate.getTime() + 15 * 24 * 60 * 60 * 1000);

        return {
          quoteNumber: state.quoteNumber || generateQuoteNumber(),
          createdAt: createdDate.toISOString(),
          validUntil: validDate.toISOString(),
          propertyType: state.propertyType || 'apartment',
          presetTemplate: state.presetTemplate,
          wiringType: state.wiringType,
          rooms: state.rooms,
          devices: state.devices,
          subtotal: state.getSubtotal(),
          installationFee: state.getInstallationFee(),
          total: state.getTotal(),
          customerName: state.customerName,
          email: state.email,
          phone: state.phone,
          floorPlanUrl: state.floorPlanUrl || undefined,
          aiAnalysis: state.aiAnalysis || undefined,
        };
      },

      reset: () => {
        const newQuoteNum = generateQuoteNumber();
        const defaultWiring = 'neutral';
        const defaultRooms = buildRoomsFromTemplate('apartment_2bed', defaultWiring);
        set({
          step: 1,
          propertyType: 'apartment',
          presetTemplate: 'apartment_2bed',
          wiringType: defaultWiring,
          quoteNumber: newQuoteNum,
          quoteDate: new Date().toISOString(),
          rooms: defaultRooms,
          devices: [],
          floorPlanUrl: null,
          aiAnalysis: null,
          customerName: '',
          email: '',
          phone: '',
        });
      },

      getSubtotal: () => {
        const { rooms } = get();
        let subtotal = 0;
        let zigbeeDeviceCount = 0;

        rooms.forEach(room => {
          Object.entries(room.solutions).forEach(([solId, qty]) => {
            if (qty <= 0) return;
            const sol = MASTER_SOLUTIONS.find(s => s.id === solId);
            if (!sol) return;
            subtotal += sol.price * qty;
            if (sol.protocol === 'zigbee') {
              zigbeeDeviceCount += qty;
            }
          });
        });

        // Add coordinator if Zigbee is active
        if (zigbeeDeviceCount > 0) {
          subtotal += ZIGBEE_COORDINATOR.price;
        }

        return subtotal;
      },

      getInstallationFee: () => {
        const subtotal = get().getSubtotal();
        if (subtotal === 0) return 0;
        // Certified Installation Rule: 20% of equipment total, with minimum 1,500 EGP per visit across Egypt
        return Math.max(1500, Math.round(subtotal * 0.20));
      },

      getTotal: () => {
        return get().getSubtotal() + get().getInstallationFee();
      },
    }),
    {
      name: 'azkasmart-solution-planner-v2',
      partialize: (state) => ({
        propertyType: state.propertyType,
        presetTemplate: state.presetTemplate,
        wiringType: state.wiringType,
        quoteNumber: state.quoteNumber,
        quoteDate: state.quoteDate,
        rooms: state.rooms,
        devices: state.devices,
        step: state.step,
        customerName: state.customerName,
        email: state.email,
        phone: state.phone,
        floorPlanUrl: state.floorPlanUrl,
      }),
    }
  )
);
