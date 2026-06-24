// Keyless Text-to-Speech via Google Translate TTS endpoint.
// Returns MP3 bytes (base64) the browser can play directly.
// Supports Arabic (ar), English (en), and auto-detects language.
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function detectLang(text: string): string {
  // Arabic Unicode range check
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
    ? "ar"
    : "en";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, lang } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean markdown before sending to TTS
    const cleanText = text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[*_#`~]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1900);

    const language = lang || detectLang(cleanText);

    // Google Translate TTS has a ~200 char limit per request, so chunk longer text.
    const chunks: string[] = [];
    for (let i = 0; i < cleanText.length; i += 190) {
      chunks.push(cleanText.slice(i, i + 190));
    }

    const audioBuffers: Uint8Array[] = [];

    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${language}&client=tw-ob`;
      const resp = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      });

      if (!resp.ok) {
        const t = await resp.text();
        console.error("TTS error for chunk:", resp.status, t);
        continue;
      }

      const buf = new Uint8Array(await resp.arrayBuffer());
      if (buf.length > 0) audioBuffers.push(buf);
    }

    if (audioBuffers.length === 0) {
      return new Response(JSON.stringify({ error: "tts_failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Concatenate MP3 chunks into one buffer
    const totalLength = audioBuffers.reduce((sum, b) => sum + b.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of audioBuffers) {
      merged.set(buf, offset);
      offset += buf.length;
    }

    const audioContent = base64Encode(merged);

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
