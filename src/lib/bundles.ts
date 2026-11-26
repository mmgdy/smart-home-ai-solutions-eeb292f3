import type { Product } from '@/types/store';
import { isProductHidden } from '@/lib/productVisibility';

export interface BundleItemConfig {
  nameMatch: string;
  qty: number;
  productId?: string;
  slug?: string;
}

export interface AdminBundle {
  id: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  priceEgp: number;
  originalPrice: number;
  devicesEn: string | string[];
  devicesAr: string | string[];
  savingsEn: string;
  savingsAr: string;
  difficulty?: number;
  badges?: string[];
  installTimeEn?: string;
  installTimeAr?: string;
  popular?: boolean;
  freeInstallation?: boolean;
  items?: BundleItemConfig[];
}

export interface ResolvedBundleEntry {
  item: BundleItemConfig;
  product?: Product;
  qty: number;
  unavailable: boolean;
  reason?: 'hidden' | 'out_of_stock' | 'missing';
}

export interface BundleCompositionBreakdown {
  resolvedEntries: ResolvedBundleEntry[];
  allSelection: Record<string, number>;
  availableSelection: Record<string, number>;
  unavailableEntries: ResolvedBundleEntry[];
  fullCompositionTotal: number;
  availableTotal: number;
  allResolved: boolean;
}

const MINIR4M_ITEM = {
  nameMatch: 'SONOFF MINI Extreme Wi-Fi Smart Switch (Matter-enabled) | MINIR4M',
  productId: '90e2b9c6-9e8a-4f0a-829a-9c47740dc7cd',
  slug: 'sonoff-mini-extreme-wi-fi-smart-switch-matter-enabled-minir4m',
} as const;

export const defaultBundles: AdminBundle[] = [
  {
    id: 'studio',
    nameEn: 'Studio Apartment Smart Kit',
    nameAr: 'باقة الاستوديو الذكية',
    descEn: 'Perfect starter kit for studios and small apartments. Control 4 lights, AC, motion, and entry security — with FREE certified installation.',
    descAr: 'الباقة الذكية المتكاملة للاستوديو والشقق الصغيرة. تحكم في ٤ خطوط إضاءة والتكييف مع حساس حركة وحساس باب — شاملة التركيب الاحترافي مجاناً.',
    priceEgp: 7748,
    originalPrice: 9298,
    devicesEn: '4x SONOFF MINI Extreme Wi-Fi Smart Switch (Matter-enabled) | MINIR4M\n1x WiFi IR Remote Control\n1x SONOFF Zigbee Bridge Pro | ZBBridge-P\n1x SONOFF Zigbee Motion Sensor | SNZB-03P\n1x Zigbee Door and Window Sensor',
    devicesAr: '٤ مفاتيح ذكية SONOFF MINI Extreme MINIR4M\n١ ريموت تكييف ذكي WiFi IR Remote\n١ هاب SONOFF Zigbee Bridge Pro\n١ حساس حركة ذكي SONOFF Zigbee\n١ حساس أبواب وشبابيك ذكي Zigbee',
    savingsEn: 'FREE Certified Installation (Save 1,550 EGP) + Lower electricity bills',
    savingsAr: 'تركيب احترافي مجاناً (وفّر ١,٥٥٠ ج.م) + تقليل فاتورة الكهرباء',
    difficulty: 1,
    badges: ['Free Install', 'WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '2-3 hours',
    installTimeAr: '٢-٣ ساعات',
    freeInstallation: true,
    items: [
      { ...MINIR4M_ITEM, qty: 4 },
      { nameMatch: 'WiFi IR Remote Control', qty: 1, productId: 'c09cf591-1a4b-41b0-9c12-af393de45dac', slug: 'wifi-ir-remote-control-2069' },
      { nameMatch: 'SONOFF Zigbee Bridge Pro | ZBBridge-P', qty: 1, productId: '41d0f5b2-6e96-4104-a622-56391f08d3cc', slug: 'sonoff-zigbee-bridge-pro-zbbridge-p' },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 1, productId: '9ac4ee7a-fa62-46c1-9dec-55dac0a9d8ab', slug: 'sonoff-zigbee-motion-sensor-snzb-03p' },
      { nameMatch: 'Zigbee Door and Window Sensor', qty: 1, productId: 'e6f07e53-9b90-4db0-add1-716c9ec0ee90', slug: 'zigbee-door-and-window-sensor-2030' },
    ],
  },
  {
    id: '2bed',
    nameEn: '2-Bedroom Apartment Kit',
    nameAr: 'باقة شقة غرفتين',
    descEn: 'Smart lighting, climate control, smart scenes, and entry protection for a 2-bedroom home — with FREE certified installation.',
    descAr: 'إضاءة ذكية، تحكم بالتكييف، سيناريوهات تشغيل ذكية، وحماية المداخل لشقة غرفتين — شاملة التركيب الاحترافي مجاناً.',
    priceEgp: 14671,
    originalPrice: 17605,
    devicesEn: '8x SONOFF MINI Extreme Wi-Fi Smart Switch (Matter-enabled) | MINIR4M\n2x WiFi IR Remote Control\n1x SONOFF Zigbee Bridge Pro | ZBBridge-P\n2x Zigbee Door and Window Sensor\n2x SONOFF Zigbee Motion Sensor | SNZB-03P\n1x SONOFF SwitchMan R5 Scene Controller',
    devicesAr: '٨ مفاتيح ذكية SONOFF MINI Extreme MINIR4M\n٢ ريموت تكييف ذكي WiFi IR Remote\n١ هاب SONOFF Zigbee Bridge Pro\n٢ حساس أبواب وشبابيك Zigbee\n٢ حساس حركة SONOFF Zigbee\n١ ريموت سيناريوهات SONOFF SwitchMan R5',
    savingsEn: 'FREE Certified Installation (Save 2,934 EGP) + Lower electricity bills',
    savingsAr: 'تركيب احترافي مجاناً (وفّر ٢,٩٣٤ ج.م) + تقليل فاتورة الكهرباء',
    difficulty: 2,
    badges: ['Free Install', 'WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '3-4 hours',
    installTimeAr: '٣-٤ ساعات',
    freeInstallation: true,
    items: [
      { ...MINIR4M_ITEM, qty: 8 },
      { nameMatch: 'WiFi IR Remote Control', qty: 2, productId: 'c09cf591-1a4b-41b0-9c12-af393de45dac', slug: 'wifi-ir-remote-control-2069' },
      { nameMatch: 'SONOFF Zigbee Bridge Pro | ZBBridge-P', qty: 1, productId: '41d0f5b2-6e96-4104-a622-56391f08d3cc', slug: 'sonoff-zigbee-bridge-pro-zbbridge-p' },
      { nameMatch: 'Zigbee Door and Window Sensor', qty: 2, productId: 'e6f07e53-9b90-4db0-add1-716c9ec0ee90', slug: 'zigbee-door-and-window-sensor-2030' },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 2, productId: '9ac4ee7a-fa62-46c1-9dec-55dac0a9d8ab', slug: 'sonoff-zigbee-motion-sensor-snzb-03p' },
      { nameMatch: 'SONOFF SwitchMan R5 White Scene Controller', qty: 1, productId: '0cd9db82-7660-48bc-a90f-88a429668bb7', slug: 'sonoff-switchman-r5-white-scene-controller-1114' },
    ],
  },
  {
    id: '3bed',
    nameEn: '3-Bedroom Apartment Kit',
    nameAr: 'باقة شقة ٣ غرف',
    descEn: 'Complete home automation with 12 switch channels, 3 AC controllers, security sensors, temperature display, and in-line power meter — with FREE certified installation.',
    descAr: 'منظومة شاملة لـ ١٢ خط إضاءة، ٣ أجهزة تكييف، حساسات أمان، شاشة حرارة ورطوبة، وعداد رقمي لمراقبة استهلاك الطاقة — شاملة التركيب الاحترافي مجاناً.',
    priceEgp: 22699,
    originalPrice: 27239,
    devicesEn: '12x SONOFF MINI Extreme Wi-Fi Smart Switch (Matter-enabled) | MINIR4M\n3x WiFi IR Remote Control\n1x SONOFF Zigbee Bridge Pro | ZBBridge-P\n2x SONOFF Zigbee Motion Sensor | SNZB-03P\n3x Zigbee Door and Window Sensor\n1x SONOFF POW Elite Smart Power Meter Switch | POWR320D\n1x SONOFF SNZB-02D Zigbee LCD Smart Temperature Humidity Sensor\n1x SONOFF SwitchMan R5 Scene Controller',
    devicesAr: '١٢ مفتاح ذكي SONOFF MINI Extreme MINIR4M\n٣ ريموت تكييف ذكي WiFi IR Remote\n١ هاب SONOFF Zigbee Bridge Pro\n٢ حساس حركة SONOFF Zigbee\n٣ حساسات أبواب وشبابيك Zigbee\n١ عداد وقاطع طاقة ذكي SONOFF POW Elite\n١ حساس حرارة ورطوبة مع شاشة SONOFF LCD\n١ ريموت سيناريوهات SONOFF SwitchMan R5',
    savingsEn: 'FREE Certified Installation (Save 4,540 EGP) + Lower electricity bills',
    savingsAr: 'تركيب احترافي مجاناً (وفّر ٤,٥٤٠ ج.م) + تقليل فاتورة الكهرباء',
    difficulty: 2,
    badges: ['Free Install', 'WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '4-5 hours',
    installTimeAr: '٤-٥ ساعات',
    popular: true,
    freeInstallation: true,
    items: [
      { ...MINIR4M_ITEM, qty: 12 },
      { nameMatch: 'WiFi IR Remote Control', qty: 3, productId: 'c09cf591-1a4b-41b0-9c12-af393de45dac', slug: 'wifi-ir-remote-control-2069' },
      { nameMatch: 'SONOFF Zigbee Bridge Pro | ZBBridge-P', qty: 1, productId: '41d0f5b2-6e96-4104-a622-56391f08d3cc', slug: 'sonoff-zigbee-bridge-pro-zbbridge-p' },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 2, productId: '9ac4ee7a-fa62-46c1-9dec-55dac0a9d8ab', slug: 'sonoff-zigbee-motion-sensor-snzb-03p' },
      { nameMatch: 'Zigbee Door and Window Sensor', qty: 3, productId: 'e6f07e53-9b90-4db0-add1-716c9ec0ee90', slug: 'zigbee-door-and-window-sensor-2030' },
      { nameMatch: 'SONOFF POW Elite Smart Power Meter Switch | POWR320D', qty: 1, productId: '97c7590b-d117-4848-ab31-f94daf478738', slug: 'sonoff-pow-elite-smart-power-meter-switch-powr320d' },
      { nameMatch: 'SONOFF SNZB-02D Zigbee LCD Smart Temperature Humidity Sensor', qty: 1, productId: '5a051372-4619-46f8-8e7b-c4e0c5caecc3', slug: 'sonoff-snzb-02d-zigbee-lcd-smart-temperature-humidity-sensor' },
      { nameMatch: 'SONOFF SwitchMan R5 White Scene Controller', qty: 1, productId: '0cd9db82-7660-48bc-a90f-88a429668bb7', slug: 'sonoff-switchman-r5-white-scene-controller-1114' },
    ],
  },
  {
    id: 'villa-security',
    nameEn: 'Villa Security Kit',
    nameAr: 'باقة أمان الفيلا',
    descEn: 'Comprehensive security system with smart biometric lock, indoor & outdoor cameras, perimeter sensors, smoke and water leak detectors — with FREE certified installation.',
    descAr: 'نظام أمان شامل مع قفل إلكتروني ببصمة الإصبع، كاميرات مراقبة داخلية وخارجية، حساسات أبواب، وحساسات دخان وتسريب — شاملة التركيب الاحترافي مجاناً.',
    priceEgp: 23622,
    originalPrice: 28346,
    devicesEn: '1x SMART LOCK LEZN 2393 K80 black\n2x Indoor Smart Security Camera | CAM-PT2\n2x SONOFF CAM Outdoor Smart Security Camera | CAM-B1P\n1x SONOFF Zigbee Bridge Pro | ZBBridge-P\n6x Zigbee Door and Window Sensor\n2x SONOFF Zigbee Motion Sensor | SNZB-03P\n1x Zigbee Smoke Sensor (without battery)\n1x SONOFF Zigbee Water Leak Sensor | SNZB-05P',
    devicesAr: '١ قفل ذكي ببصمة الإصبع SMART LOCK LEZN K80\n٢ كاميرا مراقبة داخلية متحركة CAM-PT2\n٢ كاميرا مراقبة خارجية مقاومة للطقس SONOFF CAM-B1P\n١ هاب SONOFF Zigbee Bridge Pro\n٦ حساسات أبواب وشبابيك Zigbee\n٢ حساس حركة SONOFF Zigbee\n١ حساس إنذار دخان وحريق Zigbee\n١ حساس كشف تسريب مياه SONOFF Zigbee',
    savingsEn: 'FREE Certified Installation (Save 4,724 EGP) + 24/7 Protection',
    savingsAr: 'تركيب احترافي مجاناً (وفّر ٤,٧٢٤ ج.م) + حماية على مدار الساعة',
    difficulty: 3,
    badges: ['Free Install', 'WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '5-6 hours',
    installTimeAr: '٥-٦ ساعات',
    freeInstallation: true,
    items: [
      { nameMatch: 'Lezn K80', qty: 1, productId: '59c17f4d-cb75-46cc-9182-f6a79e1562eb', slug: 'lezn-k80-black-2393' },
      { nameMatch: 'SONOFF CAM Pan-Tilt 2 Smart Indoor Home Security Camera | CAM-PT2', qty: 2, productId: '80db88e1-5520-4d67-a9ed-d488ce3c72ff', slug: 'sonoff-cam-pan-tilt-2-smart-indoor-home-security-camera-cam-pt2' },
      { nameMatch: 'SONOFF CAM Outdoor Smart Security Camera | CAM-B1P', qty: 2, productId: '962f19b9-2efb-4cd3-a335-a7e8b441d88d', slug: 'sonoff-cam-outdoor-smart-security-camera-cam-b1p' },
      { nameMatch: 'SONOFF Zigbee Bridge Pro | ZBBridge-P', qty: 1, productId: '41d0f5b2-6e96-4104-a622-56391f08d3cc', slug: 'sonoff-zigbee-bridge-pro-zbbridge-p' },
      { nameMatch: 'Zigbee Door and Window Sensor', qty: 6, productId: 'e6f07e53-9b90-4db0-add1-716c9ec0ee90', slug: 'zigbee-door-and-window-sensor-2030' },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 2, productId: '9ac4ee7a-fa62-46c1-9dec-55dac0a9d8ab', slug: 'sonoff-zigbee-motion-sensor-snzb-03p' },
      { nameMatch: 'Zigbee Smoke Sensor (without battery)', qty: 1, productId: '851c1660-24c0-46ee-bc14-fc096a5dfc6c', slug: 'zigbee-smoke-sensor-without-battery-2055' },
      { nameMatch: 'SONOFF Zigbee Water Leak Sensor | SNZB-05P', qty: 1, productId: 'd2af34ce-2edb-42f2-bf18-600b0c4bb9b0', slug: 'sonoff-zigbee-water-leak-sensor-snzb-05p' },
    ],
  },
  {
    id: 'energy',
    nameEn: 'Energy Saving Kit',
    nameAr: 'باقة توفير الطاقة',
    descEn: 'Focused on slashing your electricity bills with real-time power metering, radar human presence sensing, LCD climate displays, and scheduled AC timers — with FREE certified installation.',
    descAr: 'تركيز فائق على تقليل فاتورة الكهرباء: عداد طاقة لمراقبة الاستهلاك لحظياً، حساس وجود بشري بالرادار، ومؤقتات تكييف ذكية — شاملة التركيب الاحترافي مجاناً.',
    priceEgp: 13526,
    originalPrice: 16231,
    devicesEn: '1x SONOFF POW Elite Smart Power Meter Switch | POWR320D\n6x SONOFF MINI Extreme Wi-Fi Smart Switch (Matter-enabled) | MINIR4M\n2x WiFi IR Remote Control\n1x SONOFF Zigbee Bridge Pro | ZBBridge-P\n2x SONOFF SNZB-02D Zigbee LCD Smart Temperature Humidity Sensor\n1x SONOFF Zigbee Human Presence Sensor | SNZB-06P',
    devicesAr: '١ عداد طاقة ذكي SONOFF POW Elite 20A\n٦ مفاتيح ذكية مع مؤقتات SONOFF MINIR4M\n٢ ريموت تكييف ذكي WiFi IR Remote\n١ هاب SONOFF Zigbee Bridge Pro\n٢ حساس حرارة ورطوبة مع شاشة LCD\n١ حساس وجود بشري بالرادار SONOFF SNZB-06P',
    savingsEn: 'FREE Certified Installation (Save 2,705 EGP) + Lower electricity bills',
    savingsAr: 'تركيب احترافي مجاناً (وفّر ٢,٧٠٥ ج.م) + تقليل فاتورة الكهرباء',
    difficulty: 1,
    badges: ['Free Install', 'WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '2-3 hours',
    installTimeAr: '٢-٣ ساعات',
    freeInstallation: true,
    items: [
      { nameMatch: 'SONOFF POW Elite Smart Power Meter Switch | POWR320D', qty: 1, productId: '97c7590b-d117-4848-ab31-f94daf478738', slug: 'sonoff-pow-elite-smart-power-meter-switch-powr320d' },
      { ...MINIR4M_ITEM, qty: 6 },
      { nameMatch: 'WiFi IR Remote Control', qty: 2, productId: 'c09cf591-1a4b-41b0-9c12-af393de45dac', slug: 'wifi-ir-remote-control-2069' },
      { nameMatch: 'SONOFF Zigbee Bridge Pro | ZBBridge-P', qty: 1, productId: '41d0f5b2-6e96-4104-a622-56391f08d3cc', slug: 'sonoff-zigbee-bridge-pro-zbbridge-p' },
      { nameMatch: 'SONOFF SNZB-02D Zigbee LCD Smart Temperature Humidity Sensor', qty: 2, productId: '5a051372-4619-46f8-8e7b-c4e0c5caecc3', slug: 'sonoff-snzb-02d-zigbee-lcd-smart-temperature-humidity-sensor' },
      { nameMatch: 'SONOFF Zigbee Human Presence Sensor | SNZB-06P', qty: 1, productId: 'ed900ce3-0d1e-4fa9-8441-fc3b76294a67', slug: 'sonoff-zigbee-human-presence-sensor-snzb-06p' },
    ],
  },
  {
    id: 'villa-full',
    nameEn: 'Full Villa Smart Home',
    nameAr: 'فيلا ذكية بالكامل',
    descEn: 'The ultimate luxury smart villa with motorized curtain, cat-eye camera lock, full surveillance, 20 lighting channels, climate automation, and Ultra hub — with FREE certified installation.',
    descAr: 'الفيلا الذكية المتكاملة الفاخرة مع ستارة ذكية بموتور، قفل ذكي بكاميرا وشاشة، مراقبة شاملة، ٢٠ خط إضاءة، وهاب ألترا متقدم — شاملة التركيب الاحترافي مجاناً.',
    priceEgp: 62442,
    originalPrice: 74930,
    devicesEn: '1x SMART LOCK PANDA 2625 i18 cat eye\n1x Smart Curtain 3 Meters (Motorized)\n2x SONOFF CAM Outdoor Smart Security Camera | CAM-B1P\n2x Indoor Smart Security Camera | CAM-PT2\n20x SONOFF MINI Extreme Wi-Fi Smart Switch (Matter-enabled) | MINIR4M\n4x WiFi IR Remote Control\n1x SONOFF Zigbee Bridge Ultra | ZBBridge-U\n6x Zigbee Door and Window Sensor\n4x SONOFF Zigbee Motion Sensor | SNZB-03P\n1x SONOFF POW Elite Smart Power Meter Switch | POWR320D\n2x SONOFF SwitchMan R5 Scene Controller',
    devicesAr: '١ قفل ذكي متطور PANDA 2625 بكاميرا وشاشة داخلية\n١ موتور وستارة كهربائية ذكية ٣ متر\n٢ كاميرا مراقبة خارجية سونوف CAM-B1P\n٢ كاميرا مراقبة داخلية متحركة CAM-PT2\n٢٠ مفتاح ذكي SONOFF MINI Extreme MINIR4M\n٤ ريموت تكييف ذكي WiFi IR Remote\n١ هاب ألترا فائق المدى SONOFF Zigbee Bridge Ultra\n٦ حساسات أبواب وشبابيك Zigbee\n٤ حساسات حركة SONOFF Zigbee\n١ قاطع وعداد طاقة ذكي SONOFF POW Elite\n٢ ريموت سيناريوهات وتحكم لاسلكي SwitchMan R5',
    savingsEn: 'FREE Certified Installation (Save 12,488 EGP) + Whole-Villa Automation',
    savingsAr: 'تركيب احترافي مجاناً (وفّر ١٢,٤٨٨ ج.م) + أتمتة شاملة للفيلا',
    difficulty: 3,
    badges: ['Free Install', 'WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '1-2 days',
    installTimeAr: '١-٢ يوم',
    freeInstallation: true,
    items: [
      { nameMatch: 'SMART LOCK PANDA 2625 i18 cat eye', qty: 1, productId: 'c8fc0ab6-4ab6-47a5-9f1f-5f3331c6214a', slug: 'smart-lock-panda-2625-i18-cat-eye-1594' },
      { nameMatch: 'Smart Curtain 3 Meters', qty: 1, productId: '512b547e-4fcd-4c1d-9347-f400b7000ac6', slug: 'smart-curtain-3-meters-1305' },
      { nameMatch: 'SONOFF CAM Outdoor Smart Security Camera | CAM-B1P', qty: 2, productId: '962f19b9-2efb-4cd3-a335-a7e8b441d88d', slug: 'sonoff-cam-outdoor-smart-security-camera-cam-b1p' },
      { nameMatch: 'SONOFF CAM Pan-Tilt 2 Smart Indoor Home Security Camera | CAM-PT2', qty: 2, productId: '80db88e1-5520-4d67-a9ed-d488ce3c72ff', slug: 'sonoff-cam-pan-tilt-2-smart-indoor-home-security-camera-cam-pt2' },
      { ...MINIR4M_ITEM, qty: 20 },
      { nameMatch: 'WiFi IR Remote Control', qty: 4, productId: 'c09cf591-1a4b-41b0-9c12-af393de45dac', slug: 'wifi-ir-remote-control-2069' },
      { nameMatch: 'SONOFF Zigbee Bridge Ultra | ZBBridge-U', qty: 1, productId: 'bf6f924a-5431-4220-a189-ca7ca0a1402b', slug: 'sonoff-zigbee-bridge-ultra-zbbridge-u' },
      { nameMatch: 'Zigbee Door and Window Sensor', qty: 6, productId: 'e6f07e53-9b90-4db0-add1-716c9ec0ee90', slug: 'zigbee-door-and-window-sensor-2030' },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 4, productId: '9ac4ee7a-fa62-46c1-9dec-55dac0a9d8ab', slug: 'sonoff-zigbee-motion-sensor-snzb-03p' },
      { nameMatch: 'SONOFF POW Elite Smart Power Meter Switch | POWR320D', qty: 1, productId: '97c7590b-d117-4848-ab31-f94daf478738', slug: 'sonoff-pow-elite-smart-power-meter-switch-powr320d' },
      { nameMatch: 'SONOFF SwitchMan R5 White Scene Controller', qty: 2, productId: '0cd9db82-7660-48bc-a90f-88a429668bb7', slug: 'sonoff-switchman-r5-white-scene-controller-1114' },
    ],
  },
];

export const splitBundleDevices = (devices: string | string[] | undefined): string[] => {
  if (Array.isArray(devices)) {
    return devices.map((d) => String(d).trim()).filter(Boolean);
  }
  return (devices || '')
    .split(/\r?\n|,\s*(?=(?:\d+\s*x?\s|[٠-٩]+\s))/u)
    .map((d) => d.trim())
    .filter(Boolean);
};

const LEGACY_PRICES = new Set([4500, 7000, 8500, 13300, 12500, 20500, 18500, 21750, 24076, 6800, 12050, 45000, 55600, 62692]);

const ITEM_PRODUCT_REF_FALLBACKS: Array<[RegExp, { productId: string; slug: string }]> = [
  [/\bminir4m\b|matter-enabled/i, { productId: '90e2b9c6-9e8a-4f0a-829a-9c47740dc7cd', slug: 'sonoff-mini-extreme-wi-fi-smart-switch-matter-enabled-minir4m' }],
  [/\bminir4\b|mini extreme/i, { productId: '85ba2d61-6b50-455a-881c-e374a31ae20f', slug: 'sonoff-mini-extreme-wi-fi-smart-switch-minir4-1044' }],
  [/wifi ir remote/i, { productId: 'c09cf591-1a4b-41b0-9c12-af393de45dac', slug: 'wifi-ir-remote-control-2069' }],
  [/zbbridge-p|zigbee bridge pro/i, { productId: '41d0f5b2-6e96-4104-a622-56391f08d3cc', slug: 'sonoff-zigbee-bridge-pro-zbbridge-p' }],
  [/zbbridge-u|zigbee bridge ultra/i, { productId: 'bf6f924a-5431-4220-a189-ca7ca0a1402b', slug: 'sonoff-zigbee-bridge-ultra-zbbridge-u' }],
  [/snzb-03p|motion sensor/i, { productId: '9ac4ee7a-fa62-46c1-9dec-55dac0a9d8ab', slug: 'sonoff-zigbee-motion-sensor-snzb-03p' }],
  [/door and window sensor/i, { productId: 'e6f07e53-9b90-4db0-add1-716c9ec0ee90', slug: 'zigbee-door-and-window-sensor-2030' }],
  [/switchman r5/i, { productId: '0cd9db82-7660-48bc-a90f-88a429668bb7', slug: 'sonoff-switchman-r5-white-scene-controller-1114' }],
  [/powr320d|pow elite/i, { productId: '97c7590b-d117-4848-ab31-f94daf478738', slug: 'sonoff-pow-elite-smart-power-meter-switch-powr320d' }],
  [/snzb-02d/i, { productId: '5a051372-4619-46f8-8e7b-c4e0c5caecc3', slug: 'sonoff-snzb-02d-zigbee-lcd-smart-temperature-humidity-sensor' }],
  [/lezn.*k80/i, { productId: '59c17f4d-cb75-46cc-9182-f6a79e1562eb', slug: 'lezn-k80-black-2393' }],
  [/cam-pt2/i, { productId: '80db88e1-5520-4d67-a9ed-d488ce3c72ff', slug: 'sonoff-cam-pan-tilt-2-smart-indoor-home-security-camera-cam-pt2' }],
  [/cam-b1p/i, { productId: '962f19b9-2efb-4cd3-a335-a7e8b441d88d', slug: 'sonoff-cam-outdoor-smart-security-camera-cam-b1p' }],
  [/smoke sensor/i, { productId: '851c1660-24c0-46ee-bc14-fc096a5dfc6c', slug: 'zigbee-smoke-sensor-without-battery-2055' }],
  [/snzb-05p|water leak/i, { productId: 'd2af34ce-2edb-42f2-bf18-600b0c4bb9b0', slug: 'sonoff-zigbee-water-leak-sensor-snzb-05p' }],
  [/snzb-06p|human presence/i, { productId: 'ed900ce3-0d1e-4fa9-8441-fc3b76294a67', slug: 'sonoff-zigbee-human-presence-sensor-snzb-06p' }],
  [/panda 2625/i, { productId: 'c8fc0ab6-4ab6-47a5-9f1f-5f3331c6214a', slug: 'smart-lock-panda-2625-i18-cat-eye-1594' }],
  [/smart curtain 3 meters/i, { productId: '512b547e-4fcd-4c1d-9347-f400b7000ac6', slug: 'smart-curtain-3-meters-1305' }],
];

const resolveBundleProductRef = (
  item: BundleItemConfig,
  defItems?: BundleItemConfig[],
): { productId?: string; slug?: string } | undefined => {
  if (item.productId && item.slug) {
    return { productId: item.productId, slug: item.slug };
  }
  const cleanName = item.nameMatch.toLowerCase();
  const defMatch = defItems?.find((d) => {
    if (item.productId && d.productId === item.productId) return true;
    if (item.slug && d.slug?.toLowerCase() === item.slug.toLowerCase()) return true;
    const dLower = d.nameMatch.toLowerCase();
    return dLower === cleanName || dLower.includes(cleanName) || cleanName.includes(dLower);
  });
  if (defMatch?.productId || defMatch?.slug) {
    return {
      productId: item.productId || defMatch.productId,
      slug: item.slug || defMatch.slug,
    };
  }
  const fallback = ITEM_PRODUCT_REF_FALLBACKS.find(([pattern]) => pattern.test(item.nameMatch));
  if (fallback) {
    return {
      productId: item.productId || fallback[1].productId,
      slug: item.slug || fallback[1].slug,
    };
  }
  return item.productId || item.slug ? { productId: item.productId, slug: item.slug } : undefined;
};

const toArabicDigits = (value: string) =>
  value.replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)] ?? digit);

export const withComputedInstallSaving = <T extends { savingsEn: string; savingsAr: string }>(
  bundle: T,
  installSaving: number,
): T => {
  const formattedEn = installSaving.toLocaleString('en-US');
  const formattedAr = toArabicDigits(formattedEn);
  return {
    ...bundle,
    savingsEn: bundle.savingsEn.replace(/\(Save [^)]+\)/i, `(Save ${formattedEn} EGP)`),
    savingsAr: bundle.savingsAr.replace(/\(وفّر [^)]+\)/, `(وفّر ${formattedAr} ج.م)`),
  };
};

export const getBundleProductRefs = (
  bundles: Array<Pick<AdminBundle, 'items'>> = defaultBundles,
): { ids: string[]; slugs: string[] } => {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const collect = (items?: BundleItemConfig[]) => {
    items?.forEach((item) => {
      const ref = resolveBundleProductRef(item);
      const pid = item.productId || ref?.productId;
      const slug = item.slug || ref?.slug;
      if (pid) ids.add(pid);
      if (slug) slugs.add(slug);
    });
  };
  bundles.forEach((b) => collect(b.items));
  defaultBundles.forEach((b) => collect(b.items));
  return { ids: Array.from(ids), slugs: Array.from(slugs) };
};

export const getBundleProductIds = (bundles: Array<Pick<AdminBundle, 'items'>> = defaultBundles): string[] =>
  getBundleProductRefs(bundles).ids;

/** Resolve a structured BundleItemConfig to a Product by id, slug, or non-hidden nameMatch */
export function resolveProductForBundleItem(
  item: BundleItemConfig,
  products: Product[],
  hiddenIds?: Set<string>,
): Product | undefined {
  if (item.productId) {
    const byId = products.find((p) => p.id === item.productId && !isProductHidden(p, hiddenIds));
    if (byId) return byId;
  }
  if (item.slug) {
    const targetSlug = item.slug.trim().toLowerCase();
    const slugMatch = products.find(
      (p) => !isProductHidden(p, hiddenIds) && p.slug?.trim().toLowerCase() === targetSlug,
    );
    if (slugMatch) return slugMatch;
  }
  const target = item.nameMatch.trim().toLowerCase();
  if (!target) return undefined;
  const visible = products.filter((p) => !isProductHidden(p, hiddenIds));
  return (
    visible.find((p) => p.name.toLowerCase() === target) ||
    visible.find((p) => p.name.toLowerCase().includes(target))
  );
}

/** Resolve all items in a bundle, separating orderable (published + in-stock) from unavailable entries */
export function getBundleCompositionBreakdown(
  bundle: Pick<AdminBundle, 'items' | 'devicesEn'>,
  products: Product[],
  hiddenIds?: Set<string>,
): BundleCompositionBreakdown {
  const resolvedEntries: ResolvedBundleEntry[] = [];
  const allSelection: Record<string, number> = {};
  const availableSelection: Record<string, number> = {};
  let fullCompositionTotal = 0;
  let availableTotal = 0;
  let allResolved = true;

  if (Array.isArray(bundle.items)) {
    const activeItems = bundle.items.filter((it) => Number(it.qty) > 0);
    if (activeItems.length === 0) allResolved = false;

    activeItems.forEach((item) => {
      const qty = Math.max(1, Math.round(Number(item.qty) || 1));
      const product = resolveProductForBundleItem(item, products, hiddenIds);
      if (!product) {
        allResolved = false;
        resolvedEntries.push({ item, qty, unavailable: true, reason: 'missing' });
        return;
      }

      const isHidden = isProductHidden(product, hiddenIds);
      const isOutOfStock = (product.stock ?? 0) <= 0;
      const unavailable = isHidden || isOutOfStock;
      const reason = isHidden ? 'hidden' : isOutOfStock ? 'out_of_stock' : undefined;

      resolvedEntries.push({ item, product, qty, unavailable, reason });
      allSelection[product.id] = (allSelection[product.id] || 0) + qty;
      fullCompositionTotal += Number(product.price) * qty;

      if (!unavailable) {
        availableSelection[product.id] = (availableSelection[product.id] || 0) + qty;
        availableTotal += Number(product.price) * qty;
      }
    });

    return {
      resolvedEntries,
      allSelection,
      availableSelection,
      unavailableEntries: resolvedEntries.filter((e) => e.unavailable),
      fullCompositionTotal,
      availableTotal,
      allResolved,
    };
  }

  // Fallback for legacy bundles without an explicit items array
  const visible = products.filter((p) => !isProductHidden(p, hiddenIds));
  const devices = splitBundleDevices(bundle.devicesEn);
  devices.forEach((d) => {
    const m = d.match(/^(\d+)\s*x?\s*(.+)$/i);
    const qty = m ? parseInt(m[1], 10) : 1;
    const term = (m ? m[2] : d).toLowerCase().replace(/^tuya\s+/i, '');
    const tokens = term.split(/[\s,/-]+/).filter((t) => t.length > 2);
    const found =
      visible.find((p) => p.name.toLowerCase() === term) ||
      visible.find((p) => p.name.toLowerCase().includes(term)) ||
      visible.find((p) => tokens.length >= 2 && tokens.every((t) => p.name.toLowerCase().includes(t))) ||
      visible.find((p) =>
        tokens.every((t) => (p.name + ' ' + (p.description || '') + ' ' + (p.brand || '')).toLowerCase().includes(t)),
      ) ||
      visible.find((p) => tokens.some((t) => p.name.toLowerCase().includes(t)));
    if (found) {
      const isOutOfStock = (found.stock ?? 0) <= 0;
      const entry: ResolvedBundleEntry = {
        item: { nameMatch: m ? m[2] : d, qty, productId: found.id, slug: found.slug },
        product: found,
        qty,
        unavailable: isOutOfStock,
        reason: isOutOfStock ? 'out_of_stock' : undefined,
      };
      resolvedEntries.push(entry);
      allSelection[found.id] = (allSelection[found.id] || 0) + qty;
      fullCompositionTotal += Number(found.price) * qty;
      if (!isOutOfStock) {
        availableSelection[found.id] = (availableSelection[found.id] || 0) + qty;
        availableTotal += Number(found.price) * qty;
      }
    } else {
      allResolved = false;
    }
  });

  return {
    resolvedEntries,
    allSelection,
    availableSelection,
    unavailableEntries: resolvedEntries.filter((e) => e.unavailable),
    fullCompositionTotal,
    availableTotal,
    allResolved: allResolved && resolvedEntries.length > 0,
  };
}

export const normalizeBundles = (bundles: AdminBundle[]) =>
  bundles.map((bundle) => {
    const def = defaultBundles.find((db) => db.id === bundle.id);
    const hasExplicitItems = Array.isArray(bundle.items);
    const useDefaultPrices = def && !hasExplicitItems && (!bundle.priceEgp || LEGACY_PRICES.has(Number(bundle.priceEgp)));
    const priceEgp = useDefaultPrices ? def.priceEgp : Number(bundle.priceEgp || 0);
    const originalPrice = useDefaultPrices ? def.originalPrice : Math.round(priceEgp * 1.2);
    const installSaving = Math.max(0, originalPrice - priceEgp);

    const rawItems = hasExplicitItems ? bundle.items : def?.items;
    const items = rawItems?.map((it) => {
      const normalizedName = it.nameMatch
        .replace(/^Tuya Zigbee Door and Window Sensor$/i, 'Zigbee Door and Window Sensor')
        .replace(/^Tuya Zigbee Smoke Sensor$/i, 'Zigbee Smoke Sensor');
      const normalizedItem: BundleItemConfig = {
        ...it,
        nameMatch: normalizedName,
        qty: Math.max(1, Math.round(Number(it.qty) || 1)),
      };
      if (normalizedItem.productId && normalizedItem.slug) {
        return normalizedItem;
      }
      const fallbackRef = resolveBundleProductRef(normalizedItem, def?.items);
      return {
        ...normalizedItem,
        productId: normalizedItem.productId || fallbackRef?.productId,
        slug: normalizedItem.slug || fallbackRef?.slug,
      };
    });

    const baseBundle = {
      ...bundle,
      priceEgp,
      originalPrice,
      descEn: bundle.descEn || def?.descEn || '',
      descAr: bundle.descAr || def?.descAr || '',
      savingsEn: bundle.savingsEn || def?.savingsEn || '',
      savingsAr: bundle.savingsAr || def?.savingsAr || '',
      devicesEn: splitBundleDevices(bundle.devicesEn ?? def?.devicesEn),
      devicesAr: splitBundleDevices(bundle.devicesAr ?? def?.devicesAr),
      difficulty: bundle.difficulty || def?.difficulty || 2,
      badges: bundle.badges?.length ? bundle.badges : def?.badges || ['Free Install', 'Alexa', 'Google', 'WiFi'],
      installTimeEn: bundle.installTimeEn || def?.installTimeEn || '3-4 hours',
      installTimeAr: bundle.installTimeAr || def?.installTimeAr || '٣-٤ ساعات',
      freeInstallation: true,
      items,
    };

    return withComputedInstallSaving(baseBundle, installSaving);
  });

/** Match a bundle's items against the loaded catalog products and return { productId: quantity } */
export function matchProductsForBundle(
  bundle: ReturnType<typeof normalizeBundles>[number] | AdminBundle,
  products: Product[],
  options?: { hiddenIds?: Set<string>; onlyAvailable?: boolean },
): Record<string, number> {
  const breakdown = getBundleCompositionBreakdown(bundle, products, options?.hiddenIds);
  return options?.onlyAvailable ? breakdown.availableSelection : breakdown.allSelection;
}

/** Synchronize bundle prices to the exact sum of their composition items, with FREE 20% installation savings */
export function syncBundlesWithCatalog<T extends ReturnType<typeof normalizeBundles>[number]>(
  bundles: T[],
  products: Product[],
  hiddenIds?: Set<string>,
): T[] {
  if (!products.length) return bundles;
  return bundles.map((b) => {
    const breakdown = getBundleCompositionBreakdown(b, products, hiddenIds);
    if (breakdown.fullCompositionTotal <= 0 || !breakdown.allResolved) return b;
    const priceEgp = breakdown.fullCompositionTotal;
    const originalPrice = Math.round(priceEgp * 1.2);
    const freeInstallSaving = Math.max(0, originalPrice - priceEgp);
    return withComputedInstallSaving(
      {
        ...b,
        priceEgp,
        originalPrice,
      },
      freeInstallSaving,
    );
  });
}

export const adminEditableBundles = () =>
  defaultBundles.map((bundle) => ({
    ...bundle,
    devicesEn: splitBundleDevices(bundle.devicesEn).join('\n'),
    devicesAr: splitBundleDevices(bundle.devicesAr).join('\n'),
    items: bundle.items ? bundle.items.map((it) => ({ ...it })) : [],
  }));
