export function categoryToSlug(name: string): string {
  return String(name || "")
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function sortCategories<T extends { sort_order?: number; name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const orderA = Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : 0;
    const orderB = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 0;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

export function parseSlugLines(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const parts = String(raw || "").split(/[\r\n,]+/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push(trimmed);
  }
  return out;
}

export function matchSlugsToProducts<T extends { id: string; slug: string; name: string }>(
  raw: string,
  products: T[]
): { matched: T[]; unmatched: string[] } {
  const tokens = parseSlugLines(raw);
  const bySlug = new Map<string, T>();
  for (const p of products) {
    if (p?.slug) {
      bySlug.set(String(p.slug).trim().toLowerCase(), p);
    }
  }
  const matched: T[] = [];
  const unmatched: string[] = [];
  for (const token of tokens) {
    const found = bySlug.get(token.toLowerCase());
    if (found) matched.push(found);
    else unmatched.push(token);
  }
  return { matched, unmatched };
}

export function getPublicShopCategories<
  C extends { id: string; slug: string; is_active?: boolean; sort_order?: number; name: string }
>(categories: C[], publishedProducts: Array<{ category_id: string | null }>): C[] {
  const populatedCategoryIds = new Set<string>();
  for (const p of publishedProducts) {
    if (p?.category_id) {
      populatedCategoryIds.add(p.category_id);
    }
  }

  return sortCategories(
    categories.filter(
      (c) =>
        c.is_active !== false &&
        c.slug !== "uncategorized" &&
        populatedCategoryIds.has(c.id)
    )
  );
}
