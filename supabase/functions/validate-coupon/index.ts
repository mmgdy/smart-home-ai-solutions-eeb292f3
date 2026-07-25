import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { clamp } from "../_shared/validate.ts";

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60000, maxRequests: 20 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ valid: false, message: "Too many requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { code, orderAmount = 0 } = await req.json();
    const trimmedCode = typeof code === "string" ? code.trim().toUpperCase() : "";

    if (!trimmedCode) {
      return new Response(JSON.stringify({ valid: false, message: "Coupon code is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", trimmedCode)
      .single();

    if (error || !coupon) {
      return new Response(
        JSON.stringify({ valid: false, message: "Invalid coupon code" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (coupon.is_active === false) {
      return new Response(
        JSON.stringify({ valid: false, message: "This coupon is no longer active" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    if (new Date(coupon.start_date) > now || new Date(coupon.end_date) < now) {
      return new Response(
        JSON.stringify({ valid: false, message: "This coupon has expired" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (coupon.usage_count >= coupon.usage_limit) {
      return new Response(
        JSON.stringify({ valid: false, message: "This coupon has reached its usage limit" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (orderAmount && orderAmount < (coupon.min_order_amount || 0)) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: `Minimum order amount of ${coupon.min_order_amount} EGP required`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let discountAmount = 0;
    if (coupon.discount_type === "percentage") {
      discountAmount = (orderAmount * coupon.discount_value) / 100;
    } else {
      discountAmount = coupon.discount_value;
    }

    return new Response(
      JSON.stringify({
        valid: true,
        coupon: {
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          discount_amount: Math.round(discountAmount * 100) / 100,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Coupon validation error:", error);
    return new Response(
      JSON.stringify({ valid: false, message: "Coupon validation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
