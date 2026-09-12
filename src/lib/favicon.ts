/**
 * Utility to apply and synchronize browser favicon and tab icons dynamically.
 * Eliminates browser caching issues by applying cache-busting timestamps,
 * updating all link tags (rel="icon", rel="shortcut icon"), and storing
 * the active URL in localStorage for instantaneous pre-hydration loading.
 */

export function applyFavicon(url: string) {
  if (!url || typeof document === 'undefined') return;

  try {
    // 1. Remove existing favicon links to avoid duplicate conflicting links
    const existing = document.querySelectorAll<HTMLLinkElement>("link[rel='icon'], link[rel='shortcut icon']");
    existing.forEach((el) => el.remove());

    const cacheBuster = `v=${Date.now()}`;
    const cleanUrl = url.split('?')[0];
    const versioned = `${cleanUrl}?${cacheBuster}`;

    // 2. Create standard icon
    const ico = document.createElement('link');
    ico.rel = 'icon';
    ico.type = 'image/png';
    ico.href = versioned;
    document.head.appendChild(ico);

    // 3. Create shortcut icon (required by some Chrome & Edge versions)
    const shortcut = document.createElement('link');
    shortcut.rel = 'shortcut icon';
    shortcut.type = 'image/png';
    shortcut.href = versioned;
    document.head.appendChild(shortcut);

    // 4. Cache in localStorage for immediate sync before React boot
    try {
      localStorage.setItem('azka_favicon_url', url);
    } catch {
      // Ignore quota/private browsing issues
    }
  } catch (e) {
    console.error('Failed to update favicon:', e);
  }
}
