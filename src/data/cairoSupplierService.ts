// cairoSupplierService.ts
// Internal admin-only supplier intelligence & product audit service.
// This module MUST NEVER be imported by public customer-facing components.

import auditBundle from './cairo_audit_bundle.json';

export interface CairoSource {
  id: string;
  product_id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_url: string;
  product_url: string;
  price_egp: number | null;
  availability: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  area: string;
  match_confidence: number;
  notes: string;
  last_checked: string;
}

export interface ProductAuditInfo {
  id: string;
  product_id: string;
  product_name: string;
  brand: string;
  model: string | null;
  sku: string;
  category: string;
  price: number;
  cleaned_description: string;
  image_url?: string | null;
  image_verification?: 'VERIFIED' | 'FLAGGED_WRONG' | 'UNVERIFIED';
  image_status: 'VALID' | 'MISSING' | 'INVALID';
  price_status: 'VALID' | 'MISSING' | 'INVALID';
  description_status: 'VALID' | 'MISSING' | 'NEEDS_REVIEW';
  cairo_source_status: 'FOUND_IN_CAIRO' | 'NOT_FOUND_IN_CAIRO' | 'NEEDS_REVIEW';
  action_taken: string;
  reason: string;
  sources_count: number;
  lowest_cairo_price: number | null;
  audit_date: string;
}

export interface SupplierInfo {
  id: string;
  name: string;
  website: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  area: string;
  supplier_type: string;
  is_verified: boolean;
}

export interface AuditStats {
  total_products_discovered: number;
  total_products_inspected: number;
  valid_products: number;
  missing_images: number;
  invalid_images: number;
  healed_images: number;
  missing_prices: number;
  invalid_prices: number;
  missing_descriptions: number;
  needs_review_descriptions: number;
  products_with_cairo_suppliers: number;
  products_without_cairo_suppliers: number;
  total_cairo_sources_found: number;
  delete_candidates: number;
  products_deleted: number;
  products_requiring_manual_review: number;
  final_products_remaining: number;
}

const LOCAL_STORAGE_CUSTOM_SOURCES_KEY = 'azka_admin_custom_cairo_sources';
const LOCAL_STORAGE_FLAGGED_WRONG_IMAGES_KEY = 'azka_admin_flagged_wrong_images';
const LOCAL_STORAGE_VERIFIED_IMAGES_KEY = 'azka_admin_verified_images';
const LOCAL_STORAGE_REPLACED_IMAGES_KEY = 'azka_admin_replaced_images';

// Initial known auto-refreshed images that require verification
const INITIAL_SUSPICIOUS_IMAGES: Record<string, string> = {
  'f4f1d285-9bee-483c-b384-9b655db0c82c': 'Auto-scraped search candidate needs visual confirmation',
  '5878ce99-4c8c-44ae-83c3-ac49251a5e9f': 'Auto-scraped search candidate needs visual confirmation',
  '0ce7e309-9ceb-4b85-a836-9af926f0dd69': 'Auto-scraped search candidate needs visual confirmation',
  '27302c89-83a9-42fd-a344-efa85a93edf9': 'Auto-scraped search candidate needs visual confirmation',
  '2cb86317-385f-428a-b7cc-f88e96a685d2': 'Auto-scraped search candidate needs visual confirmation',
  '5fd46faa-960a-4faa-9d84-0b28c4adce3e': 'Auto-scraped search candidate needs visual confirmation',
  '6cdcbee4-af49-44fb-a2fa-23aaece4e7ac': 'Auto-scraped search candidate needs visual confirmation',
  '7540fdb3-fb45-4fa6-8c8f-81cc2f6fc445': 'Auto-scraped search candidate needs visual confirmation',
  '9017ebfa-aa95-47a3-8bdf-2cb0d53577bf': 'Auto-scraped search candidate needs visual confirmation',
  'a2b59aec-0c53-4d71-988b-39377702554a': 'Auto-scraped search candidate needs visual confirmation',
  'b36b705b-ed44-46f4-a06e-31cfb219a86f': 'Auto-scraped search candidate needs visual confirmation',
  'ce6a711a-6771-4cfa-96f2-5b953d74be7b': 'Auto-scraped search candidate needs visual confirmation',
  'f7061412-311f-45e7-9368-9fb5772a69ca': 'Auto-scraped search candidate needs visual confirmation',
  'a7548ab6-4737-4808-aba2-a527d1d93f6c': 'Auto-scraped search candidate needs visual confirmation',
};

function getFlaggedWrongImagesMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FLAGGED_WRONG_IMAGES_KEY);
    return raw ? { ...INITIAL_SUSPICIOUS_IMAGES, ...JSON.parse(raw) } : { ...INITIAL_SUSPICIOUS_IMAGES };
  } catch {
    return { ...INITIAL_SUSPICIOUS_IMAGES };
  }
}

function getVerifiedImagesSet(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_VERIFIED_IMAGES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function getReplacedImagesMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_REPLACED_IMAGES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getCustomSources(): Record<string, CairoSource[]> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_SOURCES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

let memoAuditMap: Map<string, ProductAuditInfo> | null = null;
function getAuditMap(): Map<string, ProductAuditInfo> {
  if (!memoAuditMap) {
    memoAuditMap = new Map((auditBundle.auditList as any[]).map(a => [a.product_id, a as ProductAuditInfo]));
  }
  return memoAuditMap;
}

export const cairoSupplierService = {
  getStats(): AuditStats {
    return auditBundle.stats as AuditStats;
  },

  getSuppliers(): SupplierInfo[] {
    return auditBundle.suppliers as SupplierInfo[];
  },

  getSupplierById(supplierId: string): SupplierInfo | undefined {
    return (auditBundle.suppliers as SupplierInfo[]).find(s => s.id === supplierId);
  },

  getAllAudits(): ProductAuditInfo[] {
    const replaced = getReplacedImagesMap();
    const flagged = getFlaggedWrongImagesMap();
    const verified = getVerifiedImagesSet();

    return (auditBundle.auditList as unknown as ProductAuditInfo[]).map(a => {
      const activeUrl = replaced[a.product_id] || a.image_url || null;
      let verification: 'VERIFIED' | 'FLAGGED_WRONG' | 'UNVERIFIED' = 'UNVERIFIED';
      if (flagged[a.product_id]) {
        verification = 'FLAGGED_WRONG';
      } else if (verified.has(a.product_id) || replaced[a.product_id]) {
        verification = 'VERIFIED';
      }

      return {
        ...a,
        image_url: activeUrl,
        image_verification: verification
      };
    });
  },

  getProductAudit(productId: string): ProductAuditInfo | null {
    const base = getAuditMap().get(productId);
    if (!base) return null;
    const replaced = getReplacedImagesMap();
    const flagged = getFlaggedWrongImagesMap();
    const verified = getVerifiedImagesSet();

    const activeUrl = replaced[productId] || base.image_url || null;
    let verification: 'VERIFIED' | 'FLAGGED_WRONG' | 'UNVERIFIED' = 'UNVERIFIED';
    if (flagged[productId]) {
      verification = 'FLAGGED_WRONG';
    } else if (verified.has(productId) || replaced[productId]) {
      verification = 'VERIFIED';
    }

    return {
      ...base,
      image_url: activeUrl,
      image_verification: verification
    };
  },

  getCairoSources(productId: string): CairoSource[] {
    const defaultSources = (auditBundle.sourcesMap as Record<string, CairoSource[]>)[productId] || [];
    const customSources = getCustomSources()[productId] || [];
    return [...customSources, ...defaultSources];
  },

  getProductsBySupplier(supplierId: string): { productId: string; productName: string; priceEgp: number | null }[] {
    const results: { productId: string; productName: string; priceEgp: number | null }[] = [];
    const auditMap = getAuditMap();
    const sourcesMap = auditBundle.sourcesMap as Record<string, CairoSource[]>;

    for (const [pId, list] of Object.entries(sourcesMap)) {
      const match = list.find(s => s.supplier_id === supplierId);
      if (match) {
        const audit = auditMap.get(pId);
        results.push({
          productId: pId,
          productName: audit?.product_name || pId,
          priceEgp: match.price_egp
        });
      }
    }
    return results;
  },

  // Wrong image flagging
  flagWrongImage(productId: string, reason: string = 'Wrong image reported by admin'): void {
    const map = getFlaggedWrongImagesMap();
    map[productId] = reason;
    try {
      localStorage.setItem(LOCAL_STORAGE_FLAGGED_WRONG_IMAGES_KEY, JSON.stringify(map));
    } catch (e) {
      console.error(e);
    }
    // Remove from verified if it was there
    const verified = getVerifiedImagesSet();
    if (verified.has(productId)) {
      verified.delete(productId);
      try {
        localStorage.setItem(LOCAL_STORAGE_VERIFIED_IMAGES_KEY, JSON.stringify(Array.from(verified)));
      } catch (e) {
        console.error(e);
      }
    }
  },

  unflagWrongImage(productId: string): void {
    const map = getFlaggedWrongImagesMap();
    delete map[productId];
    delete INITIAL_SUSPICIOUS_IMAGES[productId];
    try {
      localStorage.setItem(LOCAL_STORAGE_FLAGGED_WRONG_IMAGES_KEY, JSON.stringify(map));
    } catch (e) {
      console.error(e);
    }
  },

  isWrongImageFlagged(productId: string): boolean {
    const map = getFlaggedWrongImagesMap();
    return Boolean(map[productId]);
  },

  getWrongImageReason(productId: string): string | null {
    const map = getFlaggedWrongImagesMap();
    return map[productId] || null;
  },

  markImageVerified(productId: string): void {
    // Unflag from wrong
    this.unflagWrongImage(productId);
    const verified = getVerifiedImagesSet();
    verified.add(productId);
    try {
      localStorage.setItem(LOCAL_STORAGE_VERIFIED_IMAGES_KEY, JSON.stringify(Array.from(verified)));
    } catch (e) {
      console.error(e);
    }
  },

  isImageVerified(productId: string): boolean {
    const verified = getVerifiedImagesSet();
    return verified.has(productId);
  },

  setReplacedImageUrl(productId: string, newUrl: string): void {
    const map = getReplacedImagesMap();
    map[productId] = newUrl;
    try {
      localStorage.setItem(LOCAL_STORAGE_REPLACED_IMAGES_KEY, JSON.stringify(map));
    } catch (e) {
      console.error(e);
    }
    this.markImageVerified(productId);
  },

  getEffectiveImageUrl(productId: string, fallbackUrl?: string | null): string | null {
    const replaced = getReplacedImagesMap();
    if (replaced[productId]) return replaced[productId];
    const audit = getAuditMap().get(productId);
    return audit?.image_url || fallbackUrl || null;
  },

  addCustomSource(productId: string, source: Omit<CairoSource, 'id' | 'product_id' | 'last_checked'>): CairoSource {
    const custom = getCustomSources();
    const newSource: CairoSource = {
      ...source,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      product_id: productId,
      last_checked: new Date().toISOString()
    };
    if (!custom[productId]) custom[productId] = [];
    custom[productId].unshift(newSource);
    try {
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_SOURCES_KEY, JSON.stringify(custom));
    } catch (e) {
      console.error('Failed to persist custom source to localStorage', e);
    }
    return newSource;
  }
};
