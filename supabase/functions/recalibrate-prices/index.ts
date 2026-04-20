import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyAdminToken(supabase: any, token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = atob(token);
    const [adminId] = decoded.split(":");
    const { data } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", `admin_token_${adminId}`)
      .single();
    return !!data && data.value === token;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { token, batchSize = 10 } = await req.json();

    if (!(await verifyAdminToken(supabase, token))) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Pick products with suspiciously low or zero price, or oldest updated
    const { data: products } = await supabase
      .from("products")
      .select("id, name, brand, price, protocol")
      .order("updated_at", { ascending: true })
      .limit(batchSize);

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ success: true, results: [], message: "No products to recalibrate" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    for (const p of products) {
      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are a smart-home pricing expert for the Egyptian market (EGP). Given a product, estimate its realistic retail price in EGP based on Amazon Egypt, Noon, Jumia, and B.TECH. Use real market knowledge. Return both retail price and original/MSRP. Be realistic — most SONOFF/MOES items are 400-3000 EGP, FIBARO/HELTUN 4000-15000 EGP, hubs 1500-6000 EGP.`,
              },
              {
                role: "user",
                content: `Product: ${p.name}\nBrand: ${p.brand || "unknown"}\nProtocol: ${p.protocol || "unknown"}\nCurrent price: ${p.price} EGP`,
              },
            ],
            tools: [{
              type: "function",
              function: {
                name: "set_price",
                parameters: {
                  type: "object",
                  properties: {
                    market_price_egp: { type: "number", description: "Realistic current retail price in EGP" },
                    original_price_egp: { type: "number", description: "Original/MSRP price in EGP (10-20% higher than market_price)" },
                    confidence: { type: "string", enum: ["high", "medium", "low"] },
                    reasoning: { type: "string" },
                  },
                  required: ["market_price_egp", "original_price_egp", "confidence"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "set_price" } },
          }),
        });

        if (!aiResp.ok) {
          const t = await aiResp.text();
          results.push({ id: p.id, name: p.name, success: false, error: `AI ${aiResp.status}: ${t.substring(0, 100)}` });
          continue;
        }

        const aiData = await aiResp.json();
        const args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (!args) {
          results.push({ id: p.id, name: p.name, success: false, error: "no AI response" });
          continue;
        }
        const { market_price_egp, original_price_egp, confidence } = JSON.parse(args);

        if (confidence === "low") {
          results.push({ id: p.id, name: p.name, success: false, error: "low confidence", suggested: market_price_egp });
          continue;
        }

        await supabase.from("products").update({
          price: Math.round(market_price_egp),
          original_price: Math.round(original_price_egp),
          updated_at: new Date().toISOString(),
        }).eq("id", p.id);

        results.push({
          id: p.id, name: p.name, success: true,
          old_price: p.price, new_price: Math.round(market_price_egp), confidence,
        });
      } catch (e) {
        results.push({ id: p.id, name: p.name, success: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(JSON.stringify({ success: true, results, processed: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recalibrate-prices error:", e);
    return new Response(JSON.stringify({
      success: false,
      error: e instanceof Error ? e.message : String(e),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
