// High-quality Text-to-Speech via Lovable AI Gateway (OpenAI-compatible).
// Returns MP3 bytes the browser can play directly.
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, voice = "alloy", lang } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    // Lovable AI Gateway exposes OpenAI's /v1/audio/speech for TTS.
    const cleanText = text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[*_#`~]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1500);

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/tts-1",
        voice,
        input: cleanText,
        format: "mp3",
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("TTS gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "tts_failed", status: resp.status }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buf = await resp.arrayBuffer();
    const audioContent = base64Encode(new Uint8Array(buf));

    return new Response(JSON.stringify({ audioContent, format: "mp3" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tts-speak error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
