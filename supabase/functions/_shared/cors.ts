// Shared CORS helpers for Baytzaki edge functions.
// Enforces origin-allowlist on every request to prevent cross-site abuse.

const DEFAULT_ALLOWED_ORIGINS = [
  "https://baytzaki.com",
  "https://www.baytzaki.com",
  "http://localhost:3000",
  "http://localhost:5173",
];

export function getAllowedOrigins(): string[] {
  const env = Deno.env.get("ALLOWED_ORIGINS");
  if (env) return env.split(",").map((s) => s.trim());
  return DEFAULT_ALLOWED_ORIGINS;
}

/** Build CORS headers for a request, restricting origin to the allowlist.
 *  Falls back to the first allowed origin if the caller is unknown. */
export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = getAllowedOrigins();
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0];
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
  if (!allowed.includes(origin)) {
    return { allowed: false, headers: corsHeadersFor(req) };
  }
  return { allowed: true, headers: corsHeadersFor(req) };
}
