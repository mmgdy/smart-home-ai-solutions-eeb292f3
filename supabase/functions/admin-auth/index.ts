import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
// Use the sync API to avoid Web Worker (not available in Supabase edge runtime)
import { hashSync, compareSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function verifyAdminTokenDb(supabase: any, token: string): Promise<string | null> {
  if (!token) return null;
  try {
    const decoded = atob(token);
    const [adminId] = decoded.split(":");
    const { data } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", `admin_token_${adminId}`)
      .single();
    return data && data.value === token ? adminId : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, username, password, newPassword, token } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "login") {
      const { data: admin, error } = await supabase
        .from("admin_users")
        .select("id, username, password_hash")
        .eq("username", username)
        .single();

      if (error || !admin) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid credentials" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let passwordOk = false;
      const storedHash: string = admin.password_hash ?? "";

      if (storedHash.startsWith("$2")) {
        try {
          passwordOk = compareSync(password, storedHash);
        } catch (e) {
          console.error("bcrypt compare error", e);
          passwordOk = false;
        }
      } else {
        // Plaintext (legacy) — compare and upgrade on success
        passwordOk = storedHash === password;
        if (passwordOk) {
          try {
            const newHash = hashSync(password);
            await supabase
              .from("admin_users")
              .update({ password_hash: newHash })
              .eq("id", admin.id);
          } catch (e) {
            console.error("bcrypt hash error", e);
          }
        }
      }

      if (!passwordOk) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid credentials" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const sessionToken = btoa(`${admin.id}:${Date.now()}:${crypto.randomUUID()}`);

      await supabase
        .from("admin_settings")
        .upsert({
          key: `admin_token_${admin.id}`,
          value: sessionToken,
        }, { onConflict: "key" });

      return new Response(
        JSON.stringify({
          success: true,
          token: sessionToken,
          admin: { id: admin.id, username: admin.username },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      if (!token) {
        return new Response(
          JSON.stringify({ success: false, error: "No token provided" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const adminId = await verifyAdminTokenDb(supabase, token);
      if (!adminId) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: admin } = await supabase
        .from("admin_users")
        .select("id, username")
        .eq("id", adminId)
        .single();

      return new Response(
        JSON.stringify({ success: true, admin }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "change-password") {
      if (!token || !newPassword) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing token or new password" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const adminId = await verifyAdminTokenDb(supabase, token);
      if (!adminId) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const hashedPassword = hashSync(newPassword);

      const { error: updateError } = await supabase
        .from("admin_users")
        .update({ password_hash: hashedPassword })
        .eq("id", adminId);

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: "Failed to update password" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Password updated successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "logout") {
      if (token) {
        try {
          const decoded = atob(token);
          const [adminId] = decoded.split(":");
          await supabase
            .from("admin_settings")
            .delete()
            .eq("key", `admin_token_${adminId}`);
        } catch {
          // Ignore errors on logout
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Admin auth error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
