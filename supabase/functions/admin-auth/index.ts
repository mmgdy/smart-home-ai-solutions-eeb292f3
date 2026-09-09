// Admin authentication + secure credential reset.
//
// Actions:
//   login          -> email + password, returns an opaque admin token
//   verify         -> validates a stored token, returns the admin identity
//   reset-password -> generates a new strong password for the CURRENT admin,
//                     returns it exactly once (never persisted anywhere) and
//                     revokes every other admin session.
//   reset-admin    -> re-create/re-configure the admin user (requires SETUP_TOKEN secret)
//
// Only accounts with app_metadata.role === "admin" (or listed under the
// admin_settings key "admin_allowed_emails") get admin tokens — ordinary
// customer signups are rejected with 403.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";

const PASSWORD_ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*-_=+";


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

async function resolveSession(admin: any, token: string) {
  if (!token) return null;
  let adminId = "";
  try { adminId = atob(token).split(":")[0]; } catch { return null; }
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

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
    if (action === "verify") {
      const session = await resolveSession(admin, body.token ?? bearer);
      if (!session) return json({ success: false, error: "Invalid session" }, 401, corsHeaders);
      return json(
        { success: true, admin: { id: session.adminId, username: session.email } },
        200,
        corsHeaders,
      );
    }

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
      const { data: sessions } = await admin
        .from("admin_settings")
        .select("key")
        .or("key.like.admin_token_%,key.like.admin_session_%");
      const stale = (sessions ?? [])
        .map((r: any) => r.key as string)
        .filter((k) => !k.endsWith(session.adminId));
      if (stale.length) await admin.from("admin_settings").delete().in("key", stale);
      console.log(`Admin password reset for ${session.adminId} at ${new Date().toISOString()}`);
      return json({ success: true, email: session.email, password: newPassword }, 200, corsHeaders);
    }

    if (action === "reset-admin") {
      const setupToken = Deno.env.get("SETUP_TOKEN");
      if (!setupToken || body.setupToken !== setupToken) {
        return json({ success: false, error: "Setup token required" }, 403, corsHeaders);
      }
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      if (!email || !password) {
        return json({ success: false, error: "Email and password are required" }, 400, corsHeaders);
      }
      const { data: sessions } = await admin
        .from("admin_settings")
        .select("key")
        .or("key.like.admin_token_%,key.like.admin_session_%");
      const stale = (sessions ?? [])
        .map((r: any) => r.key as string)
        .filter((k) => !k.includes(email));
      if (stale.length) await admin.from("admin_settings").delete().in("key", stale);
      const existing = await findUserByEmail(admin, email);
      if (existing) {
        await admin.auth.admin.updateUserById(existing.id, {
          password,
          email_confirm: true,
          app_metadata: { role: "admin" },
        });
      } else {
        const { error: createErr } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name: "AzkaSmart Admin" },
          app_metadata: { role: "admin" },
        });
        if (createErr) throw createErr;
      }
      await admin.from("admin_settings").upsert(
        { key: "admin_allowed_emails", value: email, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
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
      return json(
        { success: true, token, adminId, admin: { id: adminId, username: email } },
        200,
        corsHeaders,
      );
    }

    // Normal login
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
      return json({ success: false, error: "Invalid credentials" }, 401, corsHeaders);
    }

    // Admin gate
    const { data: allowedRows } = await admin
      .from("admin_settings")
      .select("value")
      .eq("key", "admin_allowed_emails")
      .maybeSingle();
    const allowedEmails = allowedRows
      ? String(allowedRows.value).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];
    const isAdmin = signIn.user.app_metadata?.role === "admin" || allowedEmails.includes(email);
    if (!isAdmin) {
      return json({ success: false, error: "Not an admin account" }, 403, corsHeaders);
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

    // Send login confirmation email
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const Resend = (await import("https://esm.sh/resend@2.0.0")).default;
        const resend = new Resend(RESEND_API_KEY);
        const adminEmailHtml = `
          <!DOCTYPE html>
          <html><head><meta charset="utf-8"><title>Admin Login - AzkaSmart</title></head>
          <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5">
            <div style="background:#0f172a;padding:20px;border-radius:12px 12px 0 0;text-align:center">
              <h1 style="color:#00bfa5;margin:0">🔐 Admin Login</h1>
            </div>
            <div style="background:#fff;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
          <p style="color:#666">An admin login was performed on your AzkaSmart account.</p>
              <div style="background:#0f172a;color:#fff;padding:15px;border-radius:8px;margin:20px 0">
                <p style="margin:0;font-size:16px"><strong>Email:</strong> ${escapeHtml(email)}</p>
                <p style="margin:5px 0 0;font-size:14px;opacity:.9">Time: ${new Date().toLocaleString("en-EG")}</p>
              </div>
              <p style="color:#666;font-size:12px;text-align:center;margin-top:20px">If this was not you, immediately reset your password from the Security tab in the admin panel.</p>
            </div>
          </body></html>
        `;
        await resend.emails.send({
          from: "AzkaSmart Admin <admin@azkasmart.com>",
          to: ["info@azkasmart.com"],
          subject: `🔐 Admin Login - ${email}`,
          html: adminEmailHtml,
        });
      }
    } catch (e) {
      console.warn("Admin login email failed (non-fatal):", e);
    }

    return json({ success: true, token, adminId, admin: { id: adminId, username: email } }, 200, corsHeaders);
  } catch (error) {
    console.error("admin-auth error:", error);
    return json({ success: false, error: "Request failed" }, 500, corsHeaders);
  }
});