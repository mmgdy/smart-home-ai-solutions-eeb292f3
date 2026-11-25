import { supabase } from "@/integrations/supabase/client";
import { brandToSlug } from "@/lib/brands";

export const BRAND_LOGOS_BUCKET = "brand-logos";

const VALID_LOGO_EXTENSIONS = new Set(["png", "webp", "svg", "jpg", "jpeg"]);

export interface BrandLogoObject {
  name: string;
  id?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  metadata?: {
    size?: number;
    mimetype?: string;
    eTag?: string;
  } | null;
}

export interface BrandLogoIndex {
  byExactSlugPng: Map<string, BrandLogoObject>;
  bySlug: Map<string, BrandLogoObject>;
  byCompactName: Map<string, BrandLogoObject>;
  byAlphaNum: Map<string, BrandLogoObject>;
}

export function isBrandLogoFile(obj: BrandLogoObject): boolean {
  if (!obj || typeof obj.name !== "string") return false;
  if (obj.id === null) return false;
  const trimmed = obj.name.trim();
  if (!trimmed || trimmed.endsWith("/") || trimmed === ".emptyFolderPlaceholder") {
    return false;
  }
  const ext = trimmed.split(".").pop()?.toLowerCase() ?? "";
  return VALID_LOGO_EXTENSIONS.has(ext);
}

export function buildBrandLogoPublicUrl(fileName: string, versionToken?: string | null): string {
  const cleanName = fileName.replace(/^\/+/, "");
  const { data } = supabase.storage.from(BRAND_LOGOS_BUCKET).getPublicUrl(cleanName);
  const baseUrl = data.publicUrl;
  if (!versionToken) return baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}v=${encodeURIComponent(versionToken)}`;
}

function setPreferPng(map: Map<string, BrandLogoObject>, key: string, file: BrandLogoObject) {
  if (!key) return;
  const existing = map.get(key);
  if (!existing) {
    map.set(key, file);
    return;
  }
  const isNewPng = file.name.toLowerCase().endsWith(".png");
  const isExistingPng = existing.name.toLowerCase().endsWith(".png");
  if (isNewPng && !isExistingPng) {
    map.set(key, file);
  }
}

export function buildBrandLogoIndex(files: BrandLogoObject[]): BrandLogoIndex {
  const byExactSlugPng = new Map<string, BrandLogoObject>();
  const bySlug = new Map<string, BrandLogoObject>();
  const byCompactName = new Map<string, BrandLogoObject>();
  const byAlphaNum = new Map<string, BrandLogoObject>();

  for (const file of files) {
    if (!isBrandLogoFile(file)) continue;
    const baseName = file.name.split("/").pop() || file.name;
    const stem = baseName.replace(/\.[^.]+$/, "");
    const lowerName = baseName.toLowerCase();
    const isPng = lowerName.endsWith(".png");

    const slugKey = brandToSlug(stem);
    const compactKey = stem.toLowerCase().replace(/\s+/g, "");
    const alphaNumKey = stem.toLowerCase().replace(/[^a-z0-9]+/g, "");

    if (isPng) {
      if (!byExactSlugPng.has(lowerName)) {
        byExactSlugPng.set(lowerName, file);
      }
      if (slugKey && !byExactSlugPng.has(`${slugKey}.png`)) {
        byExactSlugPng.set(`${slugKey}.png`, file);
      }
    }

    setPreferPng(bySlug, slugKey, file);
    setPreferPng(byCompactName, compactKey, file);
    setPreferPng(byAlphaNum, alphaNumKey, file);
  }

  return {
    byExactSlugPng,
    bySlug,
    byCompactName,
    byAlphaNum,
  };
}

export function resolveBrandLogoUrl(
  index: BrandLogoIndex,
  brandName: string,
  brandSlug?: string
): string | null {
  if (!brandName) return null;
  const slug = (brandSlug || brandToSlug(brandName)).toLowerCase();
  const compact = brandName.toLowerCase().replace(/\s+/g, "");
  const alphaNum = brandName.toLowerCase().replace(/[^a-z0-9]+/g, "");

  const match =
    index.byExactSlugPng.get(`${slug}.png`) ||
    index.bySlug.get(slug) ||
    index.byCompactName.get(compact) ||
    index.byAlphaNum.get(alphaNum);

  if (!match) return null;

  const versionToken = match.updated_at || match.metadata?.eTag || match.created_at || null;
  return buildBrandLogoPublicUrl(match.name, versionToken);
}
