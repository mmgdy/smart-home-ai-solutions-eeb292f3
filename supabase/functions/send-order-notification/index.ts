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

    // Fetch site_info for contact details (WhatsApp, phone, email) so values stay 100% in sync with admin dashboard
    const { data: contactRows } = await supabase
      .from("site_info")
      .select("key, value")
      .eq("section", "contact");

    const siteContact: Record<string, string> = {};
    (contactRows ?? []).forEach((row: { key: string; value: string }) => {
      if (row.key && row.value) siteContact[row.key] = row.value;
    });

    const rawWhatsapp = (siteContact.whatsapp || "01501896456").trim();
    let digits = rawWhatsapp.replace(/[^0-9]/g, "");
    if (digits.startsWith("0")) {
      digits = "2" + digits;
    } else if (!digits.startsWith("20") && digits.length === 10) {
      digits = "20" + digits;
    }
    const cleanWhatsapp = digits || "201501896456";

    // Format for display: 01501896456
    let displayWhatsapp = rawWhatsapp || "01501896456";
    if (displayWhatsapp.startsWith("+20")) {
      displayWhatsapp = "0" + displayWhatsapp.slice(3);
    } else if (displayWhatsapp.startsWith("20") && displayWhatsapp.length === 12) {
      displayWhatsapp = "0" + displayWhatsapp.slice(2);
    }
    const contactEmail = (siteContact.email || ADMIN_EMAIL).trim();

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

    // Customer WhatsApp direct link for admin notification
    const rawCustomerPhone = shippingAddress.phone.replace(/[^0-9]/g, "");
    const customerWaNumber = rawCustomerPhone.startsWith("0") 
      ? "2" + rawCustomerPhone 
      : rawCustomerPhone.startsWith("20") 
      ? rawCustomerPhone 
      : rawCustomerPhone ? "2" + rawCustomerPhone : "";
    const adminCustomerWaUrl = customerWaNumber
      ? `https://wa.me/${customerWaNumber}?text=${encodeURIComponent(`مرحباً ${shippingAddress.firstName}، بخصوص طلبك رقم #${orderId.slice(0, 8).toUpperCase()} من متجر AzkaSmart...`)}`
      : null;

    // Mobile-optimized item rows (never overflows regardless of screen width)
    const itemsListHtml = items.map((item) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e2e8f0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;">
            <tr>
              <td align="right" valign="top" style="padding-left:12px;text-align:right;">
                <div style="font-size:14px;font-weight:600;color:#0f172a;line-height:1.45;word-break:break-word;">
                  ${escapeHtml(item.product_name)}
                </div>
                <div style="font-size:12px;color:#64748b;margin-top:5px;line-height:1.4;">
                  الكمية: <strong style="color:#0f172a;">${item.quantity}</strong> × <span dir="ltr">${item.price.toLocaleString()} ج.م</span>
                </div>
              </td>
              <td align="left" valign="top" style="text-align:left;white-space:nowrap;padding-right:4px;" dir="ltr">
                <div style="font-size:15px;font-weight:700;color:#0f172a;">
                  ${(item.price * item.quantity).toLocaleString()} ج.م
                </div>
                <div style="font-size:11px;color:#94a3b8;margin-top:2px;">
                  ${(item.price * item.quantity).toLocaleString()} EGP
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `).join("");

    // Shared CSS reset + Mobile responsive styles
    const sharedEmailStyles = `
      body, p, h1, h2, h3, h4, table, td, div, a, span {
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
        box-sizing: border-box;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background-color: #f1f5f9;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #0f172a;
      }
      table {
        border-collapse: collapse !important;
        mso-table-lspace: 0pt;
        mso-table-rspace: 0pt;
      }
      img {
        border: 0;
        outline: none;
        text-decoration: none;
      }
      @media only screen and (max-width: 600px) {
        .email-shell {
          padding: 8px 4px !important;
        }
        .email-container {
          width: 100% !important;
          max-width: 100% !important;
        }
        .email-header {
          padding: 22px 16px !important;
          border-radius: 10px 10px 0 0 !important;
        }
        .email-card {
          padding: 18px 14px !important;
          border-radius: 0 0 10px 10px !important;
        }
        .order-meta-cell {
          display: block !important;
          width: 100% !important;
          text-align: right !important;
          padding: 4px 0 !important;
        }
        .total-row-td {
          padding: 14px 14px !important;
        }
        .total-amount-large {
          font-size: 20px !important;
        }
        .mobile-stack-btn {
          display: block !important;
          width: 100% !important;
          margin: 8px 0 !important;
          text-align: center !important;
          padding: 14px 16px !important;
          font-size: 15px !important;
          box-sizing: border-box !important;
        }
      }
    `;

    // Admin notification email HTML (100% responsive on phone & desktop)
    const adminEmailHtml = `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml" dir="rtl" lang="ar">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="x-apple-disable-message-reformatting" />
        <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
        <title>طلب جديد - AzkaSmart #${orderId.slice(0, 8).toUpperCase()}</title>
        <style type="text/css">
          ${sharedEmailStyles}
        </style>
      </head>
      <body style="margin:0;padding:0;background-color:#f1f5f9;direction:rtl;text-align:right;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
          <tr>
            <td align="center" class="email-shell" style="padding:20px 10px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-container" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,0.06);border:1px solid #e2e8f0;">
                
                <!-- Admin Header -->
                <tr>
                  <td class="email-header" style="background:#0f172a;padding:26px 20px;text-align:center;">
                    <div style="color:#00d2b4;font-size:22px;font-weight:bold;margin-bottom:6px;">
                      🛒 طلب جديد في أزكاسمارت (AzkaSmart)
                    </div>
                    <div style="color:#94a3b8;font-size:14px;font-family:monospace;">
                      رقم الطلب: #${orderId.slice(0, 8).toUpperCase()}
                    </div>
                  </td>
                </tr>

                <!-- Admin Body -->
                <tr>
                  <td class="email-card" style="padding:24px 20px;background:#ffffff;">

                    <!-- Payment status badge -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:10px;margin-bottom:20px;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <div style="font-size:14px;font-weight:bold;color:#0f766e;">
                            طريقة الدفع: ${escapeHtml(paymentLabel)}
                          </div>
                          ${isPaid ? '<div style="color:#059669;font-weight:600;font-size:13px;margin-top:4px;">✓ تم الدفع بنجاح عبر البطاقة البنكية</div>' : ''}
                          ${shippingAddress.instapayReference ? `<div style="color:#7c3aed;font-weight:600;font-size:13px;margin-top:4px;">رقم مرجع إنستاباي: <span style="font-family:monospace;">${escapeHtml(shippingAddress.instapayReference)}</span></div>` : ''}
                        </td>
                      </tr>
                    </table>

                    <!-- Customer Details -->
                    <div style="margin-bottom:20px;">
                      <div style="font-size:14px;font-weight:bold;color:#0f172a;border-bottom:2px solid #00d2b4;padding-bottom:6px;margin-bottom:10px;">
                        بيانات العميل والتوصيل
                      </div>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
                        <tr>
                          <td style="padding:12px 14px;font-size:13px;color:#334155;line-height:1.7;">
                            <div><strong>الاسم: </strong>${escapeHtml(shippingAddress.firstName)} ${escapeHtml(shippingAddress.lastName)}</div>
                            <div><strong>البريد الإلكتروني: </strong><a href="mailto:${escapeHtml(email)}" style="color:#008b76;text-decoration:none;">${escapeHtml(email || 'غير مسجل')}</a></div>
                            <div><strong>رقم الهاتف: </strong><span dir="ltr"><strong>${escapeHtml(shippingAddress.phone)}</strong></span></div>
                            <div><strong>العنوان: </strong>${escapeHtml(shippingAddress.address)}, ${escapeHtml(shippingAddress.city)}, ${escapeHtml(shippingAddress.governorate)}</div>
                            ${shippingAddress.notes ? `<div style="color:#b45309;"><strong>ملاحظات: </strong>${escapeHtml(shippingAddress.notes)}</div>` : ''}
                          </td>
                        </tr>
                      </table>
                    </div>

                    ${adminCustomerWaUrl ? `
                      <!-- Quick WhatsApp Customer Contact Button -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
                        <tr>
                          <td align="center">
                            <a href="${adminCustomerWaUrl}"
                               target="_blank"
                               class="mobile-stack-btn"
                               style="display:inline-block;background:#25d366;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:bold;box-shadow:0 2px 6px rgba(37,211,102,0.25);">
                               💬 فتح محادثة واتساب مع العميل (${escapeHtml(shippingAddress.phone)})
                            </a>
                          </td>
                        </tr>
                      </table>
                    ` : ''}

                    <!-- Products Header -->
                    <div style="font-size:14px;font-weight:bold;color:#0f172a;border-bottom:2px solid #00d2b4;padding-bottom:6px;margin-bottom:4px;">
                      المنتجات المطلوبة (${items.reduce((s, it) => s + it.quantity, 0)})
                    </div>

                    <!-- Products List -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:16px;">
                      ${itemsListHtml}
                    </table>

                    <!-- Total Block -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f172a;border-radius:10px;margin:16px 0 20px 0;">
                      <tr>
                        <td align="right" valign="middle" class="total-row-td" style="padding:16px 18px;color:#94a3b8;font-size:15px;font-weight:600;">
                          إجمالي الطلب:
                        </td>
                        <td align="left" valign="middle" class="total-row-td" style="padding:16px 18px;color:#00d2b4;text-align:left;white-space:nowrap;" dir="ltr">
                          <strong class="total-amount-large" style="font-size:22px;color:#00d2b4;">${total.toLocaleString()}</strong> <span style="font-size:14px;color:#00d2b4;">ج.م</span>
                        </td>
                      </tr>
                    </table>

                    <div style="color:#94a3b8;font-size:12px;text-align:center;margin-top:16px;">
                      تم تسجيل هذا الطلب في ${orderDateFormatted}
                    </div>

                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Customer receipt email HTML (Bilingual: Arabic & English, 100% mobile-friendly)
    const customerEmailHtml = `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml" dir="rtl" lang="ar">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="x-apple-disable-message-reformatting" />
        <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
        <title>تأكيد طلبك من أزكاسمارت #${orderId.slice(0, 8).toUpperCase()}</title>
        <style type="text/css">
          ${sharedEmailStyles}
        </style>
      </head>
      <body style="margin:0;padding:0;background-color:#f1f5f9;direction:rtl;text-align:right;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
          <tr>
            <td align="center" class="email-shell" style="padding:20px 10px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-container" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,0.06);border:1px solid #e2e8f0;">
                
                <!-- Header Banner -->
                <tr>
                  <td class="email-header" style="background:#0f172a;padding:28px 24px;text-align:center;">
                    <div style="color:#00d2b4;font-size:24px;font-weight:bold;letter-spacing:-0.5px;margin-bottom:8px;">
                      AzkaSmart | أزكاسمارت
                    </div>
                    <div style="color:#ffffff;font-size:17px;font-weight:600;margin-bottom:4px;line-height:1.4;">
                      شكراً لطلبك! تم تأكيد الطلب بنجاح 🎉
                    </div>
                    <div style="color:#94a3b8;font-size:13px;line-height:1.4;">
                      Thank you for your order! It is now being prepared.
                    </div>
                  </td>
                </tr>

                <!-- Body Card -->
                <tr>
                  <td class="email-card" style="padding:24px 20px;background:#ffffff;">

                    <!-- Order ID & Date Box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:10px;margin-bottom:20px;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td align="right" valign="top" class="order-meta-cell">
                                <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">رقم الطلب / Order ID</div>
                                <div style="font-size:16px;font-weight:bold;color:#0f766e;font-family:monospace;margin-top:2px;">#${orderId.slice(0, 8).toUpperCase()}</div>
                              </td>
                              <td align="left" valign="top" class="order-meta-cell" dir="ltr" style="text-align:left;">
                                <div style="font-size:11px;color:#64748b;">تاريخ الطلب / Date</div>
                                <div style="font-size:12px;font-weight:600;color:#0f172a;margin-top:2px;">${orderDateFormatted}</div>
                              </td>
                            </tr>
                          </table>
                          <div style="margin-top:10px;padding-top:10px;border-top:1px dashed #99f6e4;font-size:13px;color:#0f766e;line-height:1.5;">
                            <strong>طريقة الدفع: </strong>${escapeHtml(paymentLabel)}
                            ${isPaid ? '<div style="color:#059669;font-weight:600;margin-top:4px;">✓ تم تأكيد الدفع الإلكتروني بنجاح</div>' : ''}
                            ${shippingAddress.instapayReference ? `<div style="color:#7c3aed;font-weight:600;margin-top:4px;">رقم مرجع إنستاباي: <span style="font-family:monospace;">${escapeHtml(shippingAddress.instapayReference)}</span></div>` : ''}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Shipping Details -->
                    <div style="margin-bottom:20px;">
                      <div style="font-size:14px;font-weight:bold;color:#0f172a;border-bottom:2px solid #00d2b4;padding-bottom:6px;margin-bottom:10px;">
                        تفاصيل الشحن والتوصيل / Shipping Details
                      </div>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
                        <tr>
                          <td style="padding:12px 14px;font-size:13px;color:#334155;line-height:1.6;">
                            <div><strong>المستلم: </strong>${escapeHtml(shippingAddress.firstName)} ${escapeHtml(shippingAddress.lastName)}</div>
                            <div style="margin-top:3px;"><strong>رقم الهاتف: </strong><span dir="ltr">${escapeHtml(shippingAddress.phone)}</span></div>
                            <div style="margin-top:3px;"><strong>العنوان: </strong>${escapeHtml(shippingAddress.address)}, ${escapeHtml(shippingAddress.city)}, ${escapeHtml(shippingAddress.governorate)}</div>
                            ${shippingAddress.notes ? `<div style="margin-top:3px;color:#b45309;"><strong>ملاحظات: </strong>${escapeHtml(shippingAddress.notes)}</div>` : ''}
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- Items Header -->
                    <div style="font-size:14px;font-weight:bold;color:#0f172a;border-bottom:2px solid #00d2b4;padding-bottom:6px;margin-bottom:4px;">
                      المنتجات المطلوبة / Order Items (${items.reduce((s, it) => s + it.quantity, 0)})
                    </div>

                    <!-- Items List (Responsive fluid table) -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:16px;">
                      ${itemsListHtml}
                    </table>

                    <!-- Total Block -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f172a;border-radius:10px;margin:16px 0 24px 0;">
                      <tr>
                        <td align="right" valign="middle" class="total-row-td" style="padding:16px 20px;color:#94a3b8;font-size:15px;font-weight:600;">
                          المبلغ الإجمالي / Grand Total:
                        </td>
                        <td align="left" valign="middle" class="total-row-td" style="padding:16px 20px;color:#00d2b4;text-align:left;white-space:nowrap;" dir="ltr">
                          <strong class="total-amount-large" style="font-size:22px;color:#00d2b4;">${total.toLocaleString()}</strong> <span style="font-size:14px;color:#00d2b4;">ج.م</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Support & WhatsApp Section -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;">
                      <tr>
                        <td align="center" style="padding:0;">
                          <div style="font-size:15px;font-weight:bold;color:#0f172a;margin-bottom:4px;">
                            هل لديك أي استفسار حول طلبك؟
                          </div>
                          <div style="font-size:13px;color:#64748b;margin-bottom:14px;line-height:1.5;">
                            فريق خدمة العملاء والدعم الفني متاح دائماً لمساعدتك عبر واتساب
                          </div>
                          
                          <!-- Buttons -->
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;width:100%;max-width:440px;">
                            <tr>
                              <td align="center" style="padding:4px 0;">
                                <a href="https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(`مرحباً أزكاسمارت، أستفسر عن طلبي رقم #${orderId.slice(0, 8).toUpperCase()}`)}"
                                   target="_blank"
                                   class="mobile-stack-btn"
                                   style="display:inline-block;background:#25d366;color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:8px;font-size:14px;font-weight:bold;box-shadow:0 2px 8px rgba(37,211,102,0.3);text-align:center;">
                                   💬 تواصل عبر واتساب (${displayWhatsapp})
                                </a>
                              </td>
                            </tr>
                            <tr>
                              <td align="center" style="padding:4px 0;">
                                <a href="mailto:${contactEmail}"
                                   class="mobile-stack-btn"
                                   style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:11px 22px;border-radius:8px;font-size:13px;font-weight:600;text-align:center;">
                                   ✉️ ${contactEmail}
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Footer Info -->
                    <div style="color:#94a3b8;font-size:11px;text-align:center;margin-top:24px;line-height:1.6;border-top:1px dashed #e2e8f0;padding-top:16px;">
                      AzkaSmart — حلول المنازل الذكية والأنظمة المتطورة في مصر<br>
                      Smart Home AI Solutions & Automation • Cairo, Egypt
                    </div>

                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
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
          `🛒 طلب جديد #${orderId.slice(0, 8).toUpperCase()} - ${total.toLocaleString()} ج.م (${paymentLabel})`,
          adminEmailHtml
        );
      } catch (adminMailErr) {
        console.error("Failed to send admin order email:", adminMailErr);
      }

      if (email) {
        try {
          customerEmailResponse = await sendEmail(
            [email],
            `تأكيد طلبك من أزكاسمارت #${orderId.slice(0, 8).toUpperCase()} | Order Confirmed!`,
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
        message: `طلب #${orderId.slice(0, 8).toUpperCase()} بقيمة ${total.toLocaleString()} ج.م. سنوافيك بالتحديثات فور شحنه.`,
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