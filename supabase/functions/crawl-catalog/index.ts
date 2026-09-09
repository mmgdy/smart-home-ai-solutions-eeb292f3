import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { chatCompleteRaw } from "../_shared/ai.ts";

async function verifyAdminToken(supabase: any, token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = atob(token);
    const [adminId] = decoded.split(":");
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

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "item";

const normalizeArray = (value: any): any[] => Array.isArray(value) ? value : [];

function normalizeSearchHits(payload: any): any[] {
  const candidates = [
    payload?.data, payload?.data?.web, payload?.data?.results, payload?.data?.data,
    payload?.web, payload?.web?.results, payload?.results, payload?.organic,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === "object") {
      const nested = Object.values(candidate).find((v) => Array.isArray(v));
      if (Array.isArray(nested)) return nested;
    }
  }
  return [];
}

const hitUrl = (hit: any) => hit?.url || hit?.link || hit?.sourceURL || hit?.metadata?.sourceURL || "";
const hitText = (hit: any) => hit?.markdown || hit?.description || hit?.snippet || hit?.title || "";

const cleanImages = (...values: any[]): string[] => {
  const all = values.flatMap((value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  });
  return Array.from(new Set(all.filter((url) => typeof url === "string" && /^https?:\/\//i.test(url))));
};

const imageUrlsFromHtml = (html: string): string[] =>
  cleanImages(
    ...Array.from(html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/gi)).map((m) => m[1]),
    ...Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)).map((m) => m[1])
  ).slice(0, 8);

async function responseSnippet(resp: Response) {
  const text = await resp.text().catch(() => "");
  return text.substring(0, 240) || resp.statusText;
}

// Keyless DuckDuckGo HTML search
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const decodeDuckDuckGoUrl = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl, "https://duckduckgo.com");
    const uddg = parsed.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : parsed.toString();
  } catch {
    const match = rawUrl.match(/uddg=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : rawUrl;
  }
};

const decodeEntities = (value: string): string => {
  return value
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'").replace(/&#x2F;/g, "/");
};

const stripHtml = (value: string): string =>
  decodeEntities(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")).trim();

const searchDuckDuckGo = async (query: string): Promise<{ url: string; title: string; snippet: string }[]> => {
  try {
    const html = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": BROWSER_UA, "Accept-Language": "en-US,en;q=0.9" },
    });
    if (!html.ok) return [];
    const text = await html.text();
    const results: { url: string; title: string; snippet: string }[] = [];
    const blocks = text.split(/class=["'][^"']*result__body/i).slice(1);
    for (const block of blocks) {
      const linkMatch = block.match(/<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      if (!linkMatch) continue;
      const url = decodeDuckDuckGoUrl(linkMatch[1]);
      if (!/^https?:\/\//i.test(url)) continue;
      const title = stripHtml(linkMatch[2]);
      const snippetMatch = block.match(/class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
      results.push({ url, title, snippet: snippetMatch ? stripHtml(snippetMatch[1]) : "" });
      if (results.length >= 5) break;
    }
    return results;
  } catch {
    return [];
  }
};

async function mirrorImage(supabase: any, imageUrl: string, productId: string) {
  try {
const resp = await fetch(imageUrl, { headers: { "User-Agent": "Mozilla/5.0 AzkaSmartCatalogBot/1.0" } });
    if (!resp.ok) return imageUrl;
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return imageUrl;
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : contentType.includes("svg") ? "svg" : "jpg";
    const path = `refreshed/${productId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, await resp.blob(), { contentType, upsert: true });
    if (error) return imageUrl;
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  } catch {
    return imageUrl;
  }
}

async function extractProductWithAI(markdown: string, sourceUrl: string): Promise<any> {
  const truncated = markdown.substring(0, 18000);
  const data = await chatCompleteRaw({
    messages: [
      {
        role: "system",
        content: `Extract smart-home product data from global web pages. Use any reliable worldwide source in the content, not only Egyptian stores. Convert realistic current retail pricing to EGP using USD*50, EUR*55, GBP*64, SAR*13.5, AED*13.7, and add a realistic Egypt import/warranty margin when needed. Prefer official manufacturer/shop images and never invent URLs. If no clear product on page, set name to "" so caller can skip.`,
      },
      { role: "user", content: `URL: ${sourceUrl}\n\n${truncated}` },
    ],
    tools: [{
      type: "function",
      function: {
        name: "extract_product",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            price: { type: "number" },
            original_price: { type: "number" },
            brand: { type: "string" },
            image_url: { type: "string" },
            images: { type: "array", items: { type: "string" } },
            specifications: { type: "object" },
            protocol: { type: "string" },
            category: { type: "string" },
          },
          required: ["name"],
        },
      },
    }],
    tool_choice: { type: "function", function: { name: "extract_product" } },
  });
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;
  return JSON.parse(args);
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { rootUrl, token, maxProducts = 25, urlFilter = "", mode = "discover", batchSize = 3 } = body;

    if (!(await verifyAdminToken(supabase, token))) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ============= MODE: fix-existing =============
    if (mode === "fix-existing") {
      const { data: products } = await supabase
        .from("products")
        .select("id, name, brand, price, image_url")
        .order("updated_at", { ascending: true })
        .limit(batchSize);

      if (!products || products.length === 0) {
        return new Response(JSON.stringify({ success: true, results: [], processed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const results: any[] = [];
      const BATCH = 3;
      for (let i = 0; i < products.length; i += BATCH) {
        const slice = products.slice(i, i + BATCH);
        const batchResults = await Promise.all(slice.map(async (p) => {
          try {
            const query = `${p.brand || ""} ${p.name}`.trim();
            // 1) Keyless web search to find product pages
            const ddgHits = await searchDuckDuckGo(`${query} smart home product price image official store`);
            if (ddgHits.length === 0) return { id: p.id, name: p.name, success: false, error: "no search results" };

            const sourceUrl = ddgHits[0].url;

            // 2) Fetch the product page HTML
            let pageHtml = "";
            try {
              const pageResp = await fetch(sourceUrl, {
                headers: { "User-Agent": BROWSER_UA, "Accept": "text/html,application/xhtml+xml" },
              });
              if (pageResp.ok) pageHtml = await pageResp.text();
            } catch { /* ignore */ }

            // 3) Extract best image from page HTML metadata
            let bestImage: string | null = null;
            if (pageHtml) {
              const ogMatch = pageHtml.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
              if (ogMatch) bestImage = ogMatch[1];
              const twMatch = pageHtml.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
              if (twMatch && !bestImage) bestImage = twMatch[1];
            }

            // 4) AI extracts realistic EGP price + best image URL from the markdown
            const product = await extractProductWithAI(pageHtml || ddgHits[0].snippet || "", sourceUrl);
            if (!product) return { id: p.id, name: p.name, success: false, error: "AI no extract" };

            const newImages = cleanImages(bestImage, product.image_url, product.images, p.image_url);
            const newImage = newImages[0] || p.image_url;
            const newPrice = Number(product.price) > 0 ? Math.round(Number(product.price)) : null;
            const newOriginal = product.original_price ? Math.round(Number(product.original_price)) : null;

            const updates: Record<string, any> = { updated_at: new Date().toISOString() };
            if (newImage && newImage !== p.image_url) updates.image_url = newImage;
            if (newImages.length) updates.images = newImages.slice(0, 8);
            if (newPrice && newPrice !== Number(p.price)) updates.price = newPrice;
            if (newOriginal) updates.original_price = newOriginal;

            if (Object.keys(updates).length === 1) {
              return { id: p.id, name: p.name, success: false, error: "no changes detected" };
            }

            const { error } = await supabase.from("products").update(updates).eq("id", p.id);
            if (error) return { id: p.id, name: p.name, success: false, error: error.message };

            return {
              id: p.id, name: p.name, success: true,
              old_price: p.price, new_price: updates.price ?? p.price,
              image_updated: !!updates.image_url,
            };
          } catch (e) {
            return { id: p.id, name: p.name, success: false, error: e instanceof Error ? e.message : String(e) };
          }
        }));
        results.push(...batchResults);
      }

      return new Response(JSON.stringify({
        success: true, mode: "fix-existing", processed: results.length,
        updated: results.filter((r) => r.success).length, results,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 1: Keyless web search to discover product URLs
    const searchQuery = `${urlFilter || "product"} ${rootUrl}`.trim();
    const ddgHits = await searchDuckDuckGo(searchQuery);

    if (ddgHits.length === 0) {
      return new Response(JSON.stringify({
        success: false, error: "No product URLs found via keyless search. Try a more specific URL or different filter.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Filter to likely product pages
    const productLinks = ddgHits
      .filter((h) => /product|item|p\/|dp\/|shop/i.test(h.url))
      .slice(0, maxProducts);

    console.log(`Found ${productLinks.length} candidate product URLs`);

    if (productLinks.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "No product URLs found. Try a more specific URL or different filter.",
        discoveredLinks: ddgHits.slice(0, 20).map((h) => h.url),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 2: Scrape each in parallel batches
    const results: any[] = [];
    const BATCH = 5;
    for (let i = 0; i < productLinks.length; i += BATCH) {
      const batch = productLinks.slice(i, i + BATCH);
      const batchResults = await Promise.all(batch.map(async (purl) => {
        try {
          const scrapeResp = await fetch(purl.url, {
            headers: { "User-Agent": BROWSER_UA, "Accept": "text/html,application/xhtml+xml" },
          });
          if (!scrapeResp.ok) return { url: purl.url, success: false, error: `fetch ${scrapeResp.status}` };
          const markdown = await scrapeResp.text();
          if (!markdown) return { url: purl.url, success: false, error: "no content" };

          const product = await extractProductWithAI(markdown, purl.url);
          if (!product || !product.name) return { url: purl.url, success: false, error: "no product detected" };

          const imageUrl = product.image_url || null;
          const slug = slugify(product.name);
          const { data: existing } = await supabase
            .from("products").select("id").eq("slug", slug).maybeSingle();
          if (existing) return { url: purl.url, success: false, error: "duplicate", name: product.name };

          const { error } = await supabase.from("products").insert({
            name: product.name, slug,
            description: (product.description || "").substring(0, 1500),
            price: Number(product.price) || 0,
            original_price: product.original_price ? Number(product.original_price) : null,
            brand: product.brand || null,
            protocol: product.protocol || null,
            image_url: imageUrl,
            images: product.images || [],
            specifications: product.specifications || {},
            stock: 10, featured: false,
          });

          if (error) return { url: purl.url, success: false, error: error.message };
          return { url: purl.url, success: true, name: product.name, price: product.price };
        } catch (e) {
          return { url: purl.url, success: false, error: e instanceof Error ? e.message : String(e) };
        }
      }));
      results.push(...batchResults);
    }

    const successCount = results.filter((r) => r.success).length;
    return new Response(JSON.stringify({
      success: true, discovered: productLinks.length, imported: successCount, results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("crawl-catalog error:", e);
    return new Response(JSON.stringify({
      success: false, error: e instanceof Error ? e.message : String(e),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});