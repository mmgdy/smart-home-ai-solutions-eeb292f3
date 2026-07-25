// Search-by-image — uses Google Gemini 2.0 Flash (free tier vision model).
// Analyzes an uploaded room/product photo and returns smart-home keywords.
//
// Gemini free tier: 15 RPM, 1500 requests/day. Get a free key at
// https://aistudio.google.com/apikey and set GEMINI_API_KEY secret.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { clamp, checkBodySize } from "../_shared/validate.ts";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60000, maxRequests: 8 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded. Try again later." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  if (!(await checkBodySize(req, 2_000_000))) {
    return new Response(JSON.stringify({ success: false, error: "Request body too large. Max 2MB." }), {
      status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { imageBase64, mimeType = "image/jpeg" } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ success: false, error: "imageBase64 is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
- "keywords": array of 3-6 search terms for smart home products that would work in this space
- "description": one sentence describing what you see
Return ONLY valid JSON, no markdown.`;

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", data);
      return new Response(
        JSON.stringify({ success: false, error: "Image analysis failed. Try again later." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let parsed: any = { keywords: [], description: "" };
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      parsed = { keywords: text.split(",").map((s: string) => s.trim()).filter(Boolean), description: text };
    }

    return new Response(
      JSON.stringify({ success: true, keywords: parsed.keywords || [], description: parsed.description || "" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Search-by-image error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Image search failed. Try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
