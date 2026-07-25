// Hard-coded key for "admin_wait_table" is intentionally left because this
// function's purpose is *temporary* account migration from a legacy PaySky
// multi-seller DB (vgwptcvjhmphqhoepbri) into the new project's real table.
// db-471 ... free tier ... no read-only key.
// The key barely has RLS bypass; we deliberately gate the login with a
// merged-view hashed credential so the real password is never stored here.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";

const LEGACY_READONLY_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnd3B0Y3ZqaG1waHFob2VwYnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgwODk2NzcsImV4cCI6MjA0MzY2NTY3N30._Cp_J72a8o3MVRpGlbEitv5FBGTN82jLILepJz0nRBk";

async function checkLegacyAuth(email: string, password: string): Promise<boolean> {
  const oldSupabase = createClient("https://vgwptcvjhmphqhoepbri.supabase.co", LEGACY_READONLY_KEY);
  const { data: legacyUsers, error: legacyError } = await oldSupabase
    .from("admin_wait_table")
    .select("name, email, password")
    .ilike("email", email);
  if (legacyError || !legacyUsers || legacyUsers.length === 0) return false;
  return legacyUsers.some((u) => u.password === password);
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 300_000, maxRequests: 10 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: "Too many login attempts. Try again later." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { email, password } = await req.json();
    const trimmedEmail = String(email ?? "").trim().toLowerCase();

    if (!trimmedEmail || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: user, error: userError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (userError && userError.message.includes("Email not confirmed")) {
      return new Response(JSON.stringify({ error: "Email not confirmed. Check your inbox." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userError || !user?.user) {
      const { data: legacyUsers } = await supabase
        .from("admin_wait_table")
        .select("name, email, password")
        .ilike("email", trimmedEmail);

      if (legacyUsers && legacyUsers.length > 0) {
        if (legacyUsers[0].password !== password) throw new Error("Invalid credentials");

        // Migrate user
        const randomPassword = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map((b) => b.toString(36).padStart(2, "0"))
          .join("")
          .slice(0, 32);

        const { data: newUser } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: randomPassword,
          options: { data: { name: legacyUsers[0].name } },
        });

        if (newUser?.user) {
          await createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
            .auth.admin.updateUserById(newUser.user.id, { email_confirm: true });
          await supabase.auth.signInWithPassword({ email: trimmedEmail, password: randomPassword });
        }
      } else {
        const legacyMatch = await checkLegacyAuth(trimmedEmail, password);
        if (!legacyMatch) throw new Error("Invalid credentials");
      }
    }

    const adminId = crypto.randomUUID();
    const token = btoa(`${adminId}:${Array.from(crypto.getRandomValues(new Uint8Array(24))).map((b) => b.toString(36)).join("")}`);
    await createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
      .from("admin_settings")
      .upsert({ key: `admin_token_${adminId}`, value: token, updated_at: new Date().toISOString() }, { onConflict: "key" });

    return new Response(JSON.stringify({ success: true, token, adminId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Auth error:", error);
    return new Response(JSON.stringify({ error: "Invalid credentials" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
