// Site assistant — bilingual AI search & smart-home shopping guide for AzkaSmart.
// 100% catalog-grounded, zero hallucination.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { cleanString } from "../_shared/validate.ts";
import { chatComplete, type ChatMessage } from "../_shared/ai.ts";
import {
  loadGroundedCatalog,
  matchCatalogProducts,
  formatCatalogPromptContext,
  validateAndRepairAIOutput,
  sanitizeUserInput,
  INSTALLATION_POLICY,
} from "../_shared/catalog-grounding.ts";

function streamText(text: string, encoder: TextEncoder): ReadableStream {
  return new ReadableStream({
    start(controller) {
      const chunkSize = 8;
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
        setTimeout(send, 16);
      };
      controller.enqueue(
        encoder.encode(
          `data: {"id":"${id}","object":"chat.completion.chunk","created":${Math.floor(Date.now() / 1000)},"model":"azka-assistant","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n`
        )
      );
      setTimeout(send, 25);
    },
  });
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60_000, maxRequests: 20 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  try {
    const { query, language = "en", history = [] } = await req.json();
    const cleanQueryRaw = cleanString(query, 500);
    if (!cleanQueryRaw) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanQuery = sanitizeUserInput(cleanQueryRaw);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const [fullCatalog, { data: categories }] = await Promise.all([
      loadGroundedCatalog(supabase, 250),
      supabase.from("categories").select("slug, name, description"),
    ]);

    const topProducts = matchCatalogProducts(cleanQuery, fullCatalog, 12);
    const productContext = formatCatalogPromptContext(topProducts);

    const catLines = (categories ?? []).map((c: any) =>
      `- ${c.name}: /products?category=${c.slug}`
    ).join("\n");

    const systemPrompt = language === "ar"
      ? `أنت مساعد AzkaSmart، متجر إلكتروني مصري رائد في منتجات المنزل الذكي وأنظمة التحكم في الدخول (Smart Home & Access Control).
أجب باختصار ولطف وباللغة العربية (اللهجة المصرية مقبولة ومرحب بها).
قواعد أساسية:
1. اقترح منتجات من القائمة المتاحة أدناه فقط مع ذكر روابطها الدقيقة بصيغة [اسم المنتج](/products/slug).
2. الأسعار بالجنيه المصري (EGP) مع ضمان معتمد لمدة سنة في مصر.
3. تتوفر خدمة المعاينة والتركيب الاحترافي بجميع المحافظات: ${INSTALLATION_POLICY.percentage * 100}٪ بحد أدنى ${INSTALLATION_POLICY.minVisitFeeEgp} ج.م للزيارة.

المنتجات المتطابقة مع البحث:
${productContext}

الأقسام المتاحة:
${catLines}

روابط سريعة: /bundles /calculator /ai-consultant`
      : `You are AzkaSmart's smart shopping assistant — Egypt's leading smart-home automation and access-control store.
Reply concisely and helpfully in English.
Strict rules:
1. Recommend ONLY products from the available verified list below with their exact markdown links: [Product Name](/products/slug).
2. Prices are in EGP with official 1-year warranty in Egypt.
3. Professional installation is available across Egypt: ${INSTALLATION_POLICY.percentage * 100}% of equipment total (min visit ${INSTALLATION_POLICY.minVisitFeeEgp} EGP).

Matching products:
${productContext}

Categories:
${catLines}

Quick links: /bundles /calculator /ai-consultant`;

    const msgs = [
      { role: "system", content: systemPrompt },
      ...(history ?? []).slice(-4),
      { role: "user", content: cleanQuery },
    ];

    let fullText: string;
    try {
      fullText = await chatComplete(msgs as ChatMessage[], { maxTokens: 400 });
    } catch (aiErr) {
      console.warn("site-assistant AI provider unavailable, using catalog fallback:", aiErr);
      const isArabic = language === "ar" || /[\u0600-\u06FF]/.test(cleanQuery);
      const recList = topProducts.slice(0, 4).map((p) =>
        `- **[${p.name}](/products/${p.slug})** — ${p.price} EGP`
      ).join("\n");

      if (isArabic) {
        fullText = `أهلاً بك في **AzkaSmart**! إليك أفضل المنتجات المتوفرة لطلبك "${cleanQuery}" بضمان رسمي:\n\n${recList}\n\nيمكنك استكشاف المزيد عبر [جميع المنتجات](/products) أو استشارة [مستشار الذكاء الاصطناعي](/ai-consultant).`;
      } else {
        fullText = `Welcome to **AzkaSmart**! For "${cleanQuery}", here are our top matching products in Egypt:\n\n${recList}\n\nExplore more under [All Products](/products) or chat with our [AI Consultant](/ai-consultant).`;
      }
    }

    // Post-generation validation & repair gate
    const { validText } = validateAndRepairAIOutput(fullText, fullCatalog);

    const encoder = new TextEncoder();
    return new Response(streamText(validText, encoder), {
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
