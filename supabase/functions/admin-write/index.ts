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

    // ─── Products CRUD ───────────────────────────────────────────────

    if (action === "create-product") {
      const { product } = body;
      if (!product || !product.name) {
        return new Response(JSON.stringify({ success: false, error: "Product name required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: product.name,
          slug: product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          description: product.description ?? null,
          price: product.price ?? 0,
          original_price: product.original_price ?? null,
          brand: product.brand ?? null,
          protocol: product.protocol ?? null,
          image_url: product.image_url ?? null,
          stock: product.stock ?? 10,
          featured: product.featured ?? false,
          video_url: product.video_url ?? null,
          category_id: product.category_id ?? null,
          images: product.images ?? null,
          specifications: product.specifications ?? null,
          seo_title: product.seo_title ?? null,
          seo_description: product.seo_description ?? null,
          seo_keywords: product.seo_keywords ?? null,
          tags: product.tags ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-product") {
      const { id, updates } = body;
      if (!id || !updates) {
        return new Response(JSON.stringify({ success: false, error: "id and updates required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase
        .from("products")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-product") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-delete-products") {
      const { ids } = body;
      if (!Array.isArray(ids) || !ids.length) {
        return new Response(JSON.stringify({ success: false, error: "ids array required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-set-visibility") {
      const { ids, hidden } = body;
      if (!Array.isArray(ids) || !ids.length) {
        return new Response(JSON.stringify({ success: false, error: "ids array required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (hidden) {
        const hiddenIds: string[] = [];
        for (const id of ids) {
          const { data: existing } = await supabase
            .from("site_info")
            .select("value")
            .eq("section", "products")
            .eq("key", "hidden_ids")
            .maybeSingle();
          let current: string[] = [];
          try { current = existing?.value ? JSON.parse(existing.value) : []; } catch { current = []; }
          if (!current.includes(id)) current.push(id);
          hiddenIds.push(id);
        }
        const { data, error } = await supabase
          .from("site_info")
          .select("value")
          .eq("section", "products")
          .eq("key", "hidden_ids")
          .maybeSingle();
        let currentHidden: string[] = [];
        try { currentHidden = data?.value ? JSON.parse(data.value) : []; } catch { currentHidden = []; }
        currentHidden.push(...ids.filter(id => !currentHidden.includes(id)));
        await supabase.from("site_info").upsert({
          section: "products", key: "hidden_ids",
          value: JSON.stringify(currentHidden),
          updated_at: new Date().toISOString(),
        }, { onConflict: "section,key" });
      } else {
        const { data, error } = await supabase
          .from("site_info")
          .select("value")
          .eq("section", "products")
          .eq("key", "hidden_ids")
          .maybeSingle();
        let currentHidden: string[] = [];
        try { currentHidden = data?.value ? JSON.parse(data.value) : []; } catch { currentHidden = []; }
        const newHidden = currentHidden.filter(id => !ids.includes(id));
        await supabase.from("site_info").upsert({
          section: "products", key: "hidden_ids",
          value: JSON.stringify(newHidden),
          updated_at: new Date().toISOString(),
        }, { onConflict: "section,key" });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-update-products") {
      const { ids, updates } = body;
      if (!Array.isArray(ids) || !ids.length || !updates) {
        return new Response(JSON.stringify({ success: false, error: "ids, updates required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const upd = { ...updates, updated_at: new Date().toISOString() };
      const { error } = await supabase.from("products").update(upd).in("id", ids);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-apply-discount") {
      const { ids, mode, pct } = body;
      if (!Array.isArray(ids) || !ids.length) {
        return new Response(JSON.stringify({ success: false, error: "ids required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (mode === "reset") {
        const { error } = await supabase.from("products").update({ original_price: null }).in("id", ids);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const p = parseFloat(String(pct));
      if (!p || p <= 0) {
        return new Response(JSON.stringify({ success: false, error: "Invalid discount %" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: prods, error: err1 } = await supabase.from("products").select("id, price, original_price").in("id", ids);
      if (err1) throw err1;
      const updates = prods.map((pr: any) => {
        const orig = pr.original_price && pr.original_price > pr.price ? pr.original_price : pr.price;
        return { id: pr.id, original_price: orig, price: Math.round(orig * (1 - p / 100)) };
      });
      const { error } = await supabase.from("products").upsert(updates);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "upload-file") {
      const { bucket, filename, base64, mimeType } = body;
      if (!bucket || !filename || !base64) {
        return new Response(JSON.stringify({ success: false, error: "bucket, filename, base64 required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const decoded = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const { data, error } = await supabase.storage.from(bucket).upload(filename, decoded, {
        contentType: mimeType || "application/octet-stream",
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);
      return new Response(JSON.stringify({ success: true, publicUrl: urlData.publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ai-generate-seo") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ success: false, error: "id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: prod, error: err1 } = await supabase.from("products").select("name, description, brand").eq("id", id).single();
      if (err1) throw err1;
      if (!prod) return new Response(JSON.stringify({ success: false, error: "Product not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const prompt = `Generate SEO metadata for this product in English:

Product: ${prod.name}
Brand: ${prod.brand || "N/A"}
Description: ${prod.description || "No description"}

Return a JSON object with exactly these fields:
{
  "seo_title": "A compelling SEO title <= 60 chars",
  "seo_description": "A compelling meta description <= 155 chars",
  "seo_keywords": ["keyword1", "keyword2", "keyword3"],
  "tags": ["tag1", "tag2"]
}

Return ONLY the JSON object, no markdown, no explanation.
`;
      try {
        const result = await chatComplete([{ role: "user", content: prompt }], { maxTokens: 300 });
        const parsed = JSON.parse(result);
        const { data, error } = await supabase
          .from("products")
          .update({ seo_title: parsed.seo_title, seo_description: parsed.seo_description, seo_keywords: parsed.seo_keywords, tags: parsed.tags })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, seo: parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: String(e) }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "update-site-info") {
      const { entries } = body;
      if (!Array.isArray(entries) || !entries.length) {
        return new Response(JSON.stringify({ success: false, error: "entries required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      for (const entry of entries) {
        if (!entry.section || !entry.key) {
          return new Response(JSON.stringify({ success: false, error: "section and key required" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { error } = await supabase.from("site_info").upsert({
          section: entry.section, key: entry.key, value: entry.value,
          updated_at: new Date().toISOString(),
        }, { onConflict: "section,key" });
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Products CRUD ───────────────────────────────────────────────

    if (action === "create-product") {
      const { product } = body;
      if (!product || !product.name) {
        return new Response(JSON.stringify({ success: false, error: "Product name required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const slug = product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: product.name,
          slug,
          description: product.description ?? null,
          price: product.price ?? 0,
          original_price: product.original_price ?? null,
          brand: product.brand ?? null,
          protocol: product.protocol ?? null,
          image_url: product.image_url ?? null,
          stock: product.stock ?? 10,
          featured: product.featured ?? false,
          video_url: product.video_url ?? null,
          category_id: product.category_id ?? null,
          images: product.images ?? null,
          specifications: product.specifications ?? null,
          seo_title: product.seo_title ?? null,
          seo_description: product.seo_description ?? null,
          seo_keywords: product.seo_keywords ?? null,
          tags: product.tags ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-product") {
      const { id, updates } = body;
      if (!id || !updates) {
        return new Response(JSON.stringify({ success: false, error: "id and updates required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase
        .from("products")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-product") {
      const { id } = body;
      if (!id) return new Response(JSON.stringify({ success: false, error: "id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-delete-products") {
      const { ids } = body;
      if (!Array.isArray(ids) || !ids.length) return new Response(JSON.stringify({ success: false, error: "ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-set-visibility") {
      const { ids, hidden } = body;
      if (!Array.isArray(ids) || !ids.length) return new Response(JSON.stringify({ success: false, error: "ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { data: cur, error: e1 } = await supabase.from("site_info").select("value").eq("section","products").eq("key","hidden_ids").maybeSingle();
      if (e1) throw e1;
      let hiddenIds: string[] = [];
      try { hiddenIds = cur?.value ? JSON.parse(cur.value) : []; } catch { hiddenIds = []; }
      if (hidden) { for (const id of ids) { if (!hiddenIds.includes(id)) hiddenIds.push(id); } }
      else { hiddenIds = hiddenIds.filter(id => !ids.includes(id)); }
      const { error } = await supabase.from("site_info").upsert({
        section: "products", key: "hidden_ids", value: JSON.stringify(hiddenIds),
        updated_at: new Date().toISOString(),
      }, { onConflict: "section,key" });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-update-products") {
      const { ids, updates } = body;
      if (!Array.isArray(ids) || !ids.length || !updates) return new Response(JSON.stringify({ success: false, error: "ids, updates required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const upd = { ...updates, updated_at: new Date().toISOString() };
      const { error } = await supabase.from("products").update(upd).in("id", ids);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-apply-discount") {
      const { ids, mode, pct } = body;
      if (!Array.isArray(ids) || !ids.length) return new Response(JSON.stringify({ success: false, error: "ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      if (mode === "reset") {
        const { error } = await supabase.from("products").update({ original_price: null }).in("id", ids);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const p = parseFloat(String(pct));
      if (!p || p <= 0 || p >= 100) return new Response(JSON.stringify({ success: false, error: "Invalid discount %" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { data: prods, error: e1 } = await supabase.from("products").select("id, price, original_price").in("id", ids);
      if (e1) throw e1;
      const updates = prods.map((pr: any) => {
        const base = pr.original_price && pr.original_price > pr.price ? pr.original_price : pr.price;
        return { id: pr.id, original_price: base, price: Math.round(base * (1 - p / 100)) };
      });
      const { error } = await supabase.from("products").upsert(updates);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "upload-file") {
      const { bucket, filename, base64, mimeType } = body;
      if (!bucket || !filename || !base64) return new Response(JSON.stringify({ success: false, error: "bucket, filename, base64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const decoded = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const { data: upData, error: e1 } = await supabase.storage.from(bucket).upload(filename, decoded, {
        contentType: mimeType || "application/octet-stream",
        cacheControl: "3600",
        upsert: false,
      });
      if (e1) throw e1;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);
      return new Response(JSON.stringify({ success: true, publicUrl: urlData.publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ai-generate-seo") {
      const { id } = body;
      if (!id) return new Response(JSON.stringify({ success: false, error: "id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { data: prod, error: e1 } = await supabase.from("products").select("name, description, brand").eq("id", id).single();
      if (e1) throw e1;
      if (!prod) return new Response(JSON.stringify({ success: false, error: "Product not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const prompt = `Generate SEO metadata for this product. Return ONLY a JSON object (no markdown, no explanation):

Product: ${prod.name}
Brand: ${prod.brand || "N/A"}
Description: ${prod.description || "No description"}

JSON: {"seo_title":"<=60 chars","seo_description":"<=155 chars","seo_keywords":["k1","k2"],"tags":["t1","t2"]}`;
      try {
        const result = await chatComplete([{ role: "user", content: prompt }], { maxTokens: 300 });
        const parsed = JSON.parse(result);
        const { data, error } = await supabase.from("products")
          .update({ seo_title: parsed.seo_title, seo_description: parsed.seo_description, seo_keywords: parsed.seo_keywords, tags: parsed.tags })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, seo: parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: String(e) }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "update-site-info") {
      const { entries } = body;
      if (!Array.isArray(entries) || !entries.length) return new Response(JSON.stringify({ success: false, error: "entries required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      for (const entry of entries) {
        if (!entry.section || !entry.key) return new Response(JSON.stringify({ success: false, error: "section and key required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
        const { error } = await supabase.from("site_info").upsert({
          section: entry.section, key: entry.key, value: entry.value,
          updated_at: new Date().toISOString(),
        }, { onConflict: "section,key" });
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Products CRUD ───────────────────────────────────────────────

    if (action === "create-product") {
      const { product } = body;
      if (!product || !product.name) {
        return new Response(JSON.stringify({ success: false, error: "Product name required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const slug = product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: product.name, slug,
          description: product.description ?? null,
          price: product.price ?? 0, original_price: product.original_price ?? null,
          brand: product.brand ?? null, protocol: product.protocol ?? null,
          image_url: product.image_url ?? null, stock: product.stock ?? 10,
          featured: product.featured ?? false, video_url: product.video_url ?? null,
          category_id: product.category_id ?? null,
          images: product.images ?? null, specifications: product.specifications ?? null,
          seo_title: product.seo_title ?? null, seo_description: product.seo_description ?? null,
          seo_keywords: product.seo_keywords ?? null, tags: product.tags ?? null,
        })
        .select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-product") {
      const { id, updates } = body;
      if (!id || !updates) {
        return new Response(JSON.stringify({ success: false, error: "id and updates required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase
        .from("products").update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-product") {
      const { id } = body;
      if (!id) return new Response(JSON.stringify({ success: false, error: "id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-delete-products") {
      const { ids } = body;
      if (!Array.isArray(ids) || !ids.length) return new Response(JSON.stringify({ success: false, error: "ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-set-visibility") {
      const { ids, hidden } = body;
      if (!Array.isArray(ids) || !ids.length) return new Response(JSON.stringify({ success: false, error: "ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { data: cur, error: e1 } = await supabase.from("site_info")
        .select("value").eq("section","products").eq("key","hidden_ids").maybeSingle();
      if (e1) throw e1;
      let hiddenIds: string[] = [];
      try { hiddenIds = cur?.value ? JSON.parse(cur.value) : []; } catch { hiddenIds = []; }
      if (hidden) { for (const id of ids) { if (!hiddenIds.includes(id)) hiddenIds.push(id); } }
      else { hiddenIds = hiddenIds.filter(id => !ids.includes(id)); }
      const { error } = await supabase.from("site_info").upsert({
        section: "products", key: "hidden_ids", value: JSON.stringify(hiddenIds),
        updated_at: new Date().toISOString(),
      }, { onConflict: "section,key" });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-update-products") {
      const { ids, updates } = body;
      if (!Array.isArray(ids) || !ids.length || !updates) return new Response(JSON.stringify({ success: false, error: "ids, updates required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const upd = { ...updates, updated_at: new Date().toISOString() };
      const { error } = await supabase.from("products").update(upd).in("id", ids);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk-apply-discount") {
      const { ids, mode, pct } = body;
      if (!Array.isArray(ids) || !ids.length) return new Response(JSON.stringify({ success: false, error: "ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      if (mode === "reset") {
        const { error } = await supabase.from("products").update({ original_price: null }).in("id", ids);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const p = parseFloat(String(pct));
      if (!p || p <= 0 || p >= 100) return new Response(JSON.stringify({ success: false, error: "Invalid discount %" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { data: prods, error: e1 } = await supabase.from("products")
        .select("id, price, original_price").in("id", ids);
      if (e1) throw e1;
      const updates = prods.map((pr: any) => {
        const base = pr.original_price && pr.original_price > pr.price ? pr.original_price : pr.price;
        return { id: pr.id, original_price: base, price: Math.round(base * (1 - p / 100)) };
      });
      const { error } = await supabase.from("products").upsert(updates);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "upload-file") {
      const { bucket, filename, base64, mimeType } = body;
      if (!bucket || !filename || !base64) return new Response(JSON.stringify({ success: false, error: "bucket, filename, base64 required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const decoded = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const { data: upData, error: e1 } = await supabase.storage.from(bucket).upload(filename, decoded, {
        contentType: mimeType || "application/octet-stream", cacheControl: "3600", upsert: false,
      });
      if (e1) throw e1;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);
      return new Response(JSON.stringify({ success: true, publicUrl: urlData.publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ai-generate-seo") {
      const { id } = body;
      if (!id) return new Response(JSON.stringify({ success: false, error: "id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { data: prod, error: e1 } = await supabase.from("products")
        .select("name, description, brand").eq("id", id).single();
      if (e1) throw e1;
      if (!prod) return new Response(JSON.stringify({ success: false, error: "Product not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const prompt = `Generate SEO metadata. Return ONLY a JSON object (no markdown, no explanation):

Product: ${prod.name}
Brand: ${prod.brand || "N/A"}
Description: ${prod.description || "No description"}

JSON: {"seo_title":"<=60 chars","seo_description":"<=155 chars","seo_keywords":["k1","k2"],"tags":["t1","t2"]}`;
      try {
        const result = await chatComplete([{ role: "user", content: prompt }], { maxTokens: 300 });
        const parsed = JSON.parse(result);
        const { data, error } = await supabase.from("products")
          .update({ seo_title: parsed.seo_title, seo_description: parsed.seo_description,
            seo_keywords: parsed.seo_keywords, tags: parsed.tags })
          .eq("id", id).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, seo: parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: String(e) }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "update-site-info") {
      const { entries } = body;
      if (!Array.isArray(entries) || !entries.length) return new Response(JSON.stringify({ success: false, error: "entries required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      for (const entry of entries) {
        if (!entry.section || !entry.key) return new Response(JSON.stringify({ success: false, error: "section and key required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
        const { error } = await supabase.from("site_info").upsert({
          section: entry.section, key: entry.key, value: entry.value,
          updated_at: new Date().toISOString(),
        }, { onConflict: "section,key" });
        if (error) throw error;
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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