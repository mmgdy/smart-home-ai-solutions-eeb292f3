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
}

export const defaultBundles: AdminBundle[] = [
  { id: 'studio', nameEn: 'Studio Apartment Smart Kit', nameAr: 'باقة الاستوديو الذكية', descEn: 'Perfect for small apartments and studios. Control lights, AC, and save on electricity.', descAr: 'مثالية للشقق الصغيرة والاستوديو. تحكم في الإضاءة والتكييف ووفر في الكهرباء.', priceEgp: 4500, originalPrice: 5800, devicesEn: '4x SONOFF Smart Switches\n1x Tuya IR AC Controller\n1x Smart Plug with Energy Monitor\n1x Motion Sensor\n1x Zigbee Mini Hub', devicesAr: '٤ مفاتيح ذكية SONOFF\n١ ريموت تكييف Tuya\n١ مقبس ذكي مع عداد طاقة\n١ حساس حركة\n١ هاب Zigbee صغير', savingsEn: 'Save ~200 EGP/month on electricity', savingsAr: 'وفّر ~٢٠٠ ج.م/شهر من الكهرباء', difficulty: 1, badges: ['Alexa', 'Google', 'Zigbee'], installTimeEn: '2-3 hours', installTimeAr: '٢-٣ ساعات' },
  { id: '2bed', nameEn: '2-Bedroom Apartment Kit', nameAr: 'باقة شقة غرفتين', descEn: 'Smart lighting, climate control, and basic security for a 2-bedroom apartment.', descAr: 'إضاءة ذكية، تحكم في المناخ، وأمان أساسي لشقة غرفتين.', priceEgp: 8500, originalPrice: 11000, devicesEn: '8x Smart Switches\n2x IR AC Controllers\n2x Smart Plugs\n1x Zigbee Hub\n1x Door Sensor\n1x Motion Sensor', devicesAr: '٨ مفاتيح ذكية\n٢ ريموت تكييف\n٢ مقابس ذكية\n١ هاب Zigbee\n١ حساس باب\n١ حساس حركة', savingsEn: 'Save ~350 EGP/month on electricity', savingsAr: 'وفّر ~٣٥٠ ج.م/شهر من الكهرباء', difficulty: 2, badges: ['Alexa', 'Google', 'Zigbee', 'WiFi'], installTimeEn: '3-4 hours', installTimeAr: '٣-٤ ساعات' },
  { id: '3bed', nameEn: '3-Bedroom Apartment Kit', nameAr: 'باقة شقة ٣ غرف', descEn: 'Complete smart home solution with lighting, climate, security sensors, and energy monitoring.', descAr: 'حل شامل للمنزل الذكي مع إضاءة وتكييف وحساسات أمان ومراقبة الطاقة.', priceEgp: 12500, originalPrice: 16000, devicesEn: '12x Smart Switches\n3x IR AC Controllers\n4x Smart Plugs\n1x Zigbee Hub\n2x Motion Sensors\n2x Door Sensors\n1x Energy Monitor', devicesAr: '١٢ مفتاح ذكي\n٣ ريموت تكييف\n٤ مقابس ذكية\n١ هاب Zigbee\n٢ حساس حركة\n٢ حساس باب\n١ عداد طاقة', savingsEn: 'Save ~450 EGP/month on electricity', savingsAr: 'وفّر ~٤٥٠ ج.م/شهر من الكهرباء', difficulty: 2, badges: ['Alexa', 'Google', 'Zigbee', 'WiFi'], installTimeEn: '4-5 hours', installTimeAr: '٤-٥ ساعات', popular: true },
  { id: 'villa-security', nameEn: 'Villa Security Kit', nameAr: 'باقة أمان الفيلا', descEn: 'Comprehensive security system with cameras, smart locks, and intrusion detection.', descAr: 'نظام أمان شامل مع كاميرات وأقفال ذكية وكشف التسلل.', priceEgp: 18500, originalPrice: 24000, devicesEn: '4x TP-Link Security Cameras\n1x Smart Door Lock\n6x Door/Window Sensors\n2x Motion Sensors\n1x Alarm Siren\n1x Zigbee Hub', devicesAr: '٤ كاميرات أمان TP-Link\n١ قفل ذكي\n٦ حساسات أبواب/شبابيك\n٢ حساس حركة\n١ سارينة إنذار\n١ هاب Zigbee', savingsEn: '24/7 protection for your family', savingsAr: 'حماية على مدار الساعة لعائلتك', difficulty: 3, badges: ['Alexa', 'Google', 'Zigbee'], installTimeEn: '5-6 hours', installTimeAr: '٥-٦ ساعات' },
  { id: 'energy', nameEn: 'Energy Saving Kit', nameAr: 'باقة توفير الطاقة', descEn: 'Focused on reducing your electricity bill with smart scheduling and monitoring.', descAr: 'تركيز على تقليل فاتورة الكهرباء مع الجدولة الذكية والمراقبة.', priceEgp: 6800, originalPrice: 8500, devicesEn: '6x Smart Switches with Timer\n2x Smart Plugs\n1x Whole-Home Energy Monitor\n2x IR AC Controllers\n1x Smart Hub', devicesAr: '٦ مفاتيح ذكية مع تايمر\n٢ مقابس ذكية\n١ عداد طاقة للبيت كله\n٢ ريموت تكييف\n١ هاب ذكي', savingsEn: 'Save ~350 EGP/month on electricity', savingsAr: 'وفّر ~٣٥٠ ج.م/شهر من الكهرباء', difficulty: 1, badges: ['Alexa', 'Google', 'WiFi'], installTimeEn: '2-3 hours', installTimeAr: '٢-٣ ساعات' },
  { id: 'villa-full', nameEn: 'Full Villa Smart Home', nameAr: 'فيلا ذكية بالكامل', descEn: 'The ultimate smart villa with lighting, security, climate, curtains, and full automation.', descAr: 'الفيلا الذكية المتكاملة مع إضاءة وأمان وتكييف وستائر وأتمتة كاملة.', priceEgp: 45000, originalPrice: 60000, devicesEn: '24x Smart Switches\n6x Security Cameras\n1x Smart Door Lock\n4x IR AC Controllers\n2x Motorized Curtain Motors\n8x Door/Window Sensors\n4x Motion Sensors\n1x Energy Monitor\n2x Zigbee Hubs\n1x Alarm System', devicesAr: '٢٤ مفتاح ذكي\n٦ كاميرات أمان\n١ قفل ذكي\n٤ ريموت تكييف\n٢ موتور ستائر\n٨ حساسات أبواب/شبابيك\n٤ حساس حركة\n١ عداد طاقة\n٢ هاب Zigbee\n١ نظام إنذار', savingsEn: 'Save ~800 EGP/month + total security', savingsAr: 'وفّر ~٨٠٠ ج.م/شهر + أمان شامل', difficulty: 3, badges: ['Alexa', 'Google', 'Zigbee', 'WiFi', 'Matter'], installTimeEn: '1-2 days', installTimeAr: '١-٢ يوم' },
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
}));

export const adminEditableBundles = () => defaultBundles.map((bundle) => ({
  ...bundle,
  devicesEn: splitBundleDevices(bundle.devicesEn).join('\n'),
  devicesAr: splitBundleDevices(bundle.devicesAr).join('\n'),
}));