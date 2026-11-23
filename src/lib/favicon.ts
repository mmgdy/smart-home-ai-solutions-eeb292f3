import { supabase } from '@/integrations/supabase/client';

export type BrandingAssetType = 'logo-light' | 'logo-dark' | 'favicon' | 'app-icon';

export interface BrandingSettings {
  logo_url?: string;
  logo_light_url?: string;
  logo_dark_url?: string;
  logo_size?: string;
  favicon_url?: string;
  app_icon_url?: string;
}

const BRANDING_KEYS = [
  'logo_url',
  'logo_light_url',
  'logo_dark_url',
  'logo_size',
  'favicon_url',
  'app_icon_url',
] as const;

const SITE_ASSETS_PUBLIC_PREFIX = '/storage/v1/object/public/site-assets/';

let brandingCache: BrandingSettings | null = null;
let brandingPromise: Promise<BrandingSettings> | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('azka-settings-updated', () => {
    brandingCache = null;
  });
}

/**
 * Maps Supabase Storage `site-assets` branding URLs to their synced local static assets
 * so browsers load compressed local files without consuming Supabase Storage Cached Egress.
 */
export function resolveBrandingAssetUrl(
  url: string | null | undefined,
  type: BrandingAssetType,
  fallback: string,
): string {
  const clean = url?.trim();
  if (!clean) return fallback;

  if (clean.includes(SITE_ASSETS_PUBLIC_PREFIX)) {
    const filePart = clean.split(SITE_ASSETS_PUBLIC_PREFIX)[1]?.split('?')[0]?.toLowerCase() || '';
    if (type === 'logo-light' && (filePart.startsWith('logo-light') || /^logo-\d/.test(filePart))) {
      return fallback;
    }
    if (type === 'logo-dark' && filePart.startsWith('logo-dark')) {
      return fallback;
    }
    if (type === 'favicon' && filePart.startsWith('favicon')) {
      return fallback;
    }
    if (type === 'app-icon' && filePart.startsWith('app-icon')) {
      return fallback;
    }
  }

  return clean;
}

/**
 * Shared in-memory cached loader for branding settings in `admin_settings`.
 * Deduplicates concurrent requests from FaviconUpdater, Header, and Footer into a single query.
 */
export async function loadBrandingSettings(forceRefresh = false): Promise<BrandingSettings> {
  if (!forceRefresh && brandingCache) {
    return brandingCache;
  }
  if (!forceRefresh && brandingPromise) {
    return brandingPromise;
  }

  brandingPromise = (async () => {
    try {
      const { data } = await supabase
        .from('admin_settings')
        .select('key, value')
        .in('key', [...BRANDING_KEYS]);

      const map: BrandingSettings = {};
      for (const row of (data ?? []) as Array<{ key: keyof BrandingSettings; value: string | null }>) {
        if (row.value) {
          map[row.key] = row.value;
        }
      }
      brandingCache = map;
      return map;
    } finally {
      brandingPromise = null;
    }
  })();

  return brandingPromise;
}

/**
 * Synchronizes browser favicon link tags without dynamic cache-busting timestamps,
 * avoiding repeated downloads on every page load.
 */
export function applyFavicon(url: string) {
  if (!url || typeof document === 'undefined') return;

  try {
    const targetUrl = resolveBrandingAssetUrl(url, 'favicon', '/favicon.png');
    const targetHref = new URL(targetUrl, window.location.origin).href;
    const targetBase = targetHref.split('?')[0];

    const existing = Array.from(
      document.querySelectorAll<HTMLLinkElement>("link[rel='icon'], link[rel='shortcut icon']"),
    );

    const alreadyApplied =
      existing.length > 0 &&
      existing.every((el) => el.href === targetHref || el.href.split('?')[0] === targetBase);

    if (!alreadyApplied) {
      existing.forEach((el) => el.remove());

      const ico = document.createElement('link');
      ico.rel = 'icon';
      ico.type = 'image/png';
      ico.href = targetUrl;
      document.head.appendChild(ico);

      const shortcut = document.createElement('link');
      shortcut.rel = 'shortcut icon';
      shortcut.type = 'image/png';
      shortcut.href = targetUrl;
      document.head.appendChild(shortcut);
    }

    try {
      localStorage.setItem('azka_favicon_url', targetUrl);
    } catch {
      // Ignore quota/private browsing issues
    }
  } catch (e) {
    console.error('Failed to update favicon:', e);
  }
}
