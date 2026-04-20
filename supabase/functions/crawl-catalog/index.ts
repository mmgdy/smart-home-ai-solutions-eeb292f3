import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL = "https://api.firecrawl.dev/v2";

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

async function extractProductWithAI(markdown: string, sourceUrl: string, apiKey: string) {
  const truncated = markdown.substring(0, 18000);
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Extract smart-home product data. Return realistic EGP price (USD*50, SAR*13, EUR*55). If no clear product on page, set name to "" so caller can skip.`,
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
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI ${resp.status}: ${t.substring(0, 200)}`);
  }
  const data = await resp.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;
  return JSON.parse(args);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { rootUrl, token, maxProducts = 25, urlFilter = "" } = await req.json();

    if (!(await verifyAdminToken(supabase, token))) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Step 1: Map the site to discover URLs
    console.log(`Mapping ${rootUrl}...`);
    const mapResp = await fetch(`${FIRECRAWL}/map`, {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: rootUrl,
        search: urlFilter || "product",
        limit: 200,
        includeSubdomains: false,
      }),
    });

    if (!mapResp.ok) {
      const t = await mapResp.text();
      throw new Error(`Firecrawl map failed (${mapResp.status}): ${t.substring(0, 300)}`);
    }

    const mapData = await mapResp.json();
    const allLinks: string[] = (mapData.links || mapData.data?.links || []).map((l: any) =>
      typeof l === "string" ? l : l.url
    );

    // Filter to likely product pages
    const productLinks = allLinks
      .filter((u) => u && /product|item|p\/|dp\/|shop/i.test(u))
      .slice(0, maxProducts);

    console.log(`Found ${productLinks.length} candidate product URLs`);

    if (productLinks.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "No product URLs found. Try a more specific URL or different filter.",
        discoveredLinks: allLinks.slice(0, 20),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Step 2: Scrape each in parallel batches
    const results: any[] = [];
    const BATCH = 5;
    for (let i = 0; i < productLinks.length; i += BATCH) {
      const batch = productLinks.slice(i, i + BATCH);
      const batchResults = await Promise.all(batch.map(async (purl) => {
        try {
          const scrapeResp = await fetch(`${FIRECRAWL}/scrape`, {
            method: "POST",
            headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              url: purl,
              formats: ["markdown"],
              onlyMainContent: true,
            }),
          });
          if (!scrapeResp.ok) {
            return { url: purl, success: false, error: `scrape ${scrapeResp.status}` };
          }
          const scrapeData = await scrapeResp.json();
          const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
          const meta = scrapeData.data?.metadata || scrapeData.metadata || {};
          if (!markdown) return { url: purl, success: false, error: "no content" };

          const product = await extractProductWithAI(markdown, purl, LOVABLE_API_KEY);
          if (!product || !product.name) {
            return { url: purl, success: false, error: "no product detected" };
          }

          // Prefer og:image from metadata when AI didn't find one
          const imageUrl = product.image_url || meta.ogImage || meta["og:image"] || null;

          const slug = slugify(product.name);
          const { data: existing } = await supabase
            .from("products").select("id").eq("slug", slug).maybeSingle();
          if (existing) {
            return { url: purl, success: false, error: "duplicate", name: product.name };
          }

          const { error } = await supabase.from("products").insert({
            name: product.name,
            slug,
            description: (product.description || "").substring(0, 1500),
            price: Number(product.price) || 0,
            original_price: product.original_price ? Number(product.original_price) : null,
            brand: product.brand || null,
            protocol: product.protocol || null,
            image_url: imageUrl,
            images: product.images || [],
            specifications: product.specifications || {},
            stock: 10,
            featured: false,
          });

          if (error) return { url: purl, success: false, error: error.message };
          return { url: purl, success: true, name: product.name, price: product.price };
        } catch (e) {
          return { url: purl, success: false, error: e instanceof Error ? e.message : String(e) };
        }
      }));
      results.push(...batchResults);
    }

    const successCount = results.filter((r) => r.success).length;
    return new Response(JSON.stringify({
      success: true,
      discovered: productLinks.length,
      imported: successCount,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("crawl-catalog error:", e);
    return new Response(JSON.stringify({
      success: false,
      error: e instanceof Error ? e.message : String(e),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
