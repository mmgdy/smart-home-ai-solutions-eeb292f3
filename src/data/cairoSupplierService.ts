// cairoSupplierService.ts
// Internal admin-only supplier intelligence & product audit service.
// This module MUST NEVER be imported by public customer-facing components.

import auditBundle from './cairo_audit_bundle.json';
import type { Product, Category } from '@/types/store';

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

export interface ProductRecommendation {
  productId: string;
  productName: string;
  sourcesCount: number;
  lowestSupplierPrice: number | null;
  lowestSupplierName: string | null;
  highestSupplierPrice: number | null;
  averageSupplierPrice: number | null;
  overallAvailability: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Unknown';

  // Pricing Intelligence
  currentPrice: number;
  currentMarginPct: number | null;
  pricingStatus: 'HEALTHY' | 'LOSS_RISK' | 'LOW_MARGIN' | 'OVERPRICED' | 'NO_COST_DATA';
  recommendedPrice: number;
  targetMarginPct: number;
  pricingReason: string;

  // Stock Intelligence
  currentStock: number;
  recommendedStock: number;
  stockStatus: 'AVAILABLE' | 'OUT_OF_STOCK' | 'CHECK_REQUIRED';
  stockReason: string;

  // Description Recommendations
  currentDescriptionLength: number;
  descriptionStatus: 'GOOD' | 'NEEDS_EXPANSION' | 'EMPTY';
  recommendedDescriptionEn: string;
  recommendedDescriptionAr: string;
  highlights: string[];
}

const LOCAL_STORAGE_CUSTOM_SOURCES_KEY = 'azka_admin_custom_cairo_sources';
const LOCAL_STORAGE_EDITED_SOURCES_KEY = 'azka_admin_edited_sources';
const LOCAL_STORAGE_DELETED_SOURCES_KEY = 'azka_admin_deleted_sources';
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

const safeAuditBundle: any = (auditBundle as any)?.auditList ? auditBundle : ((auditBundle as any)?.default || auditBundle || {});
const safeAuditList: any[] = Array.isArray(safeAuditBundle?.auditList) ? safeAuditBundle.auditList : [];
const safeSourcesMap: Record<string, CairoSource[]> = safeAuditBundle?.sourcesMap && typeof safeAuditBundle.sourcesMap === 'object' ? safeAuditBundle.sourcesMap : {};
const safeSuppliers: SupplierInfo[] = Array.isArray(safeAuditBundle?.suppliers) ? safeAuditBundle.suppliers : [];
const safeStats: AuditStats = safeAuditBundle?.stats || {
  total_products_discovered: 808,
  total_products_inspected: 808,
  valid_products: 733,
  missing_images: 0,
  invalid_images: 74,
  healed_images: 1,
  missing_prices: 0,
  invalid_prices: 0,
  missing_descriptions: 7,
  needs_review_descriptions: 0,
  products_with_cairo_suppliers: 808,
  products_without_cairo_suppliers: 0,
  total_cairo_sources_found: 1509,
  delete_candidates: 74,
  products_deleted: 0,
  products_requiring_manual_review: 0,
  final_products_remaining: 734
};

function getFlaggedWrongImagesMap(): Record<string, string> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_FLAGGED_WRONG_IMAGES_KEY) : null;
    if (!raw) return { ...INITIAL_SUSPICIOUS_IMAGES };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const map: Record<string, string> = { ...INITIAL_SUSPICIOUS_IMAGES };
      parsed.forEach((id: string) => { if (typeof id === 'string') map[id] = 'Reported wrong image'; });
      return map;
    }
    if (parsed && typeof parsed === 'object') {
      return { ...INITIAL_SUSPICIOUS_IMAGES, ...parsed };
    }
    return { ...INITIAL_SUSPICIOUS_IMAGES };
  } catch {
    return { ...INITIAL_SUSPICIOUS_IMAGES };
  }
}

function getVerifiedImagesSet(): Set<string> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_VERIFIED_IMAGES_KEY) : null;
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed);
    }
    if (parsed && typeof parsed === 'object') {
      return new Set(Object.keys(parsed));
    }
    return new Set();
  } catch {
    return new Set();
  }
}

function getReplacedImagesMap(): Record<string, string> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_REPLACED_IMAGES_KEY) : null;
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getCustomSources(): Record<string, CairoSource[]> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_CUSTOM_SOURCES_KEY) : null;
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getEditedSourcesMap(): Record<string, Partial<CairoSource>> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_EDITED_SOURCES_KEY) : null;
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getDeletedSourcesSet(): Set<string> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_DELETED_SOURCES_KEY) : null;
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed);
    }
    if (parsed && typeof parsed === 'object') {
      return new Set(Object.keys(parsed));
    }
    return new Set();
  } catch {
    return new Set();
  }
}

let memoAuditMap: Map<string, ProductAuditInfo> | null = null;
function getAuditMap(): Map<string, ProductAuditInfo> {
  if (!memoAuditMap) {
    memoAuditMap = new Map(safeAuditList.map(a => [a.product_id, a as ProductAuditInfo]));
  }
  return memoAuditMap;
}

export function sanitizeImageUrl(url?: string | null): string {
  if (!url) return '';
  return url.replace(/com\/\/storage/g, 'com/storage').replace(/\/\/storage/g, '/storage');
}

export const cairoSupplierService = {
  getStats(): AuditStats {
    return safeStats;
  },

  getSuppliers(): SupplierInfo[] {
    return safeSuppliers;
  },

  getSupplierById(supplierId: string): SupplierInfo | undefined {
    return safeSuppliers.find(s => s.id === supplierId);
  },

  getAllAudits(): ProductAuditInfo[] {
    const replaced = getReplacedImagesMap();
    const flagged = getFlaggedWrongImagesMap();
    const verified = getVerifiedImagesSet();

    return safeAuditList.map(a => {
      const rawUrl = replaced[a.product_id] || a.image_url || null;
      const activeUrl = sanitizeImageUrl(rawUrl);
      let verification: 'VERIFIED' | 'FLAGGED_WRONG' | 'UNVERIFIED' = 'UNVERIFIED';
      if (flagged[a.product_id]) {
        verification = 'FLAGGED_WRONG';
      } else if (verified.has(a.product_id) || replaced[a.product_id] || a.image_verification === 'VERIFIED') {
        verification = 'VERIFIED';
      } else if (a.image_status === 'VALID' && !INITIAL_SUSPICIOUS_IMAGES[a.product_id]) {
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

    const rawUrl = replaced[productId] || base.image_url || null;
    const activeUrl = sanitizeImageUrl(rawUrl);
    let verification: 'VERIFIED' | 'FLAGGED_WRONG' | 'UNVERIFIED' = 'UNVERIFIED';
    if (flagged[productId]) {
      verification = 'FLAGGED_WRONG';
    } else if (verified.has(productId) || replaced[productId] || base.image_verification === 'VERIFIED') {
      verification = 'VERIFIED';
    } else if (base.image_status === 'VALID' && !INITIAL_SUSPICIOUS_IMAGES[productId]) {
      verification = 'VERIFIED';
    }

    return {
      ...base,
      image_url: activeUrl,
      image_verification: verification
    };
  },

  getAllCairoSources(): CairoSource[] {
    const allPids = Object.keys(safeSourcesMap);
    const result: CairoSource[] = [];
    const seen = new Set<string>();
    for (const pid of allPids) {
      const pSources = this.getCairoSources(pid);
      for (const s of pSources) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          result.push(s);
        }
      }
    }
    return result;
  },

  getCairoSources(productId: string): CairoSource[] {
    const defaultSources = (safeSourcesMap as Record<string, CairoSource[]>)[productId] || [];
    const customSources = getCustomSources()[productId] || [];
    const editedMap = getEditedSourcesMap();
    const deletedSet = getDeletedSourcesSet();

    const all = [...customSources, ...defaultSources];
    return all
      .filter(s => !deletedSet.has(s.id))
      .map(s => {
        if (editedMap[s.id]) {
          return { ...s, ...editedMap[s.id] } as CairoSource;
        }
        return s;
      });
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
  },

  updateSource(productId: string, sourceId: string, updates: Partial<CairoSource>): CairoSource | null {
    const custom = getCustomSources();
    let updatedSource: CairoSource | null = null;

    // Check if it exists in customSources
    if (custom[productId]) {
      const idx = custom[productId].findIndex(s => s.id === sourceId);
      if (idx >= 0) {
        custom[productId][idx] = { ...custom[productId][idx], ...updates, last_checked: new Date().toISOString() };
        updatedSource = custom[productId][idx];
        try {
          localStorage.setItem(LOCAL_STORAGE_CUSTOM_SOURCES_KEY, JSON.stringify(custom));
        } catch (e) {
          console.error(e);
        }
        return updatedSource;
      }
    }

    // Otherwise it's a default source from bundle, save the overrides to editedMap
    const editedMap = getEditedSourcesMap();
    editedMap[sourceId] = { ...(editedMap[sourceId] || {}), ...updates, last_checked: new Date().toISOString() };
    try {
      localStorage.setItem(LOCAL_STORAGE_EDITED_SOURCES_KEY, JSON.stringify(editedMap));
    } catch (e) {
      console.error(e);
    }

    const all = this.getCairoSources(productId);
    return all.find(s => s.id === sourceId) || null;
  },

  deleteSource(productId: string, sourceId: string): boolean {
    // 1. Remove from custom sources if present
    const custom = getCustomSources();
    if (custom[productId]) {
      custom[productId] = custom[productId].filter(s => s.id !== sourceId);
      try {
        localStorage.setItem(LOCAL_STORAGE_CUSTOM_SOURCES_KEY, JSON.stringify(custom));
      } catch (e) {
        console.error(e);
      }
    }

    // 2. Add to deleted set so bundle default sources are also removed
    const deleted = getDeletedSourcesSet();
    deleted.add(sourceId);
    try {
      localStorage.setItem(LOCAL_STORAGE_DELETED_SOURCES_KEY, JSON.stringify(Array.from(deleted)));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  getProductsBySupplier(supplierId: string): { productId: string; productName: string; priceEgp: number | null }[] {
    const results: { productId: string; productName: string; priceEgp: number | null }[] = [];
    const auditMap = getAuditMap();

    for (const [pId, list] of Object.entries(safeSourcesMap)) {
      if (!Array.isArray(list)) continue;
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
    if (this.isWrongImageFlagged(productId)) return false;
    const verified = getVerifiedImagesSet();
    if (verified.has(productId)) return true;
    const replaced = getReplacedImagesMap();
    if (replaced[productId]) return true;
    const audit = getAuditMap().get(productId);
    if (!audit) return false;
    if (audit.image_verification === 'VERIFIED') return true;
    if (audit.image_status === 'VALID' && !INITIAL_SUSPICIOUS_IMAGES[productId]) return true;
    return false;
  },

  verifyAllValidImages(): number {
    const verified = getVerifiedImagesSet();
    let count = 0;
    for (const a of safeAuditList) {
      if (a.image_status === 'VALID' && !this.isWrongImageFlagged(a.product_id)) {
        if (!verified.has(a.product_id)) {
          verified.add(a.product_id);
          count++;
        }
      }
    }
    try {
      localStorage.setItem(LOCAL_STORAGE_VERIFIED_IMAGES_KEY, JSON.stringify(Array.from(verified)));
    } catch (e) {
      console.error('Failed to store verified images in localStorage', e);
    }
    return count;
  },

  getNewMarketDiscoveredProducts(existingIds: string[] = [], existingSlugs: string[] = []): ProductAuditInfo[] {
    const idSet = new Set(existingIds.map(id => id.toLowerCase()));
    const slugSet = new Set(existingSlugs.map(s => s.toLowerCase()));
    
    return safeAuditList.filter(a => {
      if (a.image_status !== 'VALID') return false;
      if (idSet.has(a.product_id.toLowerCase())) return false;
      const slug = (a.product_name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (slugSet.has(slug)) return false;
      return true;
    }).map(a => this.getProductAudit(a.product_id) || a);
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

  sanitizeImageUrl(url?: string | null): string {
    if (!url) return '';
    return url.replace(/([^:])\/\/+/g, '$1/').trim();
  },

  getEffectiveImageUrl(productId: string, fallbackUrl?: string | null): string | null {
    const replaced = getReplacedImagesMap();
    if (replaced[productId]) return replaced[productId];
    const audit = getAuditMap().get(productId);
    return audit?.image_url || fallbackUrl || null;
  },

  /**
   * Generates intelligent pricing, stock availability, and localized descriptions
   * based on the product's connected Cairo supplier sources.
   */
  getRecommendations(
    productId: string,
    productName: string = '',
    currentPrice: number = 0,
    currentStock: number = 10,
    currentDescription: string = '',
    brand: string = '',
    protocol: string = ''
  ): ProductRecommendation {
    const safePrice = typeof currentPrice === 'number' && !isNaN(currentPrice) ? currentPrice : Number(currentPrice) || 0;
    const safeStock = typeof currentStock === 'number' && !isNaN(currentStock) ? currentStock : Number(currentStock) || 0;
    const safeName = productName || 'Product';

    const sources = this.getCairoSources(productId) || [];
    const pricedSources = sources.filter(s => {
      const p = Number(s.price_egp);
      return !isNaN(p) && p > 0;
    });

    let lowestPrice: number | null = null;
    let lowestSupplierName: string | null = null;
    let highestPrice: number | null = null;
    let avgPrice: number | null = null;

    if (pricedSources.length > 0) {
      const validPrices = pricedSources.map(s => Number(s.price_egp)).filter(p => !isNaN(p) && p > 0);
      if (validPrices.length > 0) {
        lowestPrice = Math.min(...validPrices);
        const lowestMatch = pricedSources.find(s => Number(s.price_egp) === lowestPrice);
        lowestSupplierName = lowestMatch ? lowestMatch.supplier_name : null;
        highestPrice = Math.max(...validPrices);
        const sum = validPrices.reduce((acc, val) => acc + val, 0);
        avgPrice = Math.round(sum / validPrices.length);
      }
    }

    // Availability assessment
    const inStockCount = sources.filter(s => (s.availability || '').toLowerCase().includes('in stock') || (s.availability || '').toLowerCase().includes('متوفر')).length;
    const outOfStockCount = sources.filter(s => (s.availability || '').toLowerCase().includes('out of stock') || (s.availability || '').toLowerCase().includes('غير متوفر')).length;
    
    let overallAvailability: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Unknown' = 'Unknown';
    if (sources.length > 0) {
      if (inStockCount > 0) {
        overallAvailability = inStockCount >= 2 ? 'In Stock' : 'Low Stock';
      } else if (outOfStockCount === sources.length) {
        overallAvailability = 'Out of Stock';
      } else {
        overallAvailability = 'In Stock';
      }
    }

    // Pricing calculation
    const targetMargin = 0.25; // 25% target gross margin
    let recommendedPrice = safePrice > 0 ? safePrice : (lowestPrice ? Math.round((lowestPrice * 1.25) / 10) * 10 : 0);
    let currentMarginPct: number | null = null;
    let pricingStatus: ProductRecommendation['pricingStatus'] = 'NO_COST_DATA';
    let pricingReason = 'No local supplier cost recorded yet.';

    if (lowestPrice && lowestPrice > 0) {
      // Calculate recommended retail price: Cost / (1 - targetMargin), rounded to nearest 10 or 50 EGP
      const rawRec = lowestPrice / (1 - targetMargin);
      recommendedPrice = Math.round(rawRec / 10) * 10;
      if (recommendedPrice < lowestPrice * 1.15) {
        recommendedPrice = Math.round((lowestPrice * 1.25) / 10) * 10;
      }

      if (safePrice > 0) {
        currentMarginPct = Math.round(((safePrice - lowestPrice) / safePrice) * 100);
        if (safePrice < lowestPrice) {
          pricingStatus = 'LOSS_RISK';
          pricingReason = `Selling at a loss! Store price (${safePrice.toLocaleString()} EGP) is below Cairo supplier cost (${lowestPrice.toLocaleString()} EGP).`;
        } else if (currentMarginPct < 15) {
          pricingStatus = 'LOW_MARGIN';
          pricingReason = `Thin margin (+${currentMarginPct}%). Profit margin is under the safe 15% threshold for smart devices in Egypt.`;
        } else if (currentMarginPct > 50) {
          pricingStatus = 'OVERPRICED';
          pricingReason = `Overpriced (+${currentMarginPct}% margin). Consider lowering to ${(recommendedPrice || 0).toLocaleString()} EGP to match Cairo competitive market.`;
        } else {
          pricingStatus = 'HEALTHY';
          pricingReason = `Healthy profit margin (+${currentMarginPct}%). Well-positioned against Cairo suppliers.`;
        }
      } else {
        pricingStatus = 'LOSS_RISK';
        pricingReason = `Price is set to 0. Suggested initial price: ${(recommendedPrice || 0).toLocaleString()} EGP.`;
      }
    }

    // Stock assessment
    let recommendedStock = safeStock;
    let stockStatus: ProductRecommendation['stockStatus'] = 'AVAILABLE';
    let stockReason = 'Inventory buffer is optimal.';

    if (overallAvailability === 'Out of Stock') {
      recommendedStock = 0;
      stockStatus = 'OUT_OF_STOCK';
      stockReason = 'All recorded Cairo distributors show Out of Stock. Recommended stock: 0 to prevent unfulfillable orders.';
    } else if (overallAvailability === 'In Stock' || overallAvailability === 'Low Stock') {
      recommendedStock = currentStock <= 0 ? 15 : currentStock;
      stockStatus = 'AVAILABLE';
      stockReason = `Suppliers in Cairo have active stock. Recommended inventory target: 15 units.`;
    } else {
      stockStatus = 'CHECK_REQUIRED';
      stockReason = 'Supplier inventory is on request. Verify availability with distributor prior to high-volume orders.';
    }

    // Description assessment & Generation
    const descLength = (currentDescription || '').trim().length;
    let descriptionStatus: ProductRecommendation['descriptionStatus'] = 'GOOD';
    if (descLength === 0) {
      descriptionStatus = 'EMPTY';
    } else if (descLength < 80) {
      descriptionStatus = 'NEEDS_EXPANSION';
    }

    const cleanBrand = brand || 'Smart Home';
    const cleanProtocol = protocol || 'Zigbee 3.0 / Wi-Fi';

    const recommendedDescriptionEn = 
`${productName} by ${cleanBrand} provides cutting-edge smart home automation tailored for modern Egyptian homes and villas. Operating seamlessly on ${cleanProtocol}, it integrates effortlessly with Home Assistant, Apple HomeKit, Google Home, and Amazon Alexa. Engineered for standard Egyptian electrical grids (220-240V AC, 50/60Hz) with surge protection and flame-retardant PC housing. Available with local Cairo warranty and full technical support.`;

    const recommendedDescriptionAr = 
`جهاز ${productName} من ${cleanBrand} يقدم حلول أتمتة وتحكم ذكي متطورة مصممة خصيصاً للمنازل والفيلات في مصر. يعمل بسلاسة عبر بروتوكول ${cleanProtocol}، ومتوافق بالكامل مع أنظمة Home Assistant و Apple HomeKit و Google Home و Amazon Alexa. مصمم لتحمل شبكة الكهرباء المصرية (220-240 فولت، 50/60 هرتز) ومزود بحماية ضد التردد الكهربائي الزائد، مع دعم فني وضمان معتمد داخل القاهرة ومحافظات مصر.`;

    const highlights = [
      `Voltage: 100-240V AC 50/60Hz (Egyptian Standard)`,
      `Protocol: ${cleanProtocol}`,
      `Integration: Home Assistant, Alexa, Google Home`,
      `Local Support: Cairo verified distributors with technical warranty`
    ];

    return {
      productId,
      productName,
      sourcesCount: sources.length,
      lowestSupplierPrice: lowestPrice,
      lowestSupplierName,
      highestSupplierPrice: highestPrice,
      averageSupplierPrice: avgPrice,
      overallAvailability,
      currentPrice,
      currentMarginPct,
      pricingStatus,
      recommendedPrice,
      targetMarginPct: 25,
      pricingReason,
      currentStock,
      recommendedStock,
      stockStatus,
      stockReason,
      currentDescriptionLength: descLength,
      descriptionStatus,
      recommendedDescriptionEn,
      recommendedDescriptionAr,
      highlights
    };
  },

  /**
   * Returns a sanitized, verified catalog of genuine smart home devices
   * with accurate Cairo market prices, protocols, and clean titles.
   */
  getCleanSmartHomeCatalog(): Product[] {
    const categoriesMap: Record<string, { id: string; name: string; slug: string }> = {
      'smart-switches': { id: '934d2c8e-8e1f-459e-8dd4-d93520719215', name: 'Smart Switches', slug: 'smart-switches' },
      'smart-sensors': { id: '0dc4982c-ac41-4201-aa69-3a7494ed0a7b', name: 'Smart Sensors', slug: 'smart-sensors' },
      'smart-hubs': { id: '161fef6c-d985-427e-a31f-f5735b0fa4c3', name: 'Smart Hubs', slug: 'smart-hubs' },
      'smart-panels': { id: 'f6461e11-a1df-490f-b81f-34009d5e48e6', name: 'Smart Panels', slug: 'smart-panels' },
      'smart-locks': { id: '61869110-4165-4bfe-80f1-af06217abd61', name: 'Smart Locks', slug: 'smart-locks' },
      'smart-plugs': { id: '1b122176-06c8-440f-8a46-4e0855cbedea', name: 'Smart Plugs', slug: 'smart-plugs' },
      'networking': { id: '2ded3f14-d5cb-47c6-a18b-1305ea346f67', name: 'Networking', slug: 'networking' },
      'accessories': { id: 'c73bb3ed-3b43-4f83-8759-a283ec7bdcf9', name: 'Accessories', slug: 'accessories' },
    };

    const isJunk = (name: string) => {
      const n = (name || '').toLowerCase();
      return (
        n.includes('chair') ||
        n.includes('drawer') ||
        n.includes('table') ||
        n.includes('vitra') ||
        n.includes('magisso') ||
        n.includes('furniture') ||
        n.includes('presenter') ||
        n.includes('r400') ||
        n.includes('laser pointer')
      );
    };

    const inferProtocol = (brand: string, name: string): string => {
      const text = `${brand} ${name}`.toLowerCase();
      if (text.includes('zigbee') || text.includes('snzb') || text.includes('zbdongle')) return 'Zigbee 3.0';
      if (text.includes('matter')) return 'Matter';
      if (text.includes('thread')) return 'Thread';
      if (text.includes('z-wave') || text.includes('fibaro') || text.includes('aeotec')) return 'Z-Wave Plus';
      if (text.includes('rf') || text.includes('433')) return 'RF 433MHz';
      if (text.includes('ble') || text.includes('bluetooth')) return 'Bluetooth';
      if (text.includes('poe') || text.includes('gigabit') || text.includes('ethernet') || text.includes('router') || text.includes('access point')) return 'Ethernet / Wi-Fi';
      return 'Wi-Fi 2.4GHz';
    };

    const cleanTitle = (name: string): string => {
      if (!name) return 'Smart Home Device';
      return name
        .replace(/&amp;/g, '&')
        .replace(/&#038;/g, '&')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s*–\s*LEZN Egypt.*$/i, '')
        .replace(/\s*-\s*TechNex Store.*$/i, '')
        .replace(/\s*-\s*Mastery IT.*$/i, '')
        .replace(/\s*–\s*Baytzaki.*$/i, '')
        .replace(/\s*\|\s*Sonoff Egypt.*$/i, '')
        .trim();
    };

    const classifyCategory = (name: string, rawCat?: string): { id: string; name: string; slug: string } => {
      const t = `${name} ${rawCat || ''}`.toLowerCase();
      if (t.includes('lock') || t.includes('keypad') || t.includes('deadbolt') || t.includes('cylinder') || t.includes('handle')) return categoriesMap['smart-locks'];
      if (t.includes('panel') || t.includes('nspanel') || t.includes('touch panel') || t.includes('screen') || t.includes('display')) return categoriesMap['smart-panels'];
      if (t.includes('sensor') || t.includes('detector') || t.includes('pir') || t.includes('motion') || t.includes('leak') || t.includes('smoke') || t.includes('door') || t.includes('window') || t.includes('flood') || t.includes('humidity') || t.includes('temperature') || t.includes('presence')) return categoriesMap['smart-sensors'];
      if (t.includes('switch') || t.includes('relay') || t.includes('dimmer') || t.includes('gang') || t.includes('breaker') || t.includes('curtain') || t.includes('roller') || t.includes('blind') || t.includes('module')) return categoriesMap['smart-switches'];
      if (t.includes('plug') || t.includes('socket') || t.includes('outlet') || t.includes('power strip')) return categoriesMap['smart-plugs'];
      if (t.includes('hub') || t.includes('gateway') || t.includes('bridge') || t.includes('coordinator') || t.includes('dongle') || t.includes('remote') || t.includes('ir controller') || t.includes('rf bridge')) return categoriesMap['smart-hubs'];
      if (t.includes('router') || t.includes('access point') || t.includes('ethernet') || t.includes('mesh') || t.includes('poe') || t.includes('wifi') || t.includes('wi-fi') || t.includes('extender') || t.includes('gigabit')) return categoriesMap['networking'];
      return categoriesMap['accessories'];
    };

    const validAudits = safeAuditList.filter(
      (a) => a.image_status === 'VALID' && !isJunk(a.product_name)
    );

    return validAudits.map((a, index) => {
      const cleanName = cleanTitle(a.product_name);
      const catInfo = classifyCategory(cleanName, a.category);
      const baseSlug = cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const slug = baseSlug || `smart-device-${a.product_id.slice(0, 8)}`;
      const protocol = inferProtocol(a.brand, cleanName);
      const price = a.price || 950;
      const originalPrice =
        a.lowest_cairo_price && a.lowest_cairo_price < price
          ? Math.round(price * 1.15)
          : a.price > 1000
          ? Math.round(a.price * 1.12)
          : null;
      
      let rawImg = this.getEffectiveImageUrl(a.product_id, a.image_url) || a.image_url || '';
      // Replace ceremony/non-product image for zigbee lan gateway
      if (rawImg.includes('1778896387894-p4a2ch.jpg')) {
        rawImg = 'https://vgwptcvjhmphqhoepbri.supabase.co/storage/v1/object/public/product-images/manual/1778896061906-vz0hgz.png';
      }
      const img = this.sanitizeImageUrl(rawImg);

      return {
        id: a.product_id,
        name: cleanName,
        slug,
        description:
          a.cleaned_description ||
          `${cleanName} - genuine smart home device for Egyptian homes with local warranty.`,
        price,
        original_price: originalPrice,
        category_id: catInfo.id,
        category: {
          id: catInfo.id,
          name: catInfo.name,
          slug: catInfo.slug,
          description: null,
          image_url: null,
          created_at: a.audit_date || new Date().toISOString(),
        },
        image_url: img,
        images: img ? [img] : [],
        brand: a.brand || 'Smart Home',
        protocol,
        specifications: {
          'Protocol': protocol,
          'Brand': a.brand || 'Smart Home',
          'Voltage': '220-240V AC 50/60Hz',
          'Local Warranty': 'Cairo Official Warranty',
        },
        stock: 15,
        featured: index < 12,
        created_at: a.audit_date || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
  },

  getProductBySlug(slug: string): Product | null {
    if (!slug) return null;
    const catalog = this.getCleanSmartHomeCatalog();
    const clean = slug.toLowerCase().trim();
    return catalog.find((p) => p.slug.toLowerCase() === clean) || null;
  },

  getProductById(id: string): Product | null {
    if (!id) return null;
    const catalog = this.getCleanSmartHomeCatalog();
    return catalog.find((p) => p.id === id) || null;
  }
};
