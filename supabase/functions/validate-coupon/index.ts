import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting (per cold-start instance, per IP)
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const now = Date.now();
    const bucket = rateBuckets.get(ip);
    if (!bucket || bucket.resetAt < now) {
      rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    } else {
      bucket.count += 1;
      if (bucket.count > RATE_LIMIT) {
        return new Response(JSON.stringify({ valid: false, message: "Too many requests" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { code, orderAmount } = await req.json();
    // Note: usage counter is no longer incremented via this public endpoint
    // to prevent abuse. Track usage via admin reports instead.

    if (!code) {
      return new Response(JSON.stringify({ valid: false, message: "Coupon code is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read coupons from admin_settings
    const { data: settingsRow } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "all_coupons")
      .maybeSingle();

    let coupons: any[] = [];
    if (settingsRow?.value) {
      try { coupons = JSON.parse(settingsRow.value); } catch { coupons = []; }
    }

    const coupon = coupons.find((c: any) => c.code === String(code).toUpperCase().trim());

    if (!coupon) {
      return new Response(JSON.stringify({ valid: false, message: "Invalid coupon code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!coupon.is_active) {
      return new Response(JSON.stringify({ valid: false, message: "Coupon is not active" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return new Response(JSON.stringify({ valid: false, message: "Coupon has expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return new Response(JSON.stringify({ valid: false, message: "Coupon is not yet valid" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (coupon.min_order_amount && Number(orderAmount) < coupon.min_order_amount) {
      return new Response(JSON.stringify({
        valid: false,
        message: `Minimum order amount is ${coupon.min_order_amount} EGP`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return new Response(JSON.stringify({ valid: false, message: "Coupon usage limit reached" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate discount
    const discount = coupon.discount_type === "percentage"
      ? Math.round(Number(orderAmount) * coupon.discount_value / 100)
      : Math.min(coupon.discount_value, Number(orderAmount));

    return new Response(JSON.stringify({
      valid: true,
      code: coupon.code,
      discount,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("validate-coupon error:", e);
    return new Response(JSON.stringify({ valid: false, message: "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
