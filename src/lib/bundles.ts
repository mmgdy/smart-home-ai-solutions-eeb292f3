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
  items?: BundleItemConfig[];
}

export const defaultBundles: AdminBundle[] = [
  {
    id: 'studio',
    nameEn: 'Studio Apartment Smart Kit',
    nameAr: 'باقة الاستوديو الذكية',
    descEn: 'Perfect starter kit for studios and small apartments. Control 4 lights, AC, motion, and entry security.',
    descAr: 'الباقة الذكية المتكاملة للاستوديو والشقق الصغيرة. تحكم في ٤ خطوط إضاءة والتكييف مع حساس حركة وحساس باب.',
    priceEgp: 7000,
    originalPrice: 9150,
    devicesEn: '4x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4\n1x WiFi IR Remote Control\n1x SONOFF Zigbee Bridge Pro | ZBBridge-P\n1x SONOFF Zigbee Motion Sensor | SNZB-03P\n1x Tuya Zigbee Door and Window Sensor',
    devicesAr: '٤ مفاتيح ذكية SONOFF MINI Extreme MINIR4\n١ ريموت تكييف ذكي WiFi IR Remote\n١ هاب SONOFF Zigbee Bridge Pro\n١ حساس حركة ذكي SONOFF Zigbee\n١ حساس أبواب وشبابيك ذكي Tuya Zigbee',
    savingsEn: 'Save ~250 EGP/month on electricity',
    savingsAr: 'وفّر ~٢٥٠ ج.م/شهر من الكهرباء',
    difficulty: 1,
    badges: ['WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '2-3 hours',
    installTimeAr: '٢-٣ ساعات',
    items: [
      { nameMatch: 'MINI Extreme Wi-Fi Smart Switch MINIR4', qty: 4 },
      { nameMatch: 'WiFi IR Remote Control', qty: 1 },
      { nameMatch: 'SONOFF Zigbee Bridge Pro', qty: 1 },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 1 },
      { nameMatch: 'Tuya Zigbee Door and Window Sensor', qty: 1 },
    ],
  },
  {
    id: '2bed',
    nameEn: '2-Bedroom Apartment Kit',
    nameAr: 'باقة شقة غرفتين',
    descEn: 'Smart lighting, climate control, smart scenes, and entry protection for a 2-bedroom home.',
    descAr: 'إضاءة ذكية، تحكم بالتكييف، سيناريوهات تشغيل ذكية، وحماية المداخل لشقة غرفتين.',
    priceEgp: 13300,
    originalPrice: 17350,
    devicesEn: '8x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4\n2x WiFi IR Remote Control\n1x SONOFF Zigbee Bridge Pro | ZBBridge-P\n2x Tuya Zigbee Door and Window Sensor\n2x SONOFF Zigbee Motion Sensor | SNZB-03P\n1x SONOFF SwitchMan R5 Scene Controller',
    devicesAr: '٨ مفاتيح ذكية SONOFF MINI Extreme MINIR4\n٢ ريموت تكييف ذكي WiFi IR Remote\n١ هاب SONOFF Zigbee Bridge Pro\n٢ حساس أبواب وشبابيك Tuya Zigbee\n٢ حساس حركة SONOFF Zigbee\n١ ريموت سيناريوهات SONOFF SwitchMan R5',
    savingsEn: 'Save ~400 EGP/month on electricity',
    savingsAr: 'وفّر ~٤٠٠ ج.م/شهر من الكهرباء',
    difficulty: 2,
    badges: ['WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '3-4 hours',
    installTimeAr: '٣-٤ ساعات',
    items: [
      { nameMatch: 'MINI Extreme Wi-Fi Smart Switch MINIR4', qty: 8 },
      { nameMatch: 'WiFi IR Remote Control', qty: 2 },
      { nameMatch: 'SONOFF Zigbee Bridge Pro', qty: 1 },
      { nameMatch: 'Tuya Zigbee Door and Window Sensor', qty: 2 },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 2 },
      { nameMatch: 'SONOFF SwitchMan R5 Scene Controller', qty: 1 },
    ],
  },
  {
    id: '3bed',
    nameEn: '3-Bedroom Apartment Kit',
    nameAr: 'باقة شقة ٣ غرف',
    descEn: 'Complete home automation with 12 switch channels, 3 AC controllers, security sensors, temperature display, and whole-home power meter.',
    descAr: 'منظومة شاملة لـ ١٢ خط إضاءة، ٣ أجهزة تكييف، حساسات أمان، شاشة حرارة ورطوبة، وعداد رقمي لمراقبة استهلاك الطاقة.',
    priceEgp: 20500,
    originalPrice: 26800,
    devicesEn: '12x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4\n3x WiFi IR Remote Control\n1x SONOFF Zigbee Bridge Pro | ZBBridge-P\n2x SONOFF Zigbee Motion Sensor | SNZB-03P\n3x Tuya Zigbee Door and Window Sensor\n1x SONOFF POW Elite Smart Power Meter Switch | POWR320D\n1x SONOFF SNZB-02D Zigbee LCD Smart Temperature Humidity Sensor\n1x SONOFF SwitchMan R5 Scene Controller',
    devicesAr: '١٢ مفتاح ذكي SONOFF MINI Extreme MINIR4\n٣ ريموت تكييف ذكي WiFi IR Remote\n١ هاب SONOFF Zigbee Bridge Pro\n٢ حساس حركة SONOFF Zigbee\n٣ حساسات أبواب وشبابيك Tuya Zigbee\n١ عداد وقاطع طاقة ذكي SONOFF POW Elite\n١ حساس حرارة ورطوبة مع شاشة SONOFF LCD\n١ ريموت سيناريوهات SONOFF SwitchMan R5',
    savingsEn: 'Save ~600 EGP/month on electricity',
    savingsAr: 'وفّر ~٦٠٠ ج.م/شهر من الكهرباء',
    difficulty: 2,
    badges: ['WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '4-5 hours',
    installTimeAr: '٤-٥ ساعات',
    popular: true,
    items: [
      { nameMatch: 'MINI Extreme Wi-Fi Smart Switch MINIR4', qty: 12 },
      { nameMatch: 'WiFi IR Remote Control', qty: 3 },
      { nameMatch: 'SONOFF Zigbee Bridge Pro', qty: 1 },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 2 },
      { nameMatch: 'Tuya Zigbee Door and Window Sensor', qty: 3 },
      { nameMatch: 'SONOFF POW Elite Smart Power Meter', qty: 1 },
      { nameMatch: 'SONOFF SNZB-02D Zigbee LCD Smart Temperature', qty: 1 },
      { nameMatch: 'SONOFF SwitchMan R5 Scene Controller', qty: 1 },
    ],
  },
  {
    id: 'villa-security',
    nameEn: 'Villa Security Kit',
    nameAr: 'باقة أمان الفيلا',
    descEn: 'Comprehensive security system with smart biometric lock, indoor & outdoor cameras, perimeter sensors, smoke and water leak detectors.',
    descAr: 'نظام أمان شامل مع قفل إلكتروني ببصمة الإصبع، كاميرات مراقبة داخلية وخارجية، حساسات أبواب، وحساسات دخان وتسريب.',
    priceEgp: 21750,
    originalPrice: 28400,
    devicesEn: '1x SMART LOCK LEZN 2393 K80 black\n2x Indoor Smart Security Camera | CAM-PT2\n2x SONOFF CAM Outdoor Smart Security Camera | CAM-B1P\n1x SONOFF Zigbee Bridge Pro | ZBBridge-P\n6x Tuya Zigbee Door and Window Sensor\n2x SONOFF Zigbee Motion Sensor | SNZB-03P\n1x Tuya Zigbee Smoke Sensor\n1x SONOFF Zigbee Water Leak Sensor | SNZB-05P',
    devicesAr: '١ قفل ذكي ببصمة الإصبع SMART LOCK LEZN K80\n٢ كاميرا مراقبة داخلية متحركة CAM-PT2\n٢ كاميرا مراقبة خارجية مقاومة للطقس SONOFF CAM-B1P\n١ هاب SONOFF Zigbee Bridge Pro\n٦ حساسات أبواب وشبابيك Tuya Zigbee\n٢ حساس حركة SONOFF Zigbee\n١ حساس إنذار دخان وحريق Tuya Zigbee\n١ حساس كشف تسريب مياه SONOFF Zigbee',
    savingsEn: '24/7 protection & real-time phone alerts',
    savingsAr: 'حماية على مدار الساعة وتنبيهات فورية لعائلتك',
    difficulty: 3,
    badges: ['WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '5-6 hours',
    installTimeAr: '٥-٦ ساعات',
    items: [
      { nameMatch: 'SMART LOCK LEZN 2393 K80 black', qty: 1 },
      { nameMatch: 'Indoor Smart Security Camera | CAM-PT2', qty: 2 },
      { nameMatch: 'SONOFF CAM Outdoor Smart Security Camera | CAM-B1P', qty: 2 },
      { nameMatch: 'SONOFF Zigbee Bridge Pro', qty: 1 },
      { nameMatch: 'Tuya Zigbee Door and Window Sensor', qty: 6 },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 2 },
      { nameMatch: 'Tuya Zigbee Smoke Sensor', qty: 1 },
      { nameMatch: 'SONOFF Zigbee Water Leak Sensor | SNZB-05P', qty: 1 },
    ],
  },
  {
    id: 'energy',
    nameEn: 'Energy Saving Kit',
    nameAr: 'باقة توفير الطاقة',
    descEn: 'Focused on slashing your electricity bills with real-time power metering, radar human presence sensing, LCD climate displays, and scheduled AC timers.',
    descAr: 'تركيز فائق على تقليل فاتورة الكهرباء: عداد طاقة لمراقبة الاستهلاك لحظياً، حساس وجود بشري بالرادار، ومؤقتات تكييف ذكية.',
    priceEgp: 12050,
    originalPrice: 15750,
    devicesEn: '1x SONOFF POW Elite Smart Power Meter Switch | POWR320D\n6x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4\n2x WiFi IR Remote Control\n1x SONOFF Zigbee Bridge Pro | ZBBridge-P\n2x SONOFF SNZB-02D Zigbee LCD Smart Temperature Humidity Sensor\n1x SONOFF Zigbee Human Presence Sensor | SNZB-06P',
    devicesAr: '١ عداد طاقة ذكي SONOFF POW Elite 20A\n٦ مفاتيح ذكية مع مؤقتات SONOFF MINIR4\n٢ ريموت تكييف ذكي WiFi IR Remote\n١ هاب SONOFF Zigbee Bridge Pro\n٢ حساس حرارة ورطوبة مع شاشة LCD\n١ حساس وجود بشري بالرادار SONOFF SNZB-06P',
    savingsEn: 'Cut up to 35-40% on electricity bills',
    savingsAr: 'وفّر حتى ٣٥-٤٠٪ من استهلاك الكهرباء والتكييف',
    difficulty: 1,
    badges: ['WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '2-3 hours',
    installTimeAr: '٢-٣ ساعات',
    items: [
      { nameMatch: 'SONOFF POW Elite Smart Power Meter', qty: 1 },
      { nameMatch: 'MINI Extreme Wi-Fi Smart Switch MINIR4', qty: 6 },
      { nameMatch: 'WiFi IR Remote Control', qty: 2 },
      { nameMatch: 'SONOFF Zigbee Bridge Pro', qty: 1 },
      { nameMatch: 'SONOFF SNZB-02D Zigbee LCD Smart Temperature', qty: 2 },
      { nameMatch: 'SONOFF Zigbee Human Presence Sensor', qty: 1 },
    ],
  },
  {
    id: 'villa-full',
    nameEn: 'Full Villa Smart Home',
    nameAr: 'فيلا ذكية بالكامل',
    descEn: 'The ultimate luxury smart villa with motorized curtain, cat-eye camera lock, full surveillance, 20 lighting channels, climate automation, and Ultra hub.',
    descAr: 'الفيلا الذكية المتكاملة الفاخرة مع ستارة ذكية بموتور، قفل ذكي بكاميرا وشاشة، مراقبة شاملة، ٢٠ خط إضاءة، وهاب ألترا متقدم.',
    priceEgp: 55600,
    originalPrice: 72700,
    devicesEn: '1x SMART LOCK PANDA 2625 i18 cat eye\n1x Smart Curtain 3 Meters (Motorized)\n2x SONOFF CAM Outdoor Smart Security Camera | CAM-B1P\n2x Indoor Smart Security Camera | CAM-PT2\n20x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4\n4x WiFi IR Remote Control\n1x SONOFF Zigbee Bridge Ultra | ZBBridge-U\n6x Tuya Zigbee Door and Window Sensor\n4x SONOFF Zigbee Motion Sensor | SNZB-03P\n1x SONOFF POW Elite Smart Power Meter Switch | POWR320D\n2x SONOFF SwitchMan R5 Scene Controller',
    devicesAr: '١ قفل ذكي متطور PANDA 2625 بكاميرا وشاشة داخلية\n١ موتور وستارة كهربائية ذكية ٣ متر\n٢ كاميرا مراقبة خارجية سونوف CAM-B1P\n٢ كاميرا مراقبة داخلية متحركة CAM-PT2\n٢٠ مفتاح ذكي SONOFF MINI Extreme MINIR4\n٤ ريموت تكييف ذكي WiFi IR Remote\n١ هاب ألترا فائق المدى SONOFF Zigbee Bridge Ultra\n٦ حساسات أبواب وشبابيك Tuya Zigbee\n٤ حساسات حركة SONOFF Zigbee\n١ قاطع وعداد طاقة ذكي SONOFF POW Elite\n٢ ريموت سيناريوهات وتحكم لاسلكي SwitchMan R5',
    savingsEn: 'Complete automation & whole-villa security',
    savingsAr: 'أتمتة شاملة وفخامة متكاملة وأمان تام للفيلا',
    difficulty: 3,
    badges: ['WiFi', 'Zigbee', 'Matter', 'Alexa', 'Google'],
    installTimeEn: '1-2 days',
    installTimeAr: '١-٢ يوم',
    items: [
      { nameMatch: 'SMART LOCK PANDA 2625 i18 cat eye', qty: 1 },
      { nameMatch: 'Smart Curtain 3 Meters', qty: 1 },
      { nameMatch: 'SONOFF CAM Outdoor Smart Security Camera | CAM-B1P', qty: 2 },
      { nameMatch: 'Indoor Smart Security Camera | CAM-PT2', qty: 2 },
      { nameMatch: 'MINI Extreme Wi-Fi Smart Switch MINIR4', qty: 20 },
      { nameMatch: 'WiFi IR Remote Control', qty: 4 },
      { nameMatch: 'SONOFF Zigbee Bridge Ultra | ZBBridge-U', qty: 1 },
      { nameMatch: 'Tuya Zigbee Door and Window Sensor', qty: 6 },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 4 },
      { nameMatch: 'SONOFF POW Elite Smart Power Meter', qty: 1 },
      { nameMatch: 'SONOFF SwitchMan R5 Scene Controller', qty: 2 },
    ],
  },
];

export const splitBundleDevices = (devices: string | string[] | undefined) =>
  Array.isArray(devices) ? devices : (devices || '').split('\n').map((d) => d.trim()).filter(Boolean);

export const normalizeBundles = (bundles: AdminBundle[]) => bundles.map((bundle) => ({
  ...bundle,
  devicesEn: splitBundleDevices(bundle.devicesEn),
  devicesAr: splitBundleDevices(bundle.devicesAr),
  difficulty: bundle.difficulty || 2,
  badges: bundle.badges?.length ? bundle.badges : ['Alexa', 'Google', 'WiFi'],
  installTimeEn: bundle.installTimeEn || '3-4 hours',
  installTimeAr: bundle.installTimeAr || '٣-٤ ساعات',
  items: bundle.items || (defaultBundles.find((db) => db.id === bundle.id)?.items),
}));

export const adminEditableBundles = () => defaultBundles.map((bundle) => ({
  ...bundle,
  devicesEn: splitBundleDevices(bundle.devicesEn).join('\n'),
  devicesAr: splitBundleDevices(bundle.devicesAr).join('\n'),
}));