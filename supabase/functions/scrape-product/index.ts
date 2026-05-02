import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function isUrlAllowed(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) return false;
    // Block IP literals in private/loopback/link-local ranges
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      const parts = host.split(".").map(Number);
      const [a, b] = parts;
      if (a === 10) return false;
      if (a === 127) return false;
      if (a === 169 && b === 254) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
    }
    return true;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, adminToken } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!(await verifyAdminToken(supabase, adminToken))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isUrlAllowed(url)) {
      return new Response(JSON.stringify({ error: "URL not allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the page content
    const pageResp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
      },
    });

    if (!pageResp.ok) {
      throw new Error(`Failed to fetch URL: ${pageResp.status}`);
    }

    const html = await pageResp.text();

    // Pre-extract real images from HTML before AI (og:image, json-ld, srcset)
    const realImages: string[] = [];
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch) realImages.push(ogMatch[1]);
    const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    if (twMatch) realImages.push(twMatch[1]);
    // JSON-LD product images
    const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const m of jsonLdMatches) {
      try {
        const ld = JSON.parse(m[1]);
        const items = Array.isArray(ld) ? ld : [ld];
        for (const it of items) {
          const img = it.image;
          if (typeof img === "string") realImages.push(img);
          else if (Array.isArray(img)) realImages.push(...img.filter((x) => typeof x === "string"));
          else if (img?.url) realImages.push(img.url);
        }
      } catch {}
    }
    const dedupedImages = [...new Set(realImages.filter((u) => u && u.startsWith("http")))];
    const primaryImage = dedupedImages[0] || null;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI not configured");

    // Truncate HTML to avoid token limits
    const truncatedHtml = html.substring(0, 30000);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a product data extractor. Extract product information from the HTML provided. Return ONLY a JSON object with these fields:
- name: product name (string)
- description: product description (string, max 500 chars)
- price: price in EGP as number (if in USD multiply by 50, if in SAR multiply by 13)
- original_price: original/list price if there's a discount (number or null)
- brand: brand name (string or null)
- image_url: main product image URL (string or null)
- images: array of additional image URLs (string array)
- specifications: key-value pairs of specs (object)
- protocol: smart home protocol like WiFi, Zigbee, Z-Wave, Bluetooth (string or null)
- category: product category suggestion (string)

Return valid JSON only, no markdown.`
          },
          {
            role: "user",
            content: `Extract product data from this page (URL: ${url}):\n\n${truncatedHtml}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_product",
            description: "Extract product data from webpage",
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
              required: ["name", "price"],
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_product" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI error:", errText);
      throw new Error("AI extraction failed");
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("AI did not return structured data");
    }

    const productData = JSON.parse(toolCall.function.arguments);

    // Generate slug
    const slug = productData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 80);

    return new Response(JSON.stringify({
      success: true,
      product: {
        ...productData,
        // Override with real images extracted from HTML metadata when available
        image_url: primaryImage || productData.image_url,
        images: dedupedImages.length > 0 ? dedupedImages : (productData.images || []),
        slug,
        source_url: url,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Scrape failed" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
