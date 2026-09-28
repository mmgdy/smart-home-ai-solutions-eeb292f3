// Cart Compatibility & Safety Check — AzkaSmart.
// Combines deterministic electrical & access control safety rules with AI explanations.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { chatComplete } from "../_shared/ai.ts";
import { loadGroundedCatalog } from "../_shared/catalog-grounding.ts";
import { evaluateCartCompatibility, type CartItemLike } from "../_shared/compatibility-rules.ts";

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60_000, maxRequests: 20 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  try {
    const { items = [], language = "en" } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ summary: "", issues: [], suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const fullCatalog = await loadGroundedCatalog(supabase, 250);

    // 1. Run Deterministic Compatibility & Access Control Engine
    const audit = evaluateCartCompatibility(items as CartItemLike[], fullCatalog);

    // 2. If issues were found or if we want natural language polish, run AI prompt
    const isArabic = language === "ar";
    let summary = isArabic ? audit.summaryAr : audit.summaryEn;
    const finalIssues = audit.issues.map((iss) => ({
      severity: iss.severity,
      message: isArabic ? iss.messageAr : iss.messageEn,
    }));

    // If there are issues and we have an AI gateway, generate an empathetic summary sentence
    if (audit.issues.length > 0) {
      try {
        const prompt = `You are AzkaSmart's smart home technical lead reviewing a customer's cart.
Issues detected:
${audit.issues.map((i) => `- [${i.severity}] ${i.messageEn}`).join("\n")}

Write ONE short, friendly, reassuring sentence in ${isArabic ? "Egyptian Arabic" : "English"} explaining how to make their setup 100% complete and safe. Return plain text only.`;

        const aiSummary = await chatComplete([{ role: "user", content: prompt }], { maxTokens: 80 });
        if (aiSummary && aiSummary.trim().length > 10) {
          summary = aiSummary.trim();
        }
      } catch (e) {
        // Fall back to deterministic summary
      }
    }

    // 3. Format Verified Suggestions
    const suggestions = audit.suggestions.map((s) => ({
      productId: s.productId,
      slug: s.slug,
      name: s.name,
      price: s.price,
      brand: s.brand,
      image_url: s.image_url,
      reason: isArabic ? s.reasonAr : s.reasonEn,
    }));

    return new Response(JSON.stringify({
      summary,
      issues: finalIssues,
      suggestions,
      isCompatible: audit.isCompatible,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cart-compatibility-check error:", e);
    return new Response(JSON.stringify({ error: "Compatibility check failed. Try again later." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
