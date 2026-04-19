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

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "item";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, token } = body;

    if (!(await verifyAdminToken(supabase, token))) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== PRODUCTS ==========
    if (action === "create-product") {
      const { product } = body;
      const slug = product.slug || slugify(product.name);
      const { data, error } = await supabase.from("products").insert({
        name: product.name, slug,
        description: product.description ?? null,
        price: Number(product.price) || 0,
        original_price: product.original_price ? Number(product.original_price) : null,
        category_id: product.category_id || null,
        brand: product.brand || null,
        protocol: product.protocol || null,
        image_url: product.image_url || null,
        images: product.images || [],
        stock: Number(product.stock) || 0,
        featured: !!product.featured,
        video_url: product.video_url || null,
        specifications: product.specifications || {},
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, product: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-product") {
      const { id, updates } = body;
      const clean: Record<string, any> = {};
      const allowed = ["name", "slug", "description", "price", "original_price", "category_id",
        "brand", "protocol", "image_url", "images", "stock", "featured", "video_url", "specifications"];
      for (const k of allowed) if (k in updates) clean[k] = updates[k];
      if (clean.price !== undefined) clean.price = Number(clean.price);
      if (clean.original_price !== undefined && clean.original_price !== null)
        clean.original_price = Number(clean.original_price);
      if (clean.stock !== undefined) clean.stock = Number(clean.stock);
      clean.updated_at = new Date().toISOString();

      const { data, error } = await supabase.from("products").update(clean).eq("id", id).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, product: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-product") {
      const { id } = body;
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== SITE INFO ==========
    if (action === "update-site-info") {
      const { entries } = body; // [{ section, key, value }]
      if (!Array.isArray(entries)) throw new Error("entries must be an array");
      const { error } = await supabase.from("site_info").upsert(entries, { onConflict: "section,key" });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== BRANDS ==========
    if (action === "upsert-brand") {
      const { brand } = body;
      const slug = brand.slug || slugify(brand.name);
      const payload = {
        ...(brand.id ? { id: brand.id } : {}),
        name: brand.name, slug,
        logo_url: brand.logo_url || null,
        description: brand.description || null,
        display_order: Number(brand.display_order) || 0,
        featured: !!brand.featured,
      };
      const { data, error } = await supabase.from("brands").upsert(payload).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, brand: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-brand") {
      const { id } = body;
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-write error:", e);
    return new Response(JSON.stringify({
      success: false,
      error: e instanceof Error ? e.message : String(e),
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
