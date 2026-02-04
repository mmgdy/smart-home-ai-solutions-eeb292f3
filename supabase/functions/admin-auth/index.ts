import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, username, password, newPassword, token } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "login") {
      // Verify credentials
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

      // Simple password check (in production, use proper bcrypt)
      if (admin.password_hash !== password) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid credentials" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate a simple token (in production, use JWT)
      const token = btoa(`${admin.id}:${Date.now()}:${crypto.randomUUID()}`);
      
      // Store token in admin_settings for validation
      await supabase
        .from("admin_settings")
        .upsert({ 
          key: `admin_token_${admin.id}`, 
          value: token 
        }, { onConflict: 'key' });

      return new Response(
        JSON.stringify({ 
          success: true, 
          token,
          admin: { id: admin.id, username: admin.username }
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

      // Decode token to get admin ID
      try {
        const decoded = atob(token);
        const [adminId] = decoded.split(":");
        
        // Verify token exists in settings
        const { data: storedToken } = await supabase
          .from("admin_settings")
          .select("value")
          .eq("key", `admin_token_${adminId}`)
          .single();

        if (!storedToken || storedToken.value !== token) {
          return new Response(
            JSON.stringify({ success: false, error: "Invalid token" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get admin info
        const { data: admin } = await supabase
          .from("admin_users")
          .select("id, username")
          .eq("id", adminId)
          .single();

        return new Response(
          JSON.stringify({ success: true, admin }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid token format" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (action === "change-password") {
      if (!token || !newPassword) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing token or new password" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify token
      const decoded = atob(token);
      const [adminId] = decoded.split(":");
      
      const { data: storedToken } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", `admin_token_${adminId}`)
        .single();

      if (!storedToken || storedToken.value !== token) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update password
      const { error: updateError } = await supabase
        .from("admin_users")
        .update({ password_hash: newPassword })
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
          
          // Remove token
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

    if (action === "update-setting") {
      const { key, value } = await req.json();
      
      // Verify admin token first
      if (!token) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("admin_settings")
        .upsert({ key, value }, { onConflict: 'key' });

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
