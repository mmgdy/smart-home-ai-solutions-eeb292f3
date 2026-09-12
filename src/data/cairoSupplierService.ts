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

  getAllAudits(): ProductAuditInfo[] {
    return auditBundle.auditList as unknown as ProductAuditInfo[];
  },

  getProductAudit(productId: string): ProductAuditInfo | null {
    return getAuditMap().get(productId) || null;
  },

  getCairoSources(productId: string): CairoSource[] {
    const defaultSources = (auditBundle.sourcesMap as Record<string, CairoSource[]>)[productId] || [];
    const customSources = getCustomSources()[productId] || [];
    return [...customSources, ...defaultSources];
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
