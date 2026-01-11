import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are Baytzaki's AI Smart Home Consultant - an expert in smart home technology, automation, and IoT devices. Your role is to:

1. **Understand customer needs**: Ask about their home size, lifestyle, priorities (security, comfort, energy savings), and budget
2. **Recommend products**: Suggest specific smart home products from categories like:
   - Smart Lighting (Philips Hue, LIFX, Nanoleaf)
   - Smart Security (Ring, Arlo, Eufy cameras and doorbells)
   - Smart Locks (August, Yale, Schlage)
   - Smart Thermostats (Nest, Ecobee)
   - Smart Hubs (Samsung SmartThings, Hubitat)
   - Smart Sensors (motion, door/window, water leak)
   - Voice Assistants (Amazon Echo, Google Nest)

3. **Explain compatibility**: Help customers understand protocols (Zigbee, Z-Wave, WiFi, Matter) and which devices work together
4. **Create packages**: Build personalized bundles based on their requirements
5. **Provide setup tips**: Offer guidance on installation and automation scenarios

Be friendly, knowledgeable, and concise. Use bullet points for product recommendations. Ask clarifying questions when needed. Always consider the customer's technical comfort level.

If asked about prices, provide general ranges but encourage them to check the products page for current pricing.`;

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
