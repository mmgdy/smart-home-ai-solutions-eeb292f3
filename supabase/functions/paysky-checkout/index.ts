import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";

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

function getSecretKeyBytes(secretKey: string): Uint8Array {
  const cleaned = secretKey.trim().replace(/\s+/g, "");
  if (/^[0-9a-fA-F]+$/.test(cleaned) && cleaned.length % 2 === 0) {
    return new Uint8Array(cleaned.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)));
  }
  return new TextEncoder().encode(cleaned);
}

async function generateSecureHash(params: Record<string, string>, secretKey: string): Promise<string> {
  const sortedKeys = Object.keys(params).sort();
  const queryString = sortedKeys.map((key) => `${key}=${params[key]}`).join("&");
  const encoder = new TextEncoder();
  const keyBuffer = getSecretKeyBytes(secretKey);
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
    .join("")
    .toUpperCase();
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
    const body = await req.json();
    const orderId = body.orderId;
    const returnUrl = body.returnUrl || "";
    const language = body.language || body.lang || "ar";

    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Validate the order exists in the database (SEC-04)
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, total, email, status, shipping_address")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Recalculate and verify the expected order total on the server (SEC-04)
    const orderTotal = Number(order.total);
    if (isNaN(orderTotal) || orderTotal <= 0) {
      return new Response(JSON.stringify({ error: "Invalid order total" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PaySky LightBox requires amount in Egyptian piasters (100 piasters = 1 EGP)
    const amountPiasters = Math.round(orderTotal * 100);

    // 3. Retrieve PaySky configuration securely from environment or site_info
    let secretKey = Deno.env.get("PAYSKY_SECRET_KEY");
    let merchantId = Deno.env.get("PAYSKY_MERCHANT_ID");
    let terminalId = Deno.env.get("PAYSKY_TERMINAL_ID");

    if (!secretKey || !merchantId || !terminalId) {
      try {
        const { data: paymentConfigs } = await supabaseAdmin
          .from("site_info")
          .select("key, value")
          .eq("section", "payment")
          .in("key", ["paysky_mid", "paysky_tid", "paysky_secret_key"]);

        const map: Record<string, string> = {};
        (paymentConfigs || []).forEach((row: any) => {
          if (row.key && row.value) map[row.key] = row.value;
        });

        if (!secretKey) secretKey = map["paysky_secret_key"];
        if (!merchantId) merchantId = map["paysky_mid"];
        if (!terminalId) terminalId = map["paysky_tid"];
      } catch (dbErr) {
        console.warn("Could not query payment settings from site_info:", dbErr);
      }
    }

    if (!merchantId) merchantId = body.merchantId || "8386003528";
    if (!terminalId) terminalId = body.terminalId || "93655786";

    // Strictly enforce secretKey presence — NO hardcoded fallback secret (SEC-02)
    if (!secretKey) {
      console.error("PAYSKY_SECRET_KEY is not configured on the server");
      return new Response(JSON.stringify({ error: "Payment gateway configuration error: Secret key missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transactionTime = getLocalTransactionTime();
    const cleanOrderId = String(order.id).replace(/-/g, "").slice(0, 8);
    const merchantRef = `BZ_${cleanOrderId}_${Date.now()}`;

    // Compute PaySky LightBox HMAC hash (SEC-04)
    const lightboxParams: Record<string, string> = {
      Amount: String(amountPiasters),
      DateTimeLocalTrxn: transactionTime,
      MerchantId: String(merchantId),
      MerchantReference: merchantRef,
      TerminalId: String(terminalId),
    };

    const secureHash = await generateSecureHash(lightboxParams, secretKey);

    const customerEmail = String(order.email || body.customerEmail || "").trim();
    const customerName = order.shipping_address?.firstName
      ? `${order.shipping_address.firstName} ${order.shipping_address.lastName || ""}`.trim()
      : (body.customerName || "");
    const customerMobile = order.shipping_address?.phone
      ? String(order.shipping_address.phone).trim()
      : (body.customerMobile || "");

    const checkoutData = {
      merchantId: String(merchantId),
      terminalId: String(terminalId),
      amount: amountPiasters,
      currency: "EGP",
      orderId: String(order.id),
      customerEmail,
      customerName: customerName || undefined,
      customerMobile: customerMobile || undefined,
      description: body.description || "AzkaSmart Smart Home Purchase",
      callbackUrl: body.callbackUrl || undefined,
      returnUrl: returnUrl || undefined,
      transactionTime,
      merchantReference: merchantRef,
      secureHash,
      lang: language === "en" ? "en" : "ar",
    };

    return new Response(JSON.stringify({
      success: true,
      paymentUrl: "https://cube.paysky.io:6006/Payment/Index",
      merchantId: String(merchantId),
      terminalId: String(terminalId),
      orderId: String(order.id),
      amount: amountPiasters,
      hash: secureHash,
      secureHash,
      merchantReference: merchantRef,
      transactionTime,
      checkoutData,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("PaySky checkout error:", error);
    return new Response(JSON.stringify({ error: "Checkout generation failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
