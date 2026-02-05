import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { encode as hexEncode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to generate HMAC SHA-256
async function generateSecureHash(params: Record<string, string>, secretKey: string): Promise<string> {
  // Sort parameters alphabetically by key
  const sortedKeys = Object.keys(params).sort();
  
  // Construct the string: key1=value1&key2=value2&...
  const queryString = sortedKeys
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  // Decode the hex secret key
  const keyBytes = new Uint8Array(secretKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  // Create HMAC
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const encoder = new TextEncoder();
  const data = encoder.encode(queryString);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
  
  // Convert to uppercase hex
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex.toUpperCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, amount, merchantReference } = await req.json();

    // Get PaySky credentials from environment
    const PAYSKY_MERCHANT_ID = Deno.env.get("PAYSKY_MERCHANT_ID");
    const PAYSKY_TERMINAL_ID = Deno.env.get("PAYSKY_TERMINAL_ID");
    const PAYSKY_SECRET_KEY = Deno.env.get("PAYSKY_SECRET_KEY");

    if (!PAYSKY_MERCHANT_ID || !PAYSKY_TERMINAL_ID || !PAYSKY_SECRET_KEY) {
      return new Response(
        JSON.stringify({ 
          error: "PaySky credentials not configured",
          message: "Please configure PAYSKY_MERCHANT_ID, PAYSKY_TERMINAL_ID, and PAYSKY_SECRET_KEY"
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Convert amount to piasters (smallest unit - 1 EGP = 100 piasters)
    const amountInPiasters = Math.round(amount * 100);

    // Generate transaction datetime
    const now = new Date();
    const dateTimeLocalTrxn = now.toISOString()
      .replace(/[-:T]/g, '')
      .slice(0, 12); // Format: yyyyMMddHHmm

    // Parameters for secure hash
    const hashParams = {
      Amount: amountInPiasters.toString(),
      DateTimeLocalTrxn: dateTimeLocalTrxn,
      MerchantId: PAYSKY_MERCHANT_ID,
      MerchantReference: merchantReference || orderId,
      TerminalId: PAYSKY_TERMINAL_ID,
    };

    // Generate secure hash
    const secureHash = await generateSecureHash(hashParams, PAYSKY_SECRET_KEY);

    // Return configuration for LightBox
    return new Response(
      JSON.stringify({
        success: true,
        config: {
          MID: PAYSKY_MERCHANT_ID,
          TID: PAYSKY_TERMINAL_ID,
          AmountTrxn: amountInPiasters,
          MerchantReference: merchantReference || orderId,
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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
