import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const toTwoDigits = (value: number) => value.toString().padStart(2, "0");

const getLocalTransactionTime = () => {
  const now = new Date();
  return `${now.getFullYear()}${toTwoDigits(now.getMonth() + 1)}${toTwoDigits(now.getDate())}${toTwoDigits(now.getHours())}${toTwoDigits(now.getMinutes())}`;
};

const normalizeHexKey = (secretKey: string) => {
  const normalized = secretKey.replace(/\s+/g, "");
  if (!/^[0-9a-fA-F]+$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error("PAYSKY_SECRET_KEY must be an even-length hex string");
  }
  return normalized;
};

// Helper function to generate HMAC SHA-256
async function generateSecureHash(params: Record<string, string>, secretKey: string): Promise<string> {
  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys.map((key) => `${key}=${params[key]}`).join("&");

  const normalizedSecret = normalizeHexKey(secretKey);
  const keyBytes = new Uint8Array(
    normalizedSecret.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(queryString)
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { orderId, amount, merchantReference } = await req.json();

    const PAYSKY_MERCHANT_ID = Deno.env.get("PAYSKY_MERCHANT_ID");
    const PAYSKY_TERMINAL_ID = Deno.env.get("PAYSKY_TERMINAL_ID");
    const PAYSKY_SECRET_KEY = Deno.env.get("PAYSKY_SECRET_KEY");

    if (!PAYSKY_MERCHANT_ID || !PAYSKY_TERMINAL_ID || !PAYSKY_SECRET_KEY) {
      return new Response(
        JSON.stringify({
          error: "PaySky credentials not configured",
          message: "Please configure PAYSKY_MERCHANT_ID, PAYSKY_TERMINAL_ID, and PAYSKY_SECRET_KEY",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountInPiasters = Math.round(amountValue * 100);
    const dateTimeLocalTrxn = getLocalTransactionTime();

    const hashParams = {
      Amount: amountInPiasters.toString(),
      DateTimeLocalTrxn: dateTimeLocalTrxn,
      MerchantId: PAYSKY_MERCHANT_ID,
      MerchantReference: merchantReference || orderId || `BZ_${Date.now()}`,
      TerminalId: PAYSKY_TERMINAL_ID,
    };

    const secureHash = await generateSecureHash(hashParams, PAYSKY_SECRET_KEY);

    return new Response(
      JSON.stringify({
        success: true,
        config: {
          MID: PAYSKY_MERCHANT_ID,
          TID: PAYSKY_TERMINAL_ID,
          AmountTrxn: amountInPiasters,
          MerchantReference: hashParams.MerchantReference,
          TrxDateTime: dateTimeLocalTrxn,
          SecureHash: secureHash,
        },
        lightboxUrl: "https://cube.paysky.io:6006/js/LightBox.js",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("PaySky checkout error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
