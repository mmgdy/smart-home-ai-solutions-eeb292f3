import type { Product } from '@/types/store';

export interface BundleItemConfig {
  nameMatch: string;
  qty: number;
  productId?: string;
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

export const defaultBundles: AdminBundle[] = [
  {
    id: 'studio',
    nameEn: 'Studio Apartment Smart Kit',
    nameAr: 'باقة الاستوديو الذكية',
    descEn: 'Perfect starter kit for studios and small apartments. Control 4 lights, AC, motion, and entry security — with FREE certified installation.',
    descAr: 'الباقة الذكية المتكاملة للاستوديو والشقق الصغيرة. تحكم في ٤ خطوط إضاءة والتكييف مع حساس حركة وحساس باب — شاملة التركيب الاحترافي مجاناً.',
    priceEgp: 7872,
    originalPrice: 9446,
    devicesEn: '4x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4\n1x WiFi IR Remote Control\n1x SONOFF Zigbee Bridge Pro | ZBBridge-P\n1x SONOFF Zigbee Motion Sensor | SNZB-03P\n1x Zigbee Door and Window Sensor',
    devicesAr: '٤ مفاتيح ذكية SONOFF MINI Extreme MINIR4\n١ ريموت تكييف ذكي WiFi IR Remote\n١ هاب SONOFF Zigbee Bridge Pro\n١ حساس حركة ذكي SONOFF Zigbee\n١ حساس أبواب وشبابيك ذكي Zigbee',
    savingsEn: 'FREE Certified Installation (Save 1,574 EGP) + Lower electricity bills',
    savingsAr: 'تركيب احترافي مجاناً (وفّر ١,٥٧٤ ج.م) + تقليل فاتورة الكهرباء',
    difficulty: 1,
    badges: ['Free Install', 'WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '2-3 hours',
    installTimeAr: '٢-٣ ساعات',
    freeInstallation: true,
    items: [
      { nameMatch: 'SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4', qty: 4, productId: '85ba2d61-6b50-455a-881c-e374a31ae20f' },
      { nameMatch: 'WiFi IR Remote Control', qty: 1, productId: 'c09cf591-1a4b-41b0-9c12-af393de45dac' },
      { nameMatch: 'SONOFF Zigbee Bridge Pro | ZBBridge-P', qty: 1, productId: '41d0f5b2-6e96-4104-a622-56391f08d3cc' },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 1, productId: '9ac4ee7a-fa62-46c1-9dec-55dac0a9d8ab' },
      { nameMatch: 'Zigbee Door and Window Sensor', qty: 1, productId: 'e6f07e53-9b90-4db0-add1-716c9ec0ee90' },
    ],
  },
  {
    id: '2bed',
    nameEn: '2-Bedroom Apartment Kit',
    nameAr: 'باقة شقة غرفتين',
    descEn: 'Smart lighting, climate control, smart scenes, and entry protection for a 2-bedroom home — with FREE certified installation.',
    descAr: 'إضاءة ذكية، تحكم بالتكييف، سيناريوهات تشغيل ذكية، وحماية المداخل لشقة غرفتين — شاملة التركيب الاحترافي مجاناً.',
    priceEgp: 14919,
    originalPrice: 17903,
    devicesEn: '8x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4\n2x WiFi IR Remote Control\n1x SONOFF Zigbee Bridge Pro | ZBBridge-P\n2x Zigbee Door and Window Sensor\n2x SONOFF Zigbee Motion Sensor | SNZB-03P\n1x SONOFF SwitchMan R5 Scene Controller',
    devicesAr: '٨ مفاتيح ذكية SONOFF MINI Extreme MINIR4\n٢ ريموت تكييف ذكي WiFi IR Remote\n١ هاب SONOFF Zigbee Bridge Pro\n٢ حساس أبواب وشبابيك Zigbee\n٢ حساس حركة SONOFF Zigbee\n١ ريموت سيناريوهات SONOFF SwitchMan R5',
    savingsEn: 'FREE Certified Installation (Save 2,984 EGP) + Lower electricity bills',
    savingsAr: 'تركيب احترافي مجاناً (وفّر ٢,٩٨٤ ج.م) + تقليل فاتورة الكهرباء',
    difficulty: 2,
    badges: ['Free Install', 'WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '3-4 hours',
    installTimeAr: '٣-٤ ساعات',
    freeInstallation: true,
    items: [
      { nameMatch: 'SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4', qty: 8, productId: '85ba2d61-6b50-455a-881c-e374a31ae20f' },
      { nameMatch: 'WiFi IR Remote Control', qty: 2, productId: 'c09cf591-1a4b-41b0-9c12-af393de45dac' },
      { nameMatch: 'SONOFF Zigbee Bridge Pro | ZBBridge-P', qty: 1, productId: '41d0f5b2-6e96-4104-a622-56391f08d3cc' },
      { nameMatch: 'Zigbee Door and Window Sensor', qty: 2, productId: 'e6f07e53-9b90-4db0-add1-716c9ec0ee90' },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 2, productId: '9ac4ee7a-fa62-46c1-9dec-55dac0a9d8ab' },
      { nameMatch: 'SONOFF SwitchMan R5 White Scene Controller', qty: 1, productId: '0cd9db82-7660-48bc-a90f-88a429668bb7' },
    ],
  },
  {
    id: '3bed',
    nameEn: '3-Bedroom Apartment Kit',
    nameAr: 'باقة شقة ٣ غرف',
    descEn: 'Complete home automation with 12 switch channels, 3 AC controllers, security sensors, temperature display, and in-line power meter — with FREE certified installation.',
    descAr: 'منظومة شاملة لـ ١٢ خط إضاءة، ٣ أجهزة تكييف، حساسات أمان، شاشة حرارة ورطوبة، وعداد رقمي لمراقبة استهلاك الطاقة — شاملة التركيب الاحترافي مجاناً.',
    priceEgp: 23071,
    originalPrice: 27685,
    devicesEn: '12x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4\n3x WiFi IR Remote Control\n1x SONOFF Zigbee Bridge Pro | ZBBridge-P\n2x SONOFF Zigbee Motion Sensor | SNZB-03P\n3x Zigbee Door and Window Sensor\n1x SONOFF POW Elite Smart Power Meter Switch | POWR320D\n1x SONOFF SNZB-02D Zigbee LCD Smart Temperature Humidity Sensor\n1x SONOFF SwitchMan R5 Scene Controller',
    devicesAr: '١٢ مفتاح ذكي SONOFF MINI Extreme MINIR4\n٣ ريموت تكييف ذكي WiFi IR Remote\n١ هاب SONOFF Zigbee Bridge Pro\n٢ حساس حركة SONOFF Zigbee\n٣ حساسات أبواب وشبابيك Zigbee\n١ عداد وقاطع طاقة ذكي SONOFF POW Elite\n١ حساس حرارة ورطوبة مع شاشة SONOFF LCD\n١ ريموت سيناريوهات SONOFF SwitchMan R5',
    savingsEn: 'FREE Certified Installation (Save 4,614 EGP) + Lower electricity bills',
    savingsAr: 'تركيب احترافي مجاناً (وفّر ٤,٦١٤ ج.م) + تقليل فاتورة الكهرباء',
    difficulty: 2,
    badges: ['Free Install', 'WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '4-5 hours',
    installTimeAr: '٤-٥ ساعات',
    popular: true,
    freeInstallation: true,
    items: [
      { nameMatch: 'SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4', qty: 12, productId: '85ba2d61-6b50-455a-881c-e374a31ae20f' },
      { nameMatch: 'WiFi IR Remote Control', qty: 3, productId: 'c09cf591-1a4b-41b0-9c12-af393de45dac' },
      { nameMatch: 'SONOFF Zigbee Bridge Pro | ZBBridge-P', qty: 1, productId: '41d0f5b2-6e96-4104-a622-56391f08d3cc' },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 2, productId: '9ac4ee7a-fa62-46c1-9dec-55dac0a9d8ab' },
      { nameMatch: 'Zigbee Door and Window Sensor', qty: 3, productId: 'e6f07e53-9b90-4db0-add1-716c9ec0ee90' },
      { nameMatch: 'SONOFF POW Elite Smart Power Meter Switch | POWR320D', qty: 1, productId: '97c7590b-d117-4848-ab31-f94daf478738' },
      { nameMatch: 'SONOFF SNZB-02D Zigbee LCD Smart Temperature Humidity Sensor', qty: 1, productId: '5a051372-4619-46f8-8e7b-c4e0c5caecc3' },
      { nameMatch: 'SONOFF SwitchMan R5 White Scene Controller', qty: 1, productId: '0cd9db82-7660-48bc-a90f-88a429668bb7' },
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
      { nameMatch: 'Lezn K80', qty: 1, productId: '59c17f4d-cb75-46cc-9182-f6a79e1562eb' },
      { nameMatch: 'SONOFF CAM Pan-Tilt 2 Smart Indoor Home Security Camera | CAM-PT2', qty: 2, productId: '80db88e1-5520-4d67-a9ed-d488ce3c72ff' },
      { nameMatch: 'SONOFF CAM Outdoor Smart Security Camera | CAM-B1P', qty: 2, productId: '962f19b9-2efb-4cd3-a335-a7e8b441d88d' },
      { nameMatch: 'SONOFF Zigbee Bridge Pro | ZBBridge-P', qty: 1, productId: '41d0f5b2-6e96-4104-a622-56391f08d3cc' },
      { nameMatch: 'Zigbee Door and Window Sensor', qty: 6, productId: 'e6f07e53-9b90-4db0-add1-716c9ec0ee90' },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 2, productId: '9ac4ee7a-fa62-46c1-9dec-55dac0a9d8ab' },
      { nameMatch: 'Zigbee Smoke Sensor (without battery)', qty: 1, productId: '851c1660-24c0-46ee-bc14-fc096a5dfc6c' },
      { nameMatch: 'SONOFF Zigbee Water Leak Sensor | SNZB-05P', qty: 1, productId: 'd2af34ce-2edb-42f2-bf18-600b0c4bb9b0' },
    ],
  },
  {
    id: 'energy',
    nameEn: 'Energy Saving Kit',
    nameAr: 'باقة توفير الطاقة',
    descEn: 'Focused on slashing your electricity bills with real-time power metering, radar human presence sensing, LCD climate displays, and scheduled AC timers — with FREE certified installation.',
    descAr: 'تركيز فائق على تقليل فاتورة الكهرباء: عداد طاقة لمراقبة الاستهلاك لحظياً، حساس وجود بشري بالرادار، ومؤقتات تكييف ذكية — شاملة التركيب الاحترافي مجاناً.',
    priceEgp: 13712,
    originalPrice: 16454,
    devicesEn: '1x SONOFF POW Elite Smart Power Meter Switch | POWR320D\n6x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4\n2x WiFi IR Remote Control\n1x SONOFF Zigbee Bridge Pro | ZBBridge-P\n2x SONOFF SNZB-02D Zigbee LCD Smart Temperature Humidity Sensor\n1x SONOFF Zigbee Human Presence Sensor | SNZB-06P',
    devicesAr: '١ عداد طاقة ذكي SONOFF POW Elite 20A\n٦ مفاتيح ذكية مع مؤقتات SONOFF MINIR4\n٢ ريموت تكييف ذكي WiFi IR Remote\n١ هاب SONOFF Zigbee Bridge Pro\n٢ حساس حرارة ورطوبة مع شاشة LCD\n١ حساس وجود بشري بالرادار SONOFF SNZB-06P',
    savingsEn: 'FREE Certified Installation (Save 2,742 EGP) + Lower electricity bills',
    savingsAr: 'تركيب احترافي مجاناً (وفّر ٢,٧٤٢ ج.م) + تقليل فاتورة الكهرباء',
    difficulty: 1,
    badges: ['Free Install', 'WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '2-3 hours',
    installTimeAr: '٢-٣ ساعات',
    freeInstallation: true,
    items: [
      { nameMatch: 'SONOFF POW Elite Smart Power Meter Switch | POWR320D', qty: 1, productId: '97c7590b-d117-4848-ab31-f94daf478738' },
      { nameMatch: 'SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4', qty: 6, productId: '85ba2d61-6b50-455a-881c-e374a31ae20f' },
      { nameMatch: 'WiFi IR Remote Control', qty: 2, productId: 'c09cf591-1a4b-41b0-9c12-af393de45dac' },
      { nameMatch: 'SONOFF Zigbee Bridge Pro | ZBBridge-P', qty: 1, productId: '41d0f5b2-6e96-4104-a622-56391f08d3cc' },
      { nameMatch: 'SONOFF SNZB-02D Zigbee LCD Smart Temperature Humidity Sensor', qty: 2, productId: '5a051372-4619-46f8-8e7b-c4e0c5caecc3' },
      { nameMatch: 'SONOFF Zigbee Human Presence Sensor | SNZB-06P', qty: 1, productId: 'ed900ce3-0d1e-4fa9-8441-fc3b76294a67' },
    ],
  },
  {
    id: 'villa-full',
    nameEn: 'Full Villa Smart Home',
    nameAr: 'فيلا ذكية بالكامل',
    descEn: 'The ultimate luxury smart villa with motorized curtain, cat-eye camera lock, full surveillance, 20 lighting channels, climate automation, and Ultra hub — with FREE certified installation.',
    descAr: 'الفيلا الذكية المتكاملة الفاخرة مع ستارة ذكية بموتور، قفل ذكي بكاميرا وشاشة، مراقبة شاملة، ٢٠ خط إضاءة، وهاب ألترا متقدم — شاملة التركيب الاحترافي مجاناً.',
    priceEgp: 63062,
    originalPrice: 75674,
    devicesEn: '1x SMART LOCK PANDA 2625 i18 cat eye\n1x Smart Curtain 3 Meters (Motorized)\n2x SONOFF CAM Outdoor Smart Security Camera | CAM-B1P\n2x Indoor Smart Security Camera | CAM-PT2\n20x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4\n4x WiFi IR Remote Control\n1x SONOFF Zigbee Bridge Ultra | ZBBridge-U\n6x Zigbee Door and Window Sensor\n4x SONOFF Zigbee Motion Sensor | SNZB-03P\n1x SONOFF POW Elite Smart Power Meter Switch | POWR320D\n2x SONOFF SwitchMan R5 Scene Controller',
    devicesAr: '١ قفل ذكي متطور PANDA 2625 بكاميرا وشاشة داخلية\n١ موتور وستارة كهربائية ذكية ٣ متر\n٢ كاميرا مراقبة خارجية سونوف CAM-B1P\n٢ كاميرا مراقبة داخلية متحركة CAM-PT2\n٢٠ مفتاح ذكي SONOFF MINI Extreme MINIR4\n٤ ريموت تكييف ذكي WiFi IR Remote\n١ هاب ألترا فائق المدى SONOFF Zigbee Bridge Ultra\n٦ حساسات أبواب وشبابيك Zigbee\n٤ حساسات حركة SONOFF Zigbee\n١ قاطع وعداد طاقة ذكي SONOFF POW Elite\n٢ ريموت سيناريوهات وتحكم لاسلكي SwitchMan R5',
    savingsEn: 'FREE Certified Installation (Save 12,612 EGP) + Whole-Villa Automation',
    savingsAr: 'تركيب احترافي مجاناً (وفّر ١٢,٦١٢ ج.م) + أتمتة شاملة للفيلا',
    difficulty: 3,
    badges: ['Free Install', 'WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '1-2 days',
    installTimeAr: '١-٢ يوم',
    freeInstallation: true,
    items: [
      { nameMatch: 'SMART LOCK PANDA 2625 i18 cat eye', qty: 1, productId: 'c8fc0ab6-4ab6-47a5-9f1f-5f3331c6214a' },
      { nameMatch: 'Smart Curtain 3 Meters', qty: 1, productId: '512b547e-4fcd-4c1d-9347-f400b7000ac6' },
      { nameMatch: 'SONOFF CAM Outdoor Smart Security Camera | CAM-B1P', qty: 2, productId: '962f19b9-2efb-4cd3-a335-a7e8b441d88d' },
      { nameMatch: 'SONOFF CAM Pan-Tilt 2 Smart Indoor Home Security Camera | CAM-PT2', qty: 2, productId: '80db88e1-5520-4d67-a9ed-d488ce3c72ff' },
      { nameMatch: 'SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4', qty: 20, productId: '85ba2d61-6b50-455a-881c-e374a31ae20f' },
      { nameMatch: 'WiFi IR Remote Control', qty: 4, productId: 'c09cf591-1a4b-41b0-9c12-af393de45dac' },
      { nameMatch: 'SONOFF Zigbee Bridge Ultra | ZBBridge-U', qty: 1, productId: 'bf6f924a-5431-4220-a189-ca7ca0a1402b' },
      { nameMatch: 'Zigbee Door and Window Sensor', qty: 6, productId: 'e6f07e53-9b90-4db0-add1-716c9ec0ee90' },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 4, productId: '9ac4ee7a-fa62-46c1-9dec-55dac0a9d8ab' },
      { nameMatch: 'SONOFF POW Elite Smart Power Meter Switch | POWR320D', qty: 1, productId: '97c7590b-d117-4848-ab31-f94daf478738' },
      { nameMatch: 'SONOFF SwitchMan R5 White Scene Controller', qty: 2, productId: '0cd9db82-7660-48bc-a90f-88a429668bb7' },
    ],
  },
];

export const splitBundleDevices = (devices: string | string[] | undefined) =>
  Array.isArray(devices) ? devices : (devices || '').split('\n').map((d) => d.trim()).filter(Boolean);

const LEGACY_PRICES = new Set([4500, 7000, 8500, 13300, 12500, 20500, 18500, 21750, 24076, 6800, 12050, 45000, 55600, 62692]);

const ITEM_PRODUCT_ID_FALLBACKS: Array<[RegExp, string]> = [
  [/minir4|mini extreme/i, '85ba2d61-6b50-455a-881c-e374a31ae20f'],
  [/wifi ir remote/i, 'c09cf591-1a4b-41b0-9c12-af393de45dac'],
  [/zbbridge-p|zigbee bridge pro/i, '41d0f5b2-6e96-4104-a622-56391f08d3cc'],
  [/zbbridge-u|zigbee bridge ultra/i, 'bf6f924a-5431-4220-a189-ca7ca0a1402b'],
  [/snzb-03p|motion sensor/i, '9ac4ee7a-fa62-46c1-9dec-55dac0a9d8ab'],
  [/door and window sensor/i, 'e6f07e53-9b90-4db0-add1-716c9ec0ee90'],
  [/switchman r5/i, '0cd9db82-7660-48bc-a90f-88a429668bb7'],
  [/powr320d|pow elite/i, '97c7590b-d117-4848-ab31-f94daf478738'],
  [/snzb-02d/i, '5a051372-4619-46f8-8e7b-c4e0c5caecc3'],
  [/lezn.*k80/i, '59c17f4d-cb75-46cc-9182-f6a79e1562eb'],
  [/cam-pt2/i, '80db88e1-5520-4d67-a9ed-d488ce3c72ff'],
  [/cam-b1p/i, '962f19b9-2efb-4cd3-a335-a7e8b441d88d'],
  [/smoke sensor/i, '851c1660-24c0-46ee-bc14-fc096a5dfc6c'],
  [/snzb-05p|water leak/i, 'd2af34ce-2edb-42f2-bf18-600b0c4bb9b0'],
  [/snzb-06p|human presence/i, 'ed900ce3-0d1e-4fa9-8441-fc3b76294a67'],
  [/panda 2625/i, 'c8fc0ab6-4ab6-47a5-9f1f-5f3331c6214a'],
  [/smart curtain 3 meters/i, '512b547e-4fcd-4c1d-9347-f400b7000ac6'],
];

const resolveBundleProductId = (item: BundleItemConfig, defItems?: BundleItemConfig[]): string | undefined => {
  if (item.productId) return item.productId;
  const cleanName = item.nameMatch.toLowerCase();
  const defMatch = defItems?.find((d) => {
    const dLower = d.nameMatch.toLowerCase();
    return dLower === cleanName || dLower.includes(cleanName) || cleanName.includes(dLower);
  });
  if (defMatch?.productId) return defMatch.productId;
  const fallback = ITEM_PRODUCT_ID_FALLBACKS.find(([pattern]) => pattern.test(item.nameMatch));
  return fallback?.[1];
};

const toArabicDigits = (value: string) =>
  value.replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)] ?? digit);

const withComputedInstallSaving = <T extends { savingsEn: string; savingsAr: string }>(
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

export const getBundleProductIds = (bundles: Array<Pick<AdminBundle, 'items'>> = defaultBundles): string[] => {
  const ids = new Set<string>();
  bundles.forEach((b) => {
    b.items?.forEach((item) => {
      const id = resolveBundleProductId(item);
      if (id) ids.add(id);
    });
  });
  defaultBundles.forEach((b) => {
    b.items?.forEach((item) => {
      if (item.productId) ids.add(item.productId);
    });
  });
  return Array.from(ids);
};

export const normalizeBundles = (bundles: AdminBundle[]) =>
  bundles.map((bundle) => {
    const def = defaultBundles.find((db) => db.id === bundle.id);
    const useDefaultPrices = def && (!bundle.priceEgp || LEGACY_PRICES.has(Number(bundle.priceEgp)));
    const priceEgp = useDefaultPrices ? def.priceEgp : Number(bundle.priceEgp);
    const installSaving = Math.round(priceEgp * 0.2);
    const originalPrice = useDefaultPrices ? def.originalPrice : priceEgp + installSaving;

    // Normalize legacy item nameMatch strings and backfill catalog productId
    const rawItems = bundle.items?.length ? bundle.items : def?.items;
    const items = rawItems?.map((it) => {
      const normalizedName = it.nameMatch
        .replace(/^Tuya Zigbee Door and Window Sensor$/i, 'Zigbee Door and Window Sensor')
        .replace(/^Tuya Zigbee Smoke Sensor$/i, 'Zigbee Smoke Sensor');
      const normalizedItem: BundleItemConfig = {
        ...it,
        nameMatch: normalizedName,
      };
      const productId = resolveBundleProductId(normalizedItem, def?.items);
      return productId ? { ...normalizedItem, productId } : normalizedItem;
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

    return withComputedInstallSaving(baseBundle, originalPrice - priceEgp);
  });

/** Match a bundle's items against the loaded catalog products and return { productId: quantity } */
export function matchProductsForBundle(
  bundle: ReturnType<typeof normalizeBundles>[number] | AdminBundle,
  products: Product[],
): Record<string, number> {
  const sel: Record<string, number> = {};

  if (Array.isArray(bundle.items) && bundle.items.length) {
    bundle.items.forEach((item) => {
      const target = item.nameMatch.toLowerCase();
      const found =
        (item.productId ? products.find((p) => p.id === item.productId) : undefined) ||
        products.find((p) => p.name.toLowerCase() === target) ||
        products.find((p) => p.name.toLowerCase().includes(target));
      if (found) {
        sel[found.id] = (sel[found.id] || 0) + item.qty;
      }
    });
    if (Object.keys(sel).length > 0) return sel;
  }

  const devices: string[] = Array.isArray(bundle.devicesEn)
    ? bundle.devicesEn
    : (bundle.devicesEn || '').split('\n').map((s: string) => s.trim()).filter(Boolean);

  devices.forEach((d) => {
    const m = d.match(/^(\d+)\s*x?\s*(.+)$/i);
    const qty = m ? parseInt(m[1], 10) : 1;
    const term = (m ? m[2] : d).toLowerCase().replace(/^tuya\s+/i, '');
    const tokens = term.split(/[\s,/-]+/).filter((t) => t.length > 2);
    const found =
      products.find((p) => p.name.toLowerCase() === term) ||
      products.find((p) => p.name.toLowerCase().includes(term)) ||
      products.find((p) => tokens.length >= 2 && tokens.every((t) => p.name.toLowerCase().includes(t))) ||
      products.find((p) =>
        tokens.every((t) => (p.name + ' ' + (p.description || '') + ' ' + (p.brand || '')).toLowerCase().includes(t)),
      ) ||
      products.find((p) => tokens.some((t) => p.name.toLowerCase().includes(t)));
    if (found) sel[found.id] = (sel[found.id] || 0) + qty;
  });
  return sel;
}

/** Dynamically synchronize bundle prices to equal the exact sum of their matched catalog products, with FREE 20% installation as the savings */
export function syncBundlesWithCatalog<T extends ReturnType<typeof normalizeBundles>[number]>(
  bundles: T[],
  products: Product[],
): T[] {
  if (!products.length) return bundles;
  return bundles.map((b) => {
    const matched = matchProductsForBundle(b, products);
    let exactSum = 0;
    for (const [id, qty] of Object.entries(matched)) {
      const p = products.find((x) => x.id === id);
      if (p) exactSum += Number(p.price) * qty;
    }
    const allItemsMatched =
      !Array.isArray(b.items) ||
      !b.items.length ||
      b.items.every((item) => {
        if (item.productId) return Boolean(matched[item.productId]);
        const target = item.nameMatch.toLowerCase();
        return products.some(
          (p) => Boolean(matched[p.id]) && (p.name.toLowerCase() === target || p.name.toLowerCase().includes(target)),
        );
      });
    if (exactSum <= 0 || !allItemsMatched) return b;
    const freeInstallSaving = Math.round(exactSum * 0.2);
    return withComputedInstallSaving(
      {
        ...b,
        priceEgp: exactSum,
        originalPrice: exactSum + freeInstallSaving,
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
  }));
