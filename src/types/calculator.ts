export type PropertyType = 'apartment' | 'villa' | 'duplex' | 'office';

export type RoomType = 
  | 'living_room'
  | 'bedroom'
  | 'master_bedroom'
  | 'kitchen'
  | 'bathroom'
  | 'dining_room'
  | 'office'
  | 'hallway'
  | 'entrance'
  | 'balcony'
  | 'garden'
  | 'garage'
  | 'kids_room'
  | 'guest_room';

export interface Room {
  id: string;
  type: RoomType;
  name: string;
  features: RoomFeature[];
}

export interface RoomFeature {
  id: string;
  type: FeatureType;
  enabled: boolean;
  quantity: number;
}

export type FeatureType = 
  | 'smart_lighting'
  | 'smart_curtains'
  | 'smart_ac'
  | 'motion_sensor'
  | 'door_sensor'
  | 'temperature_sensor'
  | 'smart_lock'
  | 'camera'
  | 'intercom'
  | 'smart_plug'
  | 'smart_switch'
  | 'rgb_lighting'
  | 'water_leak_sensor'
  | 'smoke_detector'
  | 'smart_thermostat';

export interface DeviceRecommendation {
  productId: string;
  productName: string;
  brand: string;
  price: number;
  quantity: number;
  roomId: string;
  roomName: string;
  featureType: FeatureType;
  imageUrl?: string;
}

export interface QuoteData {
  id?: string;
  propertyType: PropertyType;
  rooms: Room[];
  devices: DeviceRecommendation[];
  subtotal: number;
  installationFee: number;
  total: number;
  email?: string;
  phone?: string;
  floorPlanUrl?: string;
  aiAnalysis?: FloorPlanAnalysis;
}

export interface FloorPlanAnalysis {
  roomsDetected: { type: RoomType; name: string; count: number }[];
  suggestedFeatures: { roomType: RoomType; features: FeatureType[] }[];
  estimatedArea?: number;
  notes?: string;
}

export const PROPERTY_TYPES: { type: PropertyType; nameEn: string; nameAr: string; icon: string; description: string }[] = [
  { type: 'apartment', nameEn: 'Apartment', nameAr: 'شقة', icon: '🏢', description: 'Residential unit in a building' },
  { type: 'villa', nameEn: 'Villa', nameAr: 'فيلا', icon: '🏡', description: 'Standalone house with garden' },
  { type: 'duplex', nameEn: 'Duplex', nameAr: 'دوبلكس', icon: '🏠', description: 'Two-floor connected apartment' },
  { type: 'office', nameEn: 'Office', nameAr: 'مكتب', icon: '💼', description: 'Commercial workspace' },
];

export const ROOM_TYPES: { type: RoomType; nameEn: string; nameAr: string; icon: string }[] = [
  { type: 'living_room', nameEn: 'Living Room', nameAr: 'غرفة المعيشة', icon: '🛋️' },
  { type: 'bedroom', nameEn: 'Bedroom', nameAr: 'غرفة نوم', icon: '🛏️' },
  { type: 'master_bedroom', nameEn: 'Master Bedroom', nameAr: 'غرفة النوم الرئيسية', icon: '👑' },
  { type: 'kitchen', nameEn: 'Kitchen', nameAr: 'مطبخ', icon: '🍳' },
  { type: 'bathroom', nameEn: 'Bathroom', nameAr: 'حمام', icon: '🚿' },
  { type: 'dining_room', nameEn: 'Dining Room', nameAr: 'غرفة الطعام', icon: '🍽️' },
  { type: 'office', nameEn: 'Home Office', nameAr: 'مكتب منزلي', icon: '💻' },
  { type: 'hallway', nameEn: 'Hallway', nameAr: 'ممر', icon: '🚪' },
  { type: 'entrance', nameEn: 'Entrance', nameAr: 'مدخل', icon: '🚶' },
  { type: 'balcony', nameEn: 'Balcony', nameAr: 'بلكونة', icon: '🌅' },
  { type: 'garden', nameEn: 'Garden', nameAr: 'حديقة', icon: '🌳' },
  { type: 'garage', nameEn: 'Garage', nameAr: 'جراج', icon: '🚗' },
  { type: 'kids_room', nameEn: 'Kids Room', nameAr: 'غرفة أطفال', icon: '🧸' },
  { type: 'guest_room', nameEn: 'Guest Room', nameAr: 'غرفة ضيوف', icon: '🛎️' },
];

export const FEATURE_TYPES: { type: FeatureType; nameEn: string; nameAr: string; icon: string; basePrice: number }[] = [
  { type: 'smart_lighting', nameEn: 'Smart Lighting', nameAr: 'إضاءة ذكية', icon: '💡', basePrice: 500 },
  { type: 'smart_curtains', nameEn: 'Smart Curtains', nameAr: 'ستائر ذكية', icon: '🪟', basePrice: 2500 },
  { type: 'smart_ac', nameEn: 'Smart AC Control', nameAr: 'تحكم تكييف ذكي', icon: '❄️', basePrice: 800 },
  { type: 'motion_sensor', nameEn: 'Motion Sensor', nameAr: 'حساس حركة', icon: '👁️', basePrice: 600 },
  { type: 'door_sensor', nameEn: 'Door/Window Sensor', nameAr: 'حساس باب/نافذة', icon: '🚪', basePrice: 500 },
  { type: 'temperature_sensor', nameEn: 'Temperature Sensor', nameAr: 'حساس حرارة', icon: '🌡️', basePrice: 400 },
  { type: 'smart_lock', nameEn: 'Smart Lock', nameAr: 'قفل ذكي', icon: '🔐', basePrice: 3500 },
  { type: 'camera', nameEn: 'Security Camera', nameAr: 'كاميرا مراقبة', icon: '📹', basePrice: 1500 },
  { type: 'intercom', nameEn: 'Smart Intercom', nameAr: 'انتركم ذكي', icon: '📞', basePrice: 4000 },
  { type: 'smart_plug', nameEn: 'Smart Plug', nameAr: 'مقبس ذكي', icon: '🔌', basePrice: 350 },
  { type: 'smart_switch', nameEn: 'Smart Switch', nameAr: 'مفتاح ذكي', icon: '🔘', basePrice: 800 },
  { type: 'rgb_lighting', nameEn: 'RGB/Mood Lighting', nameAr: 'إضاءة ملونة', icon: '🌈', basePrice: 700 },
  { type: 'water_leak_sensor', nameEn: 'Water Leak Sensor', nameAr: 'حساس تسرب مياه', icon: '💧', basePrice: 500 },
  { type: 'smoke_detector', nameEn: 'Smart Smoke Detector', nameAr: 'كاشف دخان ذكي', icon: '🔥', basePrice: 800 },
  { type: 'smart_thermostat', nameEn: 'Smart Thermostat', nameAr: 'ترموستات ذكي', icon: '🎛️', basePrice: 1200 },
];

// Default features by room type
export const DEFAULT_ROOM_FEATURES: Record<RoomType, FeatureType[]> = {
  living_room: ['smart_lighting', 'smart_curtains', 'smart_ac', 'motion_sensor'],
  bedroom: ['smart_lighting', 'smart_curtains', 'smart_ac'],
  master_bedroom: ['smart_lighting', 'smart_curtains', 'smart_ac', 'rgb_lighting'],
  kitchen: ['smart_lighting', 'smart_plug', 'smoke_detector', 'water_leak_sensor'],
  bathroom: ['smart_lighting', 'water_leak_sensor', 'motion_sensor'],
  dining_room: ['smart_lighting', 'smart_curtains'],
  office: ['smart_lighting', 'smart_ac', 'smart_plug'],
  hallway: ['smart_lighting', 'motion_sensor'],
  entrance: ['smart_lighting', 'smart_lock', 'camera', 'intercom', 'motion_sensor'],
  balcony: ['smart_lighting', 'camera'],
  garden: ['smart_lighting', 'camera', 'motion_sensor'],
  garage: ['smart_lighting', 'camera', 'door_sensor'],
  kids_room: ['smart_lighting', 'smart_curtains', 'smart_ac', 'motion_sensor'],
  guest_room: ['smart_lighting', 'smart_curtains', 'smart_ac'],
};
