export type PropertyType = 'apartment' | 'villa' | 'duplex' | 'office';

export type PresetTemplateId = 'studio' | 'apartment_2bed' | 'apartment_3bed' | 'villa' | 'custom';

export type WiringType = 'neutral' | 'no_neutral';

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

export type SolutionCategory = 
  | 'lighting'
  | 'climate'
  | 'curtains'
  | 'security'
  | 'energy'
  | 'coordinator';

export interface CatalogSolution {
  id: string;
  productId: string;
  productSlug: string;
  nameEn: string;
  nameAr: string;
  category: SolutionCategory;
  protocol: 'wifi' | 'zigbee' | 'rf' | 'matter';
  neutralRequired: boolean;
  price: number;
  imageUrl: string;
  badge?: string;
  descriptionEn: string;
  descriptionAr: string;
  recommendedForRooms?: RoomType[];
}

export interface RoomSolutionItem {
  solutionId: string;
  quantity: number;
}

export interface Room {
  id: string;
  type: RoomType;
  name: string;
  solutions: Record<string, number>; // solutionId -> quantity
  features: RoomFeature[]; // for legacy/AI analysis compatibility
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
  productSlug?: string;
  brand: string;
  price: number;
  quantity: number;
  roomId: string;
  roomName: string;
  featureType?: FeatureType;
  solutionId?: string;
  category?: SolutionCategory;
  protocol?: 'wifi' | 'zigbee' | 'rf' | 'matter';
  imageUrl?: string;
  isCoordinator?: boolean;
}

export interface QuoteData {
  id?: string;
  quoteNumber: string;
  createdAt: string;
  validUntil: string;
  propertyType: PropertyType;
  presetTemplate?: PresetTemplateId;
  wiringType?: WiringType;
  rooms: Room[];
  devices: DeviceRecommendation[];
  subtotal: number;
  installationFee: number;
  total: number;
  customerName?: string;
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

// ─── MASTER CATALOG SOLUTIONS (100% Grounded in Live Database) ───────────

export const MASTER_SOLUTIONS: CatalogSolution[] = [
  // 💡 LIGHTING & SWITCHES
  {
    id: 'switch_minir4',
    productId: '85ba2d61-6b50-455a-881c-e374a31ae20f',
    productSlug: 'sonoff-mini-extreme-wi-fi-smart-switch-minir4',
    nameEn: 'SONOFF MINI Extreme Wi-Fi Switch (MINIR4)',
    nameAr: 'مفتاح ذكي واي فاي مدمج خلف الحائط (MINIR4)',
    category: 'lighting',
    protocol: 'wifi',
    neutralRequired: true,
    price: 990,
    imageUrl: 'https://api.smartzoom.tech/uploads/cloudinary/react-products/uhx4s4e7vj4o1q2t3w4y.webp',
    badge: 'Best Seller',
    descriptionEn: 'Fits into existing wall switch boxes to convert regular switches into smart Wi-Fi controls.',
    descriptionAr: 'يركب داخل علبة المفاتيح القائمة لتحويل الإضاءة العادية إلى ذكية عبر الموبايل والمساعد الصوتي.',
    recommendedForRooms: ['living_room', 'bedroom', 'master_bedroom', 'kitchen', 'bathroom', 'office', 'dining_room', 'hallway', 'entrance', 'balcony', 'garden', 'garage', 'kids_room', 'guest_room']
  },
  {
    id: 'switch_no_neutral',
    productId: '7bf1229f-5192-493a-867c-d67b2ff639e3',
    productSlug: 'sonoff-switchman-zigbee-smart-wall-switch-zb-m5-us-1c',
    nameEn: 'SONOFF SwitchMan No-Neutral Zigbee Wall Switch (ZB M5)',
    nameAr: 'مفتاح ذكي زيجبي حائطي بدون نيوترال (ZB M5)',
    category: 'lighting',
    protocol: 'zigbee',
    neutralRequired: false,
    price: 1620,
    imageUrl: 'https://api.smartzoom.tech/uploads/cloudinary/react-products/uhx4s4e7vj4o1q2t3w4y.webp',
    badge: 'No-Neutral Wire Required',
    descriptionEn: 'Ideal for buildings without neutral wiring inside switch boxes. Ultra-stable Zigbee operation.',
    descriptionAr: 'الحل المثالي للمباني القديمة التي لا تحتوي على سلك نيوترال داخل علب المفاتيح.',
    recommendedForRooms: ['living_room', 'bedroom', 'master_bedroom', 'kitchen', 'bathroom', 'office', 'dining_room']
  },
  {
    id: 'rgbic_strip',
    productId: 'fe653459-95d6-46d3-934d-552636970712',
    productSlug: 'sonoff-l3-pro-rgbic-smart-led-strip-lights-5m-16-4ft',
    nameEn: 'SONOFF L3 Pro RGBIC Smart LED Strip (5M)',
    nameAr: 'شريط ليد ذكي ملون متدرج (L3 Pro RGBIC 5M)',
    category: 'lighting',
    protocol: 'wifi',
    neutralRequired: false,
    price: 1620,
    imageUrl: 'https://api.smartzoom.tech/uploads/cloudinary/react-products/dcoylyuk1t8est3z6284.jpg',
    badge: 'Mood & Cine Light',
    descriptionEn: '5-meter RGBIC strip with dynamic segmented color effects, music sync & voice control.',
    descriptionAr: 'شريط ليد ٥ أمتار مع إضاءة ديناميكية متدرجة ومزامنة مع الموسيقى والسينما.',
    recommendedForRooms: ['living_room', 'master_bedroom', 'kids_room']
  },

  // ❄️ CLIMATE & AC
  {
    id: 'wifi_ir_ac',
    productId: 'c09cf591-1a4b-41b0-9c12-af393de45dac',
    productSlug: 'wifi-ir-remote-control-2069',
    nameEn: 'WiFi Smart Universal IR AC Remote Control',
    nameAr: 'ريموت تكييف ذكي يونيفرسال واي فاي (IR Remote)',
    category: 'climate',
    protocol: 'wifi',
    neutralRequired: false,
    price: 756,
    imageUrl: 'https://electro-z-smart.com/wp-content/uploads/2026/07/ir.avif',
    badge: 'Smart AC Control',
    descriptionEn: 'Replaces remote controls to manage any AC brand from anywhere with temperature scheduling.',
    descriptionAr: 'يتحكم في جميع أجهزة التكييف والشاشات من الموبايل مع جدولة التشغيل المسبق وتوفير الطاقة.',
    recommendedForRooms: ['living_room', 'bedroom', 'master_bedroom', 'office', 'kids_room', 'guest_room']
  },
  {
    id: 'temp_sensor_snzb02',
    productId: '5a051372-4619-46f8-8e7b-c4e0c5caecc3',
    productSlug: 'sonoff-snzb-02d-zigbee-lcd-smart-temperature-humidity-sensor',
    nameEn: 'SONOFF SNZB-02D Zigbee LCD Temp & Humidity Sensor',
    nameAr: 'حساس حرارة ورطوبة ذكي بشاشة LCD زيجبي (SNZB-02D)',
    category: 'climate',
    protocol: 'zigbee',
    neutralRequired: false,
    price: 1000,
    imageUrl: 'https://api.smartzoom.tech/uploads/cloudinary/react-products/ekctmjeadjlxtdnlgyfr.webp',
    badge: 'LCD Display',
    descriptionEn: 'Real-time temperature and humidity monitoring with LCD screen and automatic AC triggers.',
    descriptionAr: 'مراقبة فورية للحرارة والرطوبة مع شاشة واضحة وتشغيل ذكي تلقائي للتكييف.',
    recommendedForRooms: ['living_room', 'master_bedroom', 'kids_room', 'office']
  },

  // 🪟 MOTORIZED CURTAINS
  {
    id: 'curtain_motor',
    productId: '94d205b3-5d57-43f8-aa73-7a4cd43851ad',
    productSlug: 'sonoff-zigbee-smart-curtain-motor-1282',
    nameEn: 'SONOFF Zigbee Smart Motorized Curtain System',
    nameAr: 'موتور ستائر ذكي زيجبي فائق الهدوء (SONOFF Curtain)',
    category: 'curtains',
    protocol: 'zigbee',
    neutralRequired: true,
    price: 6300,
    imageUrl: 'https://electro-z-smart.com/wp-content/uploads/2025/07/Zigbee-Smart-Curtain-Motor-1.webp',
    badge: 'Whisper Quiet',
    descriptionEn: 'Automated curtain motor with timer schedules, percentage opening, and remote control.',
    descriptionAr: 'موتور هادئ لفتح وغلق الستائر تلقائياً حسب أوقات الشروق والغروب أو بالأوامر الصوتية.',
    recommendedForRooms: ['living_room', 'master_bedroom', 'bedroom', 'dining_room']
  },

  // 🔒 SECURITY & ACCESS CONTROL
  {
    id: 'smart_lock_lezn',
    productId: 'e9276157-9431-4a86-9c72-5303baa0d441',
    productSlug: 'lezn-i11-smart-lock-2516-2111',
    nameEn: 'Lezn i11 Biometric Smart Door Lock',
    nameAr: 'كالون باب ذكي بالبصمة والكارت والموبايل (Lezn i11)',
    category: 'security',
    protocol: 'wifi',
    neutralRequired: false,
    price: 9730,
    imageUrl: 'https://electro-z-smart.com/wp-content/uploads/2026/08/i11.webp',
    badge: 'Biometric Access',
    descriptionEn: 'High-security smart lock with 3D semiconductor fingerprint, passcode, RFID card, app and keys.',
    descriptionAr: 'قفل ذكي فائق الأمان للأبواب المصفحة والخشبية: بصمة إصبع سريعة، رقم سري، كارت ذكي وموبايل.',
    recommendedForRooms: ['entrance']
  },
  {
    id: 'door_sensor_snzb04',
    productId: '07c69af5-4d42-4044-838b-909a4b5f6242',
    productSlug: 'sonoff-zigbee-door-window-sensor-snzb-04p',
    nameEn: 'SONOFF Zigbee Magnetic Door/Window Sensor (SNZB-04P)',
    nameAr: 'حساس باب وشباك مغناطيسي ذكي زيجبي (SNZB-04P)',
    category: 'security',
    protocol: 'zigbee',
    neutralRequired: false,
    price: 1120,
    imageUrl: 'https://api.smartzoom.tech/uploads/cloudinary/react-products/llawxmcgujbeihgatrby.webp',
    badge: 'Tamper Alarm',
    descriptionEn: 'Instant push notifications when doors or windows open. Triggers smart lighting automations.',
    descriptionAr: 'إشعارات فورية عند فتح الأبواب أو النوافذ مع إمكانية تشغيل الإضاءة تلقائياً عند الدخول.',
    recommendedForRooms: ['entrance', 'balcony', 'garage']
  },
  {
    id: 'motion_sensor_snzb03',
    productId: '9ac4ee7a-fa62-46c1-9dec-55dac0a9d8ab',
    productSlug: 'sonoff-zigbee-motion-sensor-snzb-03p',
    nameEn: 'SONOFF Zigbee PIR Smart Motion Sensor (SNZB-03P)',
    nameAr: 'حساس حركة ذكي زيجبي للإنارة والأمان (SNZB-03P)',
    category: 'security',
    protocol: 'zigbee',
    neutralRequired: false,
    price: 900,
    imageUrl: 'https://electro-z-smart.com/wp-content/uploads/2025/07/SNZB-03P-1.jpg',
    badge: 'Fast Detection',
    descriptionEn: 'Wide-angle PIR motion detection for automated hands-free lighting and security alarms.',
    descriptionAr: 'استشعار دقيق للحركة لتشغيل الإنارة تلقائياً في الممرات والحمامات وتنبيهات الأمان.',
    recommendedForRooms: ['hallway', 'entrance', 'bathroom', 'living_room', 'garage', 'garden']
  },
  {
    id: 'camera_indoor_ptz',
    productId: '80db88e1-5520-4d67-a9ed-d488ce3c72ff',
    productSlug: 'sonoff-cam-pan-tilt-2-smart-indoor-home-security-camera-cam-pt2',
    nameEn: 'SONOFF CAM Pan-Tilt 2 Indoor 360° Camera (CAM-PT2)',
    nameAr: 'كاميرا مراقبة داخلية متحركة ٣٦٠ درجة (CAM-PT2)',
    category: 'security',
    protocol: 'wifi',
    neutralRequired: false,
    price: 1850,
    imageUrl: 'https://api.smartzoom.tech/uploads/cloudinary/react-products/c3njvfult47hmnimiagp.png',
    badge: '360° PTZ HD',
    descriptionEn: 'Full 360° pan-tilt indoor security camera with motion tracking, two-way audio, and night vision.',
    descriptionAr: 'كاميرا متحركة تغطي الغرفة بالكامل مع تتبع الحركة والتحدث الصوتي ثنائي الاتجاه ورؤية ليلية.',
    recommendedForRooms: ['living_room', 'entrance', 'kids_room']
  },
  {
    id: 'camera_outdoor_b1',
    productId: '962f19b9-2efb-4cd3-a335-a7e8b441d88d',
    productSlug: 'sonoff-cam-outdoor-smart-security-camera-cam-b1p',
    nameEn: 'SONOFF CAM Outdoor Smart Security Camera (CAM-B1P)',
    nameAr: 'كاميرا مراقبة خارجية مقاومة للطقس والمطر (CAM-B1P)',
    category: 'security',
    protocol: 'wifi',
    neutralRequired: false,
    price: 1950,
    imageUrl: 'https://api.smartzoom.tech/uploads/cloudinary/react-products/abbkkzb4pm9dr1ukmt1n.png',
    badge: 'IP65 Weatherproof',
    descriptionEn: 'IP65 waterproof outdoor security camera with spotlights, siren alert, and high-def streaming.',
    descriptionAr: 'كاميرا خارجية قوية مقاومة للأمطار والشمس مع كشافات ليلية وجهاز إنذار صوتي.',
    recommendedForRooms: ['garden', 'garage', 'balcony', 'entrance']
  },
  {
    id: 'water_leak_snzb05',
    productId: 'd2af34ce-2edb-42f2-bf18-600b0c4bb9b0',
    productSlug: 'sonoff-zigbee-water-leak-sensor-snzb-05p',
    nameEn: 'SONOFF Zigbee Smart Water Leak Sensor (SNZB-05P)',
    nameAr: 'حساس تسريب المياه الذكي زيجبي (SNZB-05P)',
    category: 'security',
    protocol: 'zigbee',
    neutralRequired: false,
    price: 990,
    imageUrl: 'https://electro-z-smart.com/wp-content/uploads/2025/07/SNZB-05P-1.jpg',
    badge: 'Flood Defense',
    descriptionEn: 'Instant flood detection around sinks, washing machines, and water heaters to prevent damage.',
    descriptionAr: 'إنذار فوري عند أي تسريب مياه بجوار السخانات أو الغسالات والمطابخ لحماية الأرضيات.',
    recommendedForRooms: ['kitchen', 'bathroom']
  },
  {
    id: 'smoke_sensor_tuya',
    productId: 'b4a0b125-99b1-428f-8f3e-aa31d54a4a29',
    productSlug: 'tuya-zigbee-smoke-sensor-without-battery',
    nameEn: 'Tuya Zigbee Smart Smoke & Fire Alarm Detector',
    nameAr: 'كاشف دخان وحرائق ذكي زيجبي (Tuya Smoke Alarm)',
    category: 'security',
    protocol: 'zigbee',
    neutralRequired: false,
    price: 1125,
    imageUrl: 'https://api.smartzoom.tech/uploads/cloudinary/react-products/dcoylyuk1t8est3z6284.jpg',
    badge: 'Life Safety',
    descriptionEn: 'Loud acoustic buzzer + instant mobile phone notifications upon detecting smoke or fire.',
    descriptionAr: 'صفارة إنذار قوية وتنبيه مباشر لهاتفك عند تصاعد الدخان لحماية الأسرة والممتلكات.',
    recommendedForRooms: ['kitchen', 'living_room', 'bedroom', 'garage']
  },

  // ⚡ ENERGY & APPLIANCE CONTROL
  {
    id: 'power_meter_pow_elite',
    productId: '97c7590b-d117-4848-ab31-f94daf478738',
    productSlug: 'sonoff-pow-elite-smart-power-meter-switch-powr320d',
    nameEn: 'SONOFF POW Elite 20A Smart Power Meter Switch (POWR320D)',
    nameAr: 'قاطع ذكي لقياس استهلاك الكهرباء ٢٠ أمبير بشاشة (POW Elite)',
    category: 'energy',
    protocol: 'wifi',
    neutralRequired: true,
    price: 1680,
    imageUrl: 'https://api.smartzoom.tech/uploads/cloudinary/react-products/f5ydtz0j5nlozpyre2i2.webp',
    badge: '20A Heavy Duty LCD',
    descriptionEn: 'Monitors real-time kWh power consumption with overload protection for heaters and heavy appliances.',
    descriptionAr: 'يقيس استهلاك الكهرباء الفعلي بالكيلووات ويحمي السخانات والغسالات من ارتفاع التيار.',
    recommendedForRooms: ['kitchen', 'bathroom', 'office']
  }
];

// ─── CENTRAL COORDINATOR (Auto-Added when Zigbee devices are chosen) ─────

export const ZIGBEE_COORDINATOR: CatalogSolution = {
  id: 'zigbee_bridge_pro',
  productId: '41d0f5b2-6e96-4104-a622-56391f08d3cc',
  productSlug: 'sonoff-zigbee-bridge-pro-zbbridge-p',
  nameEn: 'SONOFF Zigbee Bridge Pro Hub (ZBBridge-P)',
  nameAr: 'بوابة زيجبي الذكية المركزية (SONOFF Zigbee Bridge Pro)',
  category: 'coordinator',
  protocol: 'zigbee',
  neutralRequired: false,
  price: 1500,
  imageUrl: 'https://api.smartzoom.tech/uploads/cloudinary/react-products/tpvg8ybchslaf6kbuiws.webp',
  badge: 'Required Zigbee Coordinator',
  descriptionEn: 'Central brain connecting all Zigbee sensors, smart locks, and switches to your Wi-Fi network.',
  descriptionAr: 'العقل المركزي لربط جميع حساسات وأجهزة الزيجبي بشبكة الواي فاي المنزلية وضمان استقرارها.'
};

// ─── PROPERTY TYPES ──────────────────────────────────────────────────────

export const PROPERTY_TYPES: { type: PropertyType; nameEn: string; nameAr: string; icon: string; description: string }[] = [
  { type: 'apartment', nameEn: 'Apartment', nameAr: 'شقة سكنية', icon: '🏢', description: 'Residential unit in a building (1-4 bedrooms)' },
  { type: 'villa', nameEn: 'Villa / Townhouse', nameAr: 'فيلا أو تاون هاوس', icon: '🏡', description: 'Standalone house with garden and private entrance' },
  { type: 'duplex', nameEn: 'Duplex / Penthouse', nameAr: 'دوبلكس أو بنتهاوس', icon: '🏠', description: 'Multi-floor interconnected residential space' },
  { type: 'office', nameEn: 'Office / Commercial', nameAr: 'مكتب إداري أو شركة', icon: '💼', description: 'Commercial business workspace or clinic' },
];

// ─── PRESET TEMPLATES (Inspired by planner.sonoff.tech) ───────────────────

export interface PresetTemplate {
  id: PresetTemplateId;
  nameEn: string;
  nameAr: string;
  icon: string;
  descEn: string;
  descAr: string;
  defaultRooms: {
    type: RoomType;
    nameEn: string;
    nameAr: string;
    solutions: Record<string, number>;
  }[];
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'studio',
    nameEn: 'Studio / 1-Bedroom',
    nameAr: 'ستوديو / غرفة واحدة',
    icon: '🛋️',
    descEn: 'Starter automation for compact apartments and modern studios (30–60 m²)',
    descAr: 'أتمتة ذكية أساسية للمساحات العصرية واستوديوهات العمل (٣٠-٦٠ م²)',
    defaultRooms: [
      { 
        type: 'living_room', 
        nameEn: 'Living & Bedroom', 
        nameAr: 'المعيشة والنوم', 
        solutions: { switch_minir4: 2, wifi_ir_ac: 1, curtain_motor: 1 } 
      },
      { 
        type: 'kitchen', 
        nameEn: 'Kitchenette', 
        nameAr: 'المطبخ', 
        solutions: { switch_minir4: 1, water_leak_snzb05: 1, smoke_sensor_tuya: 1 } 
      },
      { 
        type: 'bathroom', 
        nameEn: 'Bathroom', 
        nameAr: 'الحمام', 
        solutions: { switch_minir4: 1, water_leak_snzb05: 1 } 
      },
      { 
        type: 'entrance', 
        nameEn: 'Entrance', 
        nameAr: 'المدخل', 
        solutions: { smart_lock_lezn: 1, door_sensor_snzb04: 1, camera_indoor_ptz: 1 } 
      },
    ]
  },
  {
    id: 'apartment_2bed',
    nameEn: '2-Bedroom Family Apartment',
    nameAr: 'شقة عائلية (غرفتين نوم)',
    icon: '🏢',
    descEn: 'Complete comfort, lighting, climate & security package (80–140 m²)',
    descAr: 'باقة شاملة للراحة والإنارة والتكييف والأمان للشقق العائلية (٨٠-١٤٠ م²)',
    defaultRooms: [
      { 
        type: 'living_room', 
        nameEn: 'Living & Reception', 
        nameAr: 'الريسبشن والمعيشة', 
        solutions: { switch_minir4: 3, rgbic_strip: 1, wifi_ir_ac: 1, temp_sensor_snzb02: 1, curtain_motor: 1 } 
      },
      { 
        type: 'master_bedroom', 
        nameEn: 'Master Bedroom', 
        nameAr: 'غرفة النوم الرئيسية', 
        solutions: { switch_minir4: 2, wifi_ir_ac: 1, temp_sensor_snzb02: 1, curtain_motor: 1 } 
      },
      { 
        type: 'bedroom', 
        nameEn: 'Second Bedroom', 
        nameAr: 'غرفة نوم ثانية', 
        solutions: { switch_minir4: 2, wifi_ir_ac: 1 } 
      },
      { 
        type: 'kitchen', 
        nameEn: 'Kitchen', 
        nameAr: 'المطبخ', 
        solutions: { switch_minir4: 2, power_meter_pow_elite: 1, smoke_sensor_tuya: 1, water_leak_snzb05: 1 } 
      },
      { 
        type: 'bathroom', 
        nameEn: 'Master Bathroom', 
        nameAr: 'الحمام الرئيسي', 
        solutions: { switch_minir4: 1, water_leak_snzb05: 1 } 
      },
      { 
        type: 'bathroom', 
        nameEn: 'Guest Bathroom', 
        nameAr: 'حمام الضيوف', 
        solutions: { switch_minir4: 1 } 
      },
      { 
        type: 'entrance', 
        nameEn: 'Main Entrance', 
        nameAr: 'المدخل والممر', 
        solutions: { smart_lock_lezn: 1, door_sensor_snzb04: 1, motion_sensor_snzb03: 1, camera_indoor_ptz: 1 } 
      },
    ]
  },
  {
    id: 'apartment_3bed',
    nameEn: '3-Bedroom Luxury Apartment',
    nameAr: 'شقة واسعة (٣ غرف نوم)',
    icon: '🏠',
    descEn: 'Full-featured smart living across multiple zones with heavy power protection (150–250 m²)',
    descAr: 'تحكم ذكي شامل في كل الأجنحة مع حماية استهلاك الكهرباء والأمان (١٥٠-٢٥٠ م²)',
    defaultRooms: [
      { 
        type: 'living_room', 
        nameEn: 'Main Reception & Salon', 
        nameAr: 'الصالون والمعيشة', 
        solutions: { switch_minir4: 4, rgbic_strip: 1, wifi_ir_ac: 2, temp_sensor_snzb02: 1, curtain_motor: 2 } 
      },
      { 
        type: 'dining_room', 
        nameEn: 'Dining Room', 
        nameAr: 'غرفة السفرة', 
        solutions: { switch_minir4: 2 } 
      },
      { 
        type: 'master_bedroom', 
        nameEn: 'Master Suite', 
        nameAr: 'جناح النوم الرئيسي', 
        solutions: { switch_minir4: 2, wifi_ir_ac: 1, temp_sensor_snzb02: 1, curtain_motor: 1 } 
      },
      { 
        type: 'bedroom', 
        nameEn: 'Kids Bedroom', 
        nameAr: 'غرفة نوم الأطفال', 
        solutions: { switch_minir4: 2, wifi_ir_ac: 1 } 
      },
      { 
        type: 'bedroom', 
        nameEn: 'Guest Bedroom', 
        nameAr: 'غرفة الضيوف', 
        solutions: { switch_minir4: 2, wifi_ir_ac: 1 } 
      },
      { 
        type: 'kitchen', 
        nameEn: 'Kitchen', 
        nameAr: 'المطبخ', 
        solutions: { switch_minir4: 2, power_meter_pow_elite: 1, smoke_sensor_tuya: 1, water_leak_snzb05: 1 } 
      },
      { 
        type: 'bathroom', 
        nameEn: 'Master Bath', 
        nameAr: 'حمام الماستر', 
        solutions: { switch_minir4: 1, water_leak_snzb05: 1 } 
      },
      { 
        type: 'bathroom', 
        nameEn: 'Guest Bath', 
        nameAr: 'حمام الضيوف', 
        solutions: { switch_minir4: 1 } 
      },
      { 
        type: 'entrance', 
        nameEn: 'Entrance & Hallway', 
        nameAr: 'المدخل والممر', 
        solutions: { smart_lock_lezn: 1, door_sensor_snzb04: 1, motion_sensor_snzb03: 1, camera_indoor_ptz: 1 } 
      },
      { 
        type: 'balcony', 
        nameEn: 'Terrace & Balcony', 
        nameAr: 'التراس والبلكونة', 
        solutions: { switch_minir4: 1 } 
      },
    ]
  },
  {
    id: 'villa',
    nameEn: 'Luxury Villa / Mansion',
    nameAr: 'فيلا أو قصر راقي',
    icon: '🏡',
    descEn: 'End-to-end multi-story automation with outdoor perimeter security & garden (300+ m²)',
    descAr: 'تغطية شاملة لكل الطوابق والحديقة والمداخل مع كاميرات خارجية ضد المطر (+٣٠٠ م²)',
    defaultRooms: [
      { 
        type: 'entrance', 
        nameEn: 'Main Gate & Entrance', 
        nameAr: 'المدخل الرئيسي والبوابة', 
        solutions: { smart_lock_lezn: 1, door_sensor_snzb04: 1, motion_sensor_snzb03: 1, camera_outdoor_b1: 1 } 
      },
      { 
        type: 'living_room', 
        nameEn: 'Grand Reception & Hall', 
        nameAr: 'الصالون الكبير والريسبشن', 
        solutions: { switch_minir4: 4, rgbic_strip: 2, wifi_ir_ac: 2, temp_sensor_snzb02: 1, curtain_motor: 2 } 
      },
      { 
        type: 'dining_room', 
        nameEn: 'Formal Dining Area', 
        nameAr: 'غرفة الطعام الرسمية', 
        solutions: { switch_minir4: 2 } 
      },
      { 
        type: 'master_bedroom', 
        nameEn: 'Master Suite', 
        nameAr: 'جناح النوم الرئيسي', 
        solutions: { switch_minir4: 3, rgbic_strip: 1, wifi_ir_ac: 1, temp_sensor_snzb02: 1, curtain_motor: 1 } 
      },
      { 
        type: 'bedroom', 
        nameEn: 'Bedroom 2', 
        nameAr: 'غرفة نوم ٢', 
        solutions: { switch_minir4: 2, wifi_ir_ac: 1 } 
      },
      { 
        type: 'bedroom', 
        nameEn: 'Bedroom 3', 
        nameAr: 'غرفة نوم ٣', 
        solutions: { switch_minir4: 2, wifi_ir_ac: 1 } 
      },
      { 
        type: 'office', 
        nameEn: 'Executive Home Office', 
        nameAr: 'المكتب الإداري', 
        solutions: { switch_minir4: 2, wifi_ir_ac: 1, power_meter_pow_elite: 1 } 
      },
      { 
        type: 'kitchen', 
        nameEn: 'Chef Kitchen', 
        nameAr: 'المطبخ الرئيسي', 
        solutions: { switch_minir4: 2, power_meter_pow_elite: 1, smoke_sensor_tuya: 1, water_leak_snzb05: 1 } 
      },
      { 
        type: 'bathroom', 
        nameEn: 'Master Bathroom', 
        nameAr: 'الحمام الرئيسي', 
        solutions: { switch_minir4: 1, water_leak_snzb05: 1 } 
      },
      { 
        type: 'bathroom', 
        nameEn: 'Guest Bathroom', 
        nameAr: 'حمام الضيوف', 
        solutions: { switch_minir4: 1 } 
      },
      { 
        type: 'garden', 
        nameEn: 'Garden & Pool Patio', 
        nameAr: 'الحديقة وحمام السباحة', 
        solutions: { switch_minir4: 2, camera_outdoor_b1: 2 } 
      },
      { 
        type: 'garage', 
        nameEn: 'Garage & Driveway', 
        nameAr: 'الجراج والسيارات', 
        solutions: { switch_minir4: 1, motion_sensor_snzb03: 1, camera_outdoor_b1: 1 } 
      },
    ]
  },
  {
    id: 'custom',
    nameEn: 'Custom Plan (Blank Canvas)',
    nameAr: 'تخطيط مخصص (من الصفر)',
    icon: '✨',
    descEn: 'Build your custom layout room by room exactly to your specifications',
    descAr: 'حدد كل غرفة وأجهزتها بحرية تامة خطوة بخطوة حسب مخططك الخاص',
    defaultRooms: []
  }
];

// ─── ROOM TYPES ──────────────────────────────────────────────────────────

export const ROOM_TYPES: { type: RoomType; nameEn: string; nameAr: string; icon: string }[] = [
  { type: 'living_room', nameEn: 'Living Room', nameAr: 'غرفة المعيشة والريسبشن', icon: '🛋️' },
  { type: 'bedroom', nameEn: 'Bedroom', nameAr: 'غرفة نوم', icon: '🛏️' },
  { type: 'master_bedroom', nameEn: 'Master Bedroom', nameAr: 'غرفة النوم الرئيسية', icon: '👑' },
  { type: 'kitchen', nameEn: 'Kitchen', nameAr: 'مطبخ', icon: '🍳' },
  { type: 'bathroom', nameEn: 'Bathroom', nameAr: 'حمام', icon: '🚿' },
  { type: 'dining_room', nameEn: 'Dining Room', nameAr: 'غرفة الطعام', icon: '🍽️' },
  { type: 'office', nameEn: 'Home Office', nameAr: 'مكتب منزلي', icon: '💻' },
  { type: 'hallway', nameEn: 'Hallway', nameAr: 'ممر', icon: '🚪' },
  { type: 'entrance', nameEn: 'Entrance', nameAr: 'المدخل الرئيسي', icon: '🚶' },
  { type: 'balcony', nameEn: 'Balcony / Terrace', nameAr: 'بلكونة / تراس', icon: '🌅' },
  { type: 'garden', nameEn: 'Garden', nameAr: 'حديقة', icon: '🌳' },
  { type: 'garage', nameEn: 'Garage', nameAr: 'جراج', icon: '🚗' },
  { type: 'kids_room', nameEn: 'Kids Room', nameAr: 'غرفة أطفال', icon: '🧸' },
  { type: 'guest_room', nameEn: 'Guest Room', nameAr: 'غرفة ضيوف', icon: '🛎️' },
];

export const FEATURE_TYPES: { type: FeatureType; nameEn: string; nameAr: string; icon: string; basePrice: number }[] = [
  { type: 'smart_lighting', nameEn: 'Smart Lighting', nameAr: 'إضاءة ذكية', icon: '💡', basePrice: 990 },
  { type: 'smart_curtains', nameEn: 'Smart Curtains', nameAr: 'ستائر ذكية', icon: '🪟', basePrice: 6300 },
  { type: 'smart_ac', nameEn: 'Smart AC Control', nameAr: 'تحكم تكييف ذكي', icon: '❄️', basePrice: 756 },
  { type: 'motion_sensor', nameEn: 'Motion Sensor', nameAr: 'حساس حركة', icon: '👁️', basePrice: 900 },
  { type: 'door_sensor', nameEn: 'Door/Window Sensor', nameAr: 'حساس باب/نافذة', icon: '🚪', basePrice: 1120 },
  { type: 'temperature_sensor', nameEn: 'Temperature Sensor', nameAr: 'حساس حرارة', icon: '🌡️', basePrice: 1000 },
  { type: 'smart_lock', nameEn: 'Smart Lock', nameAr: 'قفل ذكي بالبصمة', icon: '🔐', basePrice: 9730 },
  { type: 'camera', nameEn: 'Security Camera', nameAr: 'كاميرا مراقبة', icon: '📹', basePrice: 1850 },
  { type: 'intercom', nameEn: 'Smart Intercom', nameAr: 'انتركم ذكي', icon: '📞', basePrice: 4000 },
  { type: 'smart_plug', nameEn: 'Smart Plug', nameAr: 'مقبس ذكي', icon: '🔌', basePrice: 900 },
  { type: 'smart_switch', nameEn: 'Smart Switch', nameAr: 'مفتاح ذكي', icon: '🔘', basePrice: 990 },
  { type: 'rgb_lighting', nameEn: 'RGB/Mood Lighting', nameAr: 'إضاءة ملونة', icon: '🌈', basePrice: 1620 },
  { type: 'water_leak_sensor', nameEn: 'Water Leak Sensor', nameAr: 'حساس تسرب مياه', icon: '💧', basePrice: 990 },
  { type: 'smoke_detector', nameEn: 'Smart Smoke Detector', nameAr: 'كاشف دخان ذكي', icon: '🔥', basePrice: 1125 },
  { type: 'smart_thermostat', nameEn: 'Smart Thermostat', nameAr: 'ترموستات ذكي', icon: '🎛️', basePrice: 1260 },
];

export const DEFAULT_ROOM_FEATURES: Record<RoomType, FeatureType[]> = {
  living_room: ['smart_lighting', 'smart_curtains', 'smart_ac', 'motion_sensor', 'rgb_lighting'],
  bedroom: ['smart_lighting', 'smart_curtains', 'smart_ac'],
  master_bedroom: ['smart_lighting', 'smart_curtains', 'smart_ac', 'rgb_lighting', 'temperature_sensor'],
  kitchen: ['smart_lighting', 'smoke_detector', 'water_leak_sensor'],
  bathroom: ['smart_lighting', 'water_leak_sensor', 'motion_sensor'],
  dining_room: ['smart_lighting', 'smart_curtains'],
  office: ['smart_lighting', 'smart_ac'],
  hallway: ['smart_lighting', 'motion_sensor'],
  entrance: ['smart_lighting', 'smart_lock', 'camera', 'door_sensor', 'motion_sensor'],
  balcony: ['smart_lighting', 'camera'],
  garden: ['smart_lighting', 'camera', 'motion_sensor'],
  garage: ['smart_lighting', 'camera', 'door_sensor'],
  kids_room: ['smart_lighting', 'smart_curtains', 'smart_ac'],
  guest_room: ['smart_lighting', 'smart_curtains', 'smart_ac'],
};
