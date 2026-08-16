// Site assistant — bilingual AI search & site guide.
// AI via the shared fallback gateway (_shared/ai.ts).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { cleanString } from "../_shared/validate.ts";
import { chatComplete, type ChatMessage } from "../_shared/ai.ts";

function streamText(text: string, encoder: TextEncoder): ReadableStream {
  return new ReadableStream({
    start(controller) {
      const chunkSize = 6;
      let i = 0;
      const id = crypto.randomUUID();
      const send = () => {
        if (i >= text.length) {
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
          return;
        }
        const chunk = text.slice(i, i + chunkSize);
        i += chunkSize;
        const payload = JSON.stringify({ choices: [{ delta: { content: chunk } }] });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        setTimeout(send, 18);
      };
      controller.enqueue(encoder.encode(
        `data: {"id":"${id}","object":"chat.completion.chunk","created":${Math.floor(Date.now() / 1000)},"model":"gpt-4","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n`
      ));
      setTimeout(send, 30);
    },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60_000, maxRequests: 10 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  try {
    const { query, language = "en", history = [] } = await req.json();
    const cleanQuery = cleanString(query, 500);
    if (!cleanQuery) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: products }, { data: categories }] = await Promise.all([
      supabase.from("products").select("name, slug, price, brand, category_id, description").limit(80),
      supabase.from("categories").select("slug, name, description"),
    ]);

    const q = cleanQuery.toLowerCase();
    const words = q.split(/\s+/).filter((w) => w.length > 2);
    const scored = (products ?? []).map((p: any) => {
      const hay = `${p.name} ${p.brand ?? ""} ${p.description ?? ""}`.toLowerCase();
      let score = 0;
      words.forEach((w) => { if (hay.includes(w)) score += 1; });
      return { p, score };
    }).sort((a, b) => b.score - a.score);
    const top = (scored.filter((s) => s.score > 0).slice(0, 8).length
      ? scored.filter((s) => s.score > 0).slice(0, 8)
      : scored.slice(0, 6)
    ).map((s) => s.p);

    const productLines = top.map((p: any) =>
      `- ${p.name} — EGP ${p.price} — /products/${p.slug}${p.brand ? ` — ${p.brand}` : ""}`
    ).join("\n");

    const catLines = (categories ?? []).map((c: any) =>
      `- ${c.name}: /products?category=${c.slug}`
    ).join("\n");

    const system = language === "ar"
      ? `أنت مساعد Baytzaki، متجر إلكتروني مصري للمنزل الذكي والأثاث الفني. أجب باختصار وبالعربية. اقترح منتجات من القائمة فقط، واذكر روابطها. الأسعار بالجنيه المصري.

المنتجات المتاحة:
${productLines}

الأقسام:
${catLines}

صفحات مفيدة: /bundles /ai-consultant /calculator /brands /services`
      : `You are Baytzaki's helpful shopping assistant — an Egyptian smart-home and art-furniture store. Reply concisely in English. Recommend ONLY products from the list, include their /products/<slug> links. Prices are in EGP.

Available products:
${productLines}

Categories:
${catLines}

Useful pages: /bundles /ai-consultant /calculator /brands /services`;

    const msgs = [
      { role: "system", content: system },
      ...(history ?? []).slice(-6),
      { role: "user", content: cleanQuery },
    ];

    let fullText: string;
    try {
      fullText = await chatComplete(msgs as ChatMessage[], { maxTokens: 400 });
    } catch (aiErr) {
      console.error("site-assistant AI error:", aiErr);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable. Try again later." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    return new Response(streamText(fullText, encoder), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    console.error("site-assistant error:", e);
    return new Response(JSON.stringify({ error: "Service temporarily unavailable. Try again later." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
