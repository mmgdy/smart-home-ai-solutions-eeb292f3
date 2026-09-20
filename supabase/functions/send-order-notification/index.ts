// Order confirmation / notification — sends Resend emails to admin + customer,
// plus a best-effort push notification.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { sendPushToEmail } from "../_shared/fcm.ts";

const ADMIN_EMAIL = "info@azkasmart.com";
const PRIMARY_FROM_EMAIL = "info@azkasmart.com";
const FALLBACK_FROM_EMAIL = "onboarding@resend.dev";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60_000, maxRequests: 20 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  try {
    const { orderId, paymentMethod, isPaid } = await req.json();
    if (!orderId || typeof orderId !== "string") {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, email, total, shipping_address, created_at, status")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rawItems } = await supabase
      .from("order_items")
      .select("product_name, quantity, price")
      .eq("order_id", orderId);

    const email = (order.email || "").trim();
    const total = Number(order.total) || 0;
    const items = (rawItems ?? []).map((i: any) => ({
      product_name: String(i.product_name ?? ""),
      quantity: Number(i.quantity) || 0,
      price: Number(i.price) || 0,
    }));

    const sa = (order.shipping_address ?? {}) as Record<string, any>;
    const shippingAddress = {
      firstName: String(sa.firstName ?? ""),
      lastName: String(sa.lastName ?? ""),
      phone: String(sa.phone ?? ""),
      address: String(sa.address ?? ""),
      city: String(sa.city ?? ""),
      governorate: String(sa.governorate ?? ""),
      notes: String(sa.notes ?? ""),
      instapayReference: String(sa.instapayReference ?? ""),
    };

    const effectiveMethod = paymentMethod || sa.paymentMethod || "card";
    const paymentLabel = 
      effectiveMethod === "cod" || effectiveMethod === "cash" 
        ? "الدفع عند الاستلام (Cash on Delivery)" 
        : effectiveMethod === "instapay"
        ? "إنستاباي (InstaPay Transfer)"
        : "بطاقة بنكية عبر PaySky (Online Card)";

    const orderDateFormatted = new Date(order.created_at || Date.now()).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const itemsRowsHtml = items.map((item) => `
      <tr>
        <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#1e293b;font-weight:500;">
          ${escapeHtml(item.product_name)}
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:14px;color:#475569;">
          ${item.quantity}
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:14px;color:#475569;white-space:nowrap;">
          ${item.price.toLocaleString()} ج.م
        </td>
        <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:14px;font-weight:600;color:#0f172a;white-space:nowrap;">
          ${(item.price * item.quantity).toLocaleString()} ج.م
        </td>
      </tr>
    `).join("");

    // Admin notification email HTML
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head><meta charset="utf-8"><title>طلب جديد - AzkaSmart</title></head>
      <body style="font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;max-width:640px;margin:0 auto;padding:20px;background:#f8fafc;direction:rtl;text-align:right;">
        <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#00d2b4;margin:0;font-size:22px;letter-spacing:-0.5px;">🛒 طلب جديد في أزكاسمارت (AzkaSmart)</h1>
          <p style="color:#94a3b8;margin:6px 0 0;font-size:14px;">رقم الطلب: #${orderId.slice(0, 8)}</p>
        </div>
        <div style="background:#ffffff;padding:28px;border-radius:0 0 12px 12px;box-shadow:0 4px 12px rgba(0,0,0,0.06);border:1px solid #e2e8f0;border-top:none;">
          <div style="background:#f0fdfa;border:1px solid #ccfbf1;color:#0f766e;padding:16px;border-radius:8px;margin-bottom:24px;">
            <p style="margin:0;font-size:15px;font-weight:bold;">طريقة الدفع: ${escapeHtml(paymentLabel)}</p>
            ${isPaid ? '<p style="margin:4px 0 0;color:#059669;font-weight:600;">✓ تم الدفع بنجاح عبر البطاقة</p>' : ''}
            ${shippingAddress.instapayReference ? `<p style="margin:4px 0 0;color:#7c3aed;font-weight:600;">رقم مرجع إنستاباي: ${escapeHtml(shippingAddress.instapayReference)}</p>` : ''}
          </div>

          <h3 style="color:#0f172a;border-bottom:2px solid #00d2b4;padding-bottom:8px;margin:0 0 16px;font-size:16px;">بيانات العميل والتوصيل</h3>
          <table style="width:100%;margin-bottom:24px;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:6px 0;color:#64748b;width:120px;">الاسم:</td><td style="padding:6px 0;color:#0f172a;font-weight:600;">${escapeHtml(shippingAddress.firstName)} ${escapeHtml(shippingAddress.lastName)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">البريد الإلكتروني:</td><td style="padding:6px 0;color:#0f172a;"><strong>${escapeHtml(email || 'غير مسجل')}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">رقم الهاتف:</td><td style="padding:6px 0;color:#0f172a;font-weight:600;" dir="ltr">${escapeHtml(shippingAddress.phone)}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;">العنوان:</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(shippingAddress.address)}, ${escapeHtml(shippingAddress.city)}, ${escapeHtml(shippingAddress.governorate)}</td></tr>
            ${shippingAddress.notes ? `<tr><td style="padding:6px 0;color:#64748b;">ملاحظات:</td><td style="padding:6px 0;color:#b45309;font-weight:500;">${escapeHtml(shippingAddress.notes)}</td></tr>` : ''}
          </table>

          <h3 style="color:#0f172a;border-bottom:2px solid #00d2b4;padding-bottom:8px;margin:0 0 16px;font-size:16px;">المنتجات المطلوبة</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 14px;text-align:right;font-size:13px;color:#475569;border-bottom:2px solid #e2e8f0;">المنتج</th>
                <th style="padding:10px 14px;text-align:center;font-size:13px;color:#475569;border-bottom:2px solid #e2e8f0;">الكمية</th>
                <th style="padding:10px 14px;text-align:right;font-size:13px;color:#475569;border-bottom:2px solid #e2e8f0;">السعر</th>
                <th style="padding:10px 14px;text-align:right;font-size:13px;color:#475569;border-bottom:2px solid #e2e8f0;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>${itemsRowsHtml}</tbody>
          </table>

          <div style="background:#0f172a;color:#ffffff;padding:20px 24px;border-radius:10px;text-align:left;display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:16px;color:#94a3b8;">إجمالي الطلب:</span>
            <span style="font-size:24px;font-weight:bold;color:#00d2b4;float:left;">${total.toLocaleString()} ج.م</span>
            <div style="clear:both;"></div>
          </div>
          <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:24px;">تم تسجيل هذا الطلب في ${orderDateFormatted}</p>
        </div>
      </body></html>
    `;

    // Customer receipt email HTML (Bilingual: Arabic & English)
    const customerEmailHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head><meta charset="utf-8"><title>إيصال تأكيد الطلب - AzkaSmart</title></head>
      <body style="font-family:Segoe UI,Tahoma,Geneva,Verdana,sans-serif;max-width:640px;margin:0 auto;padding:20px;background:#f8fafc;direction:rtl;text-align:right;">
        <div style="background:#0f172a;padding:28px 24px;border-radius:14px 14px 0 0;text-align:center;">
          <h1 style="color:#00d2b4;margin:0;font-size:24px;letter-spacing:-0.5px;">AzkaSmart | أزكاسمارت</h1>
          <p style="color:#e2e8f0;margin:8px 0 0;font-size:16px;font-weight:600;">شكراً لطلبك! تم تأكيد طلبك بنجاح 🎉</p>
          <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">Thank you for your order! Your order has been placed successfully.</p>
        </div>

        <div style="background:#ffffff;padding:28px;border-radius:0 0 14px 14px;box-shadow:0 4px 12px rgba(0,0,0,0.06);border:1px solid #e2e8f0;border-top:none;">
          <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
              <div>
                <span style="font-size:12px;color:#64748b;display:block;">رقم الطلب / Order ID</span>
                <span style="font-size:17px;font-weight:bold;color:#0f766e;font-family:monospace;">#${orderId.slice(0, 8)}</span>
              </div>
              <div>
                <span style="font-size:12px;color:#64748b;display:block;">التاريخ / Date</span>
                <span style="font-size:13px;font-weight:600;color:#0f172a;">${orderDateFormatted}</span>
              </div>
            </div>
            <div style="margin-top:10px;padding-top:10px;border-top:1px dashed #99f6e4;font-size:13px;color:#0f766e;">
              <strong>طريقة الدفع: </strong>${escapeHtml(paymentLabel)}
            </div>
          </div>

          <h3 style="color:#0f172a;border-bottom:2px solid #00d2b4;padding-bottom:8px;margin:0 0 14px;font-size:15px;">تفاصيل الشحن والتوصيل / Shipping Details</h3>
          <div style="background:#f8fafc;border-radius:8px;padding:14px 18px;margin-bottom:24px;font-size:14px;color:#334155;line-height:1.6;">
            <p style="margin:0 0 4px;"><strong>المستلم: </strong>${escapeHtml(shippingAddress.firstName)} ${escapeHtml(shippingAddress.lastName)}</p>
            <p style="margin:0 0 4px;"><strong>رقم الهاتف: </strong><span dir="ltr">${escapeHtml(shippingAddress.phone)}</span></p>
            <p style="margin:0 0 4px;"><strong>العنوان: </strong>${escapeHtml(shippingAddress.address)}, ${escapeHtml(shippingAddress.city)}, ${escapeHtml(shippingAddress.governorate)}</p>
            ${shippingAddress.notes ? `<p style="margin:0;color:#64748b;"><strong>ملاحظات: </strong>${escapeHtml(shippingAddress.notes)}</p>` : ''}
          </div>

          <h3 style="color:#0f172a;border-bottom:2px solid #00d2b4;padding-bottom:8px;margin:0 0 14px;font-size:15px;">المنتجات / Order Items</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 12px;text-align:right;font-size:13px;color:#475569;border-bottom:2px solid #e2e8f0;">المنتج</th>
                <th style="padding:10px 12px;text-align:center;font-size:13px;color:#475569;border-bottom:2px solid #e2e8f0;">الكمية</th>
                <th style="padding:10px 12px;text-align:right;font-size:13px;color:#475569;border-bottom:2px solid #e2e8f0;">السعر</th>
                <th style="padding:10px 12px;text-align:right;font-size:13px;color:#475569;border-bottom:2px solid #e2e8f0;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>${itemsRowsHtml}</tbody>
          </table>

          <div style="background:#0f172a;color:#ffffff;padding:20px 24px;border-radius:10px;text-align:left;">
            <span style="font-size:16px;color:#94a3b8;">المبلغ الإجمالي / Total:</span>
            <span style="font-size:24px;font-weight:bold;color:#00d2b4;float:left;">${total.toLocaleString()} ج.م</span>
            <div style="clear:both;"></div>
          </div>

          <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;">
            <h4 style="margin:0 0 8px;color:#0f172a;font-size:14px;">هل لديك أي استفسار حول طلبك؟</h4>
            <p style="margin:0 0 16px;font-size:13px;color:#64748b;">فريق الدعم الفني وخدمة العملاء متاح دائماً لمساعدتك</p>
            <a href="https://wa.me/201050627310?text=${encodeURIComponent(`مرحباً أزكاسمارت، أستفسر عن طلبي رقم #${orderId.slice(0, 8)}`)}" 
               style="display:inline-block;background:#25d366;color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600;margin-left:8px;">
               تواصل عبر واتساب
            </a>
            <a href="mailto:info@azkasmart.com" 
               style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:600;">
               info@azkasmart.com
            </a>
          </div>

          <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:24px;line-height:1.5;">
            AzkaSmart — حلول المنازل الذكية وأنظمة التحكم المتطورة<br>
            Smart Home AI Solutions & Automation
          </p>
        </div>
      </body></html>
    `;

    let adminEmailResponse = null;
    let customerEmailResponse = null;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const resend = new Resend(RESEND_API_KEY);

      // Safe sender function with automatic fallback to onboarding@resend.dev
      // if the custom domain isn't verified yet on Resend.
      const sendEmail = async (to: string[], subject: string, html: string) => {
        try {
          const primaryRes = await resend.emails.send({
            from: `Azkasmart <${PRIMARY_FROM_EMAIL}>`,
            to,
            subject,
            html,
          });

          if (primaryRes.error) {
            console.warn("Primary sender returned error, trying fallback sender:", primaryRes.error);
            const fallbackRes = await resend.emails.send({
              from: `Azkasmart <${FALLBACK_FROM_EMAIL}>`,
              to,
              subject,
              html,
            });
            return fallbackRes;
          }
          return primaryRes;
        } catch (sendErr) {
          console.warn("Primary send threw exception, trying fallback:", sendErr);
          try {
            return await resend.emails.send({
              from: `Azkasmart <${FALLBACK_FROM_EMAIL}>`,
              to,
              subject,
              html,
            });
          } catch (fallbackErr) {
            console.error("Fallback sender also failed:", fallbackErr);
            return null;
          }
        }
      };

      try {
        adminEmailResponse = await sendEmail(
          [ADMIN_EMAIL],
          `🛒 طلب جديد #${orderId.slice(0, 8)} - ${total.toLocaleString()} ج.م (${paymentLabel})`,
          adminEmailHtml
        );
      } catch (adminMailErr) {
        console.error("Failed to send admin order email:", adminMailErr);
      }

      if (email) {
        try {
          customerEmailResponse = await sendEmail(
            [email],
            `تأكيد طلبك من أزكاسمارت #${orderId.slice(0, 8)} | Order Confirmed!`,
            customerEmailHtml
          );
        } catch (custMailErr) {
          console.error("Failed to send customer order email:", custMailErr);
        }
      }
    } else {
      console.warn("RESEND_API_KEY not configured in Supabase secrets.");
    }

    // Best-effort push notification (don't block response)
    try {
      await sendPushToEmail(supabase, email, {
        title: "تم تأكيد طلبك 🎉",
        message: `طلب #${orderId.slice(0, 8)} بقيمة ${total.toLocaleString()} ج.م. سنوافيك بالتحديثات فور شحنه.`,
        url: `/order-confirmation?orderId=${orderId}`,
      });
    } catch (e) {
      console.warn("Push notification failed (non-fatal):", e);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        adminEmail: adminEmailResponse, 
        customerEmail: customerEmailResponse,
        emailConfigured: !!RESEND_API_KEY 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending order notification:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Notification failed. Try again later." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);