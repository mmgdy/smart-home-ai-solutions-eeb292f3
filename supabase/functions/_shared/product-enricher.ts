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

export function autoEnrichProductSpecifications(product: ProductInput): ProductInput {
  const name = (product.name || "").toLowerCase();
  const desc = (product.description || "").toLowerCase();
  const combined = `${name} ${desc} ${product.brand || ""}`.toLowerCase();

  const specs: Record<string, any> = {
    ...(product.specifications && typeof product.specifications === "object" ? product.specifications : {}),
  };

  // ─── 1. Protocol Auto-Detection ───────────────────────────────────────────
  let protocol = product.protocol?.trim();
  if (!protocol || protocol.toLowerCase() === "null" || protocol === "-") {
    if (/matter/i.test(name)) protocol = "Matter";
    else if (/zigbee|snzb|zbmini|zbbridge/i.test(name)) protocol = "Zigbee";
    else if (/wi-fi|wifi/i.test(name) || /cam-|minir4\b/i.test(name)) protocol = "Wi-Fi";
    else if (/rf433|433mhz|rf remote/i.test(name)) protocol = "RF433";
    else if (/magnetic lock|electric strike|drop bolt|12v|zkteco/i.test(name)) protocol = "12V DC";
    else protocol = "Wi-Fi"; // Safe default for consumer smart home
  }

  // ─── 2. Neutral Wire Classification for In-Wall Switches ─────────────────
  const isSwitchOrRelay = /switch|مفتاح|relay|مفتاح تاتش|سويتش|minir|zbmini|dualr|tx\b|in-wall/i.test(combined);

  if (isSwitchOrRelay) {
    const isExplicitNoNeutral = /no neutral|بدون نيوترال|zbmini-l2|zbminil2|t2eu-rf/i.test(combined);
    if (isExplicitNoNeutral) {
      specs.neutral_required = false;
      specs.neutral_note = "لا يتطلب سلك محايد (نيوترال) - مثالي للمباني القديمة بدون نيوترال في العلب.";
    } else {
      specs.neutral_required = true;
      specs.neutral_note = "يتطلب سلك محايد (نيوترال) في العلبة الكهربائية لضمان التغذية المستقرة.";
    }
  }

  // ─── 3. Access Control Hardware Classification ───────────────────────────
  if (/magnetic lock|em-lock|قفل مغناطيسي/i.test(combined)) {
    specs.lock_type = "magnetic_lock";
    specs.fail_safe = true; // Magnetic locks always release on power cut
    specs.voltage = "12V DC";
    specs.bracket_required = "ZL-Bracket (Inward Wood/Metal Doors) or U-Bracket (Frameless Glass Doors)";
    specs.power_supply_recommended = "12V 5A Power Supply with 7Ah Battery Backup";
  } else if (/drop bolt|كالون مسمار/i.test(combined)) {
    specs.lock_type = "drop_bolt";
    specs.voltage = "12V DC";
  } else if (/electric strike|كالون دفين كهربائي/i.test(combined)) {
    specs.lock_type = "electric_strike";
    specs.voltage = "12V DC";
  } else if (/smart lock|قفل ذكي|كالون ذكي|بصمة|panda|lezn/i.test(combined)) {
    specs.lock_type = "smart_biometric_lock";
    specs.door_thickness = specs.door_thickness || "38-70mm";
    specs.emergency_power = "USB Type-C + Physical Mechanical Keys";
  }

  // ─── 4. RFID Frequency Classification ────────────────────────────────────
  if (/125\s*khz|em-id|em4100|tk4100|id card|id tag/i.test(combined)) {
    specs.rfid_frequency = "125kHz (EM-Marine)";
  } else if (/13\.56\s*mhz|mifare|ic card|ic tag|nfc/i.test(combined)) {
    specs.rfid_frequency = "13.56MHz (Mifare IC)";
  }

  // ─── 5. Universal Warranty Tagging ────────────────────────────────────────
  specs.warranty = specs.warranty || "1-Year Official Warranty in Egypt (ضمان رسمي لمدة سنة)";
  specs.installation = "Certified Installation Available (20% of equipment, min 1,500 EGP visit fee)";

  return {
    ...product,
    protocol,
    specifications: specs,
  };
}
