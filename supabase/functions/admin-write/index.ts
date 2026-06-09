import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPushToEmail } from "../_shared/fcm.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

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

    // ========== PUBLIC ACTIONS (no admin token required) ==========
    if (action === "public-create-order") {
      const { orderData, orderItems } = body;
      if (!orderData?.email || orderData?.total == null) {
        return new Response(JSON.stringify({ success: false, error: "email and total are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: orderData.user_id || null,
          email: String(orderData.email),
          total: Number(orderData.total),
          status: "pending",
          stripe_session_id: orderData.stripe_session_id || null,
          shipping_address: orderData.shipping_address || null,
        })
        .select()
        .single();
      if (orderError) throw orderError;

      if (Array.isArray(orderItems) && orderItems.length > 0) {
        const items = orderItems.map((item: any) => ({
          order_id: order.id,
          product_id: item.product_id || null,
          product_name: String(item.product_name),
          quantity: Number(item.quantity),
          price: Number(item.price),
        }));
        const { error: itemsError } = await supabase.from("order_items").insert(items);
        if (itemsError) throw itemsError;
      }

      return new Response(JSON.stringify({ success: true, order }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        seo_title: product.seo_title || null,
        seo_description: product.seo_description || null,
        seo_keywords: product.seo_keywords || [],
        tags: product.tags || [],
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
        "brand", "protocol", "image_url", "images", "stock", "featured", "video_url", "specifications",
        "seo_title", "seo_description", "seo_keywords", "tags"];
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

    // ========== BULK PRODUCT OPERATIONS ==========
    // Filter products on the server by brand / category / price range, return matching IDs.
    if (action === "filter-product-ids") {
      const { brands: brandFilter, categoryId, minPrice, maxPrice, search } = body;
      let q = supabase.from("products").select("id,name,brand,price,category_id").limit(5000);
      if (Array.isArray(brandFilter) && brandFilter.length) q = q.in("brand", brandFilter);
      if (categoryId) q = q.eq("category_id", categoryId);
      if (typeof minPrice === "number") q = q.gte("price", minPrice);
      if (typeof maxPrice === "number") q = q.lte("price", maxPrice);
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, products: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-update-products") {
      const { ids, updates } = body as { ids: string[]; updates: Record<string, any> };
      if (!Array.isArray(ids) || ids.length === 0) throw new Error("ids required");
      const allowed = ["featured", "stock", "category_id", "brand", "tags",
        "seo_keywords", "seo_title", "seo_description"];
      const clean: Record<string, any> = { updated_at: new Date().toISOString() };
      for (const k of allowed) if (k in updates) clean[k] = updates[k];
      const { error } = await supabase.from("products").update(clean).in("id", ids);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, count: ids.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-delete-products") {
      const { ids } = body as { ids: string[] };
      if (!Array.isArray(ids) || ids.length === 0) throw new Error("ids required");
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, count: ids.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Apply % discount across many products in a single round-trip.
    // mode: 'discount' (sets original_price=current price; price = current * (1-pct/100))
    // mode: 'reset' (price = original_price; original_price = null)
    if (action === "bulk-apply-discount") {
      const { ids, mode, pct } = body as { ids: string[]; mode: "discount" | "reset"; pct?: number };
      if (!Array.isArray(ids) || ids.length === 0) throw new Error("ids required");
      const { data: rows, error: selErr } = await supabase
        .from("products").select("id,price,original_price").in("id", ids);
      if (selErr) throw selErr;
      let success = 0;
      for (const p of rows || []) {
        let upd: Record<string, any>;
        if (mode === "discount") {
          if (!pct || pct <= 0 || pct >= 100) throw new Error("pct must be 1-99");
          upd = {
            price: Math.round(Number(p.price) * (1 - pct / 100)),
            original_price: Number(p.price),
            updated_at: new Date().toISOString(),
          };
        } else {
          if (!p.original_price) continue;
          upd = { price: Number(p.original_price), original_price: null, updated_at: new Date().toISOString() };
        }
        const { error } = await supabase.from("products").update(upd).eq("id", p.id);
        if (!error) success++;
      }
      return new Response(JSON.stringify({ success: true, count: success }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bulk visibility (hidden/published) — append/remove in site_info hidden_ids
    if (action === "bulk-set-visibility") {
      const { ids, hidden } = body as { ids: string[]; hidden: boolean };
      if (!Array.isArray(ids)) throw new Error("ids required");
      const current = await readHiddenIds(supabase);
      const set = new Set(current);
      for (const id of ids) hidden ? set.add(id) : set.delete(id);
      await supabase.from("site_info").upsert({
        section: "products", key: "hidden_ids", value: JSON.stringify(Array.from(set)),
      }, { onConflict: "section,key" });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AI SEO autofill: generates seo_title, seo_description, seo_keywords, tags
    if (action === "ai-generate-seo") {
      const { id } = body;
      const { data: p, error: pErr } = await supabase
        .from("products")
        .select("name,brand,description,protocol,categories(name)")
        .eq("id", id).single();
      if (pErr) throw pErr;
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
      const ctx = `Product: ${p.name}\nBrand: ${p.brand ?? ""}\nProtocol: ${p.protocol ?? ""}\nCategory: ${(p as any).categories?.name ?? ""}\nDescription: ${p.description ?? ""}`;
      const prompt = `You are an SEO expert for Baytzaki, a smart-home retailer in Egypt. Given the product context below, return ONLY a compact JSON object with keys: seo_title (max 60 chars, includes brand+product+key benefit), seo_description (max 155 chars, includes a value proposition + "Egypt" + a CTA), seo_keywords (array of 8-12 high-intent search keywords, mix of English and Arabic where helpful, no '#'), tags (array of 5-10 short topical tags). No markdown, no commentary.\n\n${ctx}`;
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!r.ok) throw new Error(`AI gateway ${r.status}`);
      const j = await r.json();
      const text: string = j.choices?.[0]?.message?.content ?? "{}";
      const cleaned = text.replace(/```json|```/g, "").trim();
      let parsed: any = {};
      try { parsed = JSON.parse(cleaned); } catch {
        const m = cleaned.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]);
      }
      const upd = {
        seo_title: (parsed.seo_title || "").slice(0, 70) || null,
        seo_description: (parsed.seo_description || "").slice(0, 170) || null,
        seo_keywords: Array.isArray(parsed.seo_keywords) ? parsed.seo_keywords.slice(0, 15) : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 12) : [],
        updated_at: new Date().toISOString(),
      };
      const { error: uErr } = await supabase.from("products").update(upd).eq("id", id);
      if (uErr) throw uErr;
      return new Response(JSON.stringify({ success: true, seo: upd }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== VARIANT MERGE ==========
    // Suggest groups of duplicate products by name similarity
    if (action === "suggest-variant-groups") {
      const { data: products, error } = await supabase
        .from("products")
        .select("id,name,brand,price,stock,image_url,parent_id,variant_axis,variant_label")
        .is("parent_id", null);
      if (error) throw error;

      // Strip color/wattage/channel/size tokens to derive a base key
      const stripTokens = (s: string) =>
        s.toLowerCase()
          .replace(/\b(\d+)\s*(w|watt|watts|m|cm|mm|amp|a|gang|ch|channel|key|button|buttons|way|ways)\b/g, "")
          .replace(/\b(black|white|gold|silver|gray|grey|red|blue|green|brown|beige|champagne|rose|pink)\b/g, "")
          .replace(/\b(1|2|3|4|5|6)[\s-]?(gang|channel|ch|button|key|way)\b/g, "")
          .replace(/[^a-z0-9 ]+/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const groups: Record<string, any[]> = {};
      for (const p of products || []) {
        const key = `${(p.brand || "").toLowerCase()}::${stripTokens(p.name)}`;
        if (!key.split("::")[1]) continue;
        (groups[key] ||= []).push(p);
      }
      const suggestions = Object.entries(groups)
        .filter(([, items]) => items.length >= 2)
        .map(([key, items]) => ({ key, items }));
      return new Response(JSON.stringify({ success: true, suggestions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Merge: assign parent_id + axis + label to children
    if (action === "merge-variants") {
      const { masterId, variantIds, axis, labels } = body as {
        masterId: string;
        variantIds: string[];
        axis: string;
        labels: Record<string, string>;
      };
      if (!masterId || !Array.isArray(variantIds) || variantIds.length === 0) {
        throw new Error("masterId and variantIds required");
      }
      // Set master axis + clear its parent
      await supabase.from("products").update({
        parent_id: null,
        variant_axis: axis,
        variant_label: labels[masterId] || null,
      }).eq("id", masterId);

      // Update each child
      for (const vid of variantIds) {
        if (vid === masterId) continue;
        await supabase.from("products").update({
          parent_id: masterId,
          variant_axis: axis,
          variant_label: labels[vid] || null,
        }).eq("id", vid);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Unmerge a variant (promote back to standalone)
    if (action === "unmerge-variant") {
      const { id } = body;
      const { error } = await supabase.from("products").update({
        parent_id: null,
        variant_axis: null,
        variant_label: null,
      }).eq("id", id);
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

    // ========== FILE UPLOAD (bypasses storage RLS using service role) ==========
    if (action === "upload-file") {
      const { filename, base64, mimeType, bucket } = body;
      const allowed = ["product-images", "product-videos", "site-assets"];
      if (!allowed.includes(bucket)) throw new Error("Invalid bucket");
      if (!filename || !base64) throw new Error("filename and base64 required");
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(filename, bytes, { contentType: mimeType || "application/octet-stream", upsert: true, cacheControl: "31536000" });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);
      return new Response(JSON.stringify({ success: true, publicUrl: urlData.publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== ORDERS ==========
    if (action === "update-order-status") {
      const { id, status } = body;
      const allowed = ["pending", "processing", "shipped", "delivered", "cancelled"];
      if (!allowed.includes(status)) throw new Error("Invalid status value");
      const { data: orderRow } = await supabase.from("orders").select("email, total, shipping_address").eq("id", id).single();
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
      // Notify the customer's devices about the status change (non-fatal if push not configured)
      try {
        const labels: Record<string, { title: string; msg: string }> = {
          pending:    { title: "Order received", msg: "We've received your order and are reviewing it." },
          processing: { title: "Order is being prepared 📦", msg: "Your order is being processed." },
          shipped:    { title: "Your order shipped 🚚", msg: "Your order is on its way!" },
          delivered:  { title: "Order delivered ✅", msg: "Thanks for shopping with Baytzaki!" },
          cancelled:  { title: "Order cancelled", msg: "Your order has been cancelled. Contact us if this is a mistake." },
        };
        const L = labels[status];
        if (L && orderRow?.email) {
          await sendPushToEmail(supabase, orderRow.email, {
            title: L.title,
            message: `Order #${String(id).slice(0, 8)} • ${L.msg}`,
            url: `/order-confirmation?orderId=${id}`,
          });
        }
      } catch (e) { console.warn("status push failed:", e); }
      // Email the customer about the status change
      try {
        const resendKey = Deno.env.get("RESEND_API_KEY");
        const labels: Record<string, { title: string; msg: string; emoji: string }> = {
          pending:    { title: "Order received",            msg: "We've received your order and are reviewing it.", emoji: "📥" },
          processing: { title: "Your order is being prepared", msg: "We're picking and packing your items now.",     emoji: "📦" },
          shipped:    { title: "Your order is on the way",   msg: "Your order has shipped and is heading to you.",  emoji: "🚚" },
          delivered:  { title: "Order delivered",            msg: "Thanks for shopping with Baytzaki! We hope you love it.", emoji: "✅" },
          cancelled:  { title: "Order cancelled",            msg: "Your order has been cancelled. Reach out if this was a mistake.", emoji: "❌" },
        };
        const L = labels[status];
        if (resendKey && L && orderRow?.email) {
          const resend = new Resend(resendKey);
          const sa = (orderRow.shipping_address ?? {}) as any;
          const firstName = String(sa.firstName ?? "").trim() || "there";
          const total = Number(orderRow.total) || 0;
          const html = `
            <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f5f5f5;">
              <div style="background:#0f172a;padding:20px;border-radius:12px 12px 0 0;text-align:center;">
                <h1 style="color:#00bfa5;margin:0;">${L.emoji} ${L.title}</h1>
              </div>
              <div style="background:#fff;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                <p style="font-size:16px;color:#333;">Hi ${firstName},</p>
                <p style="color:#666;line-height:1.6;">${L.msg}</p>
                <div style="background:#00bfa5;color:#fff;padding:15px;border-radius:8px;margin:20px 0;">
                  <h2 style="margin:0;font-size:18px;">Order #${String(id).slice(0,8)}</h2>
                  <p style="margin:5px 0 0;opacity:.9;">Status: <strong style="text-transform:capitalize;">${status}</strong></p>
                  <p style="margin:5px 0 0;opacity:.9;">Total: ${total.toLocaleString()} EGP</p>
                </div>
                <p style="color:#666;">Questions? Contact us at <a href="mailto:info@baytzaki.com" style="color:#00bfa5;">info@baytzaki.com</a></p>
              </div>
              <p style="text-align:center;color:#999;font-size:12px;margin-top:20px;">© ${new Date().getFullYear()} Baytzaki. All rights reserved.</p>
            </body></html>
          `;
          await resend.emails.send({
            from: "Baytzaki <orders@baytzaki.com>",
            to: [orderRow.email],
            subject: `${L.emoji} ${L.title} — Order #${String(id).slice(0,8)}`,
            html,
          });
        }
      } catch (e) { console.warn("status email failed:", e); }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // ========== BULK OPERATIONS ==========
    if (action === "bulk-delete-products") {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) throw new Error("ids must be a non-empty array");
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, deleted: ids.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-update-prices") {
      const { updates } = body; // [{ id, price, original_price }]
      if (!Array.isArray(updates) || updates.length === 0) throw new Error("updates must be a non-empty array");
      let success = 0;
      let failed = 0;
      for (const u of updates) {
        const clean: Record<string, any> = { updated_at: new Date().toISOString() };
        if (u.price !== undefined) clean.price = Number(u.price);
        if ("original_price" in u) clean.original_price = u.original_price !== null ? Number(u.original_price) : null;
        const { error } = await supabase.from("products").update(clean).eq("id", u.id);
        if (error) failed++;
        else success++;
      }
      return new Response(JSON.stringify({ success: true, updated: success, failed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list-orders") {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list-order-items") {
      const { orderId } = body;
      if (!orderId) throw new Error("orderId required");
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), {
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
