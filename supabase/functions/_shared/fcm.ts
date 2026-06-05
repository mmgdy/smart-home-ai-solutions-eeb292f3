// Shared FCM v1 sender for server-to-server pushes.
// Reads FIREBASE_SERVICE_ACCOUNT_JSON. Caller passes a Supabase service-role client.
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

export type PushPayload = {
  title: string;
  message: string;
  url?: string;
  image?: string;
};

function pemToBinaryDer(pem: string): Uint8Array {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(sa: any): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
  const der = pemToBinaryDer(sa.private_key);
  const key = await crypto.subtle.importKey(
    "pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
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
  cachedToken = { token: j.access_token, exp: Date.now() + 3500_000 };
  return j.access_token as string;
}

export async function sendPushToTokens(
  supabase: any,
  tokens: string[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number; removed_stale: number }> {
  const saJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!saJson) return { sent: 0, failed: 0, removed_stale: 0 };
  if (!tokens.length) return { sent: 0, failed: 0, removed_stale: 0 };
  const sa = JSON.parse(saJson);
  const accessToken = await getAccessToken(sa);
  const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  const stale: string[] = [];
  let sent = 0, failed = 0;
  for (const tk of tokens) {
    const body = {
      message: {
        token: tk,
        notification: { title: payload.title, body: payload.message, ...(payload.image ? { image: payload.image } : {}) },
        data: { url: payload.url || "/", ...(payload.image ? { image: payload.image } : {}) },
        webpush: { fcmOptions: { link: payload.url || "/" } },
      },
    };
    const r = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) { sent++; continue; }
    failed++;
    const j = await r.json().catch(() => ({}));
    const code = j?.error?.details?.[0]?.errorCode || j?.error?.status;
    if (code === "UNREGISTERED" || code === "INVALID_ARGUMENT" || code === "NOT_FOUND") stale.push(tk);
  }
  if (stale.length) {
    try { await supabase.from("push_subscriptions").delete().in("fcm_token", stale); } catch { /* ignore */ }
  }
  return { sent, failed, removed_stale: stale.length };
}

export async function sendPushToEmail(supabase: any, email: string | null | undefined, payload: PushPayload) {
  if (!email) return { sent: 0, failed: 0, removed_stale: 0 };
  const { data } = await supabase
    .from("push_subscriptions").select("fcm_token").eq("email", email).eq("enabled", true);
  const tokens = (data || []).map((r: any) => r.fcm_token).filter(Boolean);
  return sendPushToTokens(supabase, tokens, payload);
}

export async function sendPushToAll(supabase: any, payload: PushPayload) {
  const { data } = await supabase
    .from("push_subscriptions").select("fcm_token").eq("enabled", true);
  const tokens = (data || []).map((r: any) => r.fcm_token).filter(Boolean);
  return sendPushToTokens(supabase, tokens, payload);
}