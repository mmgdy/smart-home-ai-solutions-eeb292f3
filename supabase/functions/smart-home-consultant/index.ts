// Smart Home & Access Control Consultant — AzkaSmart.
// 100% catalog-grounded, safe, and hallucination-free AI advisor.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { cleanString } from "../_shared/validate.ts";
import { chatComplete, getLastSuccessfulProvider } from "../_shared/ai.ts";
import {
  loadGroundedCatalog,
  matchCatalogProducts,
  matchOfficialBundles,
  extractPriceFilter,
  formatCatalogPromptContext,
  buildSmartGroundedResponse,
  OFFICIAL_BUNDLES,
  INSTALLATION_POLICY,
  validateAndRepairAIOutput,
  detectVagueIntent,
  sanitizeUserInput,
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

    const fullCatalog = await loadGroundedCatalog(supabase, 500);
    const matchedProducts = matchCatalogProducts(cleaned, fullCatalog, 20);
    const productContext = formatCatalogPromptContext(matchedProducts);
    const priceFilter = extractPriceFilter(cleaned);
    const matchedBundles = matchOfficialBundles(cleaned);

    // 3. Format Official Bundles Summary with full device lists
    const bundleSummary = OFFICIAL_BUNDLES.map(
      (b) =>
        `- [${b.nameAr} / ${b.nameEn}](/bundles?bundle=${b.id}): EGP ${b.priceEgp} (was ${b.originalPriceEgp}) | ${b.savingsAr} | يشمل: ${b.devicesAr.join(" + ")}`
    ).join("\n");

    const bundleHint = matchedBundles.length > 0
      ? `\nRECOMMENDED BUNDLES FOR THIS QUERY: Prioritize ${matchedBundles.map((b) => `${b.nameAr} (${b.nameEn} - ${b.priceEgp} EGP)`).join(" and ")}, explain its included devices & savings, and also link 3-4 individual products from VERIFIED CATALOG CONTEXT below so product cards appear.`
      : "";

    const priceHint = priceFilter.maxPrice
      ? `\nBUDGET FILTER ACTIVE (Max ${priceFilter.maxPrice} EGP): First list the matching products priced <= ${priceFilter.maxPrice} EGP. Then list the most affordable options above ${priceFilter.maxPrice} EGP as premium upgrades.`
      : "";

    // 4. Build Strict Grounded System Prompt
    const systemPrompt = `You are AzkaSmart Consultant — the official AI smart-home & access-control engineer for AzkaSmart (Egypt's premier Smart Home and Access Control store).

CRITICAL GROUNDING RULES:
1. ONLY recommend products listed in the VERIFIED CATALOG below. NEVER invent products, model numbers, or specifications.
2. When recommending products, ALWAYS link using the EXACT relative path: [Product Name](/products/slug). For bundles, use [Bundle Name](/bundles?bundle=id). Do NOT prepend https://azkasmart.com.
3. If an item is not in the catalog (e.g. Philips Hue, Nest, Apple HomePod), state politely that AzkaSmart does not sell it, and suggest the closest catalog alternative (e.g. Sonoff, Tuya).
4. Prices are in EGP with official 1-year Egyptian warranty.
5. Installation terms: Certified professional installation is available across all Egyptian governorates: EXACTLY ${INSTALLATION_POLICY.percentage * 100}% of equipment total (minimum visit fee ${INSTALLATION_POLICY.minVisitFeeEgp} EGP). Never say 15%.
6. Smart Home Compatibility Rules:
   - Zigbee devices REQUIRE a Zigbee Bridge/Hub to connect to phone/Alexa/Google.
   - Wi-Fi devices connect directly to 2.4GHz home Wi-Fi (no hub required).
   - In-wall switches: If user mentions older Egyptian apartment, remind them about the neutral wire (advise no-neutral models like ZBMINI-L2 if no neutral exists).
7. Access Control Rules:
   - Magnetic Locks (EM-Locks) are Fail-Safe (unlock on power cut). Fire exit doors must always be Fail-Safe.
   - Glass doors require U-Brackets; inward-opening doors require ZL-Brackets.
   - 12V DC locks & keypads require a 12V 5A power supply box with battery backup.
8. Official Bundles Available:
${bundleSummary}${bundleHint}${priceHint}

VERIFIED CATALOG CONTEXT:
${productContext}

Language: Answer in the customer's exact language (Egyptian Arabic / Modern Standard Arabic / English).
Style: Expert, structured with clear bullet points, exact EGP prices, and clickable product links.`;

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

    const lastUserIdx = sanitizedHistory.map((m) => m.role).lastIndexOf("user");
    if (lastUserIdx !== -1) {
      sanitizedHistory[lastUserIdx].content = cleaned;
    }

    const aiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...sanitizedHistory,
    ];

    let aiRawText = "";
    let providerUsed = "local-catalog-rules";
    try {
      aiRawText = await chatComplete(aiMessages, {
        maxTokens: 700,
        task: "fast_chat",
        timeoutMs: 9500,
      });
      providerUsed = getLastSuccessfulProvider();
    } catch (aiErr) {
      console.warn("smart-home-consultant: AI provider unavailable, using smart grounded advisor:", aiErr);
      aiRawText = buildSmartGroundedResponse(cleaned, matchedProducts, fullCatalog);
    }

    // 5. Post-Generation Verification Gate
    const { validText } = validateAndRepairAIOutput(aiRawText, fullCatalog, OFFICIAL_BUNDLES);

    if (!stream) {
      return new Response(JSON.stringify({ response: validText, provider: providerUsed }), {
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
