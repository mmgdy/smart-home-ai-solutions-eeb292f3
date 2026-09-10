// Smart Home Consultant — AI via the shared fallback gateway.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { cleanString } from "../_shared/validate.ts";
import { chatComplete } from "../_shared/ai.ts";

async function callAI(messages: any[], systemPrompt: string): Promise<string> {
  return chatComplete([
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: String(m.content) })),
  ], { maxTokens: 400 });
}

function productCategory(p: any): string {
  return p?.categories?.name ?? "";
}

function scoreProducts(message: string, products: any[]): any[] {
  const terms = message.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
  const scored = products.map((p) => {
    const hay = `${p.name ?? ""} ${p.brand ?? ""} ${productCategory(p)} ${p.description ?? ""}`.toLowerCase();
    const score = terms.reduce((acc, term) => acc + (hay.includes(term) ? 1 : 0), 0);
    return { product: p, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter((s) => s.score > 0).map((s) => s.product);
}

function makeProductContext(products: any[]): string {
  return products.slice(0, 25).map((p) =>
    `- ${p.name}${p.brand ? ` (${p.brand})` : ""}${p.price ? ` — ${p.price} EGP` : ""}${productCategory(p) ? ` [${productCategory(p)}]` : ""}`
  ).join("\n");
}

function makeCategorySummary(products: any[]): string {
  const cats: Record<string, number> = {};
  for (const p of products) {
    const c = productCategory(p) || "Other";
    cats[c] = (cats[c] || 0) + 1;
  }
  return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n, c]) => `- ${n}: ${c}`).join("\n");
}

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

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60_000, maxRequests: 10 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  try {
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const stream = body.stream !== false;

    // Support both { message: "..." } and { messages: [{ role, content }, ...] }
    let userQuery = "";
    let chatHistory: Array<{ role: "user" | "assistant"; content: string }> = [];

    if (typeof body.message === "string" && body.message.trim()) {
      userQuery = body.message.trim();
      chatHistory = [{ role: "user", content: userQuery }];
    } else if (Array.isArray(body.messages) && body.messages.length > 0) {
      chatHistory = body.messages
        .map((m: any) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: String(m.content ?? "").trim(),
        }))
        .filter((m: any) => m.content.length > 0);
      const lastUser = [...chatHistory].reverse().find((m) => m.role === "user");
      userQuery = lastUser?.content ?? "";
    }

    const cleaned = cleanString(userQuery, 2000);
    if (!cleaned) {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: products, error: productError } = await supabase
      .from("products")
      .select("id, name, brand, price, slug, description, category_id, categories(name)")
      .eq("is_published", true)
      .limit(250);

    if (productError) throw productError;

    const matched = scoreProducts(cleaned, products || []);
    const topProducts = matched.length ? matched : (products || []).slice(0, 25);
    const categorySummary = makeCategorySummary(products || []);
    const productContext = makeProductContext(topProducts);

    const systemPrompt = `You are AzkaSmart Smart Home Consultant — an expert AI assistant for an Egyptian smart home and automation store.
Available product categories:
${categorySummary}

Relevant products for this query:
${productContext}

Answer in the same language as the user (Arabic or English). Be friendly, helpful, practical, and concise (under 250 words).
When recommending products, include markdown links in the format [Product Name](/products/slug).
Mention prices in EGP and official warranty in Egypt.`;

    let aiText: string;
    try {
      const historyToPass = chatHistory.length > 0 ? chatHistory.slice(-6) : [{ role: "user", content: cleaned }];
      aiText = await callAI(historyToPass, systemPrompt);
    } catch (aiErr) {
      console.warn("smart-home-consultant: AI provider unavailable, using catalog fallback:", aiErr);
      const isArabic = /[\u0600-\u06FF]/.test(cleaned);
      const recList = topProducts.slice(0, 4).map((p: any) =>
        `- **[${p.name}](/products/${p.slug || p.id})**${p.brand ? ` (${p.brand})` : ""}: ${p.price} EGP`
      ).join("\n");

      if (isArabic) {
        aiText = `أهلاً بك في **AzkaSmart**! لمساعدتك بخصوص "${cleaned}"، إليك أفضل الأجهزة الذكية المتوافقة والمتاحة لدينا في مصر بضمان رسمي:\n\n${recList}\n\nنوفر أيضاً خدمات المعاينة والتركيب المعتمد في جميع محافظات مصر. يمكنك استكشاف [باقات التوفير الذكية](/bundles) أو حساب التكلفة فوراً عبر [حاسبة التكلفة](/calculator).\n\nهل تود معرفة تفاصيل أو طريقة تشغيل أي منتج منها؟`;
      } else {
        aiText = `Welcome to **AzkaSmart**! Regarding your request for "${cleaned}", here are our top recommended smart home devices available in Egypt with official warranty:\n\n${recList}\n\nWe also provide professional installation across Egypt. You can explore [Smart Bundles](/bundles) or calculate full costs on our [Calculator](/calculator).\n\nWould you like more details on any of these devices?`;
      }
    }

    if (!stream) {
      return new Response(JSON.stringify({ response: aiText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    return new Response(streamText(aiText, encoder), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Consultant error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Consultation failed. Try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
