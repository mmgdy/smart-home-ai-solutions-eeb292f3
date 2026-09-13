import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { chatCompleteRaw, chatComplete } from "../_shared/ai.ts";

async function verifyAdminToken(supabase: any, token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = atob(token);
    const [adminId] = decoded.split(":");
    const { data } = await supabase.from("admin_settings").select("value")
      .eq("key", `admin_token_${adminId}`).single();
    return !!data && data.value === token;
  } catch { return false; }
}

function detectSourceType(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("amazon.eg") || host.includes("amazon.com")) return "amazon";
    if (host.includes("noon.com")) return "noon";
    if (host.includes("jumia.com")) return "jumia";
    if (host.includes("btech.com")) return "btech";
    return "url";
  } catch { return "url"; }
}

function isListingPage(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    // Amazon search or category listing
    if (u.hostname.includes("amazon") && (path.startsWith("/s") || path.includes("/b?") || u.searchParams.has("k") || u.searchParams.has("rh"))) return true;
    if (u.hostname.includes("noon") && (path.includes("/search") || path.includes("/category") || path.includes("/c/"))) return true;
    if (u.hostname.includes("jumia") && (path.includes("/catalog") || path.includes("mlp-"))) return true;
    return false;
  } catch { return false; }
}

// Extract product links from a listing/search page HTML
function extractProductLinks(html: string, baseUrl: string, sourceType: string): string[] {
  const links: Set<string> = new Set();
  const base = new URL(baseUrl);

  if (sourceType === "amazon") {
    // Amazon ASINs in href patterns like /dp/ASIN or /gp/product/ASIN
    const asinPattern = /href="(\/(?:dp|gp\/product)\/([A-Z0-9]{10})[^"]*?)"/g;
    let m: RegExpExecArray | null;
    while ((m = asinPattern.exec(html)) !== null) {
      const path = m[1].split("?")[0].split("#")[0];
      links.add(`https://${base.hostname}${path}`);
      if (links.size >= 20) break;
    }
  } else if (sourceType === "noon") {
    // Noon product links
    const noonPattern = /href="(\/egypt-en\/[^"]+\/p\/[^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = noonPattern.exec(html)) !== null) {
      links.add(`https://www.noon.com${m[1]}`);
      if (links.size >= 20) break;
    }
  } else if (sourceType === "jumia") {
    const jumiaPattern = /href="(\/[^"]+\.html)"/g;
    let m: RegExpExecArray | null;
    while ((m = jumiaPattern.exec(html)) !== null) {
      if (m[1].includes("-") && !m[1].includes("catalog")) {
        links.add(`https://www.jumia.com.eg${m[1]}`);
        if (links.size >= 20) break;
      }
    }
  }

  return [...links].slice(0, 12);
}

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
  "Cache-Control": "no-cache",
};

async function fetchHtml(url: string): Promise<string> {
  const resp = await fetch(url, { headers: BROWSER_HEADERS, redirect: "follow" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return resp.text();
}

function extractImagesFromHtml(html: string): string[] {
  const images: string[] = [];
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogMatch) images.push(ogMatch[1]);
  const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (twMatch && !images.includes(twMatch[1])) images.push(twMatch[1]);
  // JSON-LD
  const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    try {
      const ld = JSON.parse(m[1]);
      const items = Array.isArray(ld) ? ld : [ld];
      for (const it of items) {
        const img = it.image;
        if (typeof img === "string" && !images.includes(img)) images.push(img);
        else if (Array.isArray(img)) images.push(...img.filter((x: any) => typeof x === "string" && !images.includes(x)));
        else if (img?.url && !images.includes(img.url)) images.push(img.url);
      }
    } catch {}
  }
  return images.filter((u) => u && u.startsWith("http")).slice(0, 5);
}

async function scrapeProductFromUrl(url: string): Promise<any | null> {
  try {
    const html = await fetchHtml(url);
    const images = extractImagesFromHtml(html);
    const truncated = html.substring(0, 28000);

    let productData: any = null;

    // Try tool-calling first
    try {
      const aiData = await chatCompleteRaw({
        messages: [
          {
            role: "system",
            content: `Extract product info from HTML. Return JSON with: name (string), description (string ≤400 chars), price (EGP number), brand (string|null), protocol (string|null, e.g. WiFi/Zigbee/Z-Wave), category (string), specifications (object). If currency is USD multiply price by 50. Return valid JSON only.`,
          },
          { role: "user", content: `URL: ${url}\n\nHTML:\n${truncated}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_product",
            description: "Extract product data",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                price: { type: "number" },
                brand: { type: "string" },
                protocol: { type: "string" },
                category: { type: "string" },
                specifications: { type: "object" },
              },
              required: ["name", "price"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_product" } },
      });
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) productData = JSON.parse(toolCall.function.arguments);
    } catch {
      // Fallback to plain text completion
      const text = await chatComplete([
        { role: "system", content: "Extract product info from HTML. Return ONLY a JSON object: {name, description, price (EGP), brand, protocol, category}. No markdown." },
        { role: "user", content: `URL: ${url}\n\nHTML:\n${truncated}` },
      ]);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) productData = JSON.parse(jsonMatch[0]);
    }

    if (!productData?.name || !productData?.price) return null;

    return {
      ...productData,
      image_url: images[0] || null,
      images: images,
      source_url: url,
    };
  } catch (e) {
    console.error("Scrape error for", url, String(e).slice(0, 100));
    return null;
  }
}

async function upsertProduct(supabase: any, productData: any, catMap: Map<string, string>): Promise<"added" | "updated" | "skipped" | "error"> {
  try {
    const slug = (productData.name as string)
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

    const { data: existing } = await supabase.from("products").select("id, price")
      .or(`slug.eq.${slug},name.ilike.%${(productData.name as string).slice(0, 30).replace(/%/g, "")}%`)
      .limit(1);

    const catId = findCategoryId(productData.category || "", catMap);
    const cleanImage = sanitizeUrl(productData.image_url);
    const cleanImages = (productData.images || []).map(sanitizeUrl).filter(Boolean);

    if (existing?.length > 0) {
      const curr = existing[0];
      const newPrice = Math.round(productData.price);
      if (newPrice > 0 && Math.abs(curr.price - newPrice) / curr.price > 0.05) {
        await supabase.from("products").update({
          price: newPrice,
          original_price: Math.round(newPrice * 1.15),
          updated_at: new Date().toISOString(),
          ...(cleanImage ? { image_url: cleanImage, images: cleanImages } : {}),
        }).eq("id", curr.id);
        return "updated";
      }
      return "skipped";
    }

    const { error } = await supabase.from("products").insert({
      name: productData.name,
      slug,
      brand: productData.brand || null,
      price: Math.round(productData.price),
      original_price: Math.round(productData.price * 1.15),
      description: productData.description || null,
      category_id: catId,
      protocol: productData.protocol || null,
      specifications: productData.specifications || null,
      image_url: cleanImage,
      images: cleanImages,
      stock: 15,
      featured: false,
      is_published: true,
    });
    return error ? "error" : "added";
  } catch { return "error"; }
}

function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith("https://")) return null;
  if (url.length > 600 || url.includes("example.com")) return null;
  return url;
}

function findCategoryId(name: string, catMap: Map<string, string>): string | null {
  if (!name) return null;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return catMap.get(slug) || catMap.get(name.toLowerCase()) || null;
}

async function buildCategoryMap(supabase: any): Promise<Map<string, string>> {
  const { data } = await supabase.from("categories").select("id, name, slug");
  const map = new Map<string, string>();
  for (const c of data || []) {
    map.set(c.slug, c.id);
    map.set(c.name.toLowerCase(), c.id);
    map.set(c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), c.id);
  }
  return map;
}

// ─── Main Handler ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json().catch(() => ({}));
    const { action, token, source_id, url, name } = body;

    // Verify admin
    if (!(await verifyAdminToken(supabase, token))) return json({ success: false, error: "Unauthorized" }, 401);

    const catMap = await buildCategoryMap(supabase);

    // ── List sources ────────────────────────────────────────────────────────
    if (action === "list-sources") {
      const { data, error } = await supabase.from("sync_sources")
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return json({ success: true, sources: data });
    }

    // ── Add source ──────────────────────────────────────────────────────────
    if (action === "add-source") {
      if (!url) return json({ success: false, error: "URL is required" }, 400);
      const sourceType = detectSourceType(url);
      const sourceName = name || (new URL(url).hostname.replace("www.", ""));
      const { data, error } = await supabase.from("sync_sources").insert({
        url: url.trim(),
        name: sourceName,
        source_type: sourceType,
      }).select().single();
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, source: data });
    }

    // ── Delete source ───────────────────────────────────────────────────────
    if (action === "delete-source") {
      if (!source_id) return json({ success: false, error: "source_id required" }, 400);
      const { error } = await supabase.from("sync_sources").delete().eq("id", source_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ── Toggle source active/inactive ───────────────────────────────────────
    if (action === "toggle-source") {
      if (!source_id) return json({ success: false, error: "source_id required" }, 400);
      const { data: src } = await supabase.from("sync_sources").select("is_active").eq("id", source_id).single();
      const { error } = await supabase.from("sync_sources").update({ is_active: !src?.is_active }).eq("id", source_id);
      if (error) throw error;
      return json({ success: true, is_active: !src?.is_active });
    }

    // ── Sync a single source ────────────────────────────────────────────────
    if (action === "sync-source") {
      if (!source_id) return json({ success: false, error: "source_id required" }, 400);
      const { data: src } = await supabase.from("sync_sources").select("*").eq("id", source_id).single();
      if (!src) return json({ success: false, error: "Source not found" }, 404);

      // Mark as syncing
      await supabase.from("sync_sources").update({ sync_status: "syncing", updated_at: new Date().toISOString() }).eq("id", source_id);

      const results: any[] = [];
      let productsFound = 0;
      let productsAdded = 0;

      try {
        const html = await fetchHtml(src.url);
        const sourceType = src.source_type !== "auto" ? src.source_type : detectSourceType(src.url);

        if (isListingPage(src.url)) {
          // Extract product links from listing page
          const links = extractProductLinks(html, src.url, sourceType);
          productsFound = links.length;

          for (const link of links) {
            const product = await scrapeProductFromUrl(link);
            if (product) {
              const status = await upsertProduct(supabase, product, catMap);
              results.push({ name: product.name, url: link, status });
              if (status === "added") productsAdded++;
            }
            await new Promise((r) => setTimeout(r, 500)); // Rate limit between requests
          }
        } else {
          // Single product page
          const product = await scrapeProductFromUrl(src.url);
          productsFound = product ? 1 : 0;
          if (product) {
            const status = await upsertProduct(supabase, product, catMap);
            results.push({ name: product.name, url: src.url, status });
            if (status === "added") productsAdded++;
          }
        }

        await supabase.from("sync_sources").update({
          sync_status: "success",
          sync_message: `Found ${productsFound} product(s), added/updated ${productsAdded}`,
          last_synced_at: new Date().toISOString(),
          products_found: productsFound,
          products_added: productsAdded,
          updated_at: new Date().toISOString(),
        }).eq("id", source_id);

      } catch (err: any) {
        await supabase.from("sync_sources").update({
          sync_status: "error",
          sync_message: String(err).slice(0, 200),
          updated_at: new Date().toISOString(),
        }).eq("id", source_id);
        return json({ success: false, error: String(err).slice(0, 200), results });
      }

      return json({ success: true, results, productsFound, productsAdded });
    }

    // ── Sync all active sources ─────────────────────────────────────────────
    if (action === "sync-all") {
      const { data: sources } = await supabase.from("sync_sources")
        .select("id").eq("is_active", true);
      const allResults: any[] = [];
      for (const src of sources || []) {
        // Re-invoke sync-source for each
        const r = await (async () => {
          const { data: s } = await supabase.from("sync_sources").select("*").eq("id", src.id).single();
          if (!s) return null;
          await supabase.from("sync_sources").update({ sync_status: "syncing" }).eq("id", src.id);
          try {
            const html = await fetchHtml(s.url);
            const st = s.source_type !== "auto" ? s.source_type : detectSourceType(s.url);
            let added = 0;
            if (isListingPage(s.url)) {
              const links = extractProductLinks(html, s.url, st);
              for (const link of links) {
                const p = await scrapeProductFromUrl(link);
                if (p) { const status = await upsertProduct(supabase, p, catMap); if (status === "added") added++; }
                await new Promise(r => setTimeout(r, 400));
              }
              await supabase.from("sync_sources").update({ sync_status: "success", last_synced_at: new Date().toISOString(), products_added: added }).eq("id", src.id);
              return { source: s.name, added, status: "success" };
            } else {
              const p = await scrapeProductFromUrl(s.url);
              if (p) { const status = await upsertProduct(supabase, p, catMap); if (status === "added") added++; }
              await supabase.from("sync_sources").update({ sync_status: "success", last_synced_at: new Date().toISOString(), products_added: added }).eq("id", src.id);
              return { source: s.name, added, status: "success" };
            }
          } catch (e) {
            await supabase.from("sync_sources").update({ sync_status: "error", sync_message: String(e).slice(0, 200) }).eq("id", src.id);
            return { source: s?.name, status: "error", error: String(e).slice(0, 100) };
          }
        })();
        if (r) allResults.push(r);
        await new Promise(res => setTimeout(res, 1000));
      }
      return json({ success: true, results: allResults });
    }

    return json({ success: false, error: "Unknown action" }, 400);
  } catch (err) {
    console.error("sync-from-sources error:", err);
    return json({ success: false, error: String(err).slice(0, 200) }, 500);
  }
});
