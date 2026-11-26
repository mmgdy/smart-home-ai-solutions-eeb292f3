import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { chatComplete } from "../_shared/ai.ts";
import { autoEnrichProductSpecifications } from "../_shared/product-enricher.ts";
import {
  XPAY_API_BASE,
  maskSecretHint,
  normalizeXPayMode,
  validateKeyForMode,
} from "../_shared/xpay.ts";
import {
  readXPayPublicConfig,
  resolveXPaySecretKey,
  resolveXPayWebhookSecrets,
} from "../_shared/xpay-secrets.ts";

async function verifyAdminToken(supabase: any, token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = atob(token);
    const [adminId] = decoded.split(":");
    if (!adminId) return false;
    const { data } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", `admin_token_${adminId}`)
      .single();
    return !!data && data.value === token;
  } catch {
    return false;
  }
}

const DB_PRODUCT_FIELDS = [
  "name","slug","description","description_ar","price","original_price","brand","protocol",
  "image_url","stock","featured","video_url","category_id","images","specifications","is_published",
];

function filterProductFields(obj: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => DB_PRODUCT_FIELDS.includes(k)));
}

function normalizeIdList(rawIds: unknown): string[] {
  if (!Array.isArray(rawIds)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of rawIds) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function parseJsonIdArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    return normalizeIdList(JSON.parse(raw));
  } catch {
    return [];
  }
}

async function syncHiddenIdsSetting(
  supabase: any,
  ids: string[],
  hidden: boolean,
): Promise<string[]> {
  const { data: cur, error: e1 } = await supabase
    .from("site_info")
    .select("value")
    .eq("section", "products")
    .eq("key", "hidden_ids")
    .maybeSingle();
  if (e1) throw e1;

  let hiddenIds = parseJsonIdArray(cur?.value);
  const idSet = new Set(ids);
  if (hidden) {
    const existingSet = new Set(hiddenIds);
    for (const id of ids) {
      if (!existingSet.has(id)) {
        existingSet.add(id);
        hiddenIds.push(id);
      }
    }
  } else {
    hiddenIds = hiddenIds.filter((id) => !idSet.has(id));
  }

  const { error } = await supabase.from("site_info").upsert(
    {
      section: "products",
      key: "hidden_ids",
      value: JSON.stringify(hiddenIds),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "section,key" },
  );
  if (error) throw error;
  return hiddenIds;
}

async function deleteProductsByIds(
  supabase: any,
  rawIds: unknown,
): Promise<{ deletedIds: string[]; deletedCount: number }> {
  const uniqueIds = normalizeIdList(rawIds);
  if (uniqueIds.length === 0) {
    return { deletedIds: [], deletedCount: 0 };
  }

  const BATCH = 40;
  const deletedIds: string[] = [];
  for (let i = 0; i < uniqueIds.length; i += BATCH) {
    const chunk = uniqueIds.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from("products")
      .delete()
      .in("id", chunk)
      .select("id");
    if (error) throw error;
    for (const row of data ?? []) {
      if (row?.id) deletedIds.push(String(row.id));
    }
  }

  if (deletedIds.length > 0) {
    const deletedSet = new Set(deletedIds);

    const { data: hiddenRow } = await supabase
      .from("site_info")
      .select("value")
      .eq("section", "products")
      .eq("key", "hidden_ids")
      .maybeSingle();
    const curHidden = parseJsonIdArray(hiddenRow?.value);
    const nextHidden = curHidden.filter((id) => !deletedSet.has(id));
    if (nextHidden.length !== curHidden.length) {
      const { error: hiddenUpdErr } = await supabase.from("site_info").upsert(
        {
          section: "products",
          key: "hidden_ids",
          value: JSON.stringify(nextHidden),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "section,key" },
      );
      if (hiddenUpdErr) throw hiddenUpdErr;
    }

    for (let i = 0; i < deletedIds.length; i += BATCH) {
      const chunk = deletedIds.slice(i, i + BATCH);
      const { error: delDepErr } = await supabase
        .from("site_info")
        .delete()
        .eq("section", "product_dependencies")
        .in("key", chunk);
      if (delDepErr) throw delDepErr;
    }

    const { data: depRows, error: depFetchErr } = await supabase
      .from("site_info")
      .select("id, key, value")
      .eq("section", "product_dependencies");
    if (depFetchErr) throw depFetchErr;

    for (const row of depRows ?? []) {
      if (!row?.value) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(row.value);
      } catch {
        continue;
      }
      if (!Array.isArray(parsed)) continue;
      const filtered = parsed.filter(
        (entry: any) => !deletedSet.has(String(entry?.dependent_product_id || "").trim()),
      );
      if (filtered.length !== parsed.length) {
        const { error: depUpdErr } = await supabase
          .from("site_info")
          .update({
            value: JSON.stringify(filtered),
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (depUpdErr) throw depUpdErr;
      }
    }
  }

  return { deletedIds, deletedCount: deletedIds.length };
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60_000, maxRequests: 120 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Accept token from Authorization header OR body.token
    const authHeader = req.headers.get("Authorization") || "";
    const headerToken = authHeader.replace("Bearer ", "");
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { body = {}; }

    const bodyToken = typeof body.token === "string" ? body.token : undefined;
    const token = bodyToken || headerToken;

    if (!(await verifyAdminToken(supabase, token))) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action } = body;

    // ─── Products CRUD ───────────────────────────────────────────────

    if (action === "create-product") {
      const { product } = body as { product?: Record<string, any> };
      if (!product || !product.name) {
        return new Response(JSON.stringify({ success: false, error: "Product name required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const normalizedProtocol =
        typeof product.protocol === "string" && product.protocol.trim() !== ""
          ? product.protocol.trim()
          : null;
      const normalizedBrand =
        typeof product.brand === "string" && product.brand.trim() !== ""
          ? product.brand.trim()
          : null;
      const slug = product.slug || String(product.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: product.name, slug,
          description: product.description ?? null,
          description_ar: product.description_ar ?? null,
          price: product.price ?? 0, original_price: product.original_price ?? null,
          brand: normalizedBrand, protocol: normalizedProtocol,
          image_url: product.image_url ?? null, stock: product.stock ?? 10,
          featured: product.featured ?? false, video_url: product.video_url ?? null,
          category_id: product.category_id ?? null,
          images: product.images ?? null, specifications: product.specifications ?? null,
          is_published: product.is_published !== false,
        })
        .select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-product") {
      const { id, updates } = body as { id?: string; updates?: Record<string, any> };
      if (!id || !updates) {
        return new Response(JSON.stringify({ success: false, error: "id and updates required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const filtered = filterProductFields(updates);
      if ("protocol" in filtered) {
        const pVal = filtered.protocol;
        filtered.protocol = typeof pVal === "string" && pVal.trim() !== "" ? pVal.trim() : null;
      }
      if ("brand" in filtered) {
        const bVal = filtered.brand;
        filtered.brand = typeof bVal === "string" && bVal.trim() !== "" ? bVal.trim() : null;
      }
      const { data, error } = await supabase
        .from("products")
        .update({ ...filtered, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      if ("is_published" in filtered) {
        await syncHiddenIdsSetting(supabase, [id], filtered.is_published === false);
      }
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "enrich-all-catalog") {
      const { data: allProds, error: fetchErr } = await supabase
        .from("products")
        .select("id, name, description, brand, protocol, specifications");
      if (fetchErr) throw fetchErr;

      let updatedCount = 0;
      for (const p of allProds || []) {
        const enriched = autoEnrichProductSpecifications(p);
        const { error: upErr } = await supabase
          .from("products")
          .update({
            protocol: enriched.protocol,
            specifications: enriched.specifications,
            updated_at: new Date().toISOString(),
          })
          .eq("id", p.id);
        if (!upErr) updatedCount++;
      }

      return new Response(JSON.stringify({ success: true, count: updatedCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-product") {
      const id = typeof body.id === "string" ? body.id.trim() : "";
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { deletedIds, deletedCount } = await deleteProductsByIds(supabase, [id]);
      if (deletedCount === 0) {
        return new Response(JSON.stringify({ success: false, error: "Product not found or already deleted." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, deletedCount, deletedIds }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-delete-products") {
      const uniqueIds = normalizeIdList(body.ids);
      if (uniqueIds.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "ids required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { deletedIds, deletedCount } = await deleteProductsByIds(supabase, uniqueIds);
      if (deletedCount === 0) {
        return new Response(JSON.stringify({ success: false, error: "No matching products were found to delete." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, deletedCount, deletedIds }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-set-visibility") {
      const uniqueIds = normalizeIdList(body.ids);
      const hidden = Boolean(body.hidden);
      if (uniqueIds.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "ids required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const BATCH = 40;
      const nowIso = new Date().toISOString();
      let updatedCount = 0;
      for (let i = 0; i < uniqueIds.length; i += BATCH) {
        const chunk = uniqueIds.slice(i, i + BATCH);
        const { data: updatedRows, error: pubErr } = await supabase
          .from("products")
          .update({ is_published: !hidden, updated_at: nowIso })
          .in("id", chunk)
          .select("id");
        if (pubErr) throw pubErr;
        updatedCount += updatedRows?.length ?? 0;
      }
      const hiddenIds = await syncHiddenIdsSetting(supabase, uniqueIds, hidden);
      return new Response(JSON.stringify({ success: true, hidden, updatedCount, hiddenIds }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-update-products") {
      const { ids, updates } = body;
      const uniqueIds = normalizeIdList(ids);
      if (uniqueIds.length === 0 || !updates) return new Response(JSON.stringify({ success: false, error: "ids, updates required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const upd = { ...filterProductFields(updates as Record<string, unknown>), updated_at: new Date().toISOString() };
      const { error } = await supabase.from("products").update(upd).in("id", uniqueIds);
      if (error) throw error;
      if ("is_published" in upd) {
        await syncHiddenIdsSetting(supabase, uniqueIds, upd.is_published === false);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-apply-discount") {
      const { ids, mode, pct } = body;
      if (!Array.isArray(ids) || !ids.length) return new Response(JSON.stringify({ success: false, error: "ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      if (mode === "reset") {
        const { error } = await supabase.from("products").update({ original_price: null }).in("id", ids);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const p = parseFloat(String(pct));
      if (!p || p <= 0) return new Response(JSON.stringify({ success: false, error: "Invalid discount %" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { data: prods, error: e1 } = await supabase.from("products").select("id, price, original_price").in("id", ids);
      if (e1) throw e1;
      const updates = prods.map((pr: any) => {
        const base = pr.original_price && pr.original_price > pr.price ? pr.original_price : pr.price;
        return { id: pr.id, original_price: base, price: Math.round(base * (1 - p / 100)) };
      });
      const { error } = await supabase.from("products").upsert(updates);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "upload-file") {
      const { bucket, filename, base64, mimeType, upsert, cacheControl } = body as {
        bucket?: string;
        filename?: string;
        base64?: string;
        mimeType?: string;
        upsert?: boolean;
        cacheControl?: string;
      };
      if (!bucket || !filename || !base64) return new Response(JSON.stringify({ success: false, error: "bucket, filename, base64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const cleanFilename = String(filename).replace(/^\/+/, "");
      if (!cleanFilename || cleanFilename.includes("..")) {
        return new Response(JSON.stringify({ success: false, error: "Invalid filename" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const decoded = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const { data: upData, error: e1 } = await supabase.storage.from(bucket).upload(cleanFilename, decoded, {
        contentType: mimeType || "application/octet-stream",
        cacheControl: typeof cacheControl === "string" && cacheControl ? cacheControl : "31536000",
        upsert: Boolean(upsert),
      });
      if (e1) throw e1;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(cleanFilename);
      return new Response(JSON.stringify({ success: true, publicUrl: urlData.publicUrl, path: upData?.path || cleanFilename }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list-files") {
      const { bucket, prefix, limit } = body as {
        bucket?: string;
        prefix?: string;
        limit?: number;
      };
      if (!bucket || typeof bucket !== "string") {
        return new Response(JSON.stringify({ success: false, error: "bucket required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const cleanPrefix = typeof prefix === "string" ? prefix.replace(/^\/+/, "") : "";
      const safeLimit = Math.min(Math.max(Number(limit) || 500, 1), 1000);
      const { data, error: listErr } = await supabase.storage.from(bucket).list(cleanPrefix, {
        limit: safeLimit,
        sortBy: { column: "name", order: "asc" },
      });
      if (listErr) throw listErr;
      return new Response(JSON.stringify({ success: true, files: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-file") {
      const { bucket, paths, filename } = body as {
        bucket?: string;
        paths?: string[];
        filename?: string;
      };
      const rawPaths = Array.isArray(paths) ? paths : filename ? [filename] : [];
      const cleanPaths = rawPaths
        .map((p) => String(p).replace(/^\/+/, ""))
        .filter((p) => p && !p.includes(".."));
      if (!bucket || typeof bucket !== "string" || cleanPaths.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "bucket and valid paths required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: delErr } = await supabase.storage.from(bucket).remove(cleanPaths);
      if (delErr) throw delErr;
      return new Response(JSON.stringify({ success: true, deleted: cleanPaths }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ai-generate-seo") {
      const { id } = body;
      if (!id) return new Response(JSON.stringify({ success: false, error: "id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { data: prod, error: e1 } = await supabase.from("products").select("name, description, brand").eq("id", id).single();
      if (e1) throw e1;
      if (!prod) return new Response(JSON.stringify({ success: false, error: "Product not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const prompt = `Generate SEO metadata. Return ONLY a JSON object (no markdown, no explanation):

Product: ${prod.name}
Brand: ${prod.brand || "N/A"}
Description: ${prod.description || "No description"}

JSON: {"seo_title":"<=60 chars","seo_description":"<=155 chars","seo_keywords":["k1","k2"],"tags":["t1","t2"]}`;
      try {
        const result = await chatComplete([{ role: "user", content: prompt }], { maxTokens: 300 });
        const parsed = JSON.parse(result);
        const { data, error } = await supabase.from("products")
          .update({ seo_title: parsed.seo_title, seo_description: parsed.seo_description,
            seo_keywords: parsed.seo_keywords, tags: parsed.tags })
          .eq("id", id).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, seo: parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: String(e) }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "update-site-info") {
      const { entries } = body;
      if (!Array.isArray(entries) || !entries.length) return new Response(JSON.stringify({ success: false, error: "entries required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      for (const entry of entries) {
        if (!entry.section || !entry.key) return new Response(JSON.stringify({ success: false, error: "section and key required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
        const { error } = await supabase.from("site_info").upsert({
          section: entry.section, key: entry.key, value: entry.value,
          updated_at: new Date().toISOString(),
        }, { onConflict: "section,key" });
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Admin settings (writes to admin_settings — token from body) ──

    if (action === "update-admin-settings") {
      const entries = body.entries as Array<{ key: string; value: string }>;
      if (!Array.isArray(entries) || !entries.length) {
        return new Response(JSON.stringify({ success: false, error: "entries required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      for (const entry of entries) {
        if (!entry.key) {
          return new Response(JSON.stringify({ success: false, error: "key required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: existing } = await supabase
          .from("admin_settings")
          .select("id")
          .eq("key", entry.key)
          .maybeSingle();
        if (existing) {
          const { error } = await supabase
            .from("admin_settings")
            .update({ value: entry.value })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("admin_settings").insert({ key: entry.key, value: entry.value });
          if (error) throw error;
        }
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save-site-content") {
      const { content, section } = body;
      if (!content || !section) {
        return new Response(JSON.stringify({ success: false, error: "content and section required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("site_info").upsert({
        section, key: "content", value: JSON.stringify(content),
        updated_at: new Date().toISOString(),
      }, { onConflict: "section,key" });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate-seo") {
      const { topic, language = "en" } = body;
      if (!topic) {
        return new Response(JSON.stringify({ success: false, error: "topic required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      try {
        const seoContent = await chatComplete([{ role: "user", content: `Create SEO content for: ${topic}\n\nLanguage: ${language}\n\nRequirements:\n- SEO-friendly\n- Engaging and professional\n- Include relevant keywords\n- Appropriate length for the content type\n- Use proper formatting\n\nReturn only the content without any prefixes or explanations.` }], { maxTokens: 400 });
        return new Response(JSON.stringify({ success: true, content: seoContent }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: String(e) }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "test-ai-provider") {
      const { provider, key, model, baseUrl } = body as { provider?: string; key?: string; model?: string; baseUrl?: string };
      const start = performance.now();
      try {
        if (provider === "omniroute") {
          let endpointUrl = (typeof baseUrl === "string" && baseUrl.trim()) ? baseUrl.trim() : Deno.env.get("OMNIROUTE_BASE_URL") || "";
          let apiKey = (typeof key === "string" && key.trim()) ? key.trim() : Deno.env.get("OMNIROUTE_API_KEY") || "";
          if (!endpointUrl) {
            const { data } = await supabase.from("site_info").select("value").eq("section", "ai").eq("key", "omniroute_base_url").maybeSingle();
            if (data?.value) endpointUrl = data.value.trim();
          }
          if (!apiKey) {
            const { data } = await supabase.from("site_info").select("value").eq("section", "ai").eq("key", "omniroute_api_key").maybeSingle();
            if (data?.value) apiKey = data.value.trim();
          }
          if (!endpointUrl) throw new Error("No OmniRoute Base URL provided or configured");
          const cleanBase = endpointUrl.replace(/\/+$/, "");
          const targetUrl = cleanBase.endsWith("/chat/completions")
            ? cleanBase
            : cleanBase.endsWith("/v1")
            ? `${cleanBase}/chat/completions`
            : `${cleanBase}/v1/chat/completions`;
          const m = (typeof model === "string" && model.trim()) ? model.trim() : "auto/best-free";
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
          const res = await fetch(targetUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model: m,
              messages: [{ role: "user", content: "Reply with OK" }],
              max_tokens: 10,
            }),
            signal: AbortSignal.timeout(6000),
          });
          const text = await res.text();
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 160)}`);
          return new Response(JSON.stringify({
            success: true, provider, model: m, latencyMs: Math.round(performance.now() - start),
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (provider === "gemini") {
          let apiKey = (typeof key === "string" && key.trim()) ? key.trim() : Deno.env.get("GEMINI_API_KEY");
          if (!apiKey) {
            const { data } = await supabase.from("site_info").select("value").eq("section", "ai").eq("key", "gemini_api_key").maybeSingle();
            if (data?.value) apiKey = data.value.trim();
          }
          if (!apiKey) throw new Error("No Gemini API Key provided or configured");
          const m = (typeof model === "string" && model.trim()) ? model.trim() : "gemini-1.5-flash";
          const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: m,
              messages: [{ role: "user", content: "Reply with OK" }],
              max_tokens: 10,
            }),
          });
          const text = await res.text();
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 160)}`);
          return new Response(JSON.stringify({
            success: true, provider, model: m, latencyMs: Math.round(performance.now() - start),
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (provider === "groq") {
          let apiKey = (typeof key === "string" && key.trim()) ? key.trim() : Deno.env.get("GROQ_API_KEY");
          if (!apiKey) {
            const { data } = await supabase.from("site_info").select("value").eq("section", "ai").eq("key", "groq_api_key").maybeSingle();
            if (data?.value) apiKey = data.value.trim();
          }
          if (!apiKey) throw new Error("No Groq API Key provided or configured");
          const m = (typeof model === "string" && model.trim()) ? model.trim() : "llama-3.3-70b-versatile";
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: m,
              messages: [{ role: "user", content: "Reply with OK" }],
              max_tokens: 10,
            }),
          });
          const text = await res.text();
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 160)}`);
          return new Response(JSON.stringify({
            success: true, provider, model: m, latencyMs: Math.round(performance.now() - start),
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (provider === "openrouter") {
          let apiKey = (typeof key === "string" && key.trim()) ? key.trim() : Deno.env.get("OPENROUTER_API_KEY");
          if (!apiKey) {
            const { data } = await supabase.from("site_info").select("value").eq("section", "ai").eq("key", "openrouter_api_key").maybeSingle();
            if (data?.value) apiKey = data.value.trim();
          }
          if (!apiKey) throw new Error("No OpenRouter API Key provided or configured");
          const m = (typeof model === "string" && model.trim()) ? model.trim() : "google/gemini-2.0-flash-exp:free";
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "HTTP-Referer": "https://azkasmart.com" },
            body: JSON.stringify({
              model: m,
              messages: [{ role: "user", content: "Reply with OK" }],
              max_tokens: 10,
            }),
          });
          const text = await res.text();
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 160)}`);
          return new Response(JSON.stringify({
            success: true, provider, model: m, latencyMs: Math.round(performance.now() - start),
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (provider === "huggingface") {
          let apiKey = (typeof key === "string" && key.trim()) ? key.trim() : Deno.env.get("HUGGINGFACE_API_KEY");
          if (!apiKey) {
            const { data } = await supabase.from("site_info").select("value").eq("section", "ai").eq("key", "huggingface_api_key").maybeSingle();
            if (data?.value) apiKey = data.value.trim();
          }
          if (!apiKey) throw new Error("No Hugging Face Token provided or configured");
          const m = (typeof model === "string" && model.trim()) ? model.trim() : "meta-llama/Llama-3.1-8B-Instruct";
          const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: m,
              messages: [{ role: "user", content: "Reply with OK" }],
              max_tokens: 10,
            }),
          });
          const text = await res.text();
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 160)}`);
          return new Response(JSON.stringify({
            success: true, provider, model: m, latencyMs: Math.round(performance.now() - start),
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        if (provider === "pollinations") {
          const res = await fetch("https://text.pollinations.ai/openai?referrer=azkasmart.com", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "openai-fast",
              messages: [{ role: "user", content: "Reply with OK" }],
              max_tokens: 10,
            }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return new Response(JSON.stringify({
            success: true, provider, model: "openai-fast", latencyMs: Math.round(performance.now() - start),
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        throw new Error("Invalid provider");
      } catch (err: any) {
        return new Response(JSON.stringify({
          success: false, provider, error: err?.message || String(err), latencyMs: Math.round(performance.now() - start),
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ─── Orders CRUD ────────────────────────────────────────────────

    if (action === "list-orders") {
      const { data, error } = await supabase
        .from("orders")
        .select("id, email, total, status, created_at, shipping_address, stripe_session_id")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list-order-items") {
      const { orderId } = body;
      const { data, error } = await supabase
        .from("order_items")
        .select("id, product_name, quantity, price")
        .eq("order_id", orderId)
        .order("id");
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-order-status") {
      const { id, status, sendNotification = true, note, trackingNumber, trackingCarrier, forceResend } = body;

      const { data: currentOrder, error: fetchErr } = await supabase
        .from("orders")
        .select("id, status, email, total, shipping_address")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr || !currentOrder) {
        throw new Error("Order not found");
      }

      const oldStatus = currentOrder.status;

      const { error: updateErr } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (updateErr) throw updateErr;

      let notification: any = null;
      if (sendNotification && currentOrder.email && (oldStatus !== status || forceResend)) {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
          const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
          if (supabaseUrl && serviceRoleKey) {
            const notifyRes = await fetch(`${supabaseUrl}/functions/v1/send-order-notification`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${serviceRoleKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                orderId: id,
                action: "status_update",
                status,
                oldStatus,
                note,
                trackingNumber,
                trackingCarrier,
                forceResend: Boolean(forceResend),
              }),
            });
            if (notifyRes.ok) {
              notification = await notifyRes.json().catch(() => null);
            } else {
              console.warn("send-order-notification returned status:", notifyRes.status);
            }
          }
        } catch (notifyErr) {
          console.warn("Failed to invoke send-order-notification:", notifyErr);
        }
      }

      return new Response(JSON.stringify({ success: true, oldStatus, newStatus: status, notification }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-order") {
      const { id } = body;
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── XPay Payment Gateway Settings (secrets stored server-side only) ──

    if (action === "get-xpay-settings") {
      const pub = await readXPayPublicConfig(supabase);
      const [skTest, skLive, whSecrets] = await Promise.all([
        resolveXPaySecretKey(supabase, "test"),
        resolveXPaySecretKey(supabase, "live"),
        resolveXPayWebhookSecrets(supabase),
      ]);

      return new Response(
        JSON.stringify({
          success: true,
          settings: {
            enabled: pub.enabled,
            mode: pub.mode,
            publishableKeyTest: pub.publishableKeyTest,
            publishableKeyLive: pub.publishableKeyLive,
            cardFeePercent: String(pub.cardFeePercent),
            cardFeeFixed: String(pub.cardFeeFixed),
            hasSecretKeyTest: Boolean(skTest),
            hasSecretKeyLive: Boolean(skLive),
            hasWebhookSecretTest: Boolean(whSecrets.test),
            hasWebhookSecretLive: Boolean(whSecrets.live),
            secretKeyMaskTest: maskSecretHint(skTest),
            secretKeyMaskLive: maskSecretHint(skLive),
            webhookSecretMaskTest: maskSecretHint(whSecrets.test),
            webhookSecretMaskLive: maskSecretHint(whSecrets.live),
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "save-xpay-settings") {
      const mode = normalizeXPayMode(body.mode);
      const enabled = Boolean(body.enabled);
      const publishableKeyTest = typeof body.publishableKeyTest === "string" ? body.publishableKeyTest.trim() : "";
      const publishableKeyLive = typeof body.publishableKeyLive === "string" ? body.publishableKeyLive.trim() : "";
      const secretKeyTest = typeof body.secretKeyTest === "string" ? body.secretKeyTest.trim() : "";
      const secretKeyLive = typeof body.secretKeyLive === "string" ? body.secretKeyLive.trim() : "";
      const webhookSecretTest = typeof body.webhookSecretTest === "string" ? body.webhookSecretTest.trim() : "";
      const webhookSecretLive = typeof body.webhookSecretLive === "string" ? body.webhookSecretLive.trim() : "";
      const feePctNum = Math.max(0, Math.min(20, Number(body.cardFeePercent) || 0));
      const feeFixedNum = Math.max(0, Math.min(1000, Number(body.cardFeeFixed) || 0));

      const validations: Array<{ ok: boolean; error?: string }> = [];
      if (publishableKeyTest) validations.push(validateKeyForMode("publishable", "test", publishableKeyTest));
      if (publishableKeyLive) validations.push(validateKeyForMode("publishable", "live", publishableKeyLive));
      if (secretKeyTest) validations.push(validateKeyForMode("secret", "test", secretKeyTest));
      if (secretKeyLive) validations.push(validateKeyForMode("secret", "live", secretKeyLive));
      if (webhookSecretTest) validations.push(validateKeyForMode("webhook", "test", webhookSecretTest));
      if (webhookSecretLive) validations.push(validateKeyForMode("webhook", "live", webhookSecretLive));

      const invalid = validations.find((v) => !v.ok);
      if (invalid) {
        return new Response(
          JSON.stringify({ success: false, error: invalid.error || "Invalid XPay key format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const nowIso = new Date().toISOString();
      const upsertSecret = async (key: string, value: string, shouldClear: boolean) => {
        if (shouldClear) {
          const { error } = await supabase.from("payment_secrets").delete().eq("key", key);
          if (error) throw error;
        } else if (value) {
          const { error } = await supabase
            .from("payment_secrets")
            .upsert({ key, value, updated_at: nowIso }, { onConflict: "key" });
          if (error) throw error;
        }
      };

      await upsertSecret("xpay_secret_key_test", secretKeyTest, Boolean(body.clearSecretKeyTest));
      await upsertSecret("xpay_secret_key_live", secretKeyLive, Boolean(body.clearSecretKeyLive));
      await upsertSecret("xpay_webhook_secret_test", webhookSecretTest, Boolean(body.clearWebhookSecretTest));
      await upsertSecret("xpay_webhook_secret_live", webhookSecretLive, Boolean(body.clearWebhookSecretLive));

      const [skTestAfter, skLiveAfter, whAfter] = await Promise.all([
        resolveXPaySecretKey(supabase, "test"),
        resolveXPaySecretKey(supabase, "live"),
        resolveXPayWebhookSecrets(supabase),
      ]);

      const activePk = mode === "live" ? publishableKeyLive : publishableKeyTest;
      const activeHasSk = mode === "live" ? Boolean(skLiveAfter) : Boolean(skTestAfter);

      const siteEntries = [
        { section: "payment", key: "xpay_enabled", value: String(enabled), updated_at: nowIso },
        { section: "payment", key: "xpay_mode", value: mode, updated_at: nowIso },
        { section: "payment", key: "xpay_publishable_key_test", value: publishableKeyTest, updated_at: nowIso },
        { section: "payment", key: "xpay_publishable_key_live", value: publishableKeyLive, updated_at: nowIso },
        { section: "payment", key: "xpay_publishable_key", value: activePk, updated_at: nowIso },
        { section: "payment", key: "xpay_secret_configured", value: String(activeHasSk), updated_at: nowIso },
        { section: "payment", key: "xpay_card_fee_percent", value: String(feePctNum), updated_at: nowIso },
        { section: "payment", key: "xpay_card_fee_fixed", value: String(feeFixedNum), updated_at: nowIso },
      ];

      for (const entry of siteEntries) {
        const { error } = await supabase.from("site_info").upsert(entry, { onConflict: "section,key" });
        if (error) throw error;
      }

      // Clean up any legacy paysky_* settings
      await supabase.from("site_info").delete().eq("section", "payment").like("key", "paysky_%");

      return new Response(
        JSON.stringify({
          success: true,
          settings: {
            enabled,
            mode,
            publishableKeyTest,
            publishableKeyLive,
            cardFeePercent: String(feePctNum),
            cardFeeFixed: String(feeFixedNum),
            hasSecretKeyTest: Boolean(skTestAfter),
            hasSecretKeyLive: Boolean(skLiveAfter),
            hasWebhookSecretTest: Boolean(whAfter.test),
            hasWebhookSecretLive: Boolean(whAfter.live),
            secretKeyMaskTest: maskSecretHint(skTestAfter),
            secretKeyMaskLive: maskSecretHint(skLiveAfter),
            webhookSecretMaskTest: maskSecretHint(whAfter.test),
            webhookSecretMaskLive: maskSecretHint(whAfter.live),
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "test-xpay-connection") {
      const targetMode = body.mode ? normalizeXPayMode(body.mode) : (await readXPayPublicConfig(supabase)).mode;
      const secretKey = await resolveXPaySecretKey(supabase, targetMode);
      if (!secretKey) {
        return new Response(
          JSON.stringify({
            success: false,
            mode: targetMode,
            error: `No ${targetMode} secret key configured on the server yet.`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const apiRes = await fetch(`${XPAY_API_BASE}/account`, {
        method: "GET",
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const apiJson: Record<string, any> = await apiRes.json().catch(() => ({}));

      if (!apiRes.ok) {
        return new Response(
          JSON.stringify({
            success: false,
            mode: targetMode,
            error: typeof apiJson?.message === "string" ? apiJson.message : `XPay rejected credentials (HTTP ${apiRes.status})`,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          mode: targetMode,
          livemode: Boolean(apiJson?.livemode),
          merchantName: apiJson?.displayName || apiJson?.businessName || apiJson?.name || apiJson?.id || "Connected",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list-categories") {
      const { data: cats, error: catErr } = await supabase
        .from("categories")
        .select("id, name, slug, description, image_url, sort_order, is_active, created_at")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (catErr) throw catErr;

      const counts = new Map<string, number>();
      let uncategorizedCount = 0;
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data: prods, error: prodErr } = await supabase
          .from("products")
          .select("id, category_id")
          .range(from, from + pageSize - 1);
        if (prodErr) throw prodErr;
        for (const p of prods ?? []) {
          if (p.category_id) {
            counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
          } else {
            uncategorizedCount++;
          }
        }
        if (!prods || prods.length < pageSize) break;
      }

      const enriched = (cats ?? []).map((c: any) => ({
        ...c,
        sort_order: typeof c.sort_order === "number" ? c.sort_order : 0,
        is_active: c.is_active !== false,
        product_count: counts.get(c.id) ?? 0,
      }));

      return new Response(
        JSON.stringify({ success: true, categories: enriched, uncategorized_count: uncategorizedCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create-category") {
      const rawName = typeof body.name === "string" ? body.name.trim() : "";
      if (!rawName) {
        return new Response(JSON.stringify({ success: false, error: "Category name is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const rawSlug = typeof body.slug === "string" && body.slug.trim() ? body.slug.trim() : rawName;
      const slug = rawSlug
        .toLowerCase()
        .replace(/&/g, " ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      if (!slug || slug === "uncategorized") {
        return new Response(JSON.stringify({ success: false, error: "Invalid or reserved category slug" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existingSlug } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (existingSlug) {
        return new Response(
          JSON.stringify({ success: false, error: `A category with slug "${slug}" already exists.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let nextOrder = typeof body.sort_order === "number" && Number.isFinite(body.sort_order)
        ? Math.round(body.sort_order)
        : 0;
      if (!nextOrder) {
        const { data: allCats } = await supabase.from("categories").select("sort_order");
        const maxOrder = (allCats ?? []).reduce((acc: number, row: any) => {
          const val = typeof row.sort_order === "number" && row.sort_order < 900 ? row.sort_order : 0;
          return Math.max(acc, val);
        }, 0);
        nextOrder = maxOrder + 1;
      }

      const { data, error } = await supabase
        .from("categories")
        .insert({
          name: rawName,
          slug,
          sort_order: nextOrder,
          is_active: body.is_active !== false,
        })
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-category") {
      const id = typeof body.id === "string" ? body.id.trim() : "";
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "Category id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const updates: Record<string, unknown> = {};
      if ("name" in body) {
        const name = typeof body.name === "string" ? body.name.trim() : "";
        if (!name) {
          return new Response(JSON.stringify({ success: false, error: "Category name cannot be empty" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        updates.name = name;
      }
      if ("slug" in body && typeof body.slug === "string") {
        const nextSlug = body.slug
          .toLowerCase()
          .replace(/&/g, " ")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        if (!nextSlug || nextSlug === "uncategorized") {
          return new Response(JSON.stringify({ success: false, error: "Invalid or reserved category slug" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: dup } = await supabase
          .from("categories")
          .select("id")
          .eq("slug", nextSlug)
          .neq("id", id)
          .maybeSingle();
        if (dup) {
          return new Response(
            JSON.stringify({ success: false, error: `Another category already uses slug "${nextSlug}".` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        updates.slug = nextSlug;
      }
      if ("sort_order" in body && typeof body.sort_order === "number" && Number.isFinite(body.sort_order)) {
        updates.sort_order = Math.round(body.sort_order);
      }
      if ("is_active" in body && typeof body.is_active === "boolean") {
        updates.is_active = body.is_active;
      }

      if (Object.keys(updates).length === 0) {
        return new Response(JSON.stringify({ success: false, error: "No valid category updates provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reorder-categories") {
      const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds.map((x) => String(x)).filter(Boolean) : [];
      if (orderedIds.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "orderedIds array is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      for (let idx = 0; idx < orderedIds.length; idx++) {
        const { error } = await supabase
          .from("categories")
          .update({ sort_order: idx + 1 })
          .eq("id", orderedIds[idx]);
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-category") {
      const id = typeof body.id === "string" ? body.id.trim() : "";
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "Category id is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { count, error: countErr } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id);
      if (countErr) throw countErr;
      if ((count ?? 0) > 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Cannot delete this category because ${count} product(s) are still assigned to it. Move those products to another category first.`,
            productCount: count,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { error: delErr } = await supabase.from("categories").delete().eq("id", id);
      if (delErr) throw delErr;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-assign-category-by-slug") {
      const rawSlugs = Array.isArray(body.slugs) ? body.slugs : [];
      const tokens: string[] = [];
      const seenTokens = new Set<string>();
      for (const s of rawSlugs) {
        const trimmed = String(s || "").trim();
        if (!trimmed) continue;
        const lower = trimmed.toLowerCase();
        if (seenTokens.has(lower)) continue;
        seenTokens.add(lower);
        tokens.push(trimmed);
      }
      if (tokens.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "At least one product slug is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const categoryId =
        typeof body.category_id === "string" && body.category_id.trim() && body.category_id !== "none"
          ? body.category_id.trim()
          : null;
      if (categoryId) {
        const { data: catExists } = await supabase
          .from("categories")
          .select("id")
          .eq("id", categoryId)
          .maybeSingle();
        if (!catExists) {
          return new Response(JSON.stringify({ success: false, error: "Selected category was not found" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const slugMap = new Map<string, { id: string; slug: string; name: string }>();
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data: prods, error: prodErr } = await supabase
          .from("products")
          .select("id, slug, name")
          .range(from, from + pageSize - 1);
        if (prodErr) throw prodErr;
        for (const p of prods ?? []) {
          if (p.slug) slugMap.set(String(p.slug).trim().toLowerCase(), p);
        }
        if (!prods || prods.length < pageSize) break;
      }

      const matchedIds: string[] = [];
      const matchedSlugs: string[] = [];
      const unmatchedSlugs: string[] = [];
      for (const token of tokens) {
        const found = slugMap.get(token.toLowerCase());
        if (found) {
          matchedIds.push(found.id);
          matchedSlugs.push(found.slug);
        } else {
          unmatchedSlugs.push(token);
        }
      }

      const BATCH = 40;
      const nowIso = new Date().toISOString();
      for (let i = 0; i < matchedIds.length; i += BATCH) {
        const chunk = matchedIds.slice(i, i + BATCH);
        const { error: upErr } = await supabase
          .from("products")
          .update({ category_id: categoryId, updated_at: nowIso })
          .in("id", chunk);
        if (upErr) throw upErr;
      }

      return new Response(
        JSON.stringify({
          success: true,
          updatedCount: matchedIds.length,
          matchedSlugs,
          unmatchedSlugs,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Admin write error:", error);
    const errMsg =
      error instanceof Error
        ? error.message
        : typeof error?.message === "string" && error.message
        ? error.message
        : "Server error";
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
