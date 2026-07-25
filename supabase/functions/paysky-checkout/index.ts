import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { clamp } from "../_shared/validate.ts";

const toTwoDigits = (value: number) => value.toString().padStart(2, "0");

const getLocalTransactionTime = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}${get("month")}${get("day")}${hour}${get("minute")}${get("second")}`;
};

const normalizeHexKey = (secretKey: string) => {
  const normalized = secretKey.replace(/\s+/g, "");
  if (!/^[0-9a-fA-F]+$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error("PAYSKY_SECRET_KEY must be an even-length hex string");
  }
  return normalized;
};

async function generateSecureHash(params: Record<string, string>, secretKey: string): Promise<string> {
  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys.map((key) => `${key}=${params[key]}`).join("&");
  const encoder = new TextEncoder();
  const keyBuffer = new Uint8Array(
    normalizeHexKey(secretKey).match(/.{2}/g)!.map((byte) => parseInt(byte, 16))
  );
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(queryString));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60000, maxRequests: 10 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  try {
    const {
      merchantId,
      terminalId,
      amount,
      currency = "EGP",
      orderId,
      customerEmail,
      customerName,
      description = "Baytzaki Smart Home Purchase",
      callbackUrl,
      returnUrl,
      successUrl,
    } = await req.json();

    if (!merchantId || !terminalId || !amount || !orderId || !customerEmail) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secretKey = Deno.env.get("PAYSKY_SECRET_KEY");
    if (!secretKey) {
      return new Response(JSON.stringify({ error: "PaySky not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transactionTime = getLocalTransactionTime();

    const params: Record<string, string> = {
      merchantId: String(merchantId),
      terminalId: String(terminalId),
      amount: String(amount),
      currency: String(currency),
      orderId: String(orderId),
      transactionTime,
    };

    const secureHash = await generateSecureHash(params, secretKey);

    const checkoutData = {
      merchantId: String(merchantId),
      terminalId: String(terminalId),
      amount: Number(amount),
      currency: String(currency),
      orderId: String(orderId),
      customerEmail: String(customerEmail),
      customerName: customerName ? String(customerName) : undefined,
      description: String(description),
      callbackUrl: callbackUrl ? String(callbackUrl) : undefined,
      returnUrl: returnUrl ? String(returnUrl) : undefined,
      successUrl: successUrl ? String(successUrl) : undefined,
      transactionTime,
      secureHash,
      lang: "ar",
    };

    return new Response(JSON.stringify({ success: true, checkoutData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("PaySky checkout error:", error);
    return new Response(JSON.stringify({ error: "Checkout generation failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
