// Search-by-image — AzkaSmart.
// Analyzes photo and returns verified smart-home keywords grounded in AzkaSmart catalog.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { checkBodySize } from "../_shared/validate.ts";
import { loadGroundedCatalog } from "../_shared/catalog-grounding.ts";
import { visionComplete } from "../_shared/ai.ts";

const STORE_BRANDS = ["SONOFF", "Tuya", "Lezn", "Panda", "Bosch", "SIB", "ZKTeco", "Dahua", "Hikvision"];

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60000, maxRequests: 15 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded. Try again later." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  if (!(await checkBodySize(req, 5_000_000))) {
    return new Response(JSON.stringify({ success: false, error: "Request body too large. Max 5MB." }), {
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

    const cleanMime = String(mimeType).toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp"].includes(cleanMime)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid image format. JPEG, PNG, or WebP required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const prompt = `You are a smart home hardware expert for azkasmart.com.
Analyze this photo and identify any smart home devices, switches, locks, cameras, or electronics visible.
Our store stocks: Sonoff, Tuya, Lezn, Panda, ZKTeco (Smart Switches, Smart Plugs, Smart Locks, Cameras, Zigbee Hubs, Sensors, Smart Curtains).
Return a JSON object with:
- "keywords": array of 3-5 search keywords that match the items in our catalog (e.g. ["SONOFF Smart Switch", "WiFi In-Wall Relay", "Smart Touch Switch"])
- "description": one sentence in English describing the smart home hardware seen
DO NOT suggest brands we do not stock (e.g. DO NOT suggest Philips Hue, Ring, Nest, Apple).
Return ONLY valid JSON with no markdown formatting.`;

    let parsed: { keywords: string[]; description: string } = {
      keywords: ["Smart Switch", "SONOFF", "Smart Home"],
      description: "Smart home automation device",
    };
    let visionProvider = "local-fallback";

    try {
      const { text, provider } = await visionComplete({
        prompt,
        imageBase64,
        mimeType: cleanMime,
        maxTokens: 400,
      });
      visionProvider = provider;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (err) {
      console.warn("Vision search Omni-Router fallback:", err);
    }

    // Filter out banned/unstocked brands
    const catalog = await loadGroundedCatalog(supabase, 80);
    const validKeywords = (parsed.keywords || [])
      .map((k) => String(k).trim())
      .filter((k) => !/philips|ring|nest|apple|lutron|belkin/i.test(k));

    if (validKeywords.length === 0) {
      validKeywords.push("SONOFF", "Smart Switch", "Smart Lock");
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider: visionProvider,
        keywords: validKeywords,
        description: parsed.description || "",
      }),
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
