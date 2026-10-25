import { supabase } from '@/integrations/supabase/client';

export interface ClientBundle {
  id: string;
  nameEn: string;
  nameAr: string;
  priceEgp: number;
  originalPriceEgp: number;
  savingsAr: string;
  savingsEn: string;
  devicesAr: string[];
  devicesEn: string[];
}

export const CLIENT_BUNDLES: ClientBundle[] = [
  {
    id: 'studio',
    nameEn: 'Studio Apartment Smart Kit',
    nameAr: 'باقة الاستوديو الذكية',
    priceEgp: 7000,
    originalPriceEgp: 9150,
    savingsAr: 'وفّر ~٢٥٠ ج.م/شهر من الكهرباء',
    savingsEn: 'Save ~250 EGP/month on electricity',
    devicesAr: [
      '٤ مفاتيح ذكية SONOFF MINI Extreme MINIR4',
      '١ ريموت تكييف ذكي WiFi IR Remote',
      '١ هاب SONOFF Zigbee Bridge Pro',
      '١ حساس حركة ذكي SONOFF Zigbee',
      '١ حساس أبواب وشبابيك ذكي Tuya Zigbee',
    ],
    devicesEn: [
      '4x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4',
      '1x WiFi IR Remote Control',
      '1x SONOFF Zigbee Bridge Pro',
      '1x SONOFF Zigbee Motion Sensor | SNZB-03P',
      '1x Tuya Zigbee Door and Window Sensor',
    ],
  },
  {
    id: '2bed',
    nameEn: '2-Bedroom Apartment Kit',
    nameAr: 'باقة شقة غرفتين',
    priceEgp: 13300,
    originalPriceEgp: 17350,
    savingsAr: 'وفّر ~٤٠٠ ج.م/شهر من الكهرباء',
    savingsEn: 'Save ~400 EGP/month on electricity',
    devicesAr: [
      '٨ مفاتيح ذكية SONOFF MINI Extreme MINIR4',
      '٢ ريموت تكييف ذكي WiFi IR Remote',
      '١ هاب SONOFF Zigbee Bridge Pro',
      '٢ حساس أبواب وشبابيك Tuya Zigbee',
      '٢ حساس حركة SONOFF Zigbee',
      '١ ريموت سيناريوهات SONOFF SwitchMan R5',
    ],
    devicesEn: [
      '8x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4',
      '2x WiFi IR Remote Control',
      '1x SONOFF Zigbee Bridge Pro',
      '2x Tuya Zigbee Door and Window Sensor',
      '2x SONOFF Zigbee Motion Sensor',
      '1x SONOFF SwitchMan R5 Scene Controller',
    ],
  },
  {
    id: '3bed',
    nameEn: '3-Bedroom Apartment Kit',
    nameAr: 'باقة شقة ٣ غرف',
    priceEgp: 20500,
    originalPriceEgp: 26800,
    savingsAr: 'وفّر ~٦٠٠ ج.م/شهر من الكهرباء',
    savingsEn: 'Save ~600 EGP/month on electricity',
    devicesAr: [
      '١٢ مفتاح ذكي SONOFF MINI Extreme MINIR4',
      '٣ ريموت تكييف ذكي WiFi IR Remote',
      '١ هاب SONOFF Zigbee Bridge Pro',
      '٢ حساس حركة SONOFF Zigbee',
      '٣ حساسات أبواب وشبابيك Tuya Zigbee',
      '١ عداد وقاطع طاقة ذكي SONOFF POW Elite 20A',
      '١ حساس حرارة ورطوبة مع شاشة SONOFF LCD',
      '١ ريموت سيناريوهات SONOFF SwitchMan R5',
    ],
    devicesEn: [
      '12x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4',
      '3x WiFi IR Remote Control',
      '1x SONOFF Zigbee Bridge Pro',
      '2x SONOFF Zigbee Motion Sensor',
      '3x Tuya Zigbee Door and Window Sensor',
      '1x SONOFF POW Elite Smart Power Meter',
      '1x SONOFF SNZB-02D Zigbee LCD Smart Temperature',
      '1x SONOFF SwitchMan R5 Scene Controller',
    ],
  },
  {
    id: 'villa-security',
    nameEn: 'Villa Security Kit',
    nameAr: 'باقة أمان الفيلا',
    priceEgp: 21750,
    originalPriceEgp: 28400,
    savingsAr: 'حماية على مدار الساعة وتنبيهات فورية لعائلتك',
    savingsEn: '24/7 protection & real-time phone alerts',
    devicesAr: [
      '١ قفل ذكي ببصمة الإصبع SMART LOCK LEZN K80',
      '٢ كاميرا مراقبة داخلية متحركة CAM-PT2',
      '٢ كاميرا مراقبة خارجية مقاومة للطقس SONOFF CAM-B1P',
      '١ هاب SONOFF Zigbee Bridge Pro',
      '٦ حساسات أبواب وشبابيك Tuya Zigbee',
      '٢ حساس حركة SONOFF Zigbee',
      '١ حساس إنذار دخان وحريق Tuya Zigbee',
      '١ حساس كشف تسريب مياه SONOFF Zigbee',
    ],
    devicesEn: [
      '1x SMART LOCK LEZN 2393 K80 black',
      '2x Indoor Smart Security Camera | CAM-PT2',
      '2x SONOFF CAM Outdoor Smart Security Camera | CAM-B1P',
      '1x SONOFF Zigbee Bridge Pro',
      '6x Tuya Zigbee Door and Window Sensor',
      '2x SONOFF Zigbee Motion Sensor',
      '1x Tuya Zigbee Smoke Sensor',
      '1x SONOFF Zigbee Water Leak Sensor',
    ],
  },
  {
    id: 'energy',
    nameEn: 'Energy Saving Kit',
    nameAr: 'باقة توفير الطاقة',
    priceEgp: 12050,
    originalPriceEgp: 15750,
    savingsAr: 'وفّر حتى ٣٥-٤٠٪ من استهلاك الكهرباء والتكييف',
    savingsEn: 'Cut up to 35-40% on electricity bills',
    devicesAr: [
      '١ عداد طاقة ذكي SONOFF POW Elite 20A',
      '٦ مفاتيح ذكية مع مؤقتات SONOFF MINIR4',
      '٢ ريموت تكييف ذكي WiFi IR Remote',
      '١ هاب SONOFF Zigbee Bridge Pro',
      '٢ حساس حرارة ورطوبة مع شاشة LCD',
      '١ حساس وجود بشري بالرادار SONOFF SNZB-06P',
    ],
    devicesEn: [
      '1x SONOFF POW Elite Smart Power Meter',
      '6x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4',
      '2x WiFi IR Remote Control',
      '1x SONOFF Zigbee Bridge Pro',
      '2x SONOFF SNZB-02D Zigbee LCD Smart Temperature',
      '1x SONOFF Zigbee Human Presence Sensor',
    ],
  },
  {
    id: 'villa-full',
    nameEn: 'Full Villa Smart Home',
    nameAr: 'فيلا ذكية بالكامل',
    priceEgp: 55600,
    originalPriceEgp: 72700,
    savingsAr: 'أتمتة شاملة وفخامة متكاملة وأمان تام للفيلا',
    savingsEn: 'Complete automation & whole-villa security',
    devicesAr: [
      '١ قفل ذكي متطور PANDA 2625 بكاميرا وشاشة داخلية',
      '١ موتور وستارة كهربائية ذكية ٣ متر',
      '٢ كاميرا مراقبة خارجية سونوف CAM-B1P',
      '٢ كاميرا مراقبة داخلية متحركة CAM-PT2',
      '٢٠ مفتاح ذكي SONOFF MINI Extreme MINIR4',
      '٤ ريموت تكييف ذكي WiFi IR Remote',
      '١ هاب ألترا فائق المدى SONOFF Zigbee Bridge Ultra',
      '٦ حساسات أبواب وشبابيك Tuya Zigbee',
      '٤ حساسات حركة SONOFF Zigbee',
      '١ قاطع وعداد طاقة ذكي SONOFF POW Elite',
      '٢ ريموت سيناريوهات وتحكم لاسلكي SwitchMan R5',
    ],
    devicesEn: [
      '1x SMART LOCK PANDA 2625 i18 cat eye',
      '1x Smart Curtain 3 Meters (Motorized)',
      '2x SONOFF CAM Outdoor Smart Security Camera | CAM-B1P',
      '2x Indoor Smart Security Camera | CAM-PT2',
      '20x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4',
      '4x WiFi IR Remote Control',
      '1x SONOFF Zigbee Bridge Ultra',
      '6x Tuya Zigbee Door and Window Sensor',
      '4x SONOFF Zigbee Motion Sensor',
      '1x SONOFF POW Elite Smart Power Meter',
      '2x SONOFF SwitchMan R5 Scene Controller',
    ],
  },
];

export function normalizeArabic(text: string): string {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  return text
    .replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)))
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '');
}

export function extractBudgetMax(rawQuery: string): number | null {
  const norm = normalizeArabic(rawQuery.toLowerCase()).replace(/,/g, '');
  const patterns = [
    /(?:under|below|less\s+than|max(?:imum)?|up\s+to|cheaper\s+than|budget(?:\s+of)?|around|<=?)\s*(\d{3,6})/i,
    /(\d{3,6})\s*(?:egp|le|جنيه|ج\.م)?\s*(?:or\s+less|max)/i,
    /(?:اقل\s+من|تحت|بحد\s+اقصي|لا\s+يتعدي|في\s+حدود|بميزانيه|ميزانيه|حوالي)\s*(\d{3,6})/i,
  ];
  for (const pat of patterns) {
    const m = norm.match(pat);
    if (m?.[1]) {
      const val = Number(m[1]);
      if (val >= 100 && val <= 500000) return val;
    }
  }
  return null;
}

export function matchClientBundles(rawQuery: string): ClientBundle[] {
  const norm = normalizeArabic(rawQuery.toLowerCase());
  const matched: ClientBundle[] = [];
  const add = (id: string) => {
    const b = CLIENT_BUNDLES.find((x) => x.id === id);
    if (b && !matched.some((m) => m.id === id)) matched.push(b);
  };

  if (/(?:3\s*(?:bed|bedroom|غرف|غرفه)|ثلاث\s*غرف|تلات\s*غرف|3bed)/i.test(norm)) add('3bed');
  if (/(?:2\s*(?:bed|bedroom|غرف|غرفه)|غرفتين|وصاله|2bed)/i.test(norm)) add('2bed');
  if (/(?:studio|استوديو|ستوديو|غرفه\s*واحده|شقه\s*صغيره|1\s*bed)/i.test(norm)) add('studio');
  if (/(?:اوفر|توفير|فاتوره|كهرباء|استهلاك|energy|saving|bill|electricity)/i.test(norm)) add('energy');
  if (/(?:فيلا|villa)/i.test(norm)) {
    if (/(?:امان|حمايه|كاميرات|security|lock|camera)/i.test(norm)) {
      add('villa-security');
      add('villa-full');
    } else {
      add('villa-full');
      add('villa-security');
    }
  }
  if (matched.length === 0 && /(?:bundle|kit|باقه|باقات|عرض|عروض|شقه|تجهيز\s*شقه|apartment)/i.test(norm)) {
    add('3bed');
    add('2bed');
    add('studio');
  }
  return matched;
}

/** Detect if an edge function returned the old generic static template so we can upgrade it */
export function isLegacyFallbackResponse(text: string): boolean {
  const t = text.trim();
  return (
    t.includes('here are our top matching products in Egypt:') ||
    t.includes('here are our top verified smart home devices available in Egypt') ||
    t.includes('إليك أفضل الأجهزة المتوافقة والمتاحة لدينا في مصر بضمان رسمي:') ||
    t.includes('إليك أفضل المنتجات المتوفرة لطلبك')
  );
}

/** Normalize full https://azkasmart.com links to relative SPA paths */
export function normalizeAssistantLinks(text: string): string {
  return text.replace(/https?:\/\/(?:www\.)?azkasmart\.com(\/[^\s)\]]*)/gi, '$1');
}

/** Extract /products/slug links from assistant markdown */
export function extractProductSlugsFromMarkdown(content: string): string[] {
  const normalized = normalizeAssistantLinks(content);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const [, slug] of normalized.matchAll(/\[[^\]]*\]\(\/products\/([^)?#\s]+)\)/g)) {
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      out.push(slug);
    }
  }
  return out;
}

let cachedCatalog: Array<{
  id: string;
  name: string;
  slug: string;
  price: number;
  brand: string | null;
  protocol: string | null;
  stock: number;
  category_name: string;
}> | null = null;

async function getClientCatalog() {
  if (cachedCatalog && cachedCatalog.length > 0) return cachedCatalog;
  const { data } = await supabase
    .from('products')
    .select('id, name, slug, price, brand, protocol, stock, categories(name)')
    .eq('is_published', true)
    .gt('price', 0)
    .limit(500);

  cachedCatalog = (data ?? []).map((p: any) => ({
    id: String(p.id),
    name: String(p.name || '').replace(/&amp;/g, '&'),
    slug: String(p.slug || p.id),
    price: Number(p.price) || 0,
    brand: p.brand ? String(p.brand) : null,
    protocol: p.protocol ? String(p.protocol) : null,
    stock: Number(p.stock) || 0,
    category_name: p.categories?.name ? String(p.categories.name) : '',
  }));
  return cachedCatalog;
}

/** Build a smart, accurate, grounded response directly from the live catalog & bundles */
export async function generateSmartClientAdvice(query: string, isRTL: boolean): Promise<string> {
  const catalog = await getClientCatalog();
  const isArabic = /[\u0600-\u06FF]/.test(query) || isRTL;
  const norm = normalizeArabic(query.toLowerCase());
  const maxPrice = extractBudgetMax(query);
  const bundles = matchClientBundles(query);

  const isLockQuery = /(?:lock|قفل|كالون|كيلون|بصمه|اكسس|access|door\s*lock)/i.test(norm);
  const isCameraQuery = /(?:camera|cam|كاميرا|كاميرات|مراقبه)/i.test(norm);
  const isSwitchQuery = /(?:switch|relay|مفتاح|مفاتيح|سويتش|اضاءه|اناره|نور)/i.test(norm);
  const isHubQuery = /(?:hub|bridge|zigbee|هاب|بريدج|زيجبي)/i.test(norm);
  const isSensorQuery = /(?:sensor|motion|حساس|حركه|تسريب|دخان)/i.test(norm);
  const isCurtainQuery = /(?:curtain|blind|ستاره|ستائر)/i.test(norm);

  const bundleKeywords =
    bundles.length > 0
      ? ['minir4', 'ir remote', 'zigbee bridge', 'snzb-03p', 'door and window sensor', 'pow elite', 'snzb-02d', 'switchman r5']
      : [];

  const scored = catalog.map((p) => {
    const nameL = p.name.toLowerCase();
    const catL = p.category_name.toLowerCase();
    const hay = normalizeArabic(`${p.name} ${p.brand || ''} ${p.protocol || ''} ${p.category_name}`.toLowerCase());
    let score = 0;

    if (isLockQuery) {
      if (catL.includes('lock') || /lock|قفل|كالون|reader|fingerprint|sib|lezn|levana|panda|bosch|dnake/i.test(nameL)) {
        score += 18;
      } else {
        score -= 10;
      }
    } else if (isCameraQuery && /cam|camera|كاميرا/i.test(nameL)) {
      score += 18;
    } else if (isSwitchQuery && (catL.includes('switch') || /switch|minir4|zbmini|dualr3|tx|m5/i.test(nameL))) {
      score += 15;
    } else if (isHubQuery && (catL.includes('hub') || /bridge|hub|zigbee bridge/i.test(nameL))) {
      score += 15;
    } else if (isSensorQuery && (catL.includes('sensor') || /sensor|snzb/i.test(nameL))) {
      score += 15;
    } else if (isCurtainQuery && /curtain|ستارة|ستاره/i.test(nameL)) {
      score += 15;
    }

    for (const kw of bundleKeywords) {
      if (nameL.includes(kw)) {
        score += 20;
        break;
      }
    }

    const words = norm.replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter((w) => w.length > 2);
    for (const w of words) {
      if (w === 'smart' || w === 'egp' || w === 'under' || w === 'best' || w === String(maxPrice)) continue;
      if (hay.includes(w)) score += 4;
    }

    if (p.stock > 0) score += 2;
    return { product: p, score };
  });

  // 1. BUNDLE / APARTMENT / SAVING INTENT
  if (bundles.length > 0 && !maxPrice) {
    const primary = bundles[0];
    const secondary = bundles[1];
    const installFee = Math.max(Math.round(primary.priceEgp * 0.2), 1500);
    const topBundleDevices = scored
      .filter((s) => s.score > 5 && s.product.stock > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((s) => s.product);

    const prodLinks = topBundleDevices
      .map((p) => `- **[${p.name}](/products/${p.slug})** — **${p.price.toLocaleString()} EGP**`)
      .join('\n');

    if (isArabic) {
      const devList = primary.devicesAr.map((d) => `  - ${d}`).join('\n');
      const secBlock = secondary
        ? `\n\n💡 **خيار إضافي مخصص لتوفير فاتورة الكهرباء:**\n- **[${secondary.nameAr}](/bundles?bundle=${secondary.id})** بسعر **${secondary.priceEgp.toLocaleString()} ج.م** (بدلاً من ${secondary.originalPriceEgp.toLocaleString()} ج.م) — ${secondary.savingsAr}.`
        : '';
      return `أهلاً بك في **AzkaSmart**! إليك أفضل حل متكامل وموفر لطلبك:

### 🏠 [${primary.nameAr} (${primary.nameEn})](/bundles?bundle=${primary.id})
- **سعر الباقة:** **${primary.priceEgp.toLocaleString()} ج.م** *(بدلاً من ${primary.originalPriceEgp.toLocaleString()} ج.م — خصم ${(primary.originalPriceEgp - primary.priceEgp).toLocaleString()} ج.م)*
- **التوفير الشهري:** ${primary.savingsAr}
- **الأجهزة المشمولة في الباقة:**
${devList}${secBlock}

### 🛒 أبرز الأجهزة الفردية من الكتالوج:
${prodLinks}

- **التركيب والضمان:** تركيب احترافي بجميع المحافظات (٢٠٪ من قيمة الأجهزة = **${installFee.toLocaleString()} ج.م** شامل البرمجة وضمان رسمي لمدة سنة).
- تصفح [جميع الباقات الذكية](/bundles) أو احسب تكلفة شقتك عبر [حاسبة المنزل الذكي](/calculator).`;
    } else {
      const devList = primary.devicesEn.map((d) => `  - ${d}`).join('\n');
      const secBlock = secondary
        ? `\n\n💡 **Focused Energy-Saving Alternative:**\n- **[${secondary.nameEn}](/bundles?bundle=${secondary.id})** — **${secondary.priceEgp.toLocaleString()} EGP** (was ${secondary.originalPriceEgp.toLocaleString()} EGP) — ${secondary.savingsEn}.`
        : '';
      return `Here is our best complete smart-home package for your request:

### 🏠 [${primary.nameEn}](/bundles?bundle=${primary.id})
- **Bundle Price:** **${primary.priceEgp.toLocaleString()} EGP** *(was ${primary.originalPriceEgp.toLocaleString()} EGP — Save ${(primary.originalPriceEgp - primary.priceEgp).toLocaleString()} EGP)*
- **Estimated Savings:** ${primary.savingsEn}
- **Included Devices:**
${devList}${secBlock}

### 🛒 Key Verified Devices in This Kit:
${prodLinks}

- **Installation & Warranty:** Certified installation across Egypt (20% of equipment = **${installFee.toLocaleString()} EGP**, with official 1-year warranty).
- Explore [All Smart Bundles](/bundles) or customize your setup with the [Smart Calculator](/calculator).`;
    }
  }

  // 2. PRICE / BUDGET FILTER INTENT (e.g. "Smart lock under 3000 EGP")
  if (maxPrice) {
    const relevant = scored.filter((s) => s.score > 2 && s.product.stock > 0);
    const pool = relevant.length > 0 ? relevant : scored.filter((s) => s.product.stock > 0);

    const within = pool
      .filter((s) => s.product.price <= maxPrice)
      .sort((a, b) => b.score - a.score || b.product.price - a.product.price)
      .map((s) => s.product);

    const above = pool
      .filter((s) => s.product.price > maxPrice)
      .sort((a, b) => {
        if (isLockQuery) {
          const aFull = /smart\s*lock|lezn|levana|panda|bosch|dnake|gl208/i.test(a.product.name) ? 0 : 1;
          const bFull = /smart\s*lock|lezn|levana|panda|bosch|dnake|gl208/i.test(b.product.name) ? 0 : 1;
          if (aFull !== bFull) return aFull - bFull;
        }
        return a.product.price - b.product.price;
      })
      .map((s) => s.product);

    if (isArabic) {
      let msg = `إليك أفضل الخيارات المتوفرة لميزانيتك (**أقل من ${maxPrice.toLocaleString()} ج.م**):\n\n`;
      if (within.length > 0) {
        msg += `### ✅ أجهزة متوفرة تحت ${maxPrice.toLocaleString()} ج.م:\n`;
        msg += within
          .slice(0, 4)
          .map((p) => `- **[${p.name}](/products/${p.slug})** — **${p.price.toLocaleString()} ج.م**`)
          .join('\n');
        msg += '\n\n';
      }
      if (above.length > 0) {
        msg += `### 💡 أرخص الأقفال الذكية الكاملة (بمقبض وبصمة وكارت):\n`;
        msg += above
          .slice(0, 3)
          .map((p) => `- **[${p.name}](/products/${p.slug})** — **${p.price.toLocaleString()} ج.م**`)
          .join('\n');
        msg += '\n\n';
      }
      msg += `جميع المنتجات بضمان رسمي لمدة سنة مع خدمة التركيب المعتمد (٢٠٪ بحد أدنى ١,٥٠٠ ج.م).`;
      return msg;
    } else {
      let msg = `Here are our verified options for your **under ${maxPrice.toLocaleString()} EGP** budget:\n\n`;
      if (within.length > 0) {
        msg += `### ✅ In-Stock Options Under ${maxPrice.toLocaleString()} EGP (Smart Access Locks & Biometric/Card Readers):\n`;
        msg += within
          .slice(0, 4)
          .map((p) => `- **[${p.name}](/products/${p.slug})** — **${p.price.toLocaleString()} EGP**`)
          .join('\n');
        msg += '\n\n';
      }
      if (above.length > 0) {
        msg += `### 💡 Most Affordable Full-Handle Biometric Door Locks:\n`;
        msg += above
          .slice(0, 3)
          .map((p) => `- **[${p.name}](/products/${p.slug})** — **${p.price.toLocaleString()} EGP**`)
          .join('\n');
        msg += '\n\n';
      }
      msg += `All products include a 1-year official Egyptian warranty. Certified installation is 20% of equipment total (min 1,500 EGP).`;
      return msg;
    }
  }

  // 3. GENERAL MATCHED PRODUCTS
  const topMatched = scored
    .filter((s) => s.score > 2 && s.product.stock > 0)
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
    .slice(0, 5)
    .map((s) => s.product);

  const list = (topMatched.length > 0 ? topMatched : catalog.slice(0, 4))
    .map((p) => `- **[${p.name}](/products/${p.slug})**${p.brand ? ` (${p.brand})` : ''} — **${p.price.toLocaleString()} EGP**`)
    .join('\n');

  if (isArabic) {
    return `إليك أفضل الأجهزة الذكية المتوفرة لدينا لطلبك **"${query}"** بضمان رسمي لمدة سنة:\n\n${list}\n\n- **التركيب الاحترافي:** ٢٠٪ من إجمالي الأجهزة (بحد أدنى ١,٥٠٠ ج.م للزيارة) بجميع محافظات مصر.\n- استكشف [باقات التوفير الذكية](/bundles) أو [حاسبة التكلفة](/calculator).`;
  }
  return `Here are our top verified devices matching **"${query}"** with a 1-year official warranty:\n\n${list}\n\n- **Certified Installation:** 20% of equipment total (min 1,500 EGP) across Egypt.\n- Explore [Smart Bundles](/bundles) or estimate your setup in the [Smart Calculator](/calculator).`;
}
