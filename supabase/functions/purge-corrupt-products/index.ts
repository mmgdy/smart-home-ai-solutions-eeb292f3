// purge-corrupt-products — admin-gated product cleanup.
//
// Finds products whose images are missing or corrupted and (optionally)
// deletes them:
//   * "no image"     — image_url is empty/junk AND images[] has no usable URL
//   * "broken image" — every candidate image URL fails a live check
//                      (network error, 4xx/5xx, or non-image content type —
//                      this catches soft-404 HTML pages too)
//
// SAFETY
//   * Admin-gated via the same admin_settings token check as the other
//     admin functions; random callers get 401.
//   * Dry-run by default: pass { commit: true } to actually delete rows.
//   * order_items.product_id is FK ON DELETE SET NULL (product_name is
//     denormalized) and products.parent_id is FK ON DELETE SET NULL, so
//     deletion never breaks order history or strands variants.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { clamp } from "../_shared/validate.ts";

const CHECK_UA = "Mozilla/5.0 (compatible; BaytzakiImageBot/1.0; +https://baytzaki.com)";
const FETCH_TIMEOUT_MS = 6000;
const CONCURRENCY = 12;
const VALID_URL = /^(https?:\/\/|\/|data:)/i;

interface CheckedProduct {
  id: string;
  name: string;
  reason: string;
}

async function verifyAdminToken(supabase: any, token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = atob(token);
    const [adminId] = decoded.split(":");
    const { data } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", `admin_token_${adminId}`)
      .maybeSingle();
    return !!data && data.value === token;
  } catch {
    return false;
  }
}

/** A URL is worth an HTTP probe only if it looks like a real address. */
function isStaticallyValid(url: string): boolean {
  return VALID_URL.test(url.trim());
}

/** GET with a 1-byte Range to keep transfers tiny; ok means status < 400
 *  AND an image content type (defeats soft-404 HTML error pages). */
async function imageUrlHealthy(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const absolute = url.startsWith("/") ? `https://baytzaki.com${url}` : url;
    const resp = await fetch(absolute, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": CHECK_UA,
        "Accept": "image/*,*/*;q=0.8",
        "Range": "bytes=0-0",
      },
    });
    // Drain the tiny body so the connection can be reused.
    await resp.arrayBuffer().catch(() => undefined);
    if (!resp.ok) return false;
    const type = resp.headers.get("content-type") ?? "";
    return type.startsWith("image/") || type === "";
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Run tasks with bounded concurrency. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Expensive network-heavy operation — tight budget like sync-from-old.
  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 600_000, maxRequests: 3 });
  if (!rate.ok) {
    return new Response(
      JSON.stringify({ success: false, error: "Too many requests. Try again later." }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)),
        },
      }
    );
  }

  try {
    const { token, commit = false, batchSize = 250, offset = 0 } = await req.json().catch(() => ({}));
    const limit = clamp(Number(batchSize) || 250, 1, 400);
    const skip = Math.max(0, Number(offset) || 0);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (!(await verifyAdminToken(supabase, token))) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Page through products in stable order; pass { offset } to continue.
    const { data: products, error: fetchError } = await supabase
      .from("products")
      .select("id, name, image_url, images")
      .order("created_at", { ascending: true })
      .range(skip, skip + limit - 1);

    if (fetchError) throw fetchError;
    const rows = products ?? [];

    // Collect every distinct candidate URL once — many products share images.
    const urlSet = new Set<string>();
    for (const p of rows) {
      const candidates = [p.image_url, ...(Array.isArray(p.images) ? p.images : [])]
        .filter((u): u is string => typeof u === "string" && isStaticallyValid(u) && !u.startsWith("data:"))
        .map((u) => u.trim());
      for (const u of candidates) urlSet.add(u);
    }

    const urls = Array.from(urlSet);
    const health = new Map<string, boolean>();
    await mapLimit(urls, CONCURRENCY, async (u) => {
      health.set(u, await imageUrlHealthy(u));
    });

    const broken: CheckedProduct[] = [];
    for (const p of rows) {
      const candidates = [p.image_url, ...(Array.isArray(p.images) ? p.images : [])]
        .filter((u): u is string => typeof u === "string" && u.trim().length > 0);

      const usable = candidates.filter((u) => isStaticallyValid(u));
      if (usable.length === 0) {
        broken.push({ id: p.id, name: p.name, reason: "no_image" });
        continue;
      }
      // data: URIs count as healthy without a probe.
      const allDead = usable.every(
        (u) => !u.startsWith("data:") && health.get(u.trim()) !== true
      );
      if (allDead) {
        broken.push({ id: p.id, name: p.name, reason: "broken_image" });
      }
    }

    let removed = 0;
    if (commit && broken.length > 0) {
      const ids = broken.map((b) => b.id);
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        const { error: deleteError } = await supabase
          .from("products")
          .delete()
          .in("id", chunk);
        if (deleteError) throw deleteError;
        removed += chunk.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun: !commit,
        scanned: rows.length,
        urlsChecked: urls.length,
        toRemove: broken.slice(0, 100),
        removeCount: broken.length,
        removed: commit ? removed : 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("purge-corrupt-products error:", e);
    return new Response(
      JSON.stringify({ success: false, error: "Cleanup failed. Check server logs." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
