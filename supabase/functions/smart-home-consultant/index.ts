// Smart Home Consultant — powered by Pollinations AI (free, keyless gateway).
//
// Two performance fixes vs. the old version:
// 1. Pollinations streams content into delta.reasoning (not delta.content), so we
//    call NON-streaming and re-stream the full text as proper SSE to the client.
// 2. We don't dump all 874 products into the prompt (it times out / degrades).
//    Instead we pick the ~30 most relevant products based on the user's message
//    and a category summary, so responses are fast and high quality.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const POLLINATIONS_URL = "https://text.pollinations.ai/openai";

async function callAI(messages: any[], systemPrompt: string): Promise<string> {
  const response = await fetch(POLLINATIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      stream: false,
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error("Pollinations AI error:", response.status, t.slice(0, 200));
    throw { status: response.status, message: t };
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");
  return content;
}

/** Re-stream a string as SSE chunks so the frontend feels responsive. */
function streamText(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const len = Math.min(Math.floor(Math.random() * 6) + 4, text.length - i);
    chunks.push(text.slice(i, i + len));
    i += len;
  }

  return new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        const payload = JSON.stringify({
          choices: [{ delta: { content: chunk } }],
        });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        await new Promise((r) => setTimeout(r, 10 + Math.random() * 15));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

// Keywords that map a user's request to product categories / fields.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  lighting: ["light", "bulb", "lamp", "lumen", "dimmer", "ضوء", "لمبة", "إضاءة", "انارة", "مصباح"],
  security: ["camera", "doorbell", "lock", "sensor", "alarm", "security", "كاميرا", "قفل", "باب", "حماية", "انذار", "حساس"],
  climate: ["thermostat", "ac", "air", "climate", "temperature", "thermo", "تكييف", "حرارة", "مناخ"],
  energy: ["plug", "outlet", "meter", "energy", "power", "كهرباء", "طاقة", "مقبس", "برواز"],
  entertainment: ["speaker", "tv", "audio", "music", "ستيريو", "تلفزيون", "مكبر"],
  curtain: ["curtain", "blind", "shade", "shutter", "ستار", "مقلمة", "برجيلا", "ستارة"],
  network: ["hub", "gateway", "router", "zigbee", "wifi", "بريدج", "راوتر", "هاب"],
  cleaning: ["robot", "vacuum", "clean", "روبوت", "تنظيف", "مكنسة"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase env not set");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the latest user message to drive product selection.
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const userText = (lastUser?.content ?? "").toString().toLowerCase();

    // Load in-stock products with the fields we need.
    const { data: allProducts, error: pErr } = await supabase
      .from("products")
      .select("name, description, price, brand, protocol, stock, slug, image_url, category_id")
      .gt("stock", 0)
      .limit(400);
    if (pErr) console.error("products query error:", pErr);
    const products = (allProducts ?? []) as any[];

    // Score each product by keyword overlap with the user message.
    const scoreProduct = (p: any): number => {
      if (!userText.trim()) return 0;
      const haystack = `${p.name ?? ""} ${p.description ?? ""} ${p.brand ?? ""} ${p.protocol ?? ""}`.toLowerCase();
      let score = 0;
      for (const words of Object.values(CATEGORY_KEYWORDS)) {
        for (const w of words) {
          if (userText.includes(w) && haystack.includes(w)) score += 2;
          else if (userText.includes(w)) score += 0.5;
        }
      }
      // Bonus for brand/word overlap.
      for (const tok of userText.split(/\s+/).filter((t) => t.length > 3)) {
        if (haystack.includes(tok)) score += 1;
      }
      return score;
    };

    const scored = products
      .map((p) => ({ p, s: scoreProduct(p) }))
      .sort((a, b) => b.s - a.s);

    // Take up to 25 best matches; if nothing matched, take the first 25.
    const top = scored.filter((x) => x.s > 0).slice(0, 25);
    const relevant = top.length ? top.map((x) => x.p) : products.slice(0, 25);

    const productsInfo = relevant.map((p: any) =>
      `- **${p.name}** (${p.brand || 'Baytzaki'}): ${(p.description || 'Smart home device').slice(0, 120)} - Price: ${p.price} EGP - Protocol: ${p.protocol || 'WiFi'} - Image: ${p.image_url || ''} - Link: /products/${p.slug}`
    ).join("\n");

    const totalProducts = products.length;

    const systemPrompt = `You are Baytzaki's Smart Home Consultant — an expert in smart home technology for Egyptian homes. Help customers find the RIGHT products from our store.

أنت مستشار المنزل الذكي من بيت زكي — خبير في تقنيات المنزل الذكي للمنازل المصرية.

**LANGUAGE RULES:**
- If the user writes in Arabic, respond ENTIRELY in Arabic.
- If the user writes in English, respond in English.
- Match the user's language always.

We have ${totalProducts} products in stock. Below are the most relevant ones for this conversation (do NOT claim we have nothing else — if a request doesn't match, ask a clarifying question instead):

${productsInfo || "No products currently in stock."}

**CRITICAL: Only recommend products from the list above. Never invent products.**

## Your Role:
1. Understand customer needs — ask about home size, lifestyle, priorities (security, comfort, energy savings), budget.
2. Recommend products ONLY from the list above.
3. Explain compatibility and which devices work together.
4. Create personalized bundles from available products.
5. Provide setup tips and automation scenarios.

## Guidelines:
- Be friendly, knowledgeable, and concise.
- Use clear markdown: **bold** for emphasis, bullet lists for recommendations, headings (## / ###) for sections.
- For EACH recommended product include a clickable link on its own line:
  **[Product Name](/products/slug)** — short reason — **PRICE EGP**
- Add the product image on the line above the link ONLY when an Image: URL is present:
  ![Product Name](IMAGE_URL)
- Group recommendations with short headings (e.g. "## Lighting", "## Security").
- Be honest if we don't have exactly what they need, and suggest the closest match.
- **Always show prices in EGP (ج.م) — NEVER use dollars.**
- Ask clarifying questions when needed.
- Keep responses focused and actionable.`;

    const fullResponse = await callAI(messages, systemPrompt);

    return new Response(streamText(fullResponse), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error: any) {
    console.error("Smart home consultant error:", error);
    const msg =
      error?.status === 429
        ? "Too many requests. Please wait a moment and try again."
        : error?.status === 402
          ? "AI credits exhausted. Please try again later."
          : "AI service temporarily unavailable. Please try again later.";
    return new Response(JSON.stringify({ error: msg }), {
      status: error?.status === 429 ? 429 : error?.status === 402 ? 402 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
