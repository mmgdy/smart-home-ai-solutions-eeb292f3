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
//     That key is safe to embed — it is the old project's publishable key and
//     the old project's RLS allows public reads of catalog data.
//   - Admin-gated: requires a valid new-project admin token, so random callers
//     cannot trigger expensive full-table copies.
//   - Idempotent: uses upsert with onConflict, so re-running is safe and will
//     converge the new project to match the old one for the synced tables.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OLD project — public read-only values. The anon key is designed to be public,
// but read from env (OLD_SUPABASE_URL / OLD_ANON_KEY) so the source is
// configurable without redeploying. Falls back to the legacy project values.
const OLD_SUPABASE_URL =
  Deno.env.get("OLD_SUPABASE_URL") ?? "https://vgwptcvjhmphqhoepbri.supabase.co";
const OLD_ANON_KEY =
  Deno.env.get("OLD_ANON_KEY") ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnd3B0Y3ZqaG1waHFob2VwYnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Mzk2MjcsImV4cCI6MjA4MzIxNTYyN30.sLDAgPDZhw5zAdrmMj66vlMASa1HfhbDYwTJhRoKn2w";

// Verify the caller is a logged-in admin of the NEW project (same scheme as
// admin-auth/admin-write). Prevents anonymous users from burning DB quota.
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    // products — upsert by id. Preserve is_published for rows that already exist
    // by merging the old row over the existing new row (old wins for catalog fields).
    if (wanted.has("products")) {
      const oldProducts = await fetchAllOld("products");
      // Pull existing is_published values so we don't clobber a curator's choice.
      const { data: existing } = await supabase
        .from("products")
        .select("id, is_published");
      const pubMap = new Map<string, boolean>(
        (existing ?? []).map((r: any) => [r.id, !!r.is_published])
      );
      const merged = oldProducts.map((p) => ({
        ...p,
        // keep new-project publication flag if the row already exists; default true for new rows
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

    // site_info — keyed by (section,key). Holds hidden_ids, hero content, etc.
    if (wanted.has("site_info")) {
      const rows = await fetchAllOld("site_info");
      results.site_info = { fetched: rows.length, upserted: await upsertNew(supabase, "site_info", rows, "section,key") };
    }

    // admin_settings — keyed by key. Skip any active session tokens for safety.
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
      error: e instanceof Error ? e.message : String(e),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
