// Shared CORS helpers for AzkaSmart edge functions.
// Enforces origin-allowlist on every request to prevent cross-site abuse,
// while always supporting both apex and www domains plus preview builds.

const DEFAULT_ALLOWED_ORIGINS = [
  "https://azkasmart.com",
  "https://www.azkasmart.com",
  "https://baytzaki.com",
  "https://www.baytzaki.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
];

export function getAllowedOrigins(): string[] {
  const env = Deno.env.get("ALLOWED_ORIGINS");
  if (!env) return DEFAULT_ALLOWED_ORIGINS;
  const extra = env
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra]));
}

function isOriginAllowed(origin: string, allowedList: string[]): boolean {
  if (!origin) return false;
  if (allowedList.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return (
      host === "azkasmart.com" ||
      host.endsWith(".azkasmart.com") ||
      host === "baytzaki.com" ||
      host.endsWith(".baytzaki.com") ||
      host.endsWith(".lovable.app") ||
      host.endsWith(".lovableproject.com") ||
      host.endsWith(".vercel.app")
    );
  } catch {
    return false;
  }
}

/** Build CORS headers for a request, restricting origin to the allowlist.
 *  Falls back to the first allowed origin if the caller is unknown. */
export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = getAllowedOrigins();
  const allowOrigin = isOriginAllowed(origin, allowed) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
    "Access-Control-Max-Age": "86400",
  };
}

/** Strict CORS headers for functions that should ONLY be called by the
 *  web app — returns a 403 when called from outside the allowlist. */
export function strictCorsHeadersFor(req: Request): {
  allowed: boolean;
  headers: Record<string, string>;
} {
  const origin = req.headers.get("origin") ?? "";
  const allowed = getAllowedOrigins();
  if (!isOriginAllowed(origin, allowed)) {
    return { allowed: false, headers: corsHeadersFor(req) };
  }
  return { allowed: true, headers: corsHeadersFor(req) };
}
