import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import {
  XPAY_API_BASE,
  buildXPayLineItems,
  normalizeEgyptianPhone,
  sanitizeRedirectOrigin,
  validateKeyForMode,
} from "../_shared/xpay.ts";
import { readXPayPublicConfig, resolveXPaySecretKey } from "../_shared/xpay-secrets.ts";

const PAID_OR_FINAL_STATUSES = new Set(["paid", "processing", "shipped", "delivered"]);

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60_000, maxRequests: 30 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ success: false, error: "Too many requests" }), {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)),
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: Record<string, any> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const action = typeof body.action === "string" ? body.action : "create-session";
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";

    if (!orderId) {
      return new Response(JSON.stringify({ success: false, error: "orderId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Action 1: Read authoritative order & payment status from DB ────
    if (action === "order-status") {
      const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
      const paymentToken = typeof body.paymentToken === "string" ? body.paymentToken.trim() : "";

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .select("id, total, status, created_at, stripe_session_id, shipping_address")
        .eq("id", orderId)
        .maybeSingle();

      if (orderErr || !order) {
        return new Response(JSON.stringify({ success: false, error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sa = (order.shipping_address ?? {}) as Record<string, any>;
      const tokenMatches = Boolean(paymentToken && sa.paymentToken && paymentToken === sa.paymentToken);
      const sessionMatches = Boolean(sessionId && order.stripe_session_id && sessionId === order.stripe_session_id);

      if (!tokenMatches && !sessionMatches) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized order status request" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const xpayInfo = (sa.xpay ?? {}) as Record<string, any>;
      const isPaid = order.status === "paid" || order.status === "processing" || order.status === "shipped" || order.status === "delivered" || sa.isPaid === true;

      return new Response(
        JSON.stringify({
          success: true,
          order: {
            id: order.id,
            status: order.status,
            total: order.total,
            created_at: order.created_at,
            paymentMethod: sa.paymentMethod || "xpay",
            isPaid,
            xpay: {
              sessionId: order.stripe_session_id || xpayInfo.sessionId || null,
              mode: xpayInfo.mode || null,
              paymentStatus: xpayInfo.paymentStatus || (isPaid ? "paid" : "unpaid"),
              paidAt: xpayInfo.paidAt || null,
              failureReason: xpayInfo.failureReason || null,
            },
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Action 2: Create XPay Checkout Session (server-side secret key) ──
    if (action !== "create-session") {
      return new Response(JSON.stringify({ success: false, error: "Unsupported action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentToken = typeof body.paymentToken === "string" ? body.paymentToken.trim() : "";
    const language = body.language === "ar" ? "ar" : "en";
    const origin = typeof body.origin === "string" ? body.origin.trim() : undefined;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, user_id, email, total, status, stripe_session_id, shipping_address")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ success: false, error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sa = (order.shipping_address ?? {}) as Record<string, any>;
    if (!sa.paymentToken || paymentToken !== sa.paymentToken) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized checkout session request" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (PAID_OR_FINAL_STATUSES.has(String(order.status)) || sa.isPaid === true) {
      return new Response(JSON.stringify({ success: false, error: "Order is already paid" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const xpayConfig = await readXPayPublicConfig(supabase);
    if (!xpayConfig.enabled) {
      return new Response(JSON.stringify({ success: false, error: "Card payments are currently disabled" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pkCheck = validateKeyForMode("publishable", xpayConfig.mode, xpayConfig.publishableKey);
    const secretKey = await resolveXPaySecretKey(supabase, xpayConfig.mode);
    const skCheck = secretKey
      ? validateKeyForMode("secret", xpayConfig.mode, secretKey)
      : { ok: false as const, error: "Missing secret key" };

    if (!pkCheck.ok || !skCheck.ok || !secretKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Card payment gateway is not fully configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_name, quantity, price")
      .eq("order_id", order.id);

    const { lineItems, totalMinor } = buildXPayLineItems({
      orderId: order.id,
      orderTotalEgp: Number(order.total),
      items: (orderItems ?? []).map((i: any) => ({
        name: String(i.product_name || "Product"),
        quantity: Number(i.quantity) || 1,
        priceEgp: Number(i.price) || 0,
      })),
      shippingCostEgp: Number(sa.shippingCost) || 0,
      installationFeeEgp: sa.installation?.requested ? Number(sa.installation?.fee) || 0 : 0,
      cardFeeEgp: Number(sa.cardFee) || 0,
    });

    const redirectOrigin = sanitizeRedirectOrigin(origin, xpayConfig.mode);
    const afterCompletionUrl = `${redirectOrigin}/order-confirmation?orderId=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`;

    const customerName = `${String(sa.firstName || "").trim()} ${String(sa.lastName || "").trim()}`.trim();
    const customerPhone = normalizeEgyptianPhone(sa.phone);
    const customerDetails: Record<string, string> = {};
    if (customerName) customerDetails.name = customerName.slice(0, 120);
    if (order.email) customerDetails.email = String(order.email).trim();
    if (customerPhone) customerDetails.phone = customerPhone;

    const payload: Record<string, unknown> = {
      mode: "payment",
      uiMode: "embedded",
      locale: language,
      afterCompletion: {
        type: "redirect",
        redirect: { url: afterCompletionUrl },
      },
      lineItems,
      ...(Object.keys(customerDetails).length > 0 ? { customerDetails } : {}),
      ...(order.user_id ? { externalCustomerId: String(order.user_id) } : {}),
      metadata: {
        azka_order_id: order.id,
        order_ref: order.id.slice(0, 8).toUpperCase(),
        mode: xpayConfig.mode,
      },
    };

    const idempotencyKey = `azka-${order.id}-${totalMinor}-${xpayConfig.mode}`;
    const xpayRes = await fetch(`${XPAY_API_BASE}/checkout/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    const xpayJson: Record<string, any> = await xpayRes.json().catch(() => ({}));
    if (!xpayRes.ok || !xpayJson?.clientSecret || !xpayJson?.id) {
      // Never log headers, request Authorization, or secret keys
      console.error("XPay session creation failed:", {
        status: xpayRes.status,
        code: xpayJson?.code || xpayJson?.error?.code || null,
        mode: xpayConfig.mode,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error:
            typeof xpayJson?.message === "string"
              ? xpayJson.message
              : "Failed to initialize card payment session",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nowIso = new Date().toISOString();
    const updatedShippingAddress = {
      ...sa,
      paymentMethod: "xpay",
      xpay: {
        ...(sa.xpay ?? {}),
        sessionId: String(xpayJson.id),
        mode: xpayConfig.mode,
        amountTotal: Number(xpayJson.amountTotal) || totalMinor,
        currency: String(xpayJson.currency || "EGP"),
        paymentStatus: String(xpayJson.paymentStatus || "unpaid"),
        createdAt: nowIso,
      },
    };

    await supabase
      .from("orders")
      .update({
        status: "pending_payment",
        stripe_session_id: String(xpayJson.id),
        shipping_address: updatedShippingAddress,
        updated_at: nowIso,
      })
      .eq("id", order.id);

    // Return ONLY publishable-safe session fields (never secret key)
    return new Response(
      JSON.stringify({
        success: true,
        sessionId: String(xpayJson.id),
        clientSecret: String(xpayJson.clientSecret),
        checkoutUrl: typeof xpayJson.url === "string" ? xpayJson.url : null,
        amountTotal: Number(xpayJson.amountTotal) || totalMinor,
        currency: String(xpayJson.currency || "EGP"),
        mode: xpayConfig.mode,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("xpay-checkout error:", err?.message || "Unexpected error");
    return new Response(
      JSON.stringify({ success: false, error: "Could not start payment session" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
