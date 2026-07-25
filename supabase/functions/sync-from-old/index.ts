// sync-from-old — one-shot idempotent data sync from the OLD Supabase project
// (vgwptcvjhmphqhoepbri) into the NEW project this function runs on.
//
// WHY THIS EXISTS
//   The migration tool shipped only ~40% of products (331 of 821) and dropped
//   featured flags, site_info rows, and an admin_settings key. Production
//   homepage showed "No featured products available" because no product had
//   featured=true in the new DB. This function backfills the gap.
//
// SECURITY MODEL
//   - Runs ON the new project, so it auto-receives SUPABASE_URL +
//     SUPABASE_SERVICE_ROLE_KEY for WRITES. The service role never leaves
//     Supabase infrastructure.
//   - Reads from the OLD project using its PUBLIC anon key only (read-only).
//     That key is stored in the Supabase secret OLD_ANON_KEY — never committed.
//   - Admin-gated: requires a valid new-project admin token, so random callers
//     cannot trigger expensive full-table copies.
//   - Idempotent: uses upsert with onConflict, so re-running is safe and will
//     converge the new project to match the old one for the synced tables.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";

// OLD project — read from env so the key is never in source control.
const OLD_SUPABASE_URL =
  Deno.env.get("OLD_SUPABASE_URL") ?? "https://vgwptcvjhmphqhoepbri.supabase.co";
const OLD_ANON_KEY = Deno.env.get("OLD_ANON_KEY");

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

// Paginated read from the OLD project's REST API.
async function fetchAllOld(table: string, select = "*"): Promise<any[]> {
  if (!OLD_ANON_KEY) {
    throw new Error("OLD_ANON_KEY secret is not set. Set it in Supabase secrets.");
  }
  const rows: any[] = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const url = `${OLD_SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=${PAGE}&offset=${offset}`;
    const r = await fetch(url, {
      headers: { apikey: OLD_ANON_KEY, Authorization: `Bearer ${OLD_ANON_KEY}` },
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`OLD GET ${table} @${offset}: ${r.status} ${t.slice(0, 200)}`);
    }
    const data = await r.json();
    rows.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return rows;
}

// Chunked upsert into the NEW project (service role).
async function upsertNew(supabase: any, table: string, rows: any[], conflict: string) {
  if (!rows.length) return 0;
  const CHUNK = 200;
  let done = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from(table)
      .upsert(chunk, { onConflict: conflict });
    if (error) throw new Error(`NEW UPSERT ${table} chunk@${i}: ${error.message}`);
    done += chunk.length;
  }
  return done;
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Rate limit: 3 sync calls per IP per 10 minutes (expensive operation)
  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 600_000, maxRequests: 3 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ success: false, error: "Too many requests. Try again later." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { token, tables = ["products", "site_info", "admin_settings"] } = await req.json();

    if (!(await verifyAdminToken(supabase, token))) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, any> = {};
    const wanted = new Set<string>(tables);

    if (wanted.has("products")) {
      const oldProducts = await fetchAllOld("products");
      const { data: existing } = await supabase
        .from("products")
        .select("id, is_published");
      const pubMap = new Map<string, boolean>(
        (existing ?? []).map((r: any) => [r.id, !!r.is_published])
      );
      const merged = oldProducts.map((p) => ({
        ...p,
        is_published: pubMap.has(p.id) ? pubMap.get(p.id)! : true,
      }));
      const count = await upsertNew(supabase, "products", merged, "id");
      results.products = { fetched: oldProducts.length, upserted: count };
    }

    if (wanted.has("categories")) {
      const rows = await fetchAllOld("categories");
      results.categories = { fetched: rows.length, upserted: await upsertNew(supabase, "categories", rows, "id") };
    }

    if (wanted.has("brands")) {
      const rows = await fetchAllOld("brands");
      results.brands = { fetched: rows.length, upserted: await upsertNew(supabase, "brands", rows, "id") };
    }

    if (wanted.has("site_info")) {
      const rows = await fetchAllOld("site_info");
      results.site_info = { fetched: rows.length, upserted: await upsertNew(supabase, "site_info", rows, "section,key") };
    }

    if (wanted.has("admin_settings")) {
      const rows = (await fetchAllOld("admin_settings")).filter(
        (r) => !String(r.key).startsWith("admin_token_")
      );
      results.admin_settings = { fetched: rows.length, upserted: await upsertNew(supabase, "admin_settings", rows, "key") };
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-from-old error:", e);
    return new Response(JSON.stringify({
      success: false,
      error: "Sync failed. Check server logs.",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
