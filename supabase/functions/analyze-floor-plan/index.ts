// Analyze floor plan / room photo — powered by Google Gemini 2.0 Flash (free tier).
// Gemini detects rooms and places smart-home devices on the image, returning
// a structured JSON the frontend overlays on the floor plan.
//
// Gemini free tier: 1,500 req/day, 15 req/min.
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { checkBodySize } from "../_shared/validate.ts";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface FloorPlanAnalysis {
  roomsDetected: Array<{ type: string; name: string; count: number }>;
  suggestedFeatures: Array<{ roomType: string; features: string[] }>;
  devicePlacements: Array<{ type: string; emoji: string; x: number; y: number; room: string; label: string }>;
  estimatedArea?: number;
  notes?: string;
}

const PHOTO_SYSTEM_PROMPT = `You are a smart home consultant analyzing a real photo of a home room. Return ONLY valid JSON with no markdown:
{
  "roomsDetected": [{"type":"living_room","name":"Living Room","count":1}],
  "suggestedFeatures": [{"roomType":"living_room","features":["smart_lighting","smart_curtains"]}],
  "devicePlacements": [{"type":"smart_switch","emoji":"💡","x":25,"y":40,"room":"Living Room","label":"Smart Light Switch"}],
  "notes": "Modern living room"
}`;

const FALLBACK_ANALYSIS: FloorPlanAnalysis = {
  roomsDetected: [{ type: "unknown", name: "Room", count: 1 }],
  suggestedFeatures: [
    { roomType: "unknown", features: ["smart_lighting", "smart_plug", "motion_sensor"] },
  ],
  devicePlacements: [
    { type: "smart_bulb", emoji: "💡", x: 50, y: 30, room: "Room", label: "Smart Bulb" },
  ],
  notes: "Could not analyze photo in detail",
};

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
          error: "Floor plan analysis requires a Gemini API key. Please set GEMINI_API_KEY in Supabase secrets.",
          fallback: FALLBACK_ANALYSIS,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PHOTO_SYSTEM_PROMPT },
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
        JSON.stringify({ success: false, error: "Analysis failed. Try again later.", fallback: FALLBACK_ANALYSIS }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let parsed: FloorPlanAnalysis;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]) as FloorPlanAnalysis;
      } else {
        parsed = FALLBACK_ANALYSIS;
      }
    } catch {
      parsed = FALLBACK_ANALYSIS;
    }

    return new Response(
      JSON.stringify({ success: true, analysis: parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Floor-plan error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Analysis failed. Try again later.", fallback: FALLBACK_ANALYSIS }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
