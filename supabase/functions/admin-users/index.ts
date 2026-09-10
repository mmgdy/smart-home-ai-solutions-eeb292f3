// List all registered users with orders & loyalty statistics (admin only)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";

async function verifyAdminToken(supabase: any, token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = atob(token);
    const [adminId] = decoded.split(":");
    if (!adminId) return false;
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
  const rate = checkRate(ip, { windowMs: 60000, maxRequests: 30 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization") || "";
    const bodyJson = await req.json().catch(() => ({}));
    const bodyToken = typeof (bodyJson as any).token === "string" ? (bodyJson as any).token : undefined;
    const headerToken = authHeader.replace("Bearer ", "").trim();
    const token = bodyToken || headerToken;

    if (!(await verifyAdminToken(supabase, token))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch auth users
    const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersErr) throw usersErr;

    const rawUsers = usersData?.users || [];

    // 2. Fetch orders summary to compute order count and total spent
    const { data: ordersData } = await supabase
      .from("orders")
      .select("id, user_id, email, total, status");

    const ordersByUser: Record<string, { count: number; totalSpent: number }> = {};
    const ordersByEmail: Record<string, { count: number; totalSpent: number }> = {};

    if (Array.isArray(ordersData)) {
      for (const ord of ordersData) {
        const total = Number(ord.total) || 0;
        if (ord.user_id) {
          if (!ordersByUser[ord.user_id]) ordersByUser[ord.user_id] = { count: 0, totalSpent: 0 };
          ordersByUser[ord.user_id].count += 1;
          ordersByUser[ord.user_id].totalSpent += total;
        }
        if (ord.email) {
          const em = ord.email.toLowerCase().trim();
          if (!ordersByEmail[em]) ordersByEmail[em] = { count: 0, totalSpent: 0 };
          ordersByEmail[em].count += 1;
          ordersByEmail[em].totalSpent += total;
        }
      }
    }

    // 3. Fetch loyalty points per user
    const { data: loyaltyData } = await supabase
      .from("loyalty_points")
      .select("user_id, email, points_balance, tier");

    const loyaltyByUser: Record<string, { points: number; tier: string }> = {};
    const loyaltyByEmail: Record<string, { points: number; tier: string }> = {};

    if (Array.isArray(loyaltyData)) {
      for (const lp of loyaltyData) {
        const pts = Number(lp.points_balance) || 0;
        const tier = lp.tier || "bronze";
        if (lp.user_id) loyaltyByUser[lp.user_id] = { points: pts, tier };
        if (lp.email) loyaltyByEmail[lp.email.toLowerCase().trim()] = { points: pts, tier };
      }
    }

    // 4. Combine into complete UserRow objects
    const enrichedUsers = rawUsers.map((u: any) => {
      const emailLower = (u.email || "").toLowerCase().trim();
      const meta = u.user_metadata || {};
      const appMeta = u.app_metadata || {};

      const ordStats = ordersByUser[u.id] || ordersByEmail[emailLower] || { count: 0, totalSpent: 0 };
      const loyalty = loyaltyByUser[u.id] || loyaltyByEmail[emailLower] || { points: 0, tier: "bronze" };

      const provider =
        appMeta.provider ||
        (Array.isArray(u.identities) && u.identities[0]?.provider) ||
        "email";

      return {
        id: u.id,
        email: u.email || "",
        full_name: meta.full_name || meta.name || null,
        avatar_url: meta.avatar_url || meta.picture || null,
        provider,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
        email_confirmed_at: u.email_confirmed_at || null,
        order_count: ordStats.count,
        total_spent: Math.round(ordStats.totalSpent),
        loyalty_points: loyalty.points,
        tier: loyalty.tier,
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        users: enrichedUsers,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Admin users error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Failed to fetch users" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
