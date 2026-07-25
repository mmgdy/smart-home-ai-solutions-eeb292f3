import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";

async function verifyAdminToken(supabase: any, token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = atob(token);
    const [adminId] = decoded.split(":");
    const { data } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", `admin_token_${adminId}`)
      .single();
    return !!data && data.value === token;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60000, maxRequests: 6 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const action = req.headers.get("x-push-action") || "broadcast";

    if (action === "broadcast") {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");

      if (!(await verifyAdminToken(supabase, token))) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { title, body, imageUrl, url: rawUrl } = await req.json();
      if (!title || !body) {
        return new Response(JSON.stringify({ success: false, error: "Title and body required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const siteUrl = `https://${new URL(supabaseUrl).hostname}`;
      const safeUrl = safeNotificationUrl(rawUrl, siteUrl);

      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("token, platform")
        .eq("enabled", true);

      if (!subscriptions || subscriptions.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: "No active subscriptions" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { sendSingleNotification } = await import("../_shared/fcm.ts");
      const results = [];
      const BATCH_SIZE = 500;
      const tokens = subscriptions;

      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE);
        for (const sub of batch) {
          try {
            const result = await sendSingleNotification(
              sub.token,
              {
                title: String(title).slice(0, 200),
                body: String(body).slice(0, 500),
                ...(imageUrl ? { imageUrl: String(imageUrl) } : {}),
                ...(safeUrl ? { url: safeUrl } : {}),
              },
              sub.platform
            );
            results.push(result);
          } catch (e) {
            console.error("Push error:", e);
            results.push({ success: false });
          }
        }
      }

      const successCount = results.filter((r) => r.success).length;
      return new Response(
        JSON.stringify({
          success: true,
          message: `Sent to ${successCount}/${subscriptions.length} devices`,
          total: subscriptions.length,
          successful: successCount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Push error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function safeNotificationUrl(url: unknown, siteUrl: string): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed, siteUrl);
    if (parsed.protocol !== "https:") return null;
    const allowed = [new URL(siteUrl).hostname, "baytzaki.com", "www.baytzaki.com"];
    if (!allowed.includes(parsed.hostname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
