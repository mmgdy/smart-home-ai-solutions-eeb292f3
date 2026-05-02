import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PRODUCT_IMAGES_BUCKET = "product-images";

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

type ProductRow = {
  id: string;
  name: string;
  image_url: string | null;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64) || "product";

const getExtensionFromContentType = (contentType: string | null) => {
  if (!contentType) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("svg")) return "svg";
  return "jpg";
};

const getExtensionFromUrl = (url: string) => {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  if (!match) return null;
  const ext = match[1].toLowerCase();
  return ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext) ? ext : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Backend service credentials are missing");
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit ?? 50), 1), 100);
    const dryRun = Boolean(body?.dryRun);
    const token = body?.token;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    if (!(await verifyAdminToken(supabase, token))) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, image_url")
      .not("image_url", "is", null)
      .like("image_url", "http%")
      .not("image_url", "like", `%/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/%`)
      .limit(limit);

    if (productsError) throw productsError;

    const results: Array<Record<string, string>> = [];
    let updated = 0;

    for (const product of (products ?? []) as ProductRow[]) {
      if (!product.image_url) continue;

      try {
        const imageResponse = await fetch(product.image_url, { redirect: "follow" });
        if (!imageResponse.ok) {
          throw new Error(`Image fetch failed (${imageResponse.status})`);
        }

        const contentType = imageResponse.headers.get("content-type");
        if (!contentType?.startsWith("image/")) {
          throw new Error(`Invalid content-type: ${contentType ?? "unknown"}`);
        }

        const ext = getExtensionFromUrl(product.image_url) || getExtensionFromContentType(contentType);
        const path = `products/${product.id}/${slugify(product.name)}.${ext}`;

        if (!dryRun) {
          const bytes = new Uint8Array(await imageResponse.arrayBuffer());
          const { error: uploadError } = await supabase.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .upload(path, bytes, {
              upsert: true,
              contentType,
              cacheControl: "31536000",
            });

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .getPublicUrl(path);

          const { error: updateError } = await supabase
            .from("products")
            .update({ image_url: publicUrlData.publicUrl })
            .eq("id", product.id);

          if (updateError) throw updateError;
        }

        updated += 1;
        results.push({
          id: product.id,
          name: product.name,
          status: dryRun ? "dry_run" : "updated",
        });
      } catch (error) {
        results.push({
          id: product.id,
          name: product.name,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const { count: remainingExternal } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .not("image_url", "is", null)
      .like("image_url", "http%")
      .not("image_url", "like", `%/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/%`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: products?.length ?? 0,
        updated,
        failed: (products?.length ?? 0) - updated,
        remainingExternal: remainingExternal ?? 0,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("internalize-product-images error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
