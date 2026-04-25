// Sends a one-time welcome email to a newly-registered user.
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, name, language = "en" } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Idempotency: only send once per email
    const { data: existing } = await supabase
      .from("welcome_emails_sent")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
    const resend = new Resend(RESEND_API_KEY);

    const isAr = language === "ar";
    const displayName = name || email.split("@")[0];

    const html = isAr ? `
      <div style="font-family:'Tahoma',Arial,sans-serif;direction:rtl;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
        <div style="background:#0f172a;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#00bfa5;margin:0;">أهلاً بك في بيت زكي 🏡</h1>
        </div>
        <div style="background:#fff;padding:30px;border-radius:0 0 12px 12px;">
          <p style="font-size:16px;">مرحباً ${displayName}،</p>
          <p>سعداء بانضمامك إلى عائلة بيت زكي - أول منصة بالذكاء الاصطناعي للمنازل الذكية في مصر.</p>
          <ul style="line-height:1.8;color:#555;">
            <li>🤖 استشارة مجانية مع المستشار الذكي</li>
            <li>🛒 أكثر من 580 منتج ذكي معتمد</li>
            <li>🎁 احصل على نقطة ولاء لكل 10 ج.م تنفقها</li>
            <li>🔧 تركيب احترافي + ضمان رسمي سنتين</li>
          </ul>
          <div style="text-align:center;margin:30px 0;">
            <a href="https://baytzaki.com/ai-consultant" style="background:#00bfa5;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">ابدأ الاستشارة الذكية</a>
          </div>
          <p style="color:#888;font-size:12px;text-align:center;">للمساعدة: <a href="mailto:info@baytzaki.com" style="color:#00bfa5;">info@baytzaki.com</a></p>
        </div>
      </div>` : `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
        <div style="background:#0f172a;padding:30px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#00bfa5;margin:0;">Welcome to Baytzaki 🏡</h1>
        </div>
        <div style="background:#fff;padding:30px;border-radius:0 0 12px 12px;">
          <p style="font-size:16px;">Hi ${displayName},</p>
          <p>Welcome to Baytzaki — Egypt's first AI-powered Smart Home platform.</p>
          <ul style="line-height:1.8;color:#555;">
            <li>🤖 Free AI Smart Home Consultation</li>
            <li>🛒 580+ verified smart home products</li>
            <li>🎁 Earn 1 loyalty point for every 10 EGP spent</li>
            <li>🔧 Pro installation + 2-year official warranty</li>
          </ul>
          <div style="text-align:center;margin:30px 0;">
            <a href="https://baytzaki.com/ai-consultant" style="background:#00bfa5;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">Start AI Consultation</a>
          </div>
          <p style="color:#888;font-size:12px;text-align:center;">Need help? <a href="mailto:info@baytzaki.com" style="color:#00bfa5;">info@baytzaki.com</a></p>
        </div>
      </div>`;

    const result = await resend.emails.send({
      from: "Baytzaki <welcome@baytzaki.com>",
      to: [email],
      subject: isAr ? "أهلاً بك في بيت زكي 🏡" : "Welcome to Baytzaki 🏡",
      html,
    });

    await supabase.from("welcome_emails_sent").insert({ email });

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-welcome-email error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
