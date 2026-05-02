import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Per-instance rate limiter to throttle abuse
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const now = Date.now();
    const bucket = rateBuckets.get(ip);
    if (!bucket || bucket.resetAt < now) {
      rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    } else {
      bucket.count += 1;
      if (bucket.count > RATE_LIMIT) {
        return new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { orderId, paymentMethod } = await req.json();
    if (!orderId || typeof orderId !== "string") {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch authoritative order data from DB — never trust caller-supplied fields
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: order, error: orderErr } = await supabase
      .from("orders").select("id, email, total, shipping_address, created_at")
      .eq("id", orderId).single();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: rawItems } = await supabase
      .from("order_items").select("product_name, quantity, price")
      .eq("order_id", orderId);

    const email = order.email;
    const total = Number(order.total) || 0;
    const items = (rawItems ?? []).map(i => ({
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
    };

    // Format items for email
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${escapeHtml(item.product_name)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toLocaleString()} EGP</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${(item.price * item.quantity).toLocaleString()} EGP</td>
      </tr>
    `).join('');

    const paymentLabel = paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment (PaySky)';

    // Send notification to admin
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Order - Baytzaki</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: #0f172a; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #00bfa5; margin: 0;">🛒 New Order Received!</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="background-color: #00bfa5; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 18px;">Order #${orderId.slice(0, 8)}</h2>
            <p style="margin: 5px 0 0; opacity: 0.9;">Payment: ${paymentLabel}</p>
          </div>

          <h3 style="color: #333; border-bottom: 2px solid #00bfa5; padding-bottom: 10px;">Customer Information</h3>
          <table style="width: 100%; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #666;">Name:</td>
              <td style="padding: 8px 0;"><strong>${escapeHtml(shippingAddress.firstName)} ${escapeHtml(shippingAddress.lastName)}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Email:</td>
              <td style="padding: 8px 0;"><strong>${escapeHtml(email)}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Phone:</td>
              <td style="padding: 8px 0;"><strong>${escapeHtml(shippingAddress.phone)}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;">Address:</td>
              <td style="padding: 8px 0;"><strong>${escapeHtml(shippingAddress.address)}, ${escapeHtml(shippingAddress.city)}, ${escapeHtml(shippingAddress.governorate)}</strong></td>
            </tr>
          </table>

          <h3 style="color: #333; border-bottom: 2px solid #00bfa5; padding-bottom: 10px;">Order Items</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="padding: 12px; text-align: left;">Product</th>
                <th style="padding: 12px; text-align: center;">Qty</th>
                <th style="padding: 12px; text-align: right;">Price</th>
                <th style="padding: 12px; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="background-color: #0f172a; color: white; padding: 20px; border-radius: 8px; text-align: right;">
            <span style="font-size: 18px;">Total: </span>
            <span style="font-size: 24px; font-weight: bold; color: #00bfa5;">${total.toLocaleString()} EGP</span>
          </div>

          <p style="color: #666; font-size: 12px; text-align: center; margin-top: 20px;">
            This order was placed on ${new Date().toLocaleDateString('en-EG', { dateStyle: 'full' })} at ${new Date().toLocaleTimeString('en-EG')}
          </p>
        </div>
      </body>
      </html>
    `;

    // Send email to admin
    const adminEmailResponse = await resend.emails.send({
      from: "Baytzaki Orders <orders@baytzaki.com>",
      to: ["info@baytzaki.com"],
      subject: `🛒 New Order #${orderId.slice(0, 8)} - ${total.toLocaleString()} EGP (${paymentLabel})`,
      html: adminEmailHtml,
    });

    console.log("Admin notification sent:", adminEmailResponse);

    // Send confirmation to customer
    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation - Baytzaki</title>
      </head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: #0f172a; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #00bfa5; margin: 0;">✓ Order Confirmed!</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #333;">Dear ${escapeHtml(shippingAddress.firstName)},</p>
          <p style="color: #666;">Thank you for your order! We've received your order and will process it shortly.</p>
          
          <div style="background-color: #00bfa5; color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0; font-size: 18px;">Order #${orderId.slice(0, 8)}</h2>
            <p style="margin: 5px 0 0; opacity: 0.9;">Payment Method: ${paymentLabel}</p>
          </div>

          <h3 style="color: #333;">Your Items</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tbody>
              ${items.map(item => `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 12px 0;">${escapeHtml(item.product_name)} x${item.quantity}</td>
                  <td style="padding: 12px 0; text-align: right; font-weight: bold;">${(item.price * item.quantity).toLocaleString()} EGP</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; text-align: right;">
            <span style="font-size: 18px; font-weight: bold; color: #0f172a;">Total: ${total.toLocaleString()} EGP</span>
          </div>

          <h3 style="color: #333; margin-top: 25px;">Delivery Address</h3>
          <p style="color: #666; line-height: 1.6;">
            ${escapeHtml(shippingAddress.firstName)} ${escapeHtml(shippingAddress.lastName)}<br>
            ${escapeHtml(shippingAddress.address)}<br>
            ${escapeHtml(shippingAddress.city)}, ${escapeHtml(shippingAddress.governorate)}<br>
            Phone: ${escapeHtml(shippingAddress.phone)}
          </p>

          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666;">Questions? Contact us at <a href="mailto:info@baytzaki.com" style="color: #00bfa5;">info@baytzaki.com</a></p>
          </div>
        </div>
        
        <p style="text-align: center; color: #999; font-size: 12px; margin-top: 20px;">
          © ${new Date().getFullYear()} Baytzaki. All rights reserved.
        </p>
      </body>
      </html>
    `;

    const customerEmailResponse = await resend.emails.send({
      from: "Baytzaki <orders@baytzaki.com>",
      to: [email],
      subject: `Order Confirmed! #${orderId.slice(0, 8)}`,
      html: customerEmailHtml,
    });

    console.log("Customer confirmation sent:", customerEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        adminEmail: adminEmailResponse,
        customerEmail: customerEmailResponse 
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );

  } catch (error: any) {
    console.error("Error sending order notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
};

serve(handler);
