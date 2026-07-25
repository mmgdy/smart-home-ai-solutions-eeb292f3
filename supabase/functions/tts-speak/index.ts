// Keyless Text-to-Speech via Google Translate TTS endpoint.
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { clamp, cleanString } from "../_shared/validate.ts";

function detectLang(text: string): string {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)
    ? "ar"
    : "en";
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60000, maxRequests: 15 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  try {
    const { text: rawText, lang } = await req.json();
    const text = cleanString(rawText, 3000);
    if (!text) {
      return new Response(JSON.stringify({ error: "text required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanText = text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[*_#`~]/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim();

    const language = lang || detectLang(cleanText);

    // Google Translate TTS has a ~200 char limit per request; chunk longer text.
    const chunks: string[] = [];
    const MAX_TTS_LEN = 190;
    let remaining = cleanText;
    while (remaining.length > 0) {
      let cut = remaining.slice(0, MAX_TTS_LEN);
      const lastSpace = cut.lastIndexOf(" ");
      if (lastSpace > 30 && remaining.length > MAX_TTS_LEN) {
        cut = cut.slice(0, lastSpace);
      }
      chunks.push(cut.trim());
      remaining = remaining.slice(cut.length).trim();
    }

    const audioPromises = chunks.map(async (chunk) => {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${language}&client=tw-ob`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0",
          Referer: "https://translate.google.com/",
        },
      });
      if (!res.ok) throw new Error(`TTS chunk failed: ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    });

    const audioBuffers = await Promise.all(audioPromises);
    const totalLen = audioBuffers.reduce((sum, buf) => sum + buf.length, 0);
    const combined = new Uint8Array(totalLen);
    let offset = 0;
    for (const buf of audioBuffers) {
      combined.set(buf, offset);
      offset += buf.length;
    }

    const base64Audio = base64Encode(combined);
    return new Response(
      JSON.stringify({ audio: base64Audio, format: "mp3", language }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("TTS error:", error);
    return new Response(
      JSON.stringify({ error: "Text-to-speech failed. Try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
