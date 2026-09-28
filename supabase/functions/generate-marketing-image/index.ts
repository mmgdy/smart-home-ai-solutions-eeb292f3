// Generate Marketing Banner / Social Image — AzkaSmart.
// Composites authentic catalog product photos with brand style tokens and code-rendered Arabic/English typography.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { generateCompositeSvg, type ImageDesignOptions } from "../_shared/image-pipeline.ts";

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60000, maxRequests: 20 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ success: false, error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { productId, slug, channel = "instagram_square", language = "ar" } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!
    );

    let query = supabase.from("products").select("id, name, slug, brand, price, original_price, protocol, image_url");
    if (productId) {
      query = query.eq("id", productId);
    } else if (slug) {
      query = query.eq("slug", slug);
    } else {
      // Default to featured product
      query = query.eq("featured", true).limit(1);
    }

    const { data: product, error } = await query.maybeSingle();
    if (error || !product) {
      return new Response(JSON.stringify({ success: false, error: "Product not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const svg = generateCompositeSvg({
      productName: product.name,
      brand: product.brand,
      price: product.price,
      originalPrice: product.original_price,
      productImageUrl: product.image_url || "https://azkasmart.com/placeholder.svg",
      protocol: product.protocol,
      channel: channel as ImageDesignOptions["channel"],
      language: language as "ar" | "en",
    });

    const format = body.format || "svg";
    if (format === "svg_raw") {
      return new Response(svg, {
        headers: {
          ...corsHeaders,
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
        },
        channel,
        language,
        svg,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("generate-marketing-image error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Image generation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
