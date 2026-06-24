import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const fcmToken = cleanString(body?.fcm_token, 4096);
    if (!fcmToken) {
      return new Response(JSON.stringify({ error: "fcm_token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const bearerToken = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = bearerToken
      ? await supabase.auth.getUser(bearerToken)
      : { data: { user: null } };
    const payload = {
      fcm_token: fcmToken,
      user_id: user?.id ?? null,
      email: user?.email ?? null,
      platform: cleanString(body?.platform, 32) ?? "web",
      locale: cleanString(body?.locale, 32) ?? "en",
      user_agent: cleanString(body?.user_agent, 255),
      enabled: true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(payload, { onConflict: "fcm_token" })
      .select("id")
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("register-push-token error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
