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
  lock: ["قفل", "كالون", "كيلون", "بصمة", "اقفال", "كوالين", "smart lock", "lock", "بصمه", "انتركم"],
  switch: ["مفتاح", "سويتش", "مفاتيح", "تاتش", "لمس", "انارة", "اضاءة", "switch", "relay", "قاطع"],
  neutral: ["نيوترال", "خط محايد", "سلك محايد", "ارضي", "neutral", "no neutral", "بدون نيوترال"],
  hub: ["هاب", "جيتواي", "بريدج", "موزع", "hub", "gateway", "bridge", "coordinator"],
  curtain: ["ستارة", "ستائر", "موتور ستارة", "curtain", "blind"],
  camera: ["كاميرا", "كاميرات", "مراقبة", "كاميرا خارجية", "كاميرا داخلية", "camera", "cctv"],
  sensor: ["حساس", "سينسور", "مستشعر", "حركة", "تسريب", "دخان", "حرارة", "sensor"],
  access: ["اكسس", "اكسس كنترول", "دخول", "كارت", "ميدالية", "access control", "rfid", "zkteco"],
  bundle: ["باقة", "باقات", "عرض", "عروض", "سيستم كامل", "تجهيز شقة", "تجهيز فيلا", "bundle", "kit"],
};

/** Load active published products with rich technical fields */
export async function loadGroundedCatalog(supabase: any, limit = 300): Promise<GroundedProduct[]> {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, slug, brand, price, original_price, protocol, specifications, stock, image_url, description, category_id, categories(name)")
      .eq("is_published", true)
      .limit(limit);

    if (error || !data) return [];

    return data.map((p: any) => ({
      id: String(p.id),
      name: String(p.name || ""),
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
    }));
  } catch (e) {
    console.error("loadGroundedCatalog error:", e);
    return [];
  }
}

/** Expand query with synonyms to ensure Egyptian dialect terms match English/Arabic catalog */
export function expandQueryTerms(rawQuery: string): string[] {
  const clean = rawQuery.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ");
  const terms = clean.split(/\s+/).filter((t) => t.length > 1);
  const expanded = new Set<string>(terms);

  for (const term of terms) {
    for (const [, synList] of Object.entries(SYNONYMS)) {
      if (synList.some((s) => s.toLowerCase() === term || term.includes(s.toLowerCase()))) {
        synList.forEach((s) => expanded.add(s.toLowerCase()));
      }
    }
  }

  return Array.from(expanded);
}

/** Rank and filter catalog items matching a user query */
export function matchCatalogProducts(query: string, catalog: GroundedProduct[], maxResults = 15): GroundedProduct[] {
  const terms = expandQueryTerms(query);
  if (!terms.length) return catalog.slice(0, maxResults);

  const scored = catalog.map((p) => {
    const hay = `${p.name} ${p.brand || ""} ${p.protocol || ""} ${p.category_name || ""} ${p.description || ""}`.toLowerCase();
    let score = 0;

    for (const term of terms) {
      if (hay.includes(term)) {
        score += term.length >= 4 ? 3 : 1;
        // Exact name match booster
        if (p.name.toLowerCase().includes(term)) score += 4;
        // Brand match booster
        if (p.brand && p.brand.toLowerCase() === term) score += 5;
      }
    }

    // In-stock prioritization
    if (p.stock > 0) score += 2;

    return { product: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const matched = scored.filter((s) => s.score > 0).map((s) => s.product);
  return matched.length ? matched.slice(0, maxResults) : catalog.slice(0, maxResults);
}

/** Format grounded catalog text for system prompts so the model has slugs, protocols, and exact prices */
export function formatCatalogPromptContext(products: GroundedProduct[]): string {
  return products.map((p) => {
    const stockStatus = p.stock > 0 ? "In Stock" : "Out of Stock";
    const brand = p.brand ? ` [Brand: ${p.brand}]` : "";
    const proto = p.protocol ? ` [Protocol: ${p.protocol}]` : "";
    return `- ${p.name}${brand}${proto} | Price: ${p.price} EGP | Slug: ${p.slug} | Status: ${stockStatus}`;
  }).join("\n");
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
  // Block common prompt injection attempts
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

  const catalogBySlug = new Map(catalog.map((p) => [p.slug.toLowerCase(), p]));
  const catalogById = new Map(catalog.map((p) => [p.id.toLowerCase(), p]));

  // 1. Repair or sanitize markdown links: [Title](/products/slug)
  const linkRegex = /\[([^\]]+)\]\(\/products\/([^)\s]+)\)/g;
  text = text.replace(linkRegex, (match, title, slug) => {
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
      // Ensure real bundle price is reflected accurately
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
