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

const EXCLUDED_NON_BRANDS = new Set(["smart home", "panda", "pabx"]);
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
  const normalizedBrand = normalizeBrandName(product.brand);

  const rawSpecs: Record<string, any> = {
    ...(product.specifications && typeof product.specifications === "object" ? product.specifications : {}),
  };

  // Preserve only explicitly supplied non-internal specifications without inventing template defaults
  const specs: Record<string, any> = {};
  for (const [k, v] of Object.entries(rawSpecs)) {
    if (/^(source|sync_source|smartzoom_id|smartzoom_slug|StockStatus)$/i.test(k)) {
      continue;
    }
    if (v !== null && v !== undefined && String(v).trim() !== "") {
      specs[k] = v;
    }
  }

  const rawProtocol = typeof product.protocol === "string" ? product.protocol.trim() : "";
  const protocol: string | null =
    rawProtocol && rawProtocol.toLowerCase() !== "null" && rawProtocol !== "-"
      ? rawProtocol
      : null;

  return {
    ...product,
    brand: normalizedBrand,
    protocol,
    specifications: Object.keys(specs).length > 0 ? specs : null,
  };
}
