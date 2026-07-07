// Site assistant — bilingual AI search & site guide.
// Uses Lovable AI Gateway; streams SSE chunks to the client.
// Given a user question, fetches top matching products/bundles/categories
// from Supabase and returns a helpful reply with product recommendations.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { query, language = "en", history = [] } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pull a compact catalog for grounding. Keep it small and cheap.
    const [{ data: products }, { data: categories }] = await Promise.all([
      supabase
        .from("products")
        .select("name, slug, price, brand, category_id, description")
        .limit(80),
      supabase.from("categories").select("slug, name, description"),
    ]);

    const catById: Record<string, string> = {};
    (categories ?? []).forEach((c: any) => { catById[c.slug] = c.name; });

    // Very lightweight keyword scoring against name/desc/brand
    const q = query.toLowerCase();
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

    const messages = [
      { role: "system", content: system },
      ...history.slice(-6),
      { role: "user", content: query },
    ];

    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({ model: MODEL, messages, stream: true }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: t.slice(0, 300) }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(resp.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});