// Deterministic Compatibility & Safety Engine for Smart Home & Access Control (AzkaSmart).
// Moves critical electrical, protocol, and physical security logic from probabilistic LLM prompts
// into deterministic TypeScript code.

export interface CartItemLike {
  id: string;
  name: string;
  brand?: string | null;
  protocol?: string | null;
  quantity?: number;
  slug?: string;
  price?: number;
  specifications?: Record<string, any> | null;
}

export interface CompatibilityIssue {
  severity: "warning" | "info" | "critical";
  code: string;
  messageAr: string;
  messageEn: string;
}

export interface CatalogSuggestion {
  productId: string;
  slug: string;
  name: string;
  price: number;
  brand?: string | null;
  image_url?: string | null;
  reasonAr: string;
  reasonEn: string;
}

export interface CompatibilityAuditResult {
  isCompatible: boolean;
  issues: CompatibilityIssue[];
  suggestions: CatalogSuggestion[];
  summaryAr: string;
  summaryEn: string;
}

/** Deterministic Smart Home & Access Control Verification */
export function evaluateCartCompatibility(
  items: CartItemLike[],
  fullCatalog: any[] = [],
): CompatibilityAuditResult {
  const issues: CompatibilityIssue[] = [];
  const suggestions: CatalogSuggestion[] = [];

  const catalogBySlug = new Map(fullCatalog.map((p) => [String(p.slug || "").toLowerCase(), p]));
  const catalogById = new Map(fullCatalog.map((p) => [String(p.id).toLowerCase(), p]));

  const findCatalogItem = (slugOrTerm: string) => {
    const slugLower = slugOrTerm.toLowerCase();
    if (catalogBySlug.has(slugLower)) return catalogBySlug.get(slugLower);
    return fullCatalog.find((p) =>
      p.slug?.toLowerCase().includes(slugLower) ||
      p.name?.toLowerCase().includes(slugLower)
    );
  };

  const itemNames = items.map((i) => (i.name || "").toLowerCase());
  const itemTexts = items.map((i) => `${i.name} ${i.brand || ""} ${i.protocol || ""}`.toLowerCase()).join(" ");

  // ─── 1. PROTOCOL CHECK: Zigbee Devices Require a Zigbee Gateway ─────────────
  const hasZigbeeDevice = items.some((i) =>
    (i.protocol?.toLowerCase() === "zigbee") ||
    /zigbee|snzb|zbmini|zbcurtain/i.test(i.name)
  );

  const hasZigbeeHub = items.some((i) =>
    /bridge|gateway|hub|موزع|جيتواي|هاب/i.test(i.name) &&
    /zigbee|zbbridge|ultra/i.test(i.name)
  );

  if (hasZigbeeDevice && !hasZigbeeHub) {
    issues.push({
      severity: "warning",
      code: "MISSING_ZIGBEE_HUB",
      messageAr: "تحتوي سلتك على أجهزة Zigbee تحتاج إلى جهاز موزع (Hub/Gateway) للربط بتطبيق الهاتف ومساعد أليكسا/جوجل.",
      messageEn: "Your cart includes Zigbee devices which require a Zigbee Bridge/Hub to connect to your phone and Alexa/Google Home.",
    });

    const bridge = findCatalogItem("sonoff-zigbee-bridge-pro") || findCatalogItem("zigbee-bridge");
    if (bridge && !items.some((i) => i.id === bridge.id)) {
      suggestions.push({
        productId: bridge.id,
        slug: bridge.slug,
        name: bridge.name,
        price: bridge.price,
        brand: bridge.brand,
        image_url: bridge.image_url,
        reasonAr: "موزع Zigbee Pro لربط وتشغيل جميع حساسات ومفاتيح Zigbee لديك.",
        reasonEn: "Zigbee Bridge Pro coordinator required to manage and automate your Zigbee devices.",
      });
    }
  }

  // ─── 2. ELECTRICAL CHECK: Neutral Wire in Egyptian In-Wall Boxes ─────────────
  const hasNeutralSwitch = items.some((i) => {
    const specs = i.specifications || {};
    const nReq = specs.neutral_required === true || /neutral required/i.test(i.name);
    const isMinir4 = /minir4\b/i.test(i.name);
    return nReq || (isMinir4 && !/minir4m|l2\b/i.test(i.name));
  });

  if (hasNeutralSwitch) {
    issues.push({
      severity: "info",
      code: "NEUTRAL_WIRE_ADVISORY",
      messageAr: "ملاحظة فنية هامة: بعض المفاتيح المختارة تتطلب خط محايد (نيوترال) في العلبة الكهربائية. إذا كانت علب الحائط لديك بدون نيوترال، يرجى التنسيق مع الفني أو اختيار موديل بدون نيوترال مثل ZBMINI-L2.",
      messageEn: "Technical Note: Selected in-wall switches require a Neutral wire. If your wall boxes don't have a neutral wire, consider a no-neutral model like ZBMINI-L2 or consult our certified technician.",
    });
  }

  // ─── 3. ACCESS CONTROL: Magnetic Locks (EM-Locks) & Brackets ─────────────────
  const hasMagneticLock = items.some((i) =>
    /magnetic lock|em lock|قفل مغناطيسي|مغناطيس/i.test(i.name)
  );

  const hasBracket = items.some((i) =>
    /bracket|حامل|قاعدة|zl|u-bracket/i.test(i.name)
  );

  if (hasMagneticLock && !hasBracket) {
    issues.push({
      severity: "warning",
      code: "MISSING_LOCK_BRACKET",
      messageAr: "القفل المغناطيسي يحتاج قاعدة تثبيت مطابقة لنوع الباب: حامل ZL للأبواب التي تفتح للداخل، أو حامل U للأبواب الزجاجية السيكوريت.",
      messageEn: "Magnetic locks require a mounting bracket: ZL-Bracket for inward opening doors, or U-Bracket for frameless glass doors.",
    });

    const zlBracket = findCatalogItem("zl-bracket") || findCatalogItem("bracket");
    if (zlBracket && !items.some((i) => i.id === zlBracket.id)) {
      suggestions.push({
        productId: zlBracket.id,
        slug: zlBracket.slug,
        name: zlBracket.name,
        price: zlBracket.price,
        brand: zlBracket.brand,
        image_url: zlBracket.image_url,
        reasonAr: "حامل تثبيت ZL ضروري لتركيب القفل المغناطيسي على الأبواب الخشبية أو المعدنية.",
        reasonEn: "ZL Mounting Bracket essential for installing the magnetic lock on wooden or metal doors.",
      });
    }
  }

  // ─── 4. ACCESS CONTROL: 12V Power Supply & Battery Backup ────────────────────
  const hasAccessHardware = items.some((i) =>
    /access control|zkteco|magnetic lock|electric strike|drop bolt|كالون كهربائي|اكسس كنترول/i.test(i.name)
  );

  const hasPowerSupply = items.some((i) =>
    /power supply|باور سبلاي|12v|محول/i.test(i.name)
  );

  if (hasAccessHardware && !hasPowerSupply) {
    issues.push({
      severity: "warning",
      code: "MISSING_ACCESS_POWER_SUPPLY",
      messageAr: "أجهزة الأكسس كنترول والأقفال الإلكترونية تعمل بجهد 12V DC وتتطلب باور سبلاي مخصص مع بطارية طوارئ 7Ah لضمان استمرار عمل الباب عند انقطاع الكهرباء.",
      messageEn: "Access control keypads and electronic locks require a dedicated 12V DC power supply box with battery backup (7Ah) to keep doors functional during power outages.",
    });

    const psu = findCatalogItem("power-supply-12v") || findCatalogItem("power-supply");
    if (psu && !items.some((i) => i.id === psu.id)) {
      suggestions.push({
        productId: psu.id,
        slug: psu.slug,
        name: psu.name,
        price: psu.price,
        brand: psu.brand,
        image_url: psu.image_url,
        reasonAr: "باور سبلاي 12V 5A مخصص لأنظمة الأكسس مع شاحن بطارية مدمج.",
        reasonEn: "12V 5A Access Control Power Supply unit with built-in emergency battery backup charger.",
      });
    }
  }

  // ─── 5. ACCESS CONTROL: Exit Push Button Check ───────────────────────────────
  const hasAccessKeypad = items.some((i) =>
    /access control|keypad|لوحة دخول|zkteco|قارئ/i.test(i.name)
  );

  const hasExitButton = items.some((i) =>
    /exit button|push button|زر خروج|no touch/i.test(i.name)
  );

  if (hasAccessKeypad && !hasExitButton) {
    issues.push({
      severity: "info",
      code: "MISSING_EXIT_BUTTON",
      messageAr: "تحتاج إلى زر خروج (Push to Exit أو No-Touch بالليزر) من الداخل للسماح للأشخاص بفتح الباب ومغادرة المكان بسهولة.",
      messageEn: "You need an inside Exit Button (mechanical push or No-Touch infrared) to allow occupants to release the lock and exit.",
    });

    const exitBtn = findCatalogItem("exit-button") || findCatalogItem("no-touch");
    if (exitBtn && !items.some((i) => i.id === exitBtn.id)) {
      suggestions.push({
        productId: exitBtn.id,
        slug: exitBtn.slug,
        name: exitBtn.name,
        price: exitBtn.price,
        brand: exitBtn.brand,
        image_url: exitBtn.image_url,
        reasonAr: "زر خروج ذكي بدون لمس (No Touch) لفتح الباب من الداخل.",
        reasonEn: "No-Touch infrared exit release button for effortless indoor door opening.",
      });
    }
  }

  // ─── 6. ACCESS CONTROL: RFID Frequency Mismatch (125kHz vs 13.56MHz) ─────────
  const has125kReader = items.some((i) => /125\s*khz|em-id|em4100|tk4100/i.test(i.name));
  const has1356Cards = items.some((i) => /13\.56\s*mhz|mifare|ic card/i.test(i.name));
  if (has125kReader && has1356Cards) {
    issues.push({
      severity: "critical",
      code: "RFID_FREQUENCY_MISMATCH",
      messageAr: "تحذير أمان حرج: يوجد تعارض في تردد الكروت! القارئ المختار يعمل بتردد 125kHz بينما الكروت بتردد 13.56MHz Mifare ولن تعمل معاً.",
      messageEn: "Critical Safety Warning: RFID frequency mismatch detected! The selected reader is 125kHz while cards are 13.56MHz Mifare. They will not communicate.",
    });
  }

  // ─── 7. Summary Construction ────────────────────────────────────────────────
  const isCompatible = !issues.some((iss) => iss.severity === "critical" || iss.severity === "warning");

  const summaryAr = isCompatible
    ? "جميع الأجهزة في سلتك متوافقة ومكتملة تقنياً وجاهزة للتركيب الفوري!"
    : `تم اكتشاف ${issues.length} ملاحظة فنية لضمان التوافق التام وسلامة التركيب.`;

  const summaryEn = isCompatible
    ? "All devices in your cart are fully compatible, safe, and ready for installation!"
    : `Detected ${issues.length} technical note(s) to guarantee full compatibility and electrical safety.`;

  return {
    isCompatible,
    issues,
    suggestions: suggestions.slice(0, 4),
    summaryAr,
    summaryEn,
  };
}
