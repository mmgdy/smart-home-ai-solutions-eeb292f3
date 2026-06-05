// Broadcast or targeted FCM push via Firebase HTTP v1 API.
// Admin-token gated. Uses FIREBASE_SERVICE_ACCOUNT_JSON to sign a Google
// OAuth2 access token with the messaging scope.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function verifyAdminToken(supabase: any, token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = atob(token);
    const [adminId] = decoded.split(":");
    const { data } = await supabase
      .from("admin_settings").select("value").eq("key", `admin_token_${adminId}`).single();
    return !!data && data.value === token;
  } catch { return false; }
}

function pemToBinaryDer(pem: string): Uint8Array {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getAccessToken(sa: any): Promise<string> {
  const der = pemToBinaryDer(sa.private_key);
  const key = await crypto.subtle.importKey(
    "pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: getNumericDate(0),
      exp: getNumericDate(3600),
    },
    key,
  );
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const j = await resp.json();
  if (!resp.ok) throw new Error("OAuth token failed: " + JSON.stringify(j));
  return j.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { token, title, message, url, image, tokens: targetTokens } = body || {};

    if (!(await verifyAdminToken(supabase, token))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!title || !message) {
      return new Response(JSON.stringify({ error: "title and message are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const saJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    if (!saJson) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON not set");
    const sa = JSON.parse(saJson);
    const accessToken = await getAccessToken(sa);

    let targets: string[] = Array.isArray(targetTokens) ? targetTokens : [];
    if (!targets.length) {
      const { data } = await supabase
        .from("push_subscriptions").select("fcm_token").eq("enabled", true);
      targets = (data || []).map((r: any) => r.fcm_token).filter(Boolean);
    }

    const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
    const results: any[] = [];
    const stale: string[] = [];

    for (const tk of targets) {
      const payload = {
        message: {
          token: tk,
          notification: { title, body: message, ...(image ? { image } : {}) },
          data: { url: url || "/", ...(image ? { image } : {}) },
          webpush: { fcmOptions: { link: url || "/" } },
        },
      };
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const code = j?.error?.details?.[0]?.errorCode || j?.error?.status;
        if (code === "UNREGISTERED" || code === "INVALID_ARGUMENT" || code === "NOT_FOUND") stale.push(tk);
        results.push({ token: tk.slice(0, 12), ok: false, error: code || j?.error?.message });
      } else {
        results.push({ token: tk.slice(0, 12), ok: true });
      }
    }

    if (stale.length) {
      await supabase.from("push_subscriptions").delete().in("fcm_token", stale);
    }

    return new Response(JSON.stringify({
      success: true,
      sent: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      removed_stale: stale.length,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-push error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});