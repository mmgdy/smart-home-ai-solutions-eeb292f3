// List all registered users (admin only)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { token } = await req.json();
    if (!(await verifyAdminToken(supabase, token))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List users via admin API
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;

    // Enrich with order count + total spent + loyalty
    const users = await Promise.all((data.users || []).map(async (u: any) => {
      const { data: orders } = await supabase
        .from("orders")
        .select("total")
        .eq("email", u.email);
      const totalSpent = (orders || []).reduce((s: number, o: any) => s + Number(o.total || 0), 0);
      const { data: loyalty } = await supabase
        .from("loyalty_points")
        .select("points_balance, tier, lifetime_points")
        .eq("email", u.email)
        .maybeSingle();
      return {
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || null,
        avatar_url: u.user_metadata?.avatar_url || null,
        provider: u.app_metadata?.provider || "email",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        order_count: (orders || []).length,
        total_spent: totalSpent,
        loyalty_points: loyalty?.points_balance || 0,
        tier: loyalty?.tier || "bronze",
      };
    }));

    return new Response(JSON.stringify({ users, total: users.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-users error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
