import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pollinations AI is a free, keyless, OpenAI-compatible gateway (anonymous tier).
// It supports streaming chat completions with system prompts.
const POLLINATIONS_URL = "https://text.pollinations.ai/openai";

async function callAI(messages: any[], systemPrompt: string) {
  const response = await fetch(POLLINATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error("Pollinations AI error:", response.status, t);
    throw { status: response.status, message: t };
  }
  return response;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Fetch products from the database
    let productsInfo = "";
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: products } = await supabase
        .from("products")
        .select("name, description, price, brand, protocol, stock, slug")
        .gt("stock", 0);

      if (products && products.length > 0) {
        const { data: full } = await supabase
          .from("products")
          .select("name, description, price, brand, protocol, stock, slug, image_url")
          .gt("stock", 0);
        productsInfo = (full ?? products).map((p: any) =>
          `- **${p.name}** (${p.brand || 'Baytzaki'}): ${p.description || 'Smart home device'} - السعر/Price: ${p.price} ج.م/EGP - Protocol: ${p.protocol || 'WiFi'} - Image: ${p.image_url || ''} - Link: /products/${p.slug}`
        ).join("\n");
      }
    }

    const systemPrompt = `You are Baytzaki's Smart Home Consultant - an expert in smart home technology for Egyptian homes. Help customers find the RIGHT products from our store.

أنت مستشار المنزل الذكي من بيت زكي - خبير في تقنيات المنزل الذكي للمنازل المصرية.

**LANGUAGE RULES:**
- If the user writes in Arabic, respond ENTIRELY in Arabic
- If the user writes in English, respond in English
- Match the user's language always

**CRITICAL: Only recommend products from our inventory below. Never suggest products not in this list.**

## Our Products:
${productsInfo || "No products currently in stock."}

## Your Role:
1. Understand customer needs - ask about home size, lifestyle, priorities (security, comfort, energy savings), budget
2. Recommend products ONLY from the list above
3. Explain compatibility and which devices work together
4. Create personalized bundles from available products
5. Provide setup tips and automation scenarios

## Guidelines:
- Be friendly, knowledgeable, and concise
- Use clear markdown: **bold** for emphasis, bullet lists for recommendations, and headings (## / ###) for sections
- For EACH recommended product, include BOTH the product image AND a clickable link in this exact format on its own line:
  ![Product Name](IMAGE_URL)
  **[Product Name](/products/slug)** — short reason — **PRICE ج.م**
- Only use image URLs from the "Image:" field above. Skip the image line if Image is empty.
- Group recommendations with short headings (e.g. "## Lighting", "## Security")
- Be honest if we don't have what they need
- **Always show prices in EGP (ج.م) - NEVER use dollars**
- Ask clarifying questions when needed
- Keep responses focused and actionable`;

    const response = await callAI(messages, systemPrompt);

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error: any) {
    console.error("Smart home consultant error:", error);
    const msg =
      error?.status === 429
        ? "Too many requests. Please wait a moment and try again."
        : "AI service temporarily unavailable. Please try again later.";
    return new Response(JSON.stringify({ error: msg }), {
      status: error?.status === 429 ? 429 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
