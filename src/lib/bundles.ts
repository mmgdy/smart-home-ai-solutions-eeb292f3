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
    savingsEn: 'FREE Certified Installation (Save 1,574 EGP) + ~250 EGP/mo electricity',
    savingsAr: 'تركيب احترافي مجاناً (وفّر ١,٥٧٤ ج.م) + ~٢٥٠ ج.م/شهر كهرباء',
    difficulty: 1,
    badges: ['Free Install', 'WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '2-3 hours',
    installTimeAr: '٢-٣ ساعات',
    freeInstallation: true,
    items: [
      { nameMatch: 'MINI Extreme Wi-Fi Smart Switch MINIR4', qty: 4 },
      { nameMatch: 'WiFi IR Remote Control', qty: 1 },
      { nameMatch: 'SONOFF Zigbee Bridge Pro', qty: 1 },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 1 },
      { nameMatch: 'Zigbee Door and Window Sensor', qty: 1 },
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
    savingsEn: 'FREE Certified Installation (Save 2,984 EGP) + ~400 EGP/mo electricity',
    savingsAr: 'تركيب احترافي مجاناً (وفّر ٢,٩٨٤ ج.م) + ~٤٠٠ ج.م/شهر كهرباء',
    difficulty: 2,
    badges: ['Free Install', 'WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '3-4 hours',
    installTimeAr: '٣-٤ ساعات',
    freeInstallation: true,
    items: [
      { nameMatch: 'MINI Extreme Wi-Fi Smart Switch MINIR4', qty: 8 },
      { nameMatch: 'WiFi IR Remote Control', qty: 2 },
      { nameMatch: 'SONOFF Zigbee Bridge Pro', qty: 1 },
      { nameMatch: 'Zigbee Door and Window Sensor', qty: 2 },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 2 },
      { nameMatch: 'SONOFF SwitchMan R5 Scene Controller', qty: 1 },
    ],
  },
  {
    id: '3bed',
    nameEn: '3-Bedroom Apartment Kit',
    nameAr: 'باقة شقة ٣ غرف',
    descEn: 'Complete home automation with 12 switch channels, 3 AC controllers, security sensors, temperature display, and whole-home power meter — with FREE certified installation.',
    descAr: 'منظومة شاملة لـ ١٢ خط إضاءة، ٣ أجهزة تكييف، حساسات أمان، شاشة حرارة ورطوبة، وعداد رقمي لمراقبة استهلاك الطاقة — شاملة التركيب الاحترافي مجاناً.',
    priceEgp: 23071,
    originalPrice: 27685,
    devicesEn: '12x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4\n3x WiFi IR Remote Control\n1x SONOFF Zigbee Bridge Pro | ZBBridge-P\n2x SONOFF Zigbee Motion Sensor | SNZB-03P\n3x Zigbee Door and Window Sensor\n1x SONOFF POW Elite Smart Power Meter Switch | POWR320D\n1x SONOFF SNZB-02D Zigbee LCD Smart Temperature Humidity Sensor\n1x SONOFF SwitchMan R5 Scene Controller',
    devicesAr: '١٢ مفتاح ذكي SONOFF MINI Extreme MINIR4\n٣ ريموت تكييف ذكي WiFi IR Remote\n١ هاب SONOFF Zigbee Bridge Pro\n٢ حساس حركة SONOFF Zigbee\n٣ حساسات أبواب وشبابيك Zigbee\n١ عداد وقاطع طاقة ذكي SONOFF POW Elite\n١ حساس حرارة ورطوبة مع شاشة SONOFF LCD\n١ ريموت سيناريوهات SONOFF SwitchMan R5',
    savingsEn: 'FREE Certified Installation (Save 4,614 EGP) + ~600 EGP/mo electricity',
    savingsAr: 'تركيب احترافي مجاناً (وفّر ٤,٦١٤ ج.م) + ~٦٠٠ ج.م/شهر كهرباء',
    difficulty: 2,
    badges: ['Free Install', 'WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '4-5 hours',
    installTimeAr: '٤-٥ ساعات',
    popular: true,
    freeInstallation: true,
    items: [
      { nameMatch: 'MINI Extreme Wi-Fi Smart Switch MINIR4', qty: 12 },
      { nameMatch: 'WiFi IR Remote Control', qty: 3 },
      { nameMatch: 'SONOFF Zigbee Bridge Pro', qty: 1 },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 2 },
      { nameMatch: 'Zigbee Door and Window Sensor', qty: 3 },
      { nameMatch: 'SONOFF POW Elite Smart Power Meter', qty: 1 },
      { nameMatch: 'SONOFF SNZB-02D Zigbee LCD Smart Temperature', qty: 1 },
      { nameMatch: 'SONOFF SwitchMan R5 Scene Controller', qty: 1 },
    ],
  },
  {
    id: 'villa-security',
    nameEn: 'Villa Security Kit',
    nameAr: 'باقة أمان الفيلا',
    descEn: 'Comprehensive security system with smart biometric lock, indoor & outdoor cameras, perimeter sensors, smoke and water leak detectors — with FREE certified installation.',
    descAr: 'نظام أمان شامل مع قفل إلكتروني ببصمة الإصبع، كاميرات مراقبة داخلية وخارجية، حساسات أبواب، وحساسات دخان وتسريب — شاملة التركيب الاحترافي مجاناً.',
    priceEgp: 24076,
    originalPrice: 28891,
    devicesEn: '1x SMART LOCK LEZN 2393 K80 black\n2x Indoor Smart Security Camera | CAM-PT2\n2x SONOFF CAM Outdoor Smart Security Camera | CAM-B1P\n1x SONOFF Zigbee Bridge Pro | ZBBridge-P\n6x Zigbee Door and Window Sensor\n2x SONOFF Zigbee Motion Sensor | SNZB-03P\n1x Zigbee Smoke Sensor (without battery)\n1x SONOFF Zigbee Water Leak Sensor | SNZB-05P',
    devicesAr: '١ قفل ذكي ببصمة الإصبع SMART LOCK LEZN K80\n٢ كاميرا مراقبة داخلية متحركة CAM-PT2\n٢ كاميرا مراقبة خارجية مقاومة للطقس SONOFF CAM-B1P\n١ هاب SONOFF Zigbee Bridge Pro\n٦ حساسات أبواب وشبابيك Zigbee\n٢ حساس حركة SONOFF Zigbee\n١ حساس إنذار دخان وحريق Zigbee\n١ حساس كشف تسريب مياه SONOFF Zigbee',
    savingsEn: 'FREE Certified Installation (Save 4,815 EGP) + 24/7 Protection',
    savingsAr: 'تركيب احترافي مجاناً (وفّر ٤,٨١٥ ج.م) + حماية على مدار الساعة',
    difficulty: 3,
    badges: ['Free Install', 'WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '5-6 hours',
    installTimeAr: '٥-٦ ساعات',
    freeInstallation: true,
    items: [
      { nameMatch: 'SMART LOCK LEZN 2393 K80 black', qty: 1 },
      { nameMatch: 'Indoor Smart Security Camera | CAM-PT2', qty: 2 },
      { nameMatch: 'SONOFF CAM Outdoor Smart Security Camera | CAM-B1P', qty: 2 },
      { nameMatch: 'SONOFF Zigbee Bridge Pro', qty: 1 },
      { nameMatch: 'Zigbee Door and Window Sensor', qty: 6 },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 2 },
      { nameMatch: 'Zigbee Smoke Sensor', qty: 1 },
      { nameMatch: 'SONOFF Zigbee Water Leak Sensor | SNZB-05P', qty: 1 },
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
    savingsEn: 'FREE Certified Installation (Save 2,742 EGP) + Cut 35-40% on bills',
    savingsAr: 'تركيب احترافي مجاناً (وفّر ٢,٧٤٢ ج.م) + وفّر ٣٥-٤٠٪ من الكهرباء',
    difficulty: 1,
    badges: ['Free Install', 'WiFi', 'Zigbee', 'Alexa', 'Google'],
    installTimeEn: '2-3 hours',
    installTimeAr: '٢-٣ ساعات',
    freeInstallation: true,
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
    descEn: 'The ultimate luxury smart villa with motorized curtain, cat-eye camera lock, full surveillance, 20 lighting channels, climate automation, and Ultra hub — with FREE certified installation.',
    descAr: 'الفيلا الذكية المتكاملة الفاخرة مع ستارة ذكية بموتور، قفل ذكي بكاميرا وشاشة، مراقبة شاملة، ٢٠ خط إضاءة، وهاب ألترا متقدم — شاملة التركيب الاحترافي مجاناً.',
    priceEgp: 62692,
    originalPrice: 75230,
    devicesEn: '1x SMART LOCK PANDA 2625 i18 cat eye\n1x Smart Curtain 3 Meters (Motorized)\n2x SONOFF CAM Outdoor Smart Security Camera | CAM-B1P\n2x Indoor Smart Security Camera | CAM-PT2\n20x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4\n4x WiFi IR Remote Control\n1x SONOFF Zigbee Bridge Ultra | ZBBridge-U\n6x Zigbee Door and Window Sensor\n4x SONOFF Zigbee Motion Sensor | SNZB-03P\n1x SONOFF POW Elite Smart Power Meter Switch | POWR320D\n2x SONOFF SwitchMan R5 Scene Controller',
    devicesAr: '١ قفل ذكي متطور PANDA 2625 بكاميرا وشاشة داخلية\n١ موتور وستارة كهربائية ذكية ٣ متر\n٢ كاميرا مراقبة خارجية سونوف CAM-B1P\n٢ كاميرا مراقبة داخلية متحركة CAM-PT2\n٢٠ مفتاح ذكي SONOFF MINI Extreme MINIR4\n٤ ريموت تكييف ذكي WiFi IR Remote\n١ هاب ألترا فائق المدى SONOFF Zigbee Bridge Ultra\n٦ حساسات أبواب وشبابيك Zigbee\n٤ حساسات حركة SONOFF Zigbee\n١ قاطع وعداد طاقة ذكي SONOFF POW Elite\n٢ ريموت سيناريوهات وتحكم لاسلكي SwitchMan R5',
    savingsEn: 'FREE Certified Installation (Save 12,538 EGP) + Whole-Villa Automation',
    savingsAr: 'تركيب احترافي مجاناً (وفّر ١٢,٥٣٨ ج.م) + أتمتة شاملة للفيلا',
    difficulty: 3,
    badges: ['Free Install', 'WiFi', 'Zigbee', 'Matter', 'Alexa', 'Google'],
    installTimeEn: '1-2 days',
    installTimeAr: '١-٢ يوم',
    freeInstallation: true,
    items: [
      { nameMatch: 'SMART LOCK PANDA 2625 i18 cat eye', qty: 1 },
      { nameMatch: 'Smart Curtain 3 Meters', qty: 1 },
      { nameMatch: 'SONOFF CAM Outdoor Smart Security Camera | CAM-B1P', qty: 2 },
      { nameMatch: 'Indoor Smart Security Camera | CAM-PT2', qty: 2 },
      { nameMatch: 'MINI Extreme Wi-Fi Smart Switch MINIR4', qty: 20 },
      { nameMatch: 'WiFi IR Remote Control', qty: 4 },
      { nameMatch: 'SONOFF Zigbee Bridge Ultra | ZBBridge-U', qty: 1 },
      { nameMatch: 'Zigbee Door and Window Sensor', qty: 6 },
      { nameMatch: 'SONOFF Zigbee Motion Sensor | SNZB-03P', qty: 4 },
      { nameMatch: 'SONOFF POW Elite Smart Power Meter', qty: 1 },
      { nameMatch: 'SONOFF SwitchMan R5 Scene Controller', qty: 2 },
    ],
  },
];

export const splitBundleDevices = (devices: string | string[] | undefined) =>
  Array.isArray(devices) ? devices : (devices || '').split('\n').map((d) => d.trim()).filter(Boolean);

const LEGACY_PRICES = new Set([4500, 7000, 8500, 13300, 12500, 20500, 18500, 21750, 6800, 12050, 45000, 55600]);

export const normalizeBundles = (bundles: AdminBundle[]) =>
  bundles.map((bundle) => {
    const def = defaultBundles.find((db) => db.id === bundle.id);
    const useDefaultPrices = def && (!bundle.priceEgp || LEGACY_PRICES.has(Number(bundle.priceEgp)));
    const priceEgp = useDefaultPrices ? def.priceEgp : Number(bundle.priceEgp);
    const installSaving = Math.max(1500, Math.round(priceEgp * 0.2));
    const originalPrice = useDefaultPrices ? def.originalPrice : priceEgp + installSaving;

    // Normalize legacy item nameMatch strings so all sensors match the real catalog
    const rawItems = bundle.items?.length ? bundle.items : def?.items;
    const items = rawItems?.map((it) => ({
      ...it,
      nameMatch: it.nameMatch
        .replace(/^Tuya Zigbee Door and Window Sensor$/i, 'Zigbee Door and Window Sensor')
        .replace(/^Tuya Zigbee Smoke Sensor$/i, 'Zigbee Smoke Sensor'),
    }));

    return {
      ...bundle,
      priceEgp,
      originalPrice,
      descEn: def ? def.descEn : bundle.descEn,
      descAr: def ? def.descAr : bundle.descAr,
      savingsEn: def ? def.savingsEn : bundle.savingsEn,
      savingsAr: def ? def.savingsAr : bundle.savingsAr,
      devicesEn: splitBundleDevices(def ? def.devicesEn : bundle.devicesEn),
      devicesAr: splitBundleDevices(def ? def.devicesAr : bundle.devicesAr),
      difficulty: bundle.difficulty || def?.difficulty || 2,
      badges: def?.badges || (bundle.badges?.length ? bundle.badges : ['Free Install', 'Alexa', 'Google', 'WiFi']),
      installTimeEn: bundle.installTimeEn || def?.installTimeEn || '3-4 hours',
      installTimeAr: bundle.installTimeAr || def?.installTimeAr || '٣-٤ ساعات',
      freeInstallation: true,
      items,
    };
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
        products.find((p) => item.productId && p.id === item.productId) ||
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
    if (exactSum <= 0) return b;
    const freeInstallSaving = Math.max(1500, Math.round(exactSum * 0.2));
    return {
      ...b,
      priceEgp: exactSum,
      originalPrice: exactSum + freeInstallSaving,
    };
  });
}

export const adminEditableBundles = () =>
  defaultBundles.map((bundle) => ({
    ...bundle,
    devicesEn: splitBundleDevices(bundle.devicesEn).join('\n'),
    devicesAr: splitBundleDevices(bundle.devicesAr).join('\n'),
  }));
