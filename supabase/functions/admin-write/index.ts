import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { chatComplete } from "../_shared/ai.ts";

async function verifyAdminToken(supabase: any, token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = atob(token);
    const [adminId] = decoded.split(":");
    // Primary check: token stored in admin_settings
    const { data } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", `admin_token_${adminId}`)
      .single();
    if (data && data.value === token) return true;
    // Fallback: check if this email exists in admin_users table
    const { data: session } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", `admin_session_${adminId}`)
      .maybeSingle();
    if (session?.value) {
      const { data: userRow } = await supabase
        .from("admin_users")
        .select("id")
        .eq("email", session.value)
        .maybeSingle();
      if (userRow) return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function generateSeoContentWithPollinations(contentType: string, topic: string, language: string): Promise<string> {
  const prompt = `Create ${contentType} for: ${topic}\n\nLanguage: ${language}\n\nRequirements:\n- SEO-friendly\n- Engaging and professional\n- Include relevant keywords\n- Appropriate length for the content type\n- Use proper formatting\n\nReturn only the content without any prefixes or explanations.`;
  return chatComplete([{ role: "user", content: prompt }], { maxTokens: 400 });
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60_000, maxRequests: 30 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!(await verifyAdminToken(supabase, token))) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ─── Orders CRUD ────────────────────────────────────────────────

    if (action === "list-orders") {
      const { data, error } = await supabase
        .from("orders")
        .select("id, email, total, status, created_at, shipping_address, stripe_session_id")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list-order-items") {
      const { orderId } = body;
      const { data, error } = await supabase
        .from("order_items")
        .select("id, product_name, quantity, price")
        .eq("order_id", orderId)
        .order("id");
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-order-status") {
      const { id, status } = body;
      const { error } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-order") {
      const { id } = body;
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Site content ───────────────────────────────────────────────

    if (action === "save-site-content") {
      const { content, section } = body;
      if (!content || !section) {
        return new Response(JSON.stringify({ success: false, error: "content and section required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("site_info").upsert({
        section,
        key: "content",
        value: JSON.stringify(content),
        updated_at: new Date().toISOString(),
      }, { onConflict: "section,key" });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate-seo") {
      const { topic, language = "en" } = body;
      if (!topic) {
        return new Response(JSON.stringify({ success: false, error: "topic required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      try {
        const seoContent = await generateSeoContentWithPollinations("SEO content", topic, language);
        return new Response(JSON.stringify({ success: true, content: seoContent }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: String(e) }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Admin write error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});