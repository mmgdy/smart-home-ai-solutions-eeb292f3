import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { verifyXPayWebhookSignature } from "../_shared/xpay.ts";
import { resolveXPayWebhookSecrets } from "../_shared/xpay-secrets.ts";

const ALREADY_PAID_STATUSES = new Set(["paid", "processing", "shipped", "delivered"]);

async function verifyIncomingEvent(
  rawBody: string,
  signatureHeader: string | null,
  secrets: { test: string | null; live: string | null }
) {
  const candidates: Array<{ expectedMode: "test" | "live"; secret: string }> = [];
  if (secrets.test) candidates.push({ expectedMode: "test", secret: secrets.test });
  if (secrets.live && secrets.live !== secrets.test) {
    candidates.push({ expectedMode: "live", secret: secrets.live });
  }

  // Handle shared fallback secret when test & live resolved from same single XPAY_WEBHOOK_SECRET env
  const sharedSecret = Boolean(secrets.test && secrets.live && secrets.test === secrets.live);

  let lastReason = "webhook_secret_not_configured";
  for (const candidate of candidates) {
    const res = await verifyXPayWebhookSignature(rawBody, signatureHeader, candidate.secret);
    if (!res.valid) {
      lastReason = res.reason;
      continue;
    }

    if (!sharedSecret && typeof res.event.livemode === "boolean") {
      const eventMode = res.event.livemode ? "live" : "test";
      if (eventMode !== candidate.expectedMode) {
        lastReason = "livemode_secret_mismatch";
        continue;
      }
    }

    return { valid: true as const, event: res.event };
  }

  return { valid: false as const, reason: lastReason };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, xpay-signature",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Read raw body bytes as text BEFORE JSON parsing (signature is computed over exact raw bytes)
    const rawBody = await req.text();
    const signatureHeader =
      req.headers.get("XPay-Signature") || req.headers.get("xpay-signature");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const secrets = await resolveXPayWebhookSecrets(supabase);
    const verified = await verifyIncomingEvent(rawBody, signatureHeader, secrets);
    if (!verified.valid) {
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature", reason: verified.reason }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const event = verified.event;
    const eventId = typeof event.id === "string" ? event.id.trim() : "";
    const eventType = String(event.type || "");
    const obj = (event.data?.object ?? {}) as Record<string, any>;
    const sessionId =
      typeof obj.checkoutSessionId === "string"
        ? obj.checkoutSessionId
        : typeof obj.id === "string" && obj.object === "checkout.session"
        ? obj.id
        : typeof obj.id === "string" && eventType.startsWith("checkout.session.")
        ? obj.id
        : null;

    if (!eventId) {
      return new Response(JSON.stringify({ error: "Missing event id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Locate target AzkaSmart order before recording idempotency row
    const metadataOrderId =
      typeof obj.metadata?.azka_order_id === "string"
        ? obj.metadata.azka_order_id.trim()
        : null;

    let order: Record<string, any> | null = null;
    if (metadataOrderId) {
      const { data } = await supabase
        .from("orders")
        .select("id, total, status, stripe_session_id, shipping_address")
        .eq("id", metadataOrderId)
        .maybeSingle();
      if (data) order = data;
    }

    if (!order && sessionId) {
      const { data } = await supabase
        .from("orders")
        .select("id, total, status, stripe_session_id, shipping_address")
        .eq("stripe_session_id", sessionId)
        .maybeSingle();
      if (data) order = data;
    }

    // 3. Atomic event deduplication using event_id PRIMARY KEY
    const { error: dedupErr } = await supabase.from("payment_webhook_events").insert({
      event_id: eventId,
      provider: "xpay",
      event_type: eventType,
      order_id: order?.id ?? null,
      session_id: sessionId,
      livemode: Boolean(event.livemode),
    });

    if (dedupErr) {
      if (dedupErr.code === "23505") {
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      console.error("Webhook idempotency insert failed:", dedupErr.code || dedupErr.message);
      return new Response(JSON.stringify({ error: "Webhook state error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!order) {
      return new Response(JSON.stringify({ received: true, orderMatched: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sa = (order.shipping_address ?? {}) as Record<string, any>;
    const existingXpay = (sa.xpay ?? {}) as Record<string, any>;
    const nowIso = new Date().toISOString();

    // 4. Success events: checkout.session.completed / checkout.session.async_payment_succeeded
    if (
      eventType === "checkout.session.completed" ||
      eventType === "checkout.session.async_payment_succeeded"
    ) {
      const paymentStatus = String(obj.paymentStatus || "").toLowerCase();
      if (paymentStatus !== "paid") {
        // Asynchronous method (e.g. Fawry) arrived unpaid first — do not mark order paid yet
        await supabase
          .from("orders")
          .update({
            shipping_address: {
              ...sa,
              xpay: {
                ...existingXpay,
                sessionId: sessionId || existingXpay.sessionId || null,
                paymentStatus: paymentStatus || "unpaid",
                lastEventId: eventId,
              },
            },
            updated_at: nowIso,
          })
          .eq("id", order.id);

        return new Response(JSON.stringify({ received: true, pendingAsync: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Already paid/fulfilled? Never double-fulfil or double-email
      if (ALREADY_PAID_STATUSES.has(String(order.status)) || sa.isPaid === true) {
        return new Response(JSON.stringify({ received: true, alreadyPaid: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Enforce exact order ID, currency (EGP), and amount (piasters) match
      if (metadataOrderId && metadataOrderId !== order.id) {
        return new Response(JSON.stringify({ received: true, flagged: "order_id_mismatch" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const expectedMinor = Math.round(Number(order.total) * 100);
      const receivedMinor = Number(obj.amountTotal);
      const receivedCurrency = String(obj.currency || "").toUpperCase();

      if (receivedCurrency !== "EGP" || !Number.isFinite(receivedMinor) || receivedMinor !== expectedMinor) {
        await supabase
          .from("orders")
          .update({
            shipping_address: {
              ...sa,
              xpay: {
                ...existingXpay,
                sessionId: sessionId || existingXpay.sessionId || null,
                amountMismatch: {
                  expectedMinor,
                  receivedMinor: Number.isFinite(receivedMinor) ? receivedMinor : null,
                  receivedCurrency,
                  eventId,
                  at: nowIso,
                },
              },
            },
            updated_at: nowIso,
          })
          .eq("id", order.id);

        return new Response(JSON.stringify({ received: true, flagged: "amount_mismatch" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const paymentIntentId =
        typeof obj.paymentIntentId === "string"
          ? obj.paymentIntentId
          : typeof obj.paymentIntent?.id === "string"
          ? obj.paymentIntent.id
          : null;

      const { error: paidUpdateErr } = await supabase
        .from("orders")
        .update({
          status: "paid",
          stripe_session_id: sessionId || order.stripe_session_id || null,
          shipping_address: {
            ...sa,
            paymentMethod: "xpay",
            isPaid: true,
            xpay: {
              ...existingXpay,
              sessionId: sessionId || existingXpay.sessionId || null,
              paymentIntentId,
              paymentStatus: "paid",
              amountTotal: receivedMinor,
              currency: "EGP",
              livemode: Boolean(event.livemode),
              paidAt: nowIso,
              eventId,
              failureReason: null,
            },
          },
          updated_at: nowIso,
        })
        .eq("id", order.id);

      if (paidUpdateErr) {
        await supabase.from("payment_webhook_events").delete().eq("event_id", eventId);
        console.error("Failed to mark order paid:", paidUpdateErr.code || paidUpdateErr.message);
        return new Response(JSON.stringify({ error: "Order update failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Fire order confirmation & paid receipt email asynchronously (bounded wait so XPay gets 200 quickly)
      try {
        await Promise.race([
          fetch(`${supabaseUrl}/functions/v1/send-order-notification`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              orderId: order.id,
              paymentMethod: "xpay",
              isPaid: true,
              paymentDetails: {
                provider: "xpay",
                sessionId,
                paymentIntentId,
                amountTotal: receivedMinor,
                currency: "EGP",
                livemode: Boolean(event.livemode),
              },
            }),
          }),
          new Promise((resolve) => setTimeout(resolve, 8000)),
        ]);
      } catch (notifyErr) {
        console.warn("Non-fatal notification trigger error:", (notifyErr as any)?.message || "error");
      }

      return new Response(JSON.stringify({ received: true, paid: true, orderId: order.id }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 5. Session expiration -> mark unpaid with clear status (never overwrite paid orders)
    if (eventType === "checkout.session.expired") {
      if (!ALREADY_PAID_STATUSES.has(String(order.status)) && sa.isPaid !== true) {
        await supabase
          .from("orders")
          .update({
            status: "payment_expired",
            shipping_address: {
              ...sa,
              xpay: {
                ...existingXpay,
                paymentStatus: "expired",
                expiredAt: nowIso,
                failureReason: "Payment session expired",
              },
            },
            updated_at: nowIso,
          })
          .eq("id", order.id);
      }
      return new Response(JSON.stringify({ received: true, expired: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 6. Payment failures -> leave order unpaid with clear status & reason
    if (eventType === "checkout.session.async_payment_failed" || eventType === "charge.failed") {
      if (!ALREADY_PAID_STATUSES.has(String(order.status)) && sa.isPaid !== true) {
        const failureReason =
          String(obj.failureMessage || obj.failureCode || "Payment was declined or not completed").slice(0, 240);
        await supabase
          .from("orders")
          .update({
            status: "payment_failed",
            shipping_address: {
              ...sa,
              xpay: {
                ...existingXpay,
                paymentStatus: "failed",
                failedAt: nowIso,
                failureReason,
              },
            },
            updated_at: nowIso,
          })
          .eq("id", order.id);
      }
      return new Response(JSON.stringify({ received: true, failedRecorded: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ received: true, ignoredEventType: eventType }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("xpay-webhook error:", err?.message || "Unexpected error");
    return new Response(JSON.stringify({ error: "Webhook processing error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
