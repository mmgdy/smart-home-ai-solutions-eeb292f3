import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callLovableAI(messages: any[], systemPrompt: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-5-mini",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
    }),
  });

  if (response.status === 429 || response.status === 402) {
    throw { status: response.status, fallback: true };
  }
  if (!response.ok) {
    const t = await response.text();
    console.error("Lovable AI error:", response.status, t);
    throw { status: response.status, fallback: true };
  }
  return response;
}

async function callGroqAI(messages: any[], systemPrompt: string) {
  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: true,
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error("Groq error:", response.status, t);
    throw new Error("Groq AI error");
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
        productsInfo = products.map(p => 
          `- **${p.name}** (${p.brand || 'Baytzaki'}): ${p.description || 'Smart home device'} - السعر/Price: ${p.price} ج.م/EGP - Protocol: ${p.protocol || 'WiFi'} - [View Product](/products/${p.slug})`
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
- Always include clickable product links in markdown: [Product Name](/products/slug)
- Group recommendations with short headings (e.g. "## Lighting", "## Security")
- Be honest if we don't have what they need
- **Always show prices in EGP (ج.م) - NEVER use dollars**
- Ask clarifying questions when needed
- Keep responses focused and actionable`;

    // Try Lovable AI first, fallback to Groq
    let response;
    try {
      response = await callLovableAI(messages, systemPrompt);
    } catch (err: any) {
      if (err?.fallback) {
        console.log("Lovable AI limit hit, falling back to Groq");
        try {
          response = await callGroqAI(messages, systemPrompt);
        } catch (groqErr) {
          console.error("Groq also failed:", groqErr);
          return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }), {
            status: 503,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        throw err;
      }
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Smart home consultant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
