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
  matchOfficialBundles,
  extractPriceFilter,
  formatCatalogPromptContext,
  buildSmartGroundedResponse,
  validateAndRepairAIOutput,
  sanitizeUserInput,
  OFFICIAL_BUNDLES,
  INSTALLATION_POLICY,
} from "../_shared/catalog-grounding.ts";

function streamText(text: string, encoder: TextEncoder): ReadableStream {
  return new ReadableStream({
    start(controller) {
      const chunkSize = 32;
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
        setTimeout(send, 8);
      };
      controller.enqueue(
        encoder.encode(
          `data: {"id":"${id}","object":"chat.completion.chunk","created":${Math.floor(Date.now() / 1000)},"model":"azka-omni-free","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n`
        )
      );
      setTimeout(send, 10);
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
      loadGroundedCatalog(supabase, 500),
      supabase.from("categories").select("slug, name, description"),
    ]);

    const topProducts = matchCatalogProducts(cleanQuery, fullCatalog, 14);
    const productContext = formatCatalogPromptContext(topProducts);
    const priceFilter = extractPriceFilter(cleanQuery);
    const matchedBundles = matchOfficialBundles(cleanQuery);

    const bundleLines = (matchedBundles.length > 0 ? matchedBundles : OFFICIAL_BUNDLES)
      .map(
        (b) =>
          `- [${b.nameAr} / ${b.nameEn}](/bundles?bundle=${b.id}): ${b.priceEgp} EGP (was ${b.originalPriceEgp} EGP) | ${b.savingsEn} | Includes: ${b.devicesEn.join(", ")}`,
      )
      .join("\n");

    const priceGuidance = priceFilter.maxPrice
      ? `\nBUDGET FILTER ACTIVE (Max ${priceFilter.maxPrice} EGP): First list the matching products priced <= ${priceFilter.maxPrice} EGP (such as smart access readers/locks). Then, if full-handle biometric door locks cost more (starting around 6,653 EGP), clearly list the most affordable options above ${priceFilter.maxPrice} EGP as premium upgrades.`
      : "";

    const catLines = (categories ?? []).map((c: any) =>
      `- ${c.name}: /products?category=${c.slug}`
    ).join("\n");

    const isArabicQuery = language === "ar" || /[\u0600-\u06FF]/.test(cleanQuery);

    const systemPrompt = isArabicQuery
      ? `أنت مساعد المبيعات الذكي لمتجر AzkaSmart — المتجر الرائد في مصر لأنظمة المنزل الذكي والتحكم في الدخول (Smart Home & Access Control).
أجب بذكاء ودقة واختصار باللغة العربية.
قواعد صارمة:
1. اقترح فقط المنتجات أو الباقات الموجودة في القائمة الموثقة أدناه مع وضع روابطها بصيغة الماركداون النسبية فقط: [اسم المنتج](/products/slug) أو [اسم الباقة](/bundles?bundle=id). لا تضع https://azkasmart.com قبل الرابط.
2. إذا سأل العميل عن شقة (استوديو، غرفتين، ٣ غرف، فيلا) أو توفير الكهرباء، رشّح له الباقة الرسمية المناسبة من قسم الباقات أدناه مع توضيح محتوياتها وسعرها ورابطها، بالإضافة إلى روابط أهم الأجهزة بداخلها.
3. الأسعار بالجنيه المصري (EGP) شاملة ضمان رسمي لمدة سنة في مصر.
4. التركيب المعتمد متاح بجميع محافظات مصر: ${INSTALLATION_POLICY.percentage * 100}% من قيمة الأجهزة (بحد أدنى ${INSTALLATION_POLICY.minVisitFeeEgp} ج.م للزيارة).${priceGuidance}

الباقات الرسمية المتاحة:
${bundleLines}

المنتجات المتطابقة مع البحث:
${productContext}

الأقسام:
${catLines}`
      : `You are AzkaSmart's AI Shopping Advisor — Egypt's leading smart-home automation and access-control store.
Reply smartly, accurately, and concisely in English.
Strict rules:
1. Recommend ONLY products or bundles from the verified lists below using relative markdown links: [Product Name](/products/slug) or [Bundle Name](/bundles?bundle=id). Do NOT prepend https://azkasmart.com.
2. When the user asks about an apartment/villa bundle or saving electricity, always recommend the matching Official Bundle first (with its price, savings, included devices, and /bundles?bundle=id link), plus key individual product links.
3. All prices are in EGP with an official 1-year warranty in Egypt.
4. Certified installation across Egypt is ${INSTALLATION_POLICY.percentage * 100}% of equipment total (min visit ${INSTALLATION_POLICY.minVisitFeeEgp} EGP).${priceGuidance}

Official Smart Bundles:
${bundleLines}

Matching Verified Products:
${productContext}

Categories:
${catLines}`;

    const msgs = [
      { role: "system", content: systemPrompt },
      ...(history ?? []).slice(-4),
      { role: "user", content: cleanQuery },
    ];

    let fullText: string;
    try {
      fullText = await chatComplete(msgs as ChatMessage[], {
        maxTokens: 700,
        task: "fast_chat",
        timeoutMs: 9500,
      });
    } catch (aiErr) {
      console.warn("site-assistant AI provider unavailable, using smart grounded advisor:", aiErr);
      fullText = buildSmartGroundedResponse(cleanQuery, topProducts, fullCatalog, isArabicQuery ? "ar" : "en");
    }

    // Post-generation validation & repair gate
    const { validText } = validateAndRepairAIOutput(fullText, fullCatalog, OFFICIAL_BUNDLES);

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
