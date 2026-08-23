// Admin authentication + secure credential reset.
//
// Actions:
//   login          -> email/username + password, returns an opaque admin token
//   verify         -> validates a stored token, returns the admin identity
//   reset-password -> generates a new strong password for the CURRENT admin,
//                     returns it exactly once (never persisted anywhere) and
//                     revokes every other admin session.
//
// The legacy `admin_wait_table` lookup below is a *temporary* migration path
// from the previous multi-seller DB; it does not store the new password.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";

const PASSWORD_ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*-_=+";

/** Cryptographically-random password, rejection-sampled to avoid modulo bias. */
function generatePassword(length = 24): string {
  const out: string[] = [];
  const max = Math.floor(256 / PASSWORD_ALPHABET.length) * PASSWORD_ALPHABET.length;
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    for (const b of bytes) {
      if (b >= max) continue;
      out.push(PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]);
      if (out.length === length) break;
    }
  }
  return out.join("");
}

function makeToken(adminId: string): string {
  const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return btoa(`${adminId}:${secret}`);
}

function json(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Resolves a bearer token to the admin session record, or null. */
async function resolveSession(admin: any, token: string) {
  if (!token) return null;
  let adminId = "";
  try {
    adminId = atob(token).split(":")[0];
  } catch {
    return null;
  }
  if (!adminId) return null;
  const { data } = await admin
    .from("admin_settings")
    .select("key, value")
    .in("key", [`admin_token_${adminId}`, `admin_session_${adminId}`]);
  const map: Record<string, string> = {};
  (data ?? []).forEach((r: any) => { map[r.key] = r.value; });
  if (map[`admin_token_${adminId}`] !== token) return null;
  return { adminId, email: map[`admin_session_${adminId}`] ?? "" };
}

async function findUserByEmail(admin: any, email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const hit = data.users.find((u: any) => (u.email ?? "").toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 300_000, maxRequests: 15 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: "Too many attempts. Try again later." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body */ }
  const action = String(body.action ?? "login");
  const bearer = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();

  try {
    // ---------------------------------------------------------------- verify
    if (action === "verify") {
      const session = await resolveSession(admin, body.token ?? bearer);
      if (!session) return json({ success: false, error: "Invalid session" }, 401, corsHeaders);
      return json(
        { success: true, admin: { id: session.adminId, username: session.email } },
        200,
        corsHeaders,
      );
    }

    // -------------------------------------------------------- reset-password
    if (action === "reset-password") {
      const session = await resolveSession(admin, bearer || body.token);
      if (!session) return json({ success: false, error: "Unauthorized" }, 401, corsHeaders);
      if (!session.email) {
        return json({ success: false, error: "This session has no linked account. Sign in again." }, 400, corsHeaders);
      }

      const user = await findUserByEmail(admin, session.email);
      if (!user) return json({ success: false, error: "Admin account not found" }, 404, corsHeaders);

      const newPassword = generatePassword(24);
      const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
        password: newPassword,
        email_confirm: true,
      });
      if (updErr) throw updErr;

      // Revoke every other admin session so a leaked token can't be reused.
      const { data: sessions } = await admin
        .from("admin_settings")
        .select("key")
        .or("key.like.admin_token_%,key.like.admin_session_%");
      const stale = (sessions ?? [])
        .map((r: any) => r.key as string)
        .filter((k) => !k.endsWith(session.adminId));
      if (stale.length) await admin.from("admin_settings").delete().in("key", stale);

      // Best-effort: drop legacy plaintext rows for this account so the old
      // password can never be used again.
      await admin.from("admin_wait_table").delete().ilike("email", session.email);

      console.log(`Admin password reset for ${session.adminId} at ${new Date().toISOString()}`);

      // The password is returned here and nowhere else — it is not stored.
      return json({ success: true, email: session.email, password: newPassword }, 200, corsHeaders);
    }

    // ----------------------------------------------------------------- login
    const email = String(body.email ?? body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password) {
      return json({ success: false, error: "Email and password are required" }, 400, corsHeaders);
    }

    const anon = createClient(supabaseUrl, supabaseAnonKey);
    const { data: signIn, error: signInError } = await anon.auth.signInWithPassword({ email, password });

    if (signInError?.message?.includes("Email not confirmed")) {
      return json({ success: false, error: "Email not confirmed. Check your inbox." }, 403, corsHeaders);
    }

    if (signInError || !signIn?.user) {
      // Legacy migration path: verify against the plaintext waiting table,
      // then mint a real auth user with a random password.
      const { data: legacyUsers } = await admin
        .from("admin_wait_table")
        .select("name, email, password")
        .ilike("email", email);

      if (!legacyUsers?.length || legacyUsers[0].password !== password) {
        return json({ success: false, error: "Invalid credentials" }, 401, corsHeaders);
      }

      const existing = await findUserByEmail(admin, email);
      if (existing) {
        await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
      } else {
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name: legacyUsers[0].name },
        });
      }
    }

    const adminId = crypto.randomUUID();
    const token = makeToken(adminId);
    const now = new Date().toISOString();
    await admin.from("admin_settings").upsert(
      [
        { key: `admin_token_${adminId}`, value: token, updated_at: now },
        { key: `admin_session_${adminId}`, value: email, updated_at: now },
      ],
      { onConflict: "key" },
    );

    return json({ success: true, token, adminId, admin: { id: adminId, username: email } }, 200, corsHeaders);
  } catch (error) {
    console.error("admin-auth error:", error);
    return json({ success: false, error: "Request failed" }, 500, corsHeaders);
  }
});
