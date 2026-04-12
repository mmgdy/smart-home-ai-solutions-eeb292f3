import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Use AI to extract product info from HTML
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
