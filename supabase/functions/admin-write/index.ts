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

// Reads coupons JSON array from admin_settings
async function readCoupons(supabase: any): Promise<any[]> {
  const { data } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "all_coupons")
    .maybeSingle();
  if (!data?.value) return [];
  try { return JSON.parse(data.value); } catch { return []; }
}

// Writes coupons JSON array to admin_settings
async function writeCoupons(supabase: any, coupons: any[]): Promise<void> {
  await supabase.from("admin_settings").upsert({
    key: "all_coupons",
    value: JSON.stringify(coupons),
    updated_at: new Date().toISOString(),
  }, { onConflict: "key" });
}

// Reads hidden product IDs from site_info
async function readHiddenIds(supabase: any): Promise<string[]> {
  const { data } = await supabase
    .from("site_info")
    .select("value")
    .eq("section", "products")
    .eq("key", "hidden_ids")
    .maybeSingle();
  if (!data?.value) return [];
  try { return JSON.parse(data.value); } catch { return []; }
}

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

    // ========== PRODUCT VISIBILITY (stored in site_info) ==========
    if (action === "get-product-visibility") {
      const hiddenIds = await readHiddenIds(supabase);
      return new Response(JSON.stringify({ success: true, hiddenIds }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set-product-visibility") {
      const { hiddenIds } = body; // string[]
      if (!Array.isArray(hiddenIds)) throw new Error("hiddenIds must be an array");
      await supabase.from("site_info").upsert({
        section: "products",
        key: "hidden_ids",
        value: JSON.stringify(hiddenIds),
      }, { onConflict: "section,key" });
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

    // ========== ADMIN SETTINGS (logo, etc.) ==========
    if (action === "update-admin-settings") {
      const { entries } = body; // [{ key, value }]
      if (!Array.isArray(entries)) throw new Error("entries must be an array");
      const rows = entries.map((e: any) => ({
        key: String(e.key),
        value: e.value == null ? null : String(e.value),
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("admin_settings").upsert(rows, { onConflict: "key" });
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

    // ========== COUPONS (stored in admin_settings as JSON, no DDL needed) ==========
    if (action === "list-coupons") {
      const coupons = await readCoupons(supabase);
      return new Response(JSON.stringify({ success: true, coupons }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create-coupon") {
      const { coupon } = body;
      const coupons = await readCoupons(supabase);
      const code = String(coupon.code).toUpperCase().trim();
      if (coupons.some((c: any) => c.code === code)) {
        return new Response(JSON.stringify({ success: false, error: "Coupon code already exists" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const newCoupon = {
        id: crypto.randomUUID(),
        code,
        discount_type: coupon.discount_type,
        discount_value: Number(coupon.discount_value),
        min_order_amount: Number(coupon.min_order_amount ?? 0),
        max_uses: coupon.max_uses ? Number(coupon.max_uses) : null,
        used_count: 0,
        valid_from: coupon.valid_from || new Date().toISOString(),
        valid_until: coupon.valid_until || null,
        is_active: coupon.is_active !== false,
        created_at: new Date().toISOString(),
      };
      await writeCoupons(supabase, [...coupons, newCoupon]);
      return new Response(JSON.stringify({ success: true, coupon: newCoupon }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-coupon") {
      const { id, updates } = body;
      const coupons = await readCoupons(supabase);
      const idx = coupons.findIndex((c: any) => c.id === id);
      if (idx === -1) throw new Error("Coupon not found");
      const allowed = ["discount_type", "discount_value", "min_order_amount", "max_uses",
        "valid_from", "valid_until", "is_active"];
      const updated = { ...coupons[idx] };
      for (const k of allowed) if (k in updates) updated[k] = updates[k];
      coupons[idx] = updated;
      await writeCoupons(supabase, coupons);
      return new Response(JSON.stringify({ success: true, coupon: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-coupon") {
      const { id } = body;
      const coupons = await readCoupons(supabase);
      await writeCoupons(supabase, coupons.filter((c: any) => c.id !== id));
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== ORDERS ==========
    if (action === "delete-order") {
      const { id } = body;
      const { error: itemsError } = await supabase.from("order_items").delete().eq("order_id", id);
      if (itemsError) throw itemsError;
      const { error: orderError } = await supabase.from("orders").delete().eq("id", id);
      if (orderError) throw orderError;
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
