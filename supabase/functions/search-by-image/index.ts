// Search-by-image — uses Google Gemini 2.0 Flash (free tier vision model).
// Analyzes an uploaded room/product photo and returns smart-home keywords.
//
// Gemini free tier: 15 RPM, 1500 requests/day. Get a free key at
// https://aistudio.google.com/apikey and set GEMINI_API_KEY secret.
// If no key, returns a graceful error so the UI can fall back to text search.
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

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Image search requires a Gemini API key. Please set GEMINI_API_KEY in Supabase secrets.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `You are a smart home product expert. Analyze this image and identify smart home devices, electronics, or room features visible.
Return a JSON object with:
- "keywords": array of 3-6 search terms for smart home products that would work in this space (e.g. "smart bulb", "zigbee switch", "motion sensor", "smart plug")
- "description": one sentence describing what you see

Focus on smart home automation products. Be specific with product types.
Return ONLY valid JSON, no markdown.`;

    // Gemini REST API (v1beta) — supports inline_data for base64 images.
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Gemini vision error:", response.status, err.slice(0, 200));
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limit reached. Please try again in a minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Vision API error (${response.status})`);
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

    let parsed: { keywords?: string[]; description?: string };
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
      if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
      parsed = JSON.parse(jsonStr.trim());
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
