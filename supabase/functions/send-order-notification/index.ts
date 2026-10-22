// Order confirmation & status notification — sends Resend emails to admin + customer,
// updates card order status safely via service_role, enforces idempotency,
// notifies customers on status changes (processing, shipped, delivered, cancelled),
// and triggers best-effort push notifications.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { sendPushToEmail } from "../_shared/fcm.ts";

const ADMIN_EMAIL = "info@azkasmart.com";
const ADMIN_FALLBACK_EMAIL = "mmgdy20xx@gmail.com";
const PRIMARY_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "orders@azkasmart.com";
const SECONDARY_FROM_EMAIL = "info@azkasmart.com";
const FALLBACK_FROM_EMAIL = "onboarding@resend.dev";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function resolveResendApiKey(supabase: any): Promise<string | null> {
  const envKey = Deno.env.get("RESEND_API_KEY");
  if (envKey && envKey.trim()) return envKey.trim();

  try {
    const { data: siteRow } = await supabase
      .from("site_info")
      .select("value")
      .in("section", ["email", "admin", "secrets"])
      .eq("key", "resend_api_key")
      .maybeSingle();
    if (siteRow?.value && String(siteRow.value).trim()) {
      return String(siteRow.value).trim();
    }
  } catch (e) {
    console.warn("Could not read resend_api_key from site_info:", e);
  }

  try {
    const { data: adminRow } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", "resend_api_key")
      .maybeSingle();
    if (adminRow?.value && String(adminRow.value).trim()) {
      return String(adminRow.value).trim();
    }
  } catch (e) {
    console.warn("Could not read resend_api_key from admin_settings:", e);
  }

  return null;
}

interface StatusMeta {
  badgeAr: string;
  badgeEn: string;
  headerTitleAr: string;
  headerTitleEn: string;
  headlineAr: string;
  headlineEn: string;
  themeColor: string;
  lightBg: string;
  borderColor: string;
  icon: string;
  pushTitle: string;
  pushMessage: string;
}

function getStatusMeta(status: string): StatusMeta {
  const norm = (status || "").toLowerCase().trim();
  switch (norm) {
    case "processing":
    case "processed":
      return {
        badgeAr: "قيد التجهيز",
        badgeEn: "Processing",
        headerTitleAr: "طلبك قيد التجهيز 📦",
        headerTitleEn: "Your order is being processed",
        headlineAr: "تم تأكيد طلبك والبدء في تجهيز وتغليف المنتجات بعناية في مستودعاتنا استعداداً لتسليمها لشركة الشحن.",
        headlineEn: "Your order has been confirmed and is currently being packed in our fulfillment center.",
        themeColor: "#2563eb",
        lightBg: "#eff6ff",
        borderColor: "#bfdbfe",
        icon: "📦",
        pushTitle: "طلبك قيد التجهيز 📦",
        pushMessage: "بدأنا بتجهيز طلبك وتغليفه في مستودعاتنا.",
      };
    case "shipped":
      return {
        badgeAr: "تم الشحن",
        badgeEn: "Shipped",
        headerTitleAr: "تم شحن طلبك وهو في الطريق إليك 🚚",
        headerTitleEn: "Your order has been shipped",
        headlineAr: "تم تسليم شحنتك لشركة التوصيل وهي الآن في طريقها إلى عنوانك. سيتواصل معك المندوب على هاتفك قريباً لتنسيق موعد الاستلام.",
        headlineEn: "Your package is on its way with our courier. You will be contacted prior to delivery.",
        themeColor: "#7c3aed",
        lightBg: "#f5f3ff",
        borderColor: "#ddd6fe",
        icon: "🚚",
        pushTitle: "تم شحن طلبك 🚚",
        pushMessage: "شحنتك في الطريق إليك الآن مع مندوب التوصيل.",
      };
    case "delivered":
      return {
        badgeAr: "تم التسليم بنجاح",
        badgeEn: "Delivered",
        headerTitleAr: "تم تسليم طلبك بنجاح 🎉",
        headerTitleEn: "Your order has been delivered",
        headlineAr: "تم تسليم طلبك بنجاح! نأمل أن تنال منتجاتنا إعجابك وتضيف الراحة والذكاء لمنزلك. يسعدنا دائماً خدمتك.",
        headlineEn: "Your order has been successfully delivered. Thank you for choosing AzkaSmart!",
        themeColor: "#059669",
        lightBg: "#ecfdf5",
        borderColor: "#a7f3d0",
        icon: "🎉",
        pushTitle: "تم تسليم طلبك بنجاح 🎉",
        pushMessage: "تم تسليم طلبك بنجاح. شكراً لثقتك بأزكاسمارت!",
      };
    case "cancelled":
      return {
        badgeAr: "تم الإلغاء",
        badgeEn: "Cancelled",
        headerTitleAr: "تم إلغاء الطلب ✕",
        headerTitleEn: "Your order has been cancelled",
        headlineAr: "نود إعلامك بأنه تم إلغاء هذا الطلب. إذا كان لديك أي استفسار أو كنت قد قمت بالسداد بالبطاقة البنكية، يرجى التواصل معنا لاسترداد المبلغ فوراً.",
        headlineEn: "Your order has been cancelled. If you already made an online payment, it will be fully refunded to your card.",
        themeColor: "#dc2626",
        lightBg: "#fef2f2",
        borderColor: "#fecaca",
        icon: "✕",
        pushTitle: "تم إلغاء الطلب",
        pushMessage: "تم إلغاء طلبك. تواصل مع الدعم الفني لأي استفسار.",
      };
    case "pending":
    default:
      return {
        badgeAr: "قيد المراجعة",
        badgeEn: "Pending",
        headerTitleAr: "طلبك قيد المراجعة ⏳",
        headerTitleEn: "Your order is pending review",
        headlineAr: "طلبك مسجل لدينا وهو قيد المراجعة والتأكيد من فريق المبيعات.",
        headlineEn: "Your order is currently being reviewed by our operations team.",
        themeColor: "#d97706",
        lightBg: "#fffbeb",
        borderColor: "#fde68a",
        icon: "⏳",
        pushTitle: "طلبك قيد المراجعة ⏳",
        pushMessage: "طلبك قيد المراجعة والتأكيد من فريق العمل.",
      };
  }
}

function getStatusEmailSubject(status: string, orderId: string): string {
  const shortId = orderId.slice(0, 8).toUpperCase();
  const norm = (status || "").toLowerCase().trim();
  switch (norm) {
    case "processing":
    case "processed":
      return `تحديث الطلب #${shortId} | طلبك قيد التجهيز 📦 (AzkaSmart)`;
    case "shipped":
      return `تم الشحن #${shortId} | طلبك في الطريق إليك 🚚 (AzkaSmart)`;
    case "delivered":
      return `تم التسليم بنجاح #${shortId} 🎉 شكراً لاختيارك أزكاسمارت`;
    case "cancelled":
      return `تحديث بشأن طلبك #${shortId} | تم إلغاء الطلب`;
    default:
      return `تحديث حالة طلبك #${shortId} | AzkaSmart`;
  }
}

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

function renderStatusUpdateHtml(params: {
  orderId: string;
  status: string;
  meta: StatusMeta;
  orderDateFormatted: string;
  itemsListHtml: string;
  total: number;
  paymentLabel: string;
  shippingAddress: any;
  sharedEmailStyles: string;
  cleanWhatsapp: string;
  displayWhatsapp: string;
  contactEmail: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  note?: string;
}): string {
  const {
    orderId,
    meta,
    orderDateFormatted,
    itemsListHtml,
    total,
    paymentLabel,
    shippingAddress,
    cleanWhatsapp,
    displayWhatsapp,
    contactEmail,
    trackingNumber,
    trackingCarrier,
    note,
  } = params;

  const shortId = orderId.slice(0, 8).toUpperCase();

  return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml" dir="rtl" lang="ar">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta name="x-apple-disable-message-reformatting" />
      <title>تحديث حالة الطلب #${shortId} - AzkaSmart</title>
      <style type="text/css">
        ${sharedEmailStyles}
      </style>
    </head>
    <body style="margin:0;padding:0;background-color:#f1f5f9;direction:rtl;text-align:right;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
        <tr>
          <td align="center" class="email-shell" style="padding:20px 10px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-container" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(15,23,42,0.06);border:1px solid #e2e8f0;">
              
              <!-- Brand Header -->
              <tr>
                <td class="email-header" style="background:#0f172a;padding:26px 22px;text-align:center;">
                  <div style="color:#00d2b4;font-size:24px;font-weight:bold;letter-spacing:-0.5px;margin-bottom:6px;">
                    AzkaSmart | أزكاسمارت
                  </div>
                  <div style="color:#94a3b8;font-size:13px;">
                    أنظمة وحلول المنازل الذكية في مصر • Smart Home Solutions
                  </div>
                </td>
              </tr>

              <!-- Status Banner -->
              <tr>
                <td style="background:${meta.lightBg};border-bottom:2px solid ${meta.borderColor};padding:24px 22px;text-align:center;">
                  <div style="display:inline-block;background:#ffffff;border:1px solid ${meta.borderColor};border-radius:20px;padding:4px 14px;font-size:12px;font-weight:bold;color:${meta.themeColor};margin-bottom:10px;text-transform:uppercase;">
                    ${meta.icon} ${meta.badgeAr} / ${meta.badgeEn}
                  </div>
                  <div style="color:#0f172a;font-size:20px;font-weight:bold;margin-bottom:4px;line-height:1.4;">
                    ${meta.headerTitleAr}
                  </div>
                  <div style="color:#64748b;font-size:13px;margin-bottom:12px;">
                    ${meta.headerTitleEn}
                  </div>
                  <div style="color:#334155;font-size:14px;line-height:1.6;max-width:500px;margin:0 auto;padding-top:10px;border-top:1px dashed ${meta.borderColor};">
                    ${meta.headlineAr}
                  </div>
                  <div style="color:#64748b;font-size:12px;line-height:1.5;margin-top:4px;" dir="ltr">
                    ${meta.headlineEn}
                  </div>
                </td>
              </tr>

              <!-- Body Card -->
              <tr>
                <td class="email-card" style="padding:24px 20px;background:#ffffff;">
                  
                  <!-- Order Meta Table -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:20px;">
                    <tr>
                      <td style="padding:14px 16px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td align="right" valign="top" class="order-meta-cell">
                              <div style="font-size:11px;color:#64748b;text-transform:uppercase;">رقم الطلب / Order ID</div>
                              <div style="font-size:16px;font-weight:bold;color:#0f766e;font-family:monospace;margin-top:2px;">#${shortId}</div>
                            </td>
                            <td align="left" valign="top" class="order-meta-cell" dir="ltr" style="text-align:left;">
                              <div style="font-size:11px;color:#64748b;">تاريخ الطلب / Date</div>
                              <div style="font-size:12px;font-weight:600;color:#0f172a;margin-top:2px;">${orderDateFormatted}</div>
                            </td>
                          </tr>
                        </table>
                        <div style="margin-top:10px;padding-top:10px;border-top:1px dashed #cbd5e1;font-size:13px;color:#334155;">
                          <strong>طريقة الدفع: </strong>${escapeHtml(paymentLabel)}
                        </div>
                      </td>
                    </tr>
                  </table>

                  ${trackingNumber || note || trackingCarrier ? `
                    <div style="margin-bottom:20px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:14px 16px;">
                      <div style="font-size:14px;font-weight:bold;color:#6b21a8;margin-bottom:6px;">
                        🚚 معلومات الشحن والتتبع / Shipment Details
                      </div>
                      <div style="font-size:13px;color:#3b0764;line-height:1.7;">
                        ${trackingCarrier ? `<div><strong>شركة الشحن: </strong>${escapeHtml(trackingCarrier)}</div>` : ''}
                        ${trackingNumber ? `<div><strong>رقم التتبع: </strong><span style="font-family:monospace;font-weight:bold;">${escapeHtml(trackingNumber)}</span></div>` : ''}
                        ${note ? `<div style="margin-top:4px;color:#701a75;"><strong>ملاحظات التوصيل: </strong>${escapeHtml(note)}</div>` : ''}
                      </div>
                    </div>
                  ` : ''}

                  <!-- Customer / Delivery Details -->
                  <div style="margin-bottom:20px;">
                    <div style="font-size:14px;font-weight:bold;color:#0f172a;border-bottom:2px solid #00d2b4;padding-bottom:6px;margin-bottom:10px;">
                      بيانات المستلم والتوصيل / Delivery Address
                    </div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
                      <tr>
                        <td style="padding:12px 14px;font-size:13px;color:#334155;line-height:1.7;">
                          <div><strong>المستلم: </strong>${escapeHtml(shippingAddress.firstName)} ${escapeHtml(shippingAddress.lastName)}</div>
                          <div><strong>رقم الهاتف: </strong><span dir="ltr"><strong>${escapeHtml(shippingAddress.phone)}</strong></span></div>
                          <div><strong>العنوان: </strong>${escapeHtml(shippingAddress.address)}, ${escapeHtml(shippingAddress.city)}, ${escapeHtml(shippingAddress.governorate)}</div>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Order Items -->
                  <div style="font-size:14px;font-weight:bold;color:#0f172a;border-bottom:2px solid #00d2b4;padding-bottom:6px;margin-bottom:4px;">
                    المنتجات / Order Items
                  </div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:16px;">
                    ${itemsListHtml}
                  </table>

                  <!-- Total -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0f172a;border-radius:10px;margin:16px 0 24px 0;">
                    <tr>
                      <td align="right" valign="middle" class="total-row-td" style="padding:16px 20px;color:#94a3b8;font-size:15px;font-weight:600;">
                        المبلغ الإجمالي / Total:
                      </td>
                      <td align="left" valign="middle" class="total-row-td" style="padding:16px 20px;color:#00d2b4;text-align:left;white-space:nowrap;" dir="ltr">
                        <strong class="total-amount-large" style="font-size:22px;color:#00d2b4;">${total.toLocaleString()}</strong> <span style="font-size:14px;color:#00d2b4;">ج.م</span>
                      </td>
                    </tr>
                  </table>

                  <!-- Actions / Links -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;">
                    <tr>
                      <td align="center" style="padding:0;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;width:100%;max-width:440px;">
                          <tr>
                            <td align="center" style="padding:5px 0;">
                              <a href="https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(`مرحباً أزكاسمارت، أستفسر عن تحديث طلبي رقم #${shortId}`)}"
                                 target="_blank"
                                 class="mobile-stack-btn"
                                 style="display:inline-block;background:#25d366;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:bold;box-shadow:0 2px 8px rgba(37,211,102,0.3);text-align:center;">
                                 💬 محادثة واتساب (${displayWhatsapp})
                              </a>
                            </td>
                          </tr>
                          <tr>
                            <td align="center" style="padding:5px 0;">
                              <a href="https://azkasmart.com/profile"
                                 target="_blank"
                                 class="mobile-stack-btn"
                                 style="display:inline-block;background:#0f172a;color:#00d2b4;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:bold;border:1px solid #00d2b4;text-align:center;">
                                 👤 تتبع الطلبات في حسابك
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <!-- Footer Notice -->
                  <div style="color:#94a3b8;font-size:12px;text-align:center;margin-top:20px;line-height:1.6;">
                    إذا كان لديك أي سؤال، يمكنك الرد على هذه الرسالة أو مراسلتنا على <a href="mailto:${contactEmail}" style="color:#008b76;text-decoration:none;">${contactEmail}</a>.
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
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60_000, maxRequests: 25 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)),
      },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      orderId,
      action: rawAction,
      status: rawStatus,
      newStatus: rawNewStatus,
      oldStatus,
      note,
      trackingNumber,
      trackingCarrier,
      paymentMethod,
      isPaid: rawIsPaid,
      paymentDetails,
      forceResend = false,
      isOrderConfirmationPage = false,
      queryParams = {},
    } = body;

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

    const sa = ((order.shipping_address ?? {}) as Record<string, any>);
    const effectiveMethod = paymentMethod || sa.paymentMethod || "card";

    // Detect if a card order returned from PaySky 3D Secure redirect to /order-confirmation
    const isCardOrder = effectiveMethod === "card";
    const isPaid = Boolean(
      rawIsPaid ||
      sa.isPaid ||
      order.status === "processing" ||
      (isCardOrder && isOrderConfirmationPage)
    );

    const isStatusUpdate =
      rawAction === "status_update" ||
      rawAction === "order_status_update" ||
      (Boolean(rawNewStatus || rawStatus) && (rawNewStatus || rawStatus) !== "pending" && !isPaid);

    // Fetch order items & store contact info (shared by both flows)
    const { data: rawItems } = await supabase
      .from("order_items")
      .select("product_name, quantity, price")
      .eq("order_id", orderId);

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

    const itemsListHtml = items
      .map(
        (item) => `
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
    `
      )
      .join("");

    const RESEND_API_KEY = await resolveResendApiKey(supabase);
    const emailErrors: string[] = [];

    // Helper: multi-stage sender chain
    const sendWithSenderChain = async (
      resendInstance: any,
      toList: string[],
      subject: string,
      html: string,
      replyTo?: string
    ) => {
      const senders = Array.from(
        new Set([PRIMARY_FROM_EMAIL, SECONDARY_FROM_EMAIL, FALLBACK_FROM_EMAIL])
      );
      let lastRes: any = null;

      for (const sender of senders) {
        const effectiveRecipients =
          sender === FALLBACK_FROM_EMAIL && toList.includes(ADMIN_FALLBACK_EMAIL)
            ? [ADMIN_FALLBACK_EMAIL]
            : toList;

        try {
          const res = await resendInstance.emails.send({
            from: `AzkaSmart <${sender}>`,
            to: effectiveRecipients,
            ...(replyTo ? { reply_to: replyTo } : {}),
            subject,
            html,
          });
          lastRes = res;
          if (!res.error && res.data?.id) {
            return res;
          }
          console.warn(`Resend sender ${sender} -> ${effectiveRecipients.join(",")} error:`, res.error);
          emailErrors.push(`${sender}: ${res.error?.message || JSON.stringify(res.error)}`);
        } catch (err: any) {
          console.warn(`Resend sender ${sender} threw exception:`, err);
          emailErrors.push(`${sender}: ${err?.message || String(err)}`);
        }
      }
      return lastRes;
    };

    // ─────────────────────────────────────────────────────────────────
    // FLOW 1: ORDER STATUS UPDATE NOTIFICATION
    // ─────────────────────────────────────────────────────────────────
    if (isStatusUpdate) {
      const targetStatus = (rawNewStatus || rawStatus || order.status || "").toLowerCase().trim();
      const statusEmailsSent = (sa.statusEmailsSent || {}) as Record<string, string>;

      // Idempotency check for status updates
      if (!forceResend && statusEmailsSent[targetStatus]) {
        return new Response(
          JSON.stringify({
            success: true,
            alreadySent: true,
            emailSent: true,
            status: targetStatus,
            message: `Status notification for "${targetStatus}" already sent on ${statusEmailsSent[targetStatus]}`,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const meta = getStatusMeta(targetStatus);
      const subject = getStatusEmailSubject(targetStatus, orderId);
      const statusHtml = renderStatusUpdateHtml({
        orderId,
        status: targetStatus,
        meta,
        orderDateFormatted,
        itemsListHtml,
        total,
        paymentLabel,
        shippingAddress,
        sharedEmailStyles,
        cleanWhatsapp,
        displayWhatsapp,
        contactEmail,
        trackingNumber: trackingNumber || sa.trackingNumber,
        trackingCarrier: trackingCarrier || sa.trackingCarrier,
        note: note || sa.deliveryNote,
      });

      let customerEmailResponse: any = null;

      if (RESEND_API_KEY) {
        const resend = new Resend(RESEND_API_KEY);
        if (email) {
          customerEmailResponse = await sendWithSenderChain(
            resend,
            [email],
            subject,
            statusHtml,
            contactEmail
          );
        }
      } else {
        console.warn("RESEND_API_KEY not configured for status notification.");
        emailErrors.push("RESEND_API_KEY is missing in Supabase Edge Function secrets.");
      }

      const customerDelivered = Boolean(
        customerEmailResponse?.data?.id && !customerEmailResponse?.error
      );

      // Persist status email timestamp in database
      const nowIso = new Date().toISOString();
      const updatedSa = {
        ...sa,
        statusEmailsSent: {
          ...statusEmailsSent,
          [targetStatus]: nowIso,
        },
        lastStatusNotified: targetStatus,
        lastStatusNotifiedAt: nowIso,
      };

      await supabase
        .from("orders")
        .update({
          status: targetStatus,
          shipping_address: updatedSa,
          updated_at: nowIso,
        })
        .eq("id", orderId);

      // Best effort push notification
      try {
        await sendPushToEmail(supabase, email, {
          title: meta.pushTitle,
          message: `${meta.pushMessage} (طلب #${orderId.slice(0, 8).toUpperCase()})`,
          url: `/profile`,
        });
      } catch (e) {
        console.warn("Push notification for status update failed (non-fatal):", e);
      }

      return new Response(
        JSON.stringify({
          success: true,
          emailSent: customerDelivered,
          customerDelivered,
          status: targetStatus,
          customerEmail: customerEmailResponse,
          emailConfigured: !!RESEND_API_KEY,
          errors: emailErrors.length ? emailErrors : undefined,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────────────────────────
    // FLOW 2: INITIAL ORDER CONFIRMATION / PAYMENT NOTIFICATION
    // ─────────────────────────────────────────────────────────────────
    const alreadySentInitial = Boolean(sa.emailNotificationSentAt);
    const alreadySentPaid = Boolean(sa.paidNotificationSentAt);

    if (!forceResend) {
      if (isPaid && alreadySentPaid) {
        return new Response(
          JSON.stringify({
            success: true,
            alreadySent: true,
            emailSent: true,
            status: order.status,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!isPaid && alreadySentInitial) {
        return new Response(
          JSON.stringify({
            success: true,
            alreadySent: true,
            emailSent: true,
            status: order.status,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    let updatedShippingAddress = { ...sa };
    let currentStatus = order.status;
    if (paymentDetails) {
      updatedShippingAddress.paymentDetails = paymentDetails;
    } else if (queryParams && Object.keys(queryParams).length > 1 && !updatedShippingAddress.paymentDetails) {
      updatedShippingAddress.paymentDetails = queryParams;
    }
    if (isPaid) {
      updatedShippingAddress.isPaid = true;
    }

    if (isPaid && currentStatus === "pending") {
      currentStatus = "processing";
      await supabase
        .from("orders")
        .update({
          status: "processing",
          shipping_address: updatedShippingAddress,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
    }

    const rawCustomerPhone = shippingAddress.phone.replace(/[^0-9]/g, "");
    const customerWaNumber = rawCustomerPhone.startsWith("0")
      ? "2" + rawCustomerPhone
      : rawCustomerPhone.startsWith("20")
      ? rawCustomerPhone
      : rawCustomerPhone
      ? "2" + rawCustomerPhone
      : "";
    const adminCustomerWaUrl = customerWaNumber
      ? `https://wa.me/${customerWaNumber}?text=${encodeURIComponent(`مرحباً ${shippingAddress.firstName}، بخصوص طلبك رقم #${orderId.slice(0, 8).toUpperCase()} من متجر AzkaSmart...`)}`
      : null;

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
                <tr>
                  <td class="email-card" style="padding:24px 20px;background:#ffffff;">
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
                    <div style="font-size:14px;font-weight:bold;color:#0f172a;border-bottom:2px solid #00d2b4;padding-bottom:6px;margin-bottom:4px;">
                      المنتجات المطلوبة (${items.reduce((s, it) => s + it.quantity, 0)})
                    </div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:16px;">
                      ${itemsListHtml}
                    </table>
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
                <tr>
                  <td class="email-card" style="padding:24px 20px;background:#ffffff;">
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
                    <div style="font-size:14px;font-weight:bold;color:#0f172a;border-bottom:2px solid #00d2b4;padding-bottom:6px;margin-bottom:4px;">
                      المنتجات المطلوبة / Order Items (${items.reduce((s, it) => s + it.quantity, 0)})
                    </div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:16px;">
                      ${itemsListHtml}
                    </table>
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
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;">
                      <tr>
                        <td align="center" style="padding:0;">
                          <div style="font-size:15px;font-weight:bold;color:#0f172a;margin-bottom:4px;">
                            هل لديك أي استفسار حول طلبك؟
                          </div>
                          <div style="font-size:13px;color:#64748b;margin-bottom:14px;line-height:1.5;">
                            فريق خدمة العملاء والدعم الفني متاح دائماً لمساعدتك عبر واتساب
                          </div>
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
                                   style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:8px;font-size:14px;font-weight:600;border:1px solid #334155;text-align:center;">
                                   ✉️ راسلنا عبر البريد: ${contactEmail}
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <div style="color:#94a3b8;font-size:12px;text-align:center;margin-top:20px;line-height:1.6;">
                      AzkaSmart Egypt • شركة أزكاسمارت لحلول المنازل الذكية وأنظمة الأمان<br />
                      القاهرة، جمهورية مصر العربية • <a href="https://azkasmart.com" style="color:#008b76;text-decoration:none;">azkasmart.com</a>
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

    let adminEmailResponse: any = null;
    let customerEmailResponse: any = null;

    if (RESEND_API_KEY) {
      const resend = new Resend(RESEND_API_KEY);

      const adminSubject = `🛒 طلب جديد #${orderId.slice(0, 8).toUpperCase()} - ${total.toLocaleString()} ج.م (${paymentLabel})`;
      const adminRecipients = Array.from(new Set([contactEmail, ADMIN_EMAIL, ADMIN_FALLBACK_EMAIL].filter(Boolean)));

      // 1. Send Admin Notification
      adminEmailResponse = await sendWithSenderChain(
        resend,
        adminRecipients,
        adminSubject,
        adminEmailHtml,
        email || undefined
      );

      if (adminEmailResponse?.error && ADMIN_FALLBACK_EMAIL) {
        const retryOwner = await sendWithSenderChain(
          resend,
          [ADMIN_FALLBACK_EMAIL],
          adminSubject,
          adminEmailHtml,
          email || undefined
        );
        if (retryOwner && !retryOwner.error) {
          adminEmailResponse = retryOwner;
        }
      }

      // 2. Send Customer Order Confirmation
      if (email) {
        customerEmailResponse = await sendWithSenderChain(
          resend,
          [email],
          `تأكيد طلبك من أزكاسمارت #${orderId.slice(0, 8).toUpperCase()} | Order Confirmed!`,
          customerEmailHtml,
          contactEmail
        );
      }
    } else {
      console.warn("RESEND_API_KEY not configured in Supabase secrets or site_info.");
      emailErrors.push("RESEND_API_KEY is missing in Supabase Edge Function secrets.");
    }

    const adminDelivered = Boolean(adminEmailResponse?.data?.id && !adminEmailResponse?.error);
    const customerDelivered = Boolean(customerEmailResponse?.data?.id && !customerEmailResponse?.error);
    const anyEmailSent = adminDelivered || customerDelivered;

    if (anyEmailSent) {
      const nowIso = new Date().toISOString();
      updatedShippingAddress = {
        ...updatedShippingAddress,
        emailNotificationSentAt: updatedShippingAddress.emailNotificationSentAt || nowIso,
        ...(isPaid ? { paidNotificationSentAt: nowIso } : {}),
      };
      await supabase
        .from("orders")
        .update({
          shipping_address: updatedShippingAddress,
          updated_at: nowIso,
        })
        .eq("id", orderId);
    }

    // Best-effort push notification
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
        emailSent: anyEmailSent,
        adminDelivered,
        customerDelivered,
        status: currentStatus,
        adminEmail: adminEmailResponse,
        customerEmail: customerEmailResponse,
        emailConfigured: !!RESEND_API_KEY,
        errors: emailErrors.length ? emailErrors : undefined,
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
