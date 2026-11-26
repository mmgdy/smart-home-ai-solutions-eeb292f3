import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const PUBLIC_PRODUCT_QUERY_KEYS: ReadonlyArray<readonly string[]> = [
  ['products'],
  ['product'],
  ['hidden-product-ids'],
  ['search-products'],
  ['featured-products'],
  ['complete-setup-catalog'],
  ['product-family-variants'],
  ['categories'],
  ['ai-product-card'],
  ['scene-products'],
  ['floor-plan-products'],
  ['photo-designer-products'],
  ['product-dependencies-manual'],
];

export function parseHiddenIds(rawValue: string | null | undefined): string[] {
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of parsed) {
      if (typeof item !== 'string') continue;
      const trimmed = item.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      out.push(trimmed);
    }
    return out;
  } catch {
    return [];
  }
}

export async function fetchHiddenProductIds(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('site_info')
      .select('value')
      .eq('section', 'products')
      .eq('key', 'hidden_ids')
      .maybeSingle();
    if (error) return [];
    return parseHiddenIds(data?.value);
  } catch {
    return [];
  }
}

function toHiddenSet(hiddenIds?: ReadonlySet<string> | readonly string[] | null): ReadonlySet<string> {
  if (!hiddenIds) return new Set<string>();
  return hiddenIds instanceof Set ? hiddenIds : new Set(hiddenIds);
}

export function isProductHidden(
  product: { id?: string | null; is_published?: boolean | null } | null | undefined,
  hiddenIds?: ReadonlySet<string> | readonly string[] | null,
): boolean {
  if (!product) return true;
  if (product.is_published === false) return true;
  if (!product.id) return false;
  return toHiddenSet(hiddenIds).has(product.id);
}

export function isProductPubliclyVisible(
  product: { id?: string | null; is_published?: boolean | null } | null | undefined,
  hiddenIds?: ReadonlySet<string> | readonly string[] | null,
): boolean {
  return !isProductHidden(product, hiddenIds);
}

export function filterPublicProducts<T extends { id?: string | null; is_published?: boolean | null }>(
  products: readonly T[] | null | undefined,
  hiddenIds?: ReadonlySet<string> | readonly string[] | null,
): T[] {
  if (!products || products.length === 0) return [];
  const hiddenSet = toHiddenSet(hiddenIds);
  return products.filter((p) => !isProductHidden(p, hiddenSet));
}

export function invalidateAllProductQueries(queryClient: QueryClient): void {
  for (const queryKey of PUBLIC_PRODUCT_QUERY_KEYS) {
    queryClient.invalidateQueries({ queryKey: [...queryKey] });
  }
}
