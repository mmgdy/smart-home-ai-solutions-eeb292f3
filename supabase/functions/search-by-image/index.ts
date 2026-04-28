import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType = "image/jpeg" } = await req.json();
    if (!imageBase64) throw new Error("imageBase64 is required");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const model = "google/gemini-2.5-pro";

    const prompt = `You are a smart home product expert. Analyze this image and identify smart home devices, electronics, or room features visible.
Return a JSON object with:
- "keywords": array of 3-6 search terms for smart home products that would work in this space (e.g. "smart bulb", "zigbee switch", "motion sensor", "smart plug")
- "description": one sentence describing what you see

Focus on smart home automation products. Be specific with product types.
Return ONLY valid JSON, no markdown.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
        max_tokens: 256,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI API error: ${err}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content ?? "{}";

    let parsed: { keywords?: string[]; description?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { keywords: [], description: "" };
    }

    return new Response(
      JSON.stringify({
        success: true,
        keywords: parsed.keywords ?? [],
        description: parsed.description ?? "",
        query: (parsed.keywords ?? []).join(" "),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
