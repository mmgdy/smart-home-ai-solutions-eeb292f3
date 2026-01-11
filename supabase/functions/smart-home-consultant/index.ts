import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch products from the database
    let productsInfo = "";
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: products } = await supabase
        .from("products")
        .select("name, description, price, brand, protocol, stock, slug")
        .gt("stock", 0);
      
      if (products && products.length > 0) {
        productsInfo = products.map(p => 
          `- **${p.name}** (${p.brand || 'Baytzaki'}): ${p.description || 'Smart home device'} - Price: $${p.price} - Protocol: ${p.protocol || 'WiFi'} - [View Product](/products/${p.slug})`
        ).join("\n");
      }
    }

    const systemPrompt = `You are Baytzaki's AI Smart Home Consultant - an expert in smart home technology. Your role is to help customers find the RIGHT products from our store.

**CRITICAL: You can ONLY recommend products from our inventory listed below. Do NOT suggest any products that are not in this list.**

## Our Available Products:
${productsInfo || "No products currently available in stock."}

## Your Role:
1. **Understand customer needs**: Ask about their home size, lifestyle, priorities (security, comfort, energy savings), and budget
2. **Recommend products**: ONLY suggest products from the list above that match their needs
3. **Explain compatibility**: Help customers understand protocols and which of our devices work together
4. **Create packages**: Build personalized bundles from our available products
5. **Provide setup tips**: Offer guidance on installation and automation scenarios

## Guidelines:
- Be friendly, knowledgeable, and concise
- Use bullet points for product recommendations
- Always include the product link when recommending: [Product Name](/products/slug)
- If we don't have a product that meets their needs, be honest and let them know
- When mentioning prices, use the actual prices from our inventory
- Ask clarifying questions when needed to better match products to their needs`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Smart home consultant error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
