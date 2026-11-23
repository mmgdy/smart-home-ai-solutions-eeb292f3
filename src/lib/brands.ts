const EXCLUDED_NON_BRANDS = new Set([
  'smart home',
  'amazon',
  'panda',
  'pabx',
]);

const CANONICAL_BRAND_MAP: Record<string, string> = {
  'sonoff': 'SONOFF',
  'ewelink': 'eWeLink',
  'dnake': 'DNAKE',
  'lezn': 'LEZN',
  'zosar': 'Zosar',
  'k.zosar': 'Zosar',
  'k-zosar': 'Zosar',
  'k zosar': 'Zosar',
  'tp-link': 'TP-Link',
  'tplink': 'TP-Link',
  'moes': 'MOES',
  'fibaro': 'FIBARO',
  'sib': 'SIB',
  'levana': 'Levana',
  'surpass': 'Surpass',
  'bosch': 'Bosch',
  'tuya': 'Tuya',
  'aqara': 'Aqara',
  'smartzoom': 'SmartZoom',
};

export function normalizeBrand(rawBrand?: string | null): string | null {
  if (!rawBrand || typeof rawBrand !== 'string') return null;
  const trimmed = rawBrand.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (EXCLUDED_NON_BRANDS.has(lower)) return null;
  return CANONICAL_BRAND_MAP[lower] || trimmed;
}

export function brandToSlug(brand: string): string {
  return brand.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
