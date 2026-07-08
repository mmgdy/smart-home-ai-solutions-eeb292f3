// AI-powered checkout compatibility check.
// Input: { items: [{ id, name, brand?, protocol?, category?, quantity }], language: 'en'|'ar' }
// Output: {
//   summary: string,
//   issues: [{ severity: 'warning'|'info', message: string }],
//   suggestions: [{ productId, name, price, image_url, slug, reason }]
// }
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
    const { items = [], language = "en" } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ summary: "", issues: [], suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch a compact candidate catalog (accessories & common companions).
    const { data: catalog } = await supabase
      .from("products")
      .select("id, name, slug, price, brand, protocol, category_id, image_url, description")
      .gt("stock", 0)
      .limit(120);

    const cartLines = items.map((i: any) =>
      `- ${i.name}${i.brand ? ` (${i.brand})` : ""}${i.protocol ? ` [${i.protocol}]` : ""} x${i.quantity ?? 1}`
    ).join("\n");

    const catalogLines = (catalog ?? []).map((p: any) =>
      `${p.id} | ${p.name} | EGP ${p.price} | ${p.brand ?? "-"} | ${p.protocol ?? "-"}`
    ).join("\n");

    const system = `You are Baytzaki's smart-home compatibility checker.
Review the customer's cart and identify:
1) Compatibility problems (mismatched protocols like Zigbee vs Z-Wave, missing hubs/bridges, mixed ecosystems).
2) Missing essential accessories (e.g. smart bulbs without a bridge, cameras without SD card/hub, door lock without gateway, curtain motor without power supply).
Then recommend up to 4 products from the catalog below that solve those gaps. Only recommend items whose id is in the catalog.

Reply STRICT JSON only, no prose, matching:
{"summary":"one short sentence","issues":[{"severity":"warning"|"info","message":"..."}],"suggestions":[{"productId":"<id from catalog>","reason":"why they need it"}]}

Language: ${language === "ar" ? "Arabic" : "English"}. Keep messages short and friendly.`;

    const user = `CART:\n${cartLines}\n\nCATALOG (id | name | price | brand | protocol):\n${catalogLines}`;

    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: t.slice(0, 300) }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const j = await resp.json();
    const raw = j?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
    }

    const cartIds = new Set(items.map((i: any) => String(i.id)));
    const byId = new Map((catalog ?? []).map((p: any) => [p.id, p]));
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    const enriched = suggestions
      .map((s: any) => {
        const p = byId.get(s.productId);
        if (!p || cartIds.has(p.id)) return null;
        return {
          productId: p.id,
          name: p.name,
          slug: p.slug,
          price: p.price,
          image_url: p.image_url,
          brand: p.brand,
          reason: String(s.reason ?? ""),
        };
      })
      .filter(Boolean)
      .slice(0, 4);

    return new Response(JSON.stringify({
      summary: String(parsed.summary ?? ""),
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 6) : [],
      suggestions: enriched,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});