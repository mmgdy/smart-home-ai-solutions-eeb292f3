// Smart Home & Access Control Consultant — AzkaSmart.
// 100% catalog-grounded, safe, and hallucination-free AI advisor.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { cleanString } from "../_shared/validate.ts";
import { chatComplete } from "../_shared/ai.ts";
import {
  loadGroundedCatalog,
  matchCatalogProducts,
  formatCatalogPromptContext,
  OFFICIAL_BUNDLES,
  INSTALLATION_POLICY,
  validateAndRepairAIOutput,
  detectVagueIntent,
  sanitizeUserInput,
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
          `data: {"id":"${id}","object":"chat.completion.chunk","created":${Math.floor(Date.now() / 1000)},"model":"azka-grounded","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n`
        )
      );
      setTimeout(send, 25);
    },
  });
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60_000, maxRequests: 20 });
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

    const cleanedRaw = cleanString(userQuery, 2000);
    if (!cleanedRaw) {
      return new Response(JSON.stringify({ error: "message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleaned = sanitizeUserInput(cleanedRaw);

    // 1. Check for vague questions -> ask EXACTLY ONE clarifying question
    const vagueClarification = detectVagueIntent(cleaned);
    if (vagueClarification && chatHistory.length <= 1) {
      if (!stream) {
        return new Response(JSON.stringify({ response: vagueClarification }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const encoder = new TextEncoder();
      return new Response(streamText(vagueClarification, encoder), {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
      });
    }

    // 2. Load Grounded Catalog
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const fullCatalog = await loadGroundedCatalog(supabase, 300);
    const matchedProducts = matchCatalogProducts(cleaned, fullCatalog, 20);
    const productContext = formatCatalogPromptContext(matchedProducts);

    // 3. Format Official Bundles Summary
    const bundleSummary = OFFICIAL_BUNDLES.map(
      (b) => `- ${b.nameAr} (${b.nameEn}): EGP ${b.priceEgp} (was ${b.originalPriceEgp}) — /bundles?bundle=${b.id} — ${b.descAr}`
    ).join("\n");

    // 4. Build Strict Grounded System Prompt
    const systemPrompt = `You are AzkaSmart Consultant — the official AI expert for azkasmart.com (Egypt's premier Smart Home and Access Control store).

CRITICAL GROUNDING RULES:
1. ONLY recommend products listed in the VERIFIED CATALOG below. NEVER invent products, model numbers, or specifications.
2. When recommending products, ALWAYS link using the EXACT slug provided: [Product Name](/products/slug).
3. If an item is not in the catalog (e.g. Philips Hue, Nest, Apple HomePod), state politely that AzkaSmart does not sell it, and suggest the closest catalog alternative (e.g. Sonoff, Tuya).
4. Prices are in EGP with official 1-year Egyptian warranty.
5. Installation terms: Certified professional installation is available across all Egyptian governorates: ${INSTALLATION_POLICY.percentage * 100}% of equipment total (minimum visit fee ${INSTALLATION_POLICY.minVisitFeeEgp} EGP).
6. Smart Home Compatibility Rules:
   - Zigbee devices REQUIRE a Zigbee Bridge/Hub to connect to phone/Alexa/Google.
   - Wi-Fi devices connect directly to 2.4GHz home Wi-Fi (no hub required).
   - In-wall switches: If user mentions older Egyptian apartment, remind them about the neutral wire (advise no-neutral models like ZBMINI-L2 if no neutral exists).
7. Access Control Rules:
   - Magnetic Locks (EM-Locks) are Fail-Safe (unlock on power cut). Fire exit doors must always be Fail-Safe.
   - Glass doors require U-Brackets; inward-opening doors require ZL-Brackets.
   - 12V DC locks & keypads require a 12V 5A power supply box with battery backup.
8. Official Bundles Available:
${bundleSummary}

VERIFIED CATALOG CONTEXT:
${productContext}

Language: Answer in the customer's exact language (Egyptian Arabic / Modern Standard Arabic / English / Franco-Arab).
Style: Friendly, concise (under 200 words), direct, and helpful.`;

    // Sanitize all conversation history messages to prevent multi-turn prompt injection (SEC-09)
    const sanitizedHistory = (chatHistory.length > 0 ? chatHistory.slice(-6) : [{ role: "user" as const, content: cleaned }]).map((m) => {
      const role: "user" | "assistant" = m.role === "assistant" ? "assistant" : "user";
      if (role === "user") {
        const cleanedMsg = cleanString(m.content, 2000);
        return {
          role,
          content: sanitizeUserInput(cleanedMsg),
        };
      }
      return {
        role,
        content: cleanString(m.content, 4000),
      };
    });

    // Ensure the last user query matches the fully sanitized cleaned input
    const lastUserIdx = sanitizedHistory.map((m) => m.role).lastIndexOf("user");
    if (lastUserIdx !== -1) {
      sanitizedHistory[lastUserIdx].content = cleaned;
    }

    const aiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...sanitizedHistory,
    ];

    let aiRawText = "";
    try {
      aiRawText = await chatComplete(aiMessages, { maxTokens: 450 });
    } catch (aiErr) {
      console.warn("smart-home-consultant: AI provider unavailable, using verified fallback:", aiErr);
      const isArabic = /[\u0600-\u06FF]/.test(cleaned);
      const topList = matchedProducts.slice(0, 4).map((p) =>
        `- **[${p.name}](/products/${p.slug})**${p.brand ? ` (${p.brand})` : ""}: ${p.price} EGP`
      ).join("\n");

      if (isArabic) {
        aiRawText = `أهلاً بك في **AzkaSmart**! لمساعدتك بخصوص "${cleaned}"، إليك أفضل الأجهزة المتوافقة والمتاحة لدينا في مصر بضمان رسمي:\n\n${topList}\n\nنوفر أيضاً خدمات المعاينة والتركيب المعتمد في جميع محافظات مصر (٢٠٪ من قيمة الأجهزة بحد أدنى ١,٥٠٠ ج.م للزيارة). يمكنك استكشاف [باقات التوفير الذكية](/bundles) أو مراسلة فني الدعم مباشرة عبر [واتساب](${INSTALLATION_POLICY.whatsappUrl}).`;
      } else {
        aiRawText = `Welcome to **AzkaSmart**! Regarding your request for "${cleaned}", here are our top verified smart home devices available in Egypt with official 1-year warranty:\n\n${topList}\n\nCertified installation is available across Egypt (20% of equipment total, minimum 1,500 EGP per visit). You can explore [Smart Bundles](/bundles) or reach our team directly via [WhatsApp](${INSTALLATION_POLICY.whatsappUrl}).`;
      }
    }

    // 5. Post-Generation Verification Gate
    const { validText } = validateAndRepairAIOutput(aiRawText, fullCatalog, OFFICIAL_BUNDLES);

    if (!stream) {
      return new Response(JSON.stringify({ response: validText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    return new Response(streamText(validText, encoder), {
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
