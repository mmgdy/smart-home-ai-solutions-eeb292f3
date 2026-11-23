// Automated Technical Spec & Grounding Enricher for AzkaSmart Products.
// Automatically applies smart home and access control rules to ANY product
// (existing in database, newly created, imported from CSV, scraped, or synced).

export interface ProductInput {
  name: string;
  slug?: string | null;
  description?: string | null;
  brand?: string | null;
  protocol?: string | null;
  specifications?: Record<string, any> | null;
  price?: number;
  stock?: number;
  image_url?: string | null;
  category_id?: string | null;
  [key: string]: any;
}

const EXCLUDED_NON_BRANDS = new Set(["smart home", "amazon", "panda", "pabx"]);
const CANONICAL_BRAND_MAP: Record<string, string> = {
  "sonoff": "SONOFF",
  "ewelink": "eWeLink",
  "dnake": "DNAKE",
  "lezn": "LEZN",
  "zosar": "Zosar",
  "k.zosar": "Zosar",
  "k-zosar": "Zosar",
  "k zosar": "Zosar",
};

function normalizeBrandName(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (EXCLUDED_NON_BRANDS.has(lower)) return null;
  return CANONICAL_BRAND_MAP[lower] || trimmed;
}

export function autoEnrichProductSpecifications(product: ProductInput): ProductInput {
  const name = (product.name || "").toLowerCase();
  const desc = (product.description || "").toLowerCase();
  const normalizedBrand = normalizeBrandName(product.brand);
  const combined = `${name} ${desc} ${normalizedBrand || ""}`.toLowerCase();

  const rawSpecs: Record<string, any> = {
    ...(product.specifications && typeof product.specifications === "object" ? product.specifications : {}),
  };

  // Remove raw database keys before enriching with human-readable labels
  const specs: Record<string, any> = {};
  for (const [k, v] of Object.entries(rawSpecs)) {
    if (/^(source|sync_source|smartzoom_id|smartzoom_slug|StockStatus|neutral_required|neutral_note|lock_type|fail_safe|bracket_required|power_supply_recommended|door_thickness|emergency_power|rfid_frequency|warranty|installation|brand|protocol)$/i.test(k)) {
      continue;
    }
    specs[k] = v;
  }

  // ─── 1. Protocol Auto-Detection ───────────────────────────────────────────
  const isPassiveAccessory =
    /\b(cover|enclosure|stand|bracket|frame|rail|extension cable|curtain motor base)\b/i.test(name) &&
    !/echo show|remote controller|smart lock|magnetic lock|electric lock/i.test(name);

  let protocol: string | null = product.protocol?.trim() || null;
  if (isPassiveAccessory) {
    protocol = null;
  } else if (/echo hub/i.test(name)) {
    protocol = "Wi-Fi + Zigbee + Thread + Bluetooth + Matter";
  } else if (/nspanel pro/i.test(name)) {
    protocol = "Wi-Fi + Zigbee 3.0 + Bluetooth";
  } else if (/multimode gateway/i.test(name)) {
    protocol = "Wi-Fi + Zigbee + Bluetooth";
  } else if (/pw-730t/i.test(name)) {
    protocol = "Wi-Fi + Zigbee + Bluetooth + RS485";
  } else if (/pw-430t|pw-530/i.test(name)) {
    protocol = "Wi-Fi + Bluetooth";
  } else if (/zbbridge|zigbee bridge|ihost|zigbee lan gateway/i.test(name)) {
    protocol = "Wi-Fi + Zigbee 3.0";
  } else if (/rf bridge/i.test(name)) {
    protocol = "Wi-Fi + RF433";
  } else if (!protocol || protocol.toLowerCase() === "null" || protocol === "-" || /^wi-?fi$/i.test(protocol)) {
    if (/matter/i.test(name)) protocol = "Matter over Wi-Fi";
    else if (/zigbee|snzb|zbmini|zbm5|mini-zb|trvzb|s26r2zb|zbr3|orb-zb/i.test(name)) protocol = "Zigbee 3.0";
    else if (/rf433|433\s*mhz|dw2-rf|pir3-rf|rm433|t2eu-rf|gas detector sensor|flooding sensor/i.test(name)) protocol = "RF433";
    else if (/\br5\b|s-mate|scene controller/i.test(name)) protocol = "eWeLink-Remote (2.4GHz)";
    else if (/magnetic lock|electric strike|drop bolt|12v|zkteco/i.test(name)) protocol = "12V DC";
    else if (!protocol || protocol.toLowerCase() === "null" || protocol === "-") protocol = "Wi-Fi";
  }

  // ─── 2. Neutral Wire Classification for In-Wall AC Switches ──────────────
  const isNonWiredOrNonSwitch =
    isPassiveAccessory ||
    /\b(lock|قفل|كالون|sensor|detector|pir|dw2|rm433|t2eu-rf|\br5\b|s-mate|scene controller|wireless switch|scene button|camera|cam-|bridge|gateway|hub|ihost|dongle|trvzb|valve|curtain motor|smart curtain|led strip|l3 pro|ir remote|plug|socket|s26|s55|s60|spm)\b/i.test(name);

  const isSwitchOrRelay =
    !isNonWiredOrNonSwitch &&
    /\b(switch|relay|dimmer|breaker|minir|zbmini|dualr|thr3|tx|t0|t2|t3|t5|t6|m5|zbm5|mini-rbs|mini-zbrbs|mini-2gs|mini-zb2gs|mini-dim|mini-zbdim|mini-d|basic-1gs|4ch|d1|ifan|nspanel)\b|مفتاح تاتش|سويتش/i.test(name);

  if (isSwitchOrRelay) {
    const isExplicitNoNeutral = /no neutral|بدون نيوترال|zbmini-l2|zbminil2|mini-zb2gs-l|orb-zbw1l|t2eu-rf|\bzb\s*m5\b/i.test(name);
    if (isExplicitNoNeutral) {
      specs["Neutral Wire Required"] = "No";
      specs["Wiring Note"] = "لا يتطلب سلك محايد (نيوترال) - مثالي للمباني القديمة بدون نيوترال في العلب.";
    } else {
      specs["Neutral Wire Required"] = "Yes";
      specs["Wiring Note"] = "يتطلب سلك محايد (نيوترال) في العلبة الكهربائية لضمان التغذية المستقرة.";
    }
  } else if (/\b(r5|s-mate|scene controller|wireless switch|scene button|t2eu-rf|rm433|snzb-01)\b/i.test(name)) {
    specs["Neutral Wire Required"] = "No";
  }

  // ─── 3. Access Control Hardware Classification ───────────────────────────
  if (/magnetic lock|em-lock|قفل مغناطيسي/i.test(combined)) {
    specs["Lock Type"] = "Magnetic Lock";
    specs["Fail-Safe"] = "Yes"; // Magnetic locks always release on power cut
    specs["Voltage"] = "12V DC";
    specs["Compatible Bracket"] = "ZL-Bracket (Inward Wood/Metal Doors) or U-Bracket (Frameless Glass Doors)";
    specs["Recommended Power Supply"] = "12V 5A Power Supply with 7Ah Battery Backup";
  } else if (/drop bolt|كالون مسمار/i.test(combined)) {
    specs["Lock Type"] = "Drop Bolt Lock";
    specs["Voltage"] = "12V DC";
  } else if (/electric strike|كالون دفين كهربائي/i.test(combined)) {
    specs["Lock Type"] = "Electric Strike Lock";
    specs["Voltage"] = "12V DC";
  } else if (/smart lock|قفل ذكي|كالون ذكي|بصمة|lezn/i.test(combined)) {
    specs["Lock Type"] = "Smart Biometric Lock";
    specs["Door Thickness"] = rawSpecs["Door Thickness"] || rawSpecs.door_thickness || "38-70mm";
    specs["Emergency Power"] = "USB Type-C + Physical Mechanical Keys";
  }

  // ─── 4. RFID Frequency Classification ────────────────────────────────────
  if (/125\s*khz|em-id|em4100|tk4100|id card|id tag/i.test(combined)) {
    specs["RFID Frequency"] = "125kHz (EM-Marine)";
  } else if (/13\.56\s*mhz|mifare|ic card|ic tag|nfc/i.test(combined)) {
    specs["RFID Frequency"] = "13.56MHz (Mifare IC)";
  }

  // ─── 5. Universal Warranty Tagging ────────────────────────────────────────
  specs["Warranty"] = rawSpecs["Warranty"] || rawSpecs.warranty || "1-Year Official Warranty in Egypt (ضمان رسمي لمدة سنة)";
  specs["Installation Service"] = "Certified Installation Available (20% of equipment, min 1,500 EGP visit fee)";
  if (normalizedBrand) specs["Brand"] = normalizedBrand;
  if (protocol) specs["Protocol"] = protocol;

  return {
    ...product,
    brand: normalizedBrand,
    protocol,
    specifications: specs,
  };
}
