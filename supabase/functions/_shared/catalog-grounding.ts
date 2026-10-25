// Unified Catalog Grounding & Guardrails Layer for AzkaSmart AI Services.
// Ensures 100% catalog-grounded, safe, and hallucination-free AI responses.

export interface GroundedProduct {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  price: number;
  original_price: number | null;
  protocol: string | null;
  specifications: Record<string, any> | null;
  stock: number;
  image_url: string | null;
  description: string | null;
  category_name?: string | null;
}

export interface OfficialBundle {
  id: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  priceEgp: number;
  originalPriceEgp: number;
  savingsAr: string;
  savingsEn: string;
  devicesAr: string[];
  devicesEn: string[];
}

export interface PriceFilter {
  maxPrice?: number;
  minPrice?: number;
}

export const INSTALLATION_POLICY = {
  percentage: 0.20,
  minVisitFeeEgp: 1500,
  warranty: "ضمان رسمي معتمد لمدة عام كامل في مصر (1-Year Official Warranty in Egypt)",
  coverage: "متاح في جميع محافظات مصر (Available across all Egyptian governorates)",
  supportPhone: "01501896456",
  whatsappUrl: "https://wa.me/201501896456",
};

export const OFFICIAL_BUNDLES: OfficialBundle[] = [
  {
    id: "studio",
    nameEn: "Studio Apartment Smart Kit",
    nameAr: "باقة الاستوديو الذكية",
    descEn: "Starter kit for studios. 4 lights, AC control, motion sensor, and entry security.",
    descAr: "الباقة المتكاملة للاستوديو والشقق الصغيرة: تحكم في ٤ خطوط إضاءة والتكييف وحساس حركة وحساس باب.",
    priceEgp: 7000,
    originalPriceEgp: 9150,
    savingsAr: "وفّر ~٢٥٠ ج.م/شهر من الكهرباء",
    savingsEn: "Save ~250 EGP/month on electricity",
    devicesAr: [
      "٤ مفاتيح ذكية SONOFF MINI Extreme MINIR4",
      "١ ريموت تكييف ذكي WiFi IR Remote",
      "١ هاب SONOFF Zigbee Bridge Pro",
      "١ حساس حركة ذكي SONOFF Zigbee",
      "١ حساس أبواب وشبابيك ذكي Tuya Zigbee",
    ],
    devicesEn: [
      "4x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4",
      "1x WiFi IR Remote Control",
      "1x SONOFF Zigbee Bridge Pro",
      "1x SONOFF Zigbee Motion Sensor | SNZB-03P",
      "1x Tuya Zigbee Door and Window Sensor",
    ],
  },
  {
    id: "2bed",
    nameEn: "2-Bedroom Apartment Kit",
    nameAr: "باقة شقة غرفتين",
    descEn: "Smart lighting, climate control, smart scenes, and entry protection for a 2-bedroom home.",
    descAr: "إضاءة ذكية، تحكم بالتكييف، سيناريوهات تشغيل ذكية، وحماية المداخل لشقة غرفتين.",
    priceEgp: 13300,
    originalPriceEgp: 17350,
    savingsAr: "وفّر ~٤٠٠ ج.م/شهر من الكهرباء",
    savingsEn: "Save ~400 EGP/month on electricity",
    devicesAr: [
      "٨ مفاتيح ذكية SONOFF MINI Extreme MINIR4",
      "٢ ريموت تكييف ذكي WiFi IR Remote",
      "١ هاب SONOFF Zigbee Bridge Pro",
      "٢ حساس أبواب وشبابيك Tuya Zigbee",
      "٢ حساس حركة SONOFF Zigbee",
      "١ ريموت سيناريوهات SONOFF SwitchMan R5",
    ],
    devicesEn: [
      "8x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4",
      "2x WiFi IR Remote Control",
      "1x SONOFF Zigbee Bridge Pro",
      "2x Tuya Zigbee Door and Window Sensor",
      "2x SONOFF Zigbee Motion Sensor",
      "1x SONOFF SwitchMan R5 Scene Controller",
    ],
  },
  {
    id: "3bed",
    nameEn: "3-Bedroom Apartment Kit",
    nameAr: "باقة شقة ٣ غرف",
    descEn: "Complete home automation with 12 switch channels, 3 AC controllers, security sensors, temperature display, and whole-home power meter.",
    descAr: "منظومة شاملة لـ ١٢ خط إضاءة، ٣ أجهزة تكييف، حساسات أمان، شاشة حرارة ورطوبة، وعداد رقمي لمراقبة استهلاك الطاقة.",
    priceEgp: 20500,
    originalPriceEgp: 26800,
    savingsAr: "وفّر ~٦٠٠ ج.م/شهر من الكهرباء",
    savingsEn: "Save ~600 EGP/month on electricity",
    devicesAr: [
      "١٢ مفتاح ذكي SONOFF MINI Extreme MINIR4",
      "٣ ريموت تكييف ذكي WiFi IR Remote",
      "١ هاب SONOFF Zigbee Bridge Pro",
      "٢ حساس حركة SONOFF Zigbee",
      "٣ حساسات أبواب وشبابيك Tuya Zigbee",
      "١ عداد وقاطع طاقة ذكي SONOFF POW Elite 20A",
      "١ حساس حرارة ورطوبة مع شاشة SONOFF LCD",
      "١ ريموت سيناريوهات SONOFF SwitchMan R5",
    ],
    devicesEn: [
      "12x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4",
      "3x WiFi IR Remote Control",
      "1x SONOFF Zigbee Bridge Pro",
      "2x SONOFF Zigbee Motion Sensor",
      "3x Tuya Zigbee Door and Window Sensor",
      "1x SONOFF POW Elite Smart Power Meter",
      "1x SONOFF SNZB-02D Zigbee LCD Smart Temperature",
      "1x SONOFF SwitchMan R5 Scene Controller",
    ],
  },
  {
    id: "villa-security",
    nameEn: "Villa Security Kit",
    nameAr: "باقة أمان الفيلا",
    descEn: "Comprehensive security system with smart biometric lock, indoor & outdoor cameras, perimeter sensors, smoke and water leak detectors.",
    descAr: "نظام أمان شامل مع قفل إلكتروني ببصمة الإصبع، كاميرات مراقبة داخلية وخارجية، حساسات أبواب، وحساسات دخان وتسريب مياه.",
    priceEgp: 21750,
    originalPriceEgp: 28400,
    savingsAr: "حماية على مدار الساعة وتنبيهات فورية لعائلتك",
    savingsEn: "24/7 protection & real-time phone alerts",
    devicesAr: [
      "١ قفل ذكي ببصمة الإصبع SMART LOCK LEZN K80",
      "٢ كاميرا مراقبة داخلية متحركة CAM-PT2",
      "٢ كاميرا مراقبة خارجية مقاومة للطقس SONOFF CAM-B1P",
      "١ هاب SONOFF Zigbee Bridge Pro",
      "٦ حساسات أبواب وشبابيك Tuya Zigbee",
      "٢ حساس حركة SONOFF Zigbee",
      "١ حساس إنذار دخان وحريق Tuya Zigbee",
      "١ حساس كشف تسريب مياه SONOFF Zigbee",
    ],
    devicesEn: [
      "1x SMART LOCK LEZN 2393 K80 black",
      "2x Indoor Smart Security Camera | CAM-PT2",
      "2x SONOFF CAM Outdoor Smart Security Camera | CAM-B1P",
      "1x SONOFF Zigbee Bridge Pro",
      "6x Tuya Zigbee Door and Window Sensor",
      "2x SONOFF Zigbee Motion Sensor",
      "1x Tuya Zigbee Smoke Sensor",
      "1x SONOFF Zigbee Water Leak Sensor",
    ],
  },
  {
    id: "energy",
    nameEn: "Energy Saving Kit",
    nameAr: "باقة توفير الطاقة",
    descEn: "Slashing electricity bills with real-time power metering, radar human presence sensing, LCD climate displays, and scheduled AC timers.",
    descAr: "تقليل فاتورة الكهرباء: عداد طاقة لمراقبة الاستهلاك لحظياً، حساس وجود بشري بالرادار، ومؤقتات تكييف ذكية.",
    priceEgp: 12050,
    originalPriceEgp: 15750,
    savingsAr: "وفّر حتى ٣٥-٤٠٪ من استهلاك الكهرباء والتكييف",
    savingsEn: "Cut up to 35-40% on electricity bills",
    devicesAr: [
      "١ عداد طاقة ذكي SONOFF POW Elite 20A",
      "٦ مفاتيح ذكية مع مؤقتات SONOFF MINIR4",
      "٢ ريموت تكييف ذكي WiFi IR Remote",
      "١ هاب SONOFF Zigbee Bridge Pro",
      "٢ حساس حرارة ورطوبة مع شاشة LCD",
      "١ حساس وجود بشري بالرادار SONOFF SNZB-06P",
    ],
    devicesEn: [
      "1x SONOFF POW Elite Smart Power Meter",
      "6x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4",
      "2x WiFi IR Remote Control",
      "1x SONOFF Zigbee Bridge Pro",
      "2x SONOFF SNZB-02D Zigbee LCD Smart Temperature",
      "1x SONOFF Zigbee Human Presence Sensor",
    ],
  },
  {
    id: "villa-full",
    nameEn: "Full Villa Smart Home",
    nameAr: "فيلا ذكية بالكامل",
    descEn: "Ultimate luxury smart villa with motorized curtain, cat-eye camera lock, full surveillance, 20 lighting channels, and Ultra hub.",
    descAr: "الفيلا الذكية المتكاملة الفاخرة مع ستارة ذكية بموتور، قفل ذكي بكاميرا وشاشة، مراقبة شاملة، ٢٠ خط إضاءة، وهاب ألترا متقدم.",
    priceEgp: 55600,
    originalPriceEgp: 72700,
    savingsAr: "أتمتة شاملة وفخامة متكاملة وأمان تام للفيلا",
    savingsEn: "Complete automation & whole-villa security",
    devicesAr: [
      "١ قفل ذكي متطور PANDA 2625 بكاميرا وشاشة داخلية",
      "١ موتور وستارة كهربائية ذكية ٣ متر",
      "٢ كاميرا مراقبة خارجية سونوف CAM-B1P",
      "٢ كاميرا مراقبة داخلية متحركة CAM-PT2",
      "٢٠ مفتاح ذكي SONOFF MINI Extreme MINIR4",
      "٤ ريموت تكييف ذكي WiFi IR Remote",
      "١ هاب ألترا فائق المدى SONOFF Zigbee Bridge Ultra",
      "٦ حساسات أبواب وشبابيك Tuya Zigbee",
      "٤ حساسات حركة SONOFF Zigbee",
      "١ قاطع وعداد طاقة ذكي SONOFF POW Elite",
      "٢ ريموت سيناريوهات وتحكم لاسلكي SwitchMan R5",
    ],
    devicesEn: [
      "1x SMART LOCK PANDA 2625 i18 cat eye",
      "1x Smart Curtain 3 Meters (Motorized)",
      "2x SONOFF CAM Outdoor Smart Security Camera | CAM-B1P",
      "2x Indoor Smart Security Camera | CAM-PT2",
      "20x SONOFF MINI Extreme Wi-Fi Smart Switch MINIR4",
      "4x WiFi IR Remote Control",
      "1x SONOFF Zigbee Bridge Ultra",
      "6x Tuya Zigbee Door and Window Sensor",
      "4x SONOFF Zigbee Motion Sensor",
      "1x SONOFF POW Elite Smart Power Meter",
      "2x SONOFF SwitchMan R5 Scene Controller",
    ],
  },
];

// Egyptian Dialect & Smart Home Term Synonym Mapping
export const SYNONYMS: Record<string, string[]> = {
  lock: [
    "قفل", "كالون", "كيلون", "بصمة", "بصمه", "اقفال", "أقفال", "كوالين",
    "smart lock", "lock", "locks", "انتركم", "باب", "sib", "lezn", "levana", "panda", "bosch", "dnake",
  ],
  switch: [
    "مفتاح", "سويتش", "مفاتيح", "تاتش", "لمس", "انارة", "اناره", "اضاءة", "اضاءه",
    "نور", "لمبة", "لمبه", "switch", "switches", "relay", "minir4", "zbmini", "tx", "switchman", "قاطع",
  ],
  neutral: [
    "نيوترال", "خط محايد", "سلك محايد", "ارضي", "أرضي", "neutral", "no neutral", "بدون نيوترال", "zbmini-l2", "zbminil2",
  ],
  hub: [
    "هاب", "جيتواي", "بريدج", "موزع", "hub", "gateway", "bridge", "coordinator", "zigbee bridge",
  ],
  curtain: [
    "ستارة", "ستاره", "ستائر", "موتور ستارة", "شتر", "curtain", "blind", "shutter",
  ],
  camera: [
    "كاميرا", "كاميرات", "مراقبة", "مراقبه", "كاميرا خارجية", "كاميرا داخلية", "camera", "cameras", "cctv", "cam-pt2", "cam-b1p",
  ],
  sensor: [
    "حساس", "حساسات", "سينسور", "مستشعر", "حركة", "حركه", "تسريب", "دخان", "حرارة", "حراره", "sensor", "snzb",
  ],
  access: [
    "اكسس", "أكسس", "اكسس كنترول", "دخول", "كارت", "ميدالية", "access control", "rfid", "zkteco", "reader", "fingerprint",
  ],
  climate: [
    "تكييف", "تكييفات", "مكيف", "ريموت", "ir", "ir remote", "climate", "temperature",
  ],
  energy: [
    "توفير", "اوفر", "أوفر", "كهرباء", "فاتورة", "فاتوره", "استهلاك", "طاقة", "طاقه", "عداد", "pow", "pow elite", "circuit breaker",
  ],
  bundle: [
    "باقة", "باقه", "باقات", "عرض", "عروض", "سيستم كامل", "تجهيز شقة", "تجهيز شقه", "شقة", "شقه",
    "غرف", "غرفه", "غرفة", "غرفتين", "استوديو", "ستوديو", "فيلا", "bundle", "bundles", "kit", "apartment", "bedroom", "villa", "studio",
  ],
};

/** Normalize Arabic digits (٠-٩ -> 0-9) and common Arabic letter variants */
export function normalizeArabicText(text: string): string {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  let out = text.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
  out = out
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ـ/g, "");
  return out;
}

/** Extract price constraints (e.g. "under 3000 EGP", "أقل من 3000 جنيه", "تحت 5000") */
export function extractPriceFilter(rawQuery: string): PriceFilter {
  const norm = normalizeArabicText(rawQuery.toLowerCase()).replace(/,/g, "");

  // Max price patterns (English & Arabic)
  const maxPatterns = [
    /(?:under|below|less\s+than|max(?:imum)?|up\s+to|cheaper\s+than|budget(?:\s+of)?|around|<=?)\s*(\d{3,6})/i,
    /(\d{3,6})\s*(?:egp|le|جنيه|ج\.م)?\s*(?:or\s+less|max)/i,
    /(?:اقل\s+من|تحت|بحد\s+اقصي|لا\s+يتعدي|في\s+حدود|بميزانيه|ميزانيه|حوالي)\s*(\d{3,6})/i,
  ];

  for (const pat of maxPatterns) {
    const m = norm.match(pat);
    if (m && m[1]) {
      const val = Number(m[1]);
      if (val >= 100 && val <= 500000) {
        return { maxPrice: val };
      }
    }
  }

  return {};
}

/** Match official bundles based on room count, property type, or energy/security intent */
export function matchOfficialBundles(rawQuery: string): OfficialBundle[] {
  const norm = normalizeArabicText(rawQuery.toLowerCase());
  const matched: OfficialBundle[] = [];

  const addBundle = (id: string) => {
    const b = OFFICIAL_BUNDLES.find((x) => x.id === id);
    if (b && !matched.some((m) => m.id === id)) matched.push(b);
  };

  // Specific bundle matches
  if (/(?:3\s*(?:bed|bedroom|غرف|غرفه)|ثلاث\s*غرف|تلات\s*غرف|3bed)/i.test(norm)) {
    addBundle("3bed");
  }
  if (/(?:2\s*(?:bed|bedroom|غرف|غرفه)|غرفتين|وصاله|2bed)/i.test(norm)) {
    addBundle("2bed");
  }
  if (/(?:studio|استوديو|ستوديو|غرفه\s*واحده|شقه\s*صغيره|1\s*bed)/i.test(norm)) {
    addBundle("studio");
  }
  if (/(?:اوفر|توفير|فاتوره|كهرباء|استهلاك|energy|saving|bill|electricity)/i.test(norm)) {
    // If they also asked for 3-bedroom (e.g. "عايز اوفر لشقه 3 غرف"), 3bed is first and energy is second
    addBundle("energy");
  }
  if (/(?:فيلا|villa)/i.test(norm)) {
    if (/(?:امان|حمايه|كاميرات|security|lock|camera)/i.test(norm)) {
      addBundle("villa-security");
      addBundle("villa-full");
    } else {
      addBundle("villa-full");
      addBundle("villa-security");
    }
  }

  // Generic bundle/apartment request without room count
  if (
    matched.length === 0 &&
    /(?:bundle|kit|باقه|باقات|عرض|عروض|شقه|تجهيز\s*شقه|apartment)/i.test(norm)
  ) {
    addBundle("3bed");
    addBundle("2bed");
    addBundle("studio");
  }

  return matched;
}

/** Load active published products with rich technical fields */
export async function loadGroundedCatalog(supabase: any, limit = 500): Promise<GroundedProduct[]> {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, slug, brand, price, original_price, protocol, specifications, stock, image_url, description, category_id, categories(name)")
      .eq("is_published", true)
      .limit(limit);

    if (error || !data) return [];

    return data
      .map((p: any) => ({
        id: String(p.id),
        name: String(p.name || "").replace(/&amp;/g, "&"),
        slug: String(p.slug || p.id),
        brand: p.brand ? String(p.brand) : null,
        price: Number(p.price) || 0,
        original_price: p.original_price ? Number(p.original_price) : null,
        protocol: p.protocol ? String(p.protocol) : null,
        specifications: typeof p.specifications === "object" ? p.specifications : null,
        stock: Number(p.stock) || 0,
        image_url: p.image_url ? String(p.image_url) : null,
        description: p.description ? String(p.description) : null,
        category_name: p.categories?.name ? String(p.categories.name) : null,
      }))
      .filter((p: GroundedProduct) => p.price > 0);
  } catch (e) {
    console.error("loadGroundedCatalog error:", e);
    return [];
  }
}

const STOP_WORDS = new Set([
  "under", "below", "less", "than", "egp", "price", "cost", "best", "for", "the", "with", "and",
  "want", "need", "how", "much", "what", "can", "you", "have", "from", "into",
  "عايز", "محتاج", "افضل", "احسن", "بكام", "كام", "سعر", "جنيه", "مصري", "في", "من", "علي", "على",
  "هل", "عندكم", "متوفر", "لو", "سمحت", "اللي", "لشقه", "لشقة", "شقه", "شقة", "غرف", "غرفه",
]);

/** Expand query with synonyms to ensure Egyptian dialect terms match English/Arabic catalog */
export function expandQueryTerms(rawQuery: string): string[] {
  const norm = normalizeArabicText(rawQuery.toLowerCase());
  const clean = norm.replace(/[^\p{L}\p{N}\s-]/gu, " ");
  const rawTokens = clean.split(/\s+/).filter((t) => t.length > 0);
  const terms = rawTokens.filter((t) => (t.length > 1 || /^\d$/.test(t)) && !STOP_WORDS.has(t));
  const expanded = new Set<string>(terms);

  for (const term of rawTokens) {
    for (const [canonical, synList] of Object.entries(SYNONYMS)) {
      const normalizedSyns = synList.map((s) => normalizeArabicText(s.toLowerCase()));
      if (normalizedSyns.some((s) => s === term || (term.length >= 3 && s.includes(term)))) {
        expanded.add(canonical);
        synList.forEach((s) => expanded.add(s.toLowerCase()));
      }
    }
  }

  return Array.from(expanded);
}

/** Rank and filter catalog items matching a user query, honoring price filters and bundle components */
export function matchCatalogProducts(query: string, catalog: GroundedProduct[], maxResults = 15): GroundedProduct[] {
  const validCatalog = catalog.filter((p) => p.price > 0);
  const pool = validCatalog.length > 0 ? validCatalog : catalog;

  const priceFilter = extractPriceFilter(query);
  const matchedBundles = matchOfficialBundles(query);
  const terms = expandQueryTerms(query).filter(
    (t) => !(priceFilter.maxPrice && t === String(priceFilter.maxPrice)),
  );

  // Detect primary category intent (e.g. lock, switch, camera, sensor, curtain, hub)
  const normQuery = normalizeArabicText(query.toLowerCase());
  const isLockQuery = /(?:lock|قفل|كالون|كيلون|بصمه|اكسس|access|door\s*lock)/i.test(normQuery);
  const isCameraQuery = /(?:camera|cam|كاميرا|كاميرات|مراقبه)/i.test(normQuery);
  const isSwitchQuery = /(?:switch|relay|مفتاح|مفاتيح|سويتش|اضاءه|اناره|نور)/i.test(normQuery);
  const isBundleOrHomeQuery = matchedBundles.length > 0;

  // Keywords for products inside matched bundles so bundle queries retrieve actual bundle devices
  const bundleDeviceKeywords: string[] = [];
  if (isBundleOrHomeQuery) {
    bundleDeviceKeywords.push(
      "minir4",
      "ir remote",
      "zigbee bridge",
      "snzb-03p",
      "door and window sensor",
      "pow elite",
      "snzb-02d",
      "switchman r5",
      "snzb-06p",
    );
  }

  const scored = pool.map((p) => {
    const nameLower = p.name.toLowerCase();
    const catLower = (p.category_name || "").toLowerCase();
    const hay = normalizeArabicText(
      `${p.name} ${p.brand || ""} ${p.protocol || ""} ${p.category_name || ""} ${p.description || ""}`.toLowerCase(),
    );
    let score = 0;

    // 1. Category alignment boost / penalty
    if (isLockQuery) {
      if (catLower.includes("lock") || /lock|قفل|كالون|reader|fingerprint|sib|lezn|levana|panda|bosch|dnake/i.test(nameLower)) {
        score += 15;
      } else {
        score -= 10;
      }
    } else if (isCameraQuery) {
      if (/cam|camera|كاميرا/i.test(nameLower)) score += 15;
    } else if (isSwitchQuery) {
      if (catLower.includes("switch") || /switch|minir4|zbmini|dualr3|tx|m5/i.test(nameLower)) score += 12;
    }

    // 2. Bundle device boost when user asks about an apartment/bundle/saving setup
    if (bundleDeviceKeywords.length > 0) {
      for (const kw of bundleDeviceKeywords) {
        if (nameLower.includes(kw)) {
          score += 18;
          break;
        }
      }
    }

    // 3. Term matching (ignoring generic word "smart" unless accompanied by category match)
    for (const term of terms) {
      if (term === "smart" || term === "ذكي" || term === "سمارت") continue;
      if (hay.includes(term)) {
        score += term.length >= 4 ? 3 : 1;
        if (nameLower.includes(term)) score += 5;
        if (p.brand && p.brand.toLowerCase() === term) score += 5;
      }
    }

    if (p.stock > 0) score += 2;

    return { product: p, score };
  });

  // Handle explicit budget filter (e.g. "Smart lock under 3000 EGP")
  if (priceFilter.maxPrice) {
    const maxP = priceFilter.maxPrice;
    const relevant = scored.filter((s) => s.score > 2);
    const candidatePool = relevant.length > 0 ? relevant : scored;

    // Products within budget (sorted by relevance then price)
    const withinBudget = candidatePool
      .filter((s) => s.product.price <= maxP && s.product.stock > 0)
      .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
      .map((s) => s.product);

    // Closest products above budget (for locks, prioritize full-handle door locks sorted by lowest price first!)
    const aboveBudgetCheapest = candidatePool
      .filter((s) => s.product.price > maxP && s.product.stock > 0)
      .sort((a, b) => {
        if (isLockQuery) {
          const aFull = /smart\s*lock|lezn|levana|panda|bosch|dnake|gl208/i.test(a.product.name) ? 0 : 1;
          const bFull = /smart\s*lock|lezn|levana|panda|bosch|dnake|gl208/i.test(b.product.name) ? 0 : 1;
          if (aFull !== bFull) return aFull - bFull;
        }
        return a.product.price - b.product.price;
      })
      .map((s) => s.product);

    const combined = [
      ...withinBudget.slice(0, Math.max(6, maxResults - 4)),
      ...aboveBudgetCheapest.slice(0, 5),
    ];
    if (combined.length > 0) {
      return combined.slice(0, maxResults);
    }
  }

  scored.sort((a, b) => b.score - a.score || a.product.price - b.product.price);
  const matched = scored.filter((s) => s.score > 2).map((s) => s.product);
  return matched.length ? matched.slice(0, maxResults) : pool.slice(0, maxResults);
}

/** Format grounded catalog text for system prompts so the model has slugs, protocols, and exact prices */
export function formatCatalogPromptContext(products: GroundedProduct[]): string {
  return products.map((p) => {
    const stockStatus = p.stock > 0 ? "In Stock" : "Out of Stock";
    const cat = p.category_name ? ` [Category: ${p.category_name}]` : "";
    const brand = p.brand ? ` [Brand: ${p.brand}]` : "";
    const proto = p.protocol ? ` [Protocol: ${p.protocol}]` : "";
    return `- ${p.name}${cat}${brand}${proto} | Price: ${p.price} EGP | Slug: ${p.slug} | Status: ${stockStatus}`;
  }).join("\n");
}

/**
 * Intelligent Domain-Expert Grounded Response Builder.
 * Produces an accurate, consultative, catalog-grounded answer in Arabic or English
 * covering official bundles, price budgets, technical rules, and verified product links.
 */
export function buildSmartGroundedResponse(
  query: string,
  matchedProducts: GroundedProduct[],
  fullCatalog: GroundedProduct[],
  langHint?: string,
): string {
  const isArabic = /[\u0600-\u06FF]/.test(query) || langHint === "ar";
  const norm = normalizeArabicText(query.toLowerCase());
  const priceFilter = extractPriceFilter(query);
  const bundles = matchOfficialBundles(query);

  // 1. BUNDLE / APARTMENT / SAVING INTENT (e.g. "عايز اوفر لشقه 3 غرف" or "Best bundle for a 3-bedroom apartment")
  if (bundles.length > 0 && !priceFilter.maxPrice) {
    const primary = bundles[0];
    const secondary = bundles[1];
    const installFee = Math.max(
      Math.round(primary.priceEgp * INSTALLATION_POLICY.percentage),
      INSTALLATION_POLICY.minVisitFeeEgp,
    );

    const keyProducts = matchedProducts.slice(0, 4);
    const prodLinks = keyProducts
      .map((p) => `- **[${p.name}](/products/${p.slug})** — **${p.price.toLocaleString()} EGP**`)
      .join("\n");

    if (isArabic) {
      const devicesList = primary.devicesAr.map((d) => `  - ${d}`).join("\n");
      const secBlock = secondary
        ? `\n\n💡 **بديل اقتصادي لتقليل الفاتورة:**\n- **[${secondary.nameAr}](/bundles?bundle=${secondary.id})** بسعر **${secondary.priceEgp.toLocaleString()} ج.م** (بدلاً من ${secondary.originalPriceEgp.toLocaleString()} ج.م) — ${secondary.savingsAr}.`
        : "";
      return `أهلاً بك في **AzkaSmart**! أنسب حل لطلبك هو:

### 🏠 [${primary.nameAr} (${primary.nameEn})](/bundles?bundle=${primary.id})
- **سعر الباقة:** **${primary.priceEgp.toLocaleString()} ج.م** *(بدلاً من ${primary.originalPriceEgp.toLocaleString()} ج.م — وفر ${(primary.originalPriceEgp - primary.priceEgp).toLocaleString()} ج.م)*
- **التوفير الشهري:** ${primary.savingsAr}
- **محتويات الباقة المتكاملة:**
${devicesList}${secBlock}

### 🛒 أبرز الأجهزة المشمولة في الكتالوج:
${prodLinks}

- **التركيب والضمان:** تركيب احترافي بجميع محافظات مصر (${INSTALLATION_POLICY.percentage * 100}% من قيمة الأجهزة = **${installFee.toLocaleString()} ج.م** شامل البرمجة والضمان الرسمي لمدة سنة).
- يمكنك استعراض [جميع باقات التوفير](/bundles) أو استخدام [حاسبة التكلفة الذكية](/calculator).`;
    } else {
      const devicesList = primary.devicesEn.map((d) => `  - ${d}`).join("\n");
      const secBlock = secondary
        ? `\n\n💡 **Focused Energy-Saving Alternative:**\n- **[${secondary.nameEn}](/bundles?bundle=${secondary.id})** — **${secondary.priceEgp.toLocaleString()} EGP** (was ${secondary.originalPriceEgp.toLocaleString()} EGP) — ${secondary.savingsEn}.`
        : "";
      return `Here is our top recommended package for your home:

### 🏠 [${primary.nameEn}](/bundles?bundle=${primary.id})
- **Bundle Price:** **${primary.priceEgp.toLocaleString()} EGP** *(was ${primary.originalPriceEgp.toLocaleString()} EGP — Save ${(primary.originalPriceEgp - primary.priceEgp).toLocaleString()} EGP)*
- **Estimated Savings:** ${primary.savingsEn}
- **Included Devices:**
${devicesList}${secBlock}

### 🛒 Key Verified Devices in This Setup:
${prodLinks}

- **Installation & Warranty:** Certified installation across Egypt (${INSTALLATION_POLICY.percentage * 100}% of equipment = **${installFee.toLocaleString()} EGP**, with official 1-year warranty).
- Explore [All Smart Bundles](/bundles) or customize your rooms in the [Smart Home Calculator](/calculator).`;
    }
  }

  // 2. PRICE / BUDGET FILTER INTENT (e.g. "Smart lock under 3000 EGP" / "قفل ذكي أقل من 3000 جنيه")
  if (priceFilter.maxPrice) {
    const maxP = priceFilter.maxPrice;
    const within = matchedProducts.filter((p) => p.price <= maxP);
    const above = matchedProducts.filter((p) => p.price > maxP).sort((a, b) => a.price - b.price);

    if (isArabic) {
      let msg = `بخصوص طلبك في حدود **${maxP.toLocaleString()} ج.م**:\n\n`;
      if (within.length > 0) {
        msg += `### ✅ خيارات متوفرة تحت ${maxP.toLocaleString()} ج.م:\n`;
        msg += within
          .slice(0, 5)
          .map((p) => `- **[${p.name}](/products/${p.slug})** — **${p.price.toLocaleString()} ج.م**`)
          .join("\n");
        msg += "\n\n";
      } else {
        msg += `حالياً لا يتوفر منتج مطابق تماماً أقل من **${maxP.toLocaleString()} ج.م** في هذه الفئة.\n\n`;
      }
      if (above.length > 0) {
        msg += `### 💡 أقرب الفئات الأعلى (أقفال الأبواب الذكية الكاملة بالبصمة والمقبض):\n`;
        msg += above
          .slice(0, 3)
          .map((p) => `- **[${p.name}](/products/${p.slug})** — **${p.price.toLocaleString()} ج.م**`)
          .join("\n");
        msg += "\n\n";
      }
      msg += `جميع المنتجات بضمان رسمي لمدة سنة مع إمكانية التركيب المعتمد (٢٠٪ بحد أدنى ١,٥٠٠ ج.م).`;
      return msg;
    } else {
      let msg = `Here are our verified options for your **${maxP.toLocaleString()} EGP** budget:\n\n`;
      if (within.length > 0) {
        msg += `### ✅ In-Stock Options Under ${maxP.toLocaleString()} EGP (Smart Access Locks & Fingerprint/Card Readers):\n`;
        msg += within
          .slice(0, 5)
          .map((p) => `- **[${p.name}](/products/${p.slug})** — **${p.price.toLocaleString()} EGP**`)
          .join("\n");
        msg += "\n\n";
      } else {
        msg += `We currently do not have a matching model priced below **${maxP.toLocaleString()} EGP**.\n\n`;
      }
      if (above.length > 0) {
        msg += `### 💡 Most Affordable Full-Handle Biometric Door Locks:\n`;
        msg += above
          .slice(0, 3)
          .map((p) => `- **[${p.name}](/products/${p.slug})** — **${p.price.toLocaleString()} EGP**`)
          .join("\n");
        msg += "\n\n";
      }
      msg += `All products include a 1-year official warranty in Egypt. Professional installation is 20% of equipment total (min 1,500 EGP).`;
      return msg;
    }
  }

  // 3. INSTALLATION / WARRANTY / SUPPORT INTENT
  if (/(?:installation|install\s+fee|visit\s+fee|warranty|تركيب|معاينه|مصاريف\s+التركيب|الضمان)/i.test(norm)) {
    if (isArabic) {
      return `### 🔧 نظام التركيب والضمان في AzkaSmart
- **تكلفة التركيب الاحترافي:** **٢٠٪ من إجمالي قيمة الأجهزة** بحد أدنى **١,٥٠٠ ج.م** للزيارة الواحدة (تشمل التوصيل الكهربائي، البرمجة، وربط الموبايل).
- **التغطية الجغرافية:** متاح في جميع محافظات مصر (القاهرة، الجيزة، الإسكندرية، الساحل، الدلتا، والصعيد).
- **الضمان:** ضمان رسمي معتمد لمدة **سنة كاملة** ضد عيوب الصناعة.

يمكنك حساب تكلفة شقتك فوراً عبر [حاسبة المنزل الذكي](/calculator) أو استعراض [الباقات الجاهزة](/bundles).`;
    } else {
      return `### 🔧 AzkaSmart Installation & Warranty Policy
- **Certified Installation Fee:** **20% of total equipment cost**, with a **1,500 EGP minimum visit fee** (covers wiring, hub pairing, mobile app setup, and scene programming).
- **Coverage:** Available across all Egyptian governorates (Cairo, Giza, Alexandria, North Coast, and nationwide).
- **Warranty:** Official **1-Year Egyptian Warranty** on all smart devices and locks.

Estimate your project in seconds with our [Smart Home Calculator](/calculator) or browse [Smart Bundles](/bundles).`;
    }
  }

  // 4. GENERAL PRODUCT RECOMMENDATIONS
  const topList = (matchedProducts.length > 0 ? matchedProducts : fullCatalog)
    .slice(0, 5)
    .map((p) => `- **[${p.name}](/products/${p.slug})**${p.brand ? ` (${p.brand})` : ""} — **${p.price.toLocaleString()} EGP**`)
    .join("\n");

  if (isArabic) {
    return `إليك أفضل الأجهزة الذكية المتوفرة لدينا لطلبك **"${query}"** بضمان رسمي في مصر:\n\n${topList}\n\n- **التركيب المعتمد:** ٢٠٪ من قيمة الأجهزة (بحد أدنى ١,٥٠٠ ج.م للزيارة) بجميع المحافظات.\n- تصفح [باقات التوفير المتكاملة](/bundles) أو احسب تكلفة بيتك عبر [حاسبة التكلفة](/calculator).`;
  } else {
    return `Here are the top verified smart devices matching **"${query}"** in Egypt:\n\n${topList}\n\n- **Certified Installation:** 20% of equipment total (min 1,500 EGP visit fee) across Egypt with 1-year warranty.\n- Explore [Smart Bundles](/bundles) or estimate your setup with the [Smart Calculator](/calculator).`;
  }
}

/** Check if a query is vague and needs ONE clarifying question */
export function detectVagueIntent(query: string): string | null {
  const q = query.trim().toLowerCase();
  const shortQueries: Record<string, { ar: string; en: string }> = {
    "سمارت هوم": {
      ar: "لتحديد أفضل حل لك: هل تجهز شقة/فيلا جديدة بالكامل، أم تبحث عن التحكم في بند معين كالإضاءة أو التكييف أو الأمان؟",
      en: "To recommend the best setup: Are you outfitting a new home completely, or looking to control a specific area like lighting, AC, or security?",
    },
    "smart home": {
      ar: "لتحديد أفضل حل لك: هل تجهز شقة/فيلا جديدة بالكامل، أم تبحث عن التحكم في بند معين كالإضاءة أو التكييف أو الأمان؟",
      en: "To recommend the best setup: Are you outfitting a new home completely, or looking to control a specific area like lighting, AC, or security?",
    },
    "أمان": {
      ar: "هل تبحث عن تأمين باب الشقة الرئيسي (قفل ذكي بكاميرا وبصمة) أم نظام مراقبة كامل بكاميرات خارجية وحساسات؟",
      en: "Are you looking for main door security (smart biometric lock & doorbell) or a full surveillance system with outdoor cameras?",
    },
    "security": {
      ar: "هل تبحث عن تأمين باب الشقة الرئيسي (قفل ذكي بكاميرا وبصمة) أم نظام مراقبة كامل بكاميرات خارجية وحساسات؟",
      en: "Are you looking for main door security (smart biometric lock & doorbell) or a full surveillance system with outdoor cameras?",
    },
    "مفتاح": {
      ar: "هل العلب الكهربائية لديك تحتوي على سلك محايد (نيوترال)، وكم خط إضاءة (Gang) في المفتاح المطلوب؟",
      en: "Do your wall switch boxes have a neutral wire, and how many gangs (buttons) do you need?",
    },
    "switch": {
      ar: "هل العلب الكهربائية لديك تحتوي على سلك محايد (نيوترال)، وكم خط إضاءة (Gang) في المفتاح المطلوب؟",
      en: "Do your wall switch boxes have a neutral wire, and how many gangs (buttons) do you need?",
    },
    "كالون": {
      ar: "ما نوع الباب لديك (خشب، سيكوريت زجاجي، أم مصفح)، وهل تفضل فتح الباب بالبصمة والكارت فقط أم مع كاميرا وشاشة داخلية؟",
      en: "What type of door do you have (wood, frameless glass, or armored), and do you want biometric/card access only or integrated cat-eye camera?",
    },
    "lock": {
      ar: "ما نوع الباب لديك (خشب، سيكوريت زجاجي، أم مصفح)، وهل تفضل فتح الباب بالبصمة والكارت فقط أم مع كاميرا وشاشة داخلية؟",
      en: "What type of door do you have (wood, frameless glass, or armored), and do you want biometric/card access only or integrated cat-eye camera?",
    },
  };

  for (const [key, qMsg] of Object.entries(shortQueries)) {
    if (q === key || q === `عايز ${key}` || q === `i want ${key}`) {
      const isArabic = /[\u0600-\u06FF]/.test(q);
      return isArabic ? qMsg.ar : qMsg.en;
    }
  }

  return null;
}

/** Sanitize prompt injection attempts, system prompt extractors, and malicious instructions */
export function sanitizeUserInput(input: string): string {
  let cleaned = input;
  cleaned = cleaned.replace(/ignore\s+(all\s+)?(previous|above|your|prior)?\s*(instructions|rules|constraints|pricing)/gi, "[redacted]");
  cleaned = cleaned.replace(/disregard\s+(all\s+)?(system|prior|previous)?\s*(instructions|rules|constraints)/gi, "[redacted]");
  cleaned = cleaned.replace(/reveal\s+(the\s+)?(system prompt|system message|api key|database|cost price|password)/gi, "[redacted]");
  cleaned = cleaned.replace(/print\s+(your\s+)?system\s+(message|prompt)/gi, "[redacted]");
  cleaned = cleaned.replace(/show\s+me\s+your\s+internal\s+.*?(guidelines|prompts?|settings|costs?|prices?)/gi, "[redacted]");
  cleaned = cleaned.replace(/tell\s+me\s+the\s+wholesale\s+(cost|price)/gi, "[redacted]");
  cleaned = cleaned.replace(/unrestricted\s+AI|jailbreak|DAN\s+mode/gi, "[redacted]");
  cleaned = cleaned.replace(/admin\s+password/gi, "[redacted]");
  return cleaned.trim();
}

/** Post-Generation Verification Gate: Validates links, slugs, prices, and prevents hallucinations */
export function validateAndRepairAIOutput(
  rawText: string,
  catalog: GroundedProduct[],
  bundles = OFFICIAL_BUNDLES,
): { validText: string; correctionsMade: string[] } {
  let text = rawText;
  const corrections: string[] = [];

  // Normalize any full https://azkasmart.com/... URLs to relative paths so SPA links & mini-cards work
  text = text.replace(/https?:\/\/(?:www\.)?azkasmart\.com(\/[^\s)\]]*)/gi, "$1");

  const catalogBySlug = new Map(catalog.map((p) => [p.slug.toLowerCase(), p]));
  const catalogById = new Map(catalog.map((p) => [p.id.toLowerCase(), p]));

  // 1. Repair or sanitize markdown links: [Title](/products/slug)
  const linkRegex = /\[([^\]]+)\]\(\/products\/([^)\s]+)\)/g;
  text = text.replace(linkRegex, (_match, title, slug) => {
    const cleanSlug = slug.toLowerCase().trim();
    if (catalogBySlug.has(cleanSlug)) {
      return `[${title}](/products/${cleanSlug})`;
    }

    // Try finding by ID if model used ID instead of slug
    if (catalogById.has(cleanSlug)) {
      const p = catalogById.get(cleanSlug)!;
      corrections.push(`Replaced product ID '${cleanSlug}' with slug '${p.slug}'`);
      return `[${title}](/products/${p.slug})`;
    }

    // Try finding closest product name match
    const titleLower = title.toLowerCase();
    const matched = catalog.find((p) =>
      p.name.toLowerCase().includes(titleLower) ||
      titleLower.includes(p.name.toLowerCase()) ||
      p.slug.toLowerCase().includes(titleLower.replace(/\s+/g, "-"))
    );

    if (matched) {
      corrections.push(`Repaired hallucinated slug '${slug}' -> '${matched.slug}'`);
      return `[${matched.name}](/products/${matched.slug})`;
    }

    // Fallback: If no catalog product matches, link safely to all products
    corrections.push(`Sanitized nonexistent product slug '${slug}' -> '/products'`);
    return `[${title}](/products)`;
  });

  // 2. Validate official bundles and prices mentioned
  for (const b of bundles) {
    const bundleKeyRegex = new RegExp(`(/bundles/${b.id}|باقة ${b.nameAr}|${b.nameEn})`, "i");
    if (bundleKeyRegex.test(text)) {
      const fakePriceRegex = new RegExp(`${b.id}[^\\d]{1,30}(\\d{3,6})\\s*(ج\\.م|EGP)`, "i");
      const match = text.match(fakePriceRegex);
      if (match && Number(match[1]) !== b.priceEgp) {
        corrections.push(`Corrected price for bundle ${b.id}: ${match[1]} -> ${b.priceEgp} EGP`);
        text = text.replace(match[0], `${b.nameAr} (${b.priceEgp} EGP)`);
      }
    }
  }

  // 3. Purge any stray references to "art furniture" or competitor stores
  if (/أثاث فني|art-furniture|art furniture/i.test(text)) {
    corrections.push("Purged hallucinated 'art furniture' mention");
    text = text.replace(/أثاث فني|art-furniture|art furniture/gi, "أنظمة المنزل الذكي والتحكم في الدخول");
  }

  return { validText: text, correctionsMade: corrections };
}
