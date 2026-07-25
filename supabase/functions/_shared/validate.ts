// Input-validation utilities for Baytzaki edge functions.

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

/** Validate a URL string is safe: must be https: and not javascript/data/blob. */
export function isSafeUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Ensure a relative or absolute URL starts with https: and belongs to
 *  the site. Returns null for invalid/unsafe values. */
export function safeHttpsUrl(
  value: unknown,
  siteUrl: string,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed, siteUrl);
    if (url.protocol !== "https:") return null;
    // allow-list the site itself only (prevents open redirect)
    const base = new URL(siteUrl);
    if (url.hostname !== base.hostname) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

/** Basic HTML-entity escape for text that may reach HTML contexts
 *  (email bodies, notification titles, etc.). */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Assert a request body size stays within a limit (bytes). */
export function checkBodySize(req: Request, maxBytes = 2_000_000): Promise<boolean> {
  const cl = req.headers.get("content-length");
  if (cl && Number(cl) > maxBytes) return Promise.resolve(false);
  return req.clone().arrayBuffer().then((b) => b.byteLength <= maxBytes);
}
