import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { chatComplete } from "../_shared/ai.ts";

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

const callAI = async (systemPrompt: string, userPrompt: string): Promise<string> => {
  return chatComplete(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { maxTokens: 900 },
  );
};

const SYSTEM =
  'You are a product research assistant for the Egyptian smart home market. Always return valid JSON arrays. Prices must be in Egyptian Pounds (EGP) and reflect realistic current market prices from Amazon.eg, Noon.com, or Jumia.com.eg. For image_url, provide a real direct product image URL from the official brand website, Amazon.eg product listing, or a trusted CDN (e.g. Sonoff CDN, Tuya CDN, Xiaomi CDN). If unknown, return null for image_url. Use your knowledge of brand pricing tiers to estimate when exact prices are unknown, but never inflate beyond reasonable market range.';

const parseProductsFromResponse = (
  text: string,
): Array<{
  name: string;
  brand: string;
  price: number;
  category: string;
  protocol: string;
  description: string;
  image_url?: string | null;
  source_url?: string;
}> => {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) return parsed.filter((p) => p.name && p.price && p.price > 50);
    }
  } catch {}
  return [];
};

const CATEGORIES = [
  "Smart Lighting",
  "Smart Switches & Plugs",
  "Smart Sensors",
  "Smart Cameras & Security",
  "Smart Hubs & Controllers",
  "Smart Locks",
  "Smart Thermostats & Climate",
  "Smart Speakers & Audio",
  "Networking & WiFi",
];

const BRANDS = [
  "SONOFF",
  "MOES",
  "TP-Link",
  "Tuya",
  "Xiaomi",
  "Aqara",
  "Philips Hue",
  "Ring",
  "FIBARO",
  "Shelly",
  "SwitchBot",
  "Lezn",
  "Akubela",
  "HELTUN",
  "MCOHome",
  "Heiman",
  "Danalock",
];

// Build a slug-to-id category map from the DB
async function buildCategoryMap(supabase: any): Promise<Map<string, string>> {
  const { data } = await supabase.from("categories").select("id, name, slug");
  const map = new Map<string, string>();
  for (const cat of data || []) {
    map.set(cat.slug, cat.id);
    map.set(cat.name.toLowerCase(), cat.id);
    // Also map common variations
    const slug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    map.set(slug, cat.id);
  }
  return map;
}

function findCategoryId(categoryName: string, catMap: Map<string, string>): string | null {
  if (!categoryName) return null;
  const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return catMap.get(slug) || catMap.get(categoryName.toLowerCase()) || null;
}

// Sanitize image URL — only allow https, reject obviously bad ones
function sanitizeImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  url = url.trim();
  if (!url.startsWith("https://")) return null;
  if (url.includes("example.com") || url.includes("placeholder") || url.length > 600) return null;
  return url;
}

async function insertProduct(
  supabase: any,
  product: { name: string; slug: string; brand?: string; price: number; category_id?: string | null; protocol?: string; description?: string; image_url?: string | null; stock?: number; featured?: boolean },
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("products").insert({
    name: product.name,
    slug: product.slug,
    brand: product.brand || null,
    price: product.price,
    original_price: Math.round(product.price * 1.15),
    category_id: product.category_id || null,
    protocol: product.protocol || null,
    description: product.description || null,
    image_url: sanitizeImageUrl(product.image_url),
    images: sanitizeImageUrl(product.image_url) ? [sanitizeImageUrl(product.image_url)!] : [],
    stock: product.stock ?? 10,
    featured: product.featured ?? false,
    is_published: true,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action = "discover-products", category, batchSize = 8, token, cronSecret } = await req
      .json()
      .catch(() => ({}));

    const expectedCronSecret = Deno.env.get("CRON_SECRET");
    const isCron = !!expectedCronSecret && cronSecret === expectedCronSecret;
    if (!isCron && !(await verifyAdminToken(supabase, token))) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build category map once for all insert operations
    const catMap = await buildCategoryMap(supabase);

    if (action === "discover-products") {
      const targetCategory = category || CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const prompt = `Find ${batchSize} smart home products in the category "${targetCategory}" sold in Egypt.
Focus on brands: ${BRANDS.join(", ")}.
Return ONLY a JSON array. Each object must have:
  - name (string): full product name with model number
  - brand (string): manufacturer brand
  - price (integer): realistic EGP price from Amazon.eg, Noon, or Jumia Egypt
  - category (string): "${targetCategory}"
  - protocol (string): e.g. "WiFi", "Zigbee", "Z-Wave", "Bluetooth", "Matter"
  - description (string): 2-3 sentence product description in English
  - image_url (string|null): a real direct image URL from the brand's official website or Amazon.eg CDN, or null if unsure

Return ONLY the JSON array, no explanation.`;
      const aiResponse = await callAI(SYSTEM, prompt);
      const discoveredProducts = parseProductsFromResponse(aiResponse);
      const results: any[] = [];

      for (const product of discoveredProducts) {
        try {
          const slug = product.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 80);
          const { data: existing } = await supabase
            .from("products")
            .select("id, price, name")
            .or(`slug.eq.${slug},name.ilike.%${product.name.slice(0, 30)}%`)
            .limit(1);

          if (existing && existing.length > 0) {
            const current = existing[0];
            if (product.price > 0 && Math.abs(current.price - product.price) > 50) {
              const pctDiff = (Math.abs(current.price - product.price) / current.price) * 100;
              if (pctDiff > 10 && pctDiff < 200) {
                await supabase
                  .from("products")
                  .update({
                    original_price: current.price,
                    price: product.price,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", current.id);
                results.push({
                  name: current.name,
                  status: "price_updated",
                  oldPrice: current.price,
                  newPrice: product.price,
                });
              } else {
                results.push({ name: current.name, status: "already_exists", price: current.price });
              }
            } else {
              results.push({ name: current.name, status: "already_exists", price: current.price });
            }
          } else {
            const categoryId = findCategoryId(product.category, catMap);
            const ins = await insertProduct(supabase, {
              name: product.name,
              slug,
              brand: product.brand,
              price: product.price,
              category_id: categoryId,
              protocol: product.protocol,
              description: product.description,
              image_url: product.image_url,
            });
            results.push({
              name: product.name,
              status: ins.success ? "new_product_added" : "insert_failed",
              price: product.price,
              brand: product.brand,
              image_url: sanitizeImageUrl(product.image_url),
              ...(ins.error ? { error: ins.error } : {}),
            });
          }
          await new Promise((r) => setTimeout(r, 100));
        } catch (err) {
          results.push({ name: product.name, status: "error", error: String(err) });
        }
      }

      return new Response(JSON.stringify({ success: true, category: targetCategory, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-prices") {
      const { data: products, error } = await supabase
        .from("products")
        .select("id, name, brand, price")
        .not("brand", "is", null)
        .order("updated_at", { ascending: true })
        .limit(batchSize);
      if (error) throw error;
      const results: any[] = [];
      const productNames = (products || []).map((p: any) => `"${p.name}" by ${p.brand}`).join("\n");

      if (!productNames) {
        return new Response(JSON.stringify({ success: true, results: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const prompt = `For each smart home product below, give the realistic current market price in Egyptian Pounds (EGP) on Amazon.eg, Noon, or Jumia.

${productNames}

Return ONLY a JSON array of objects: { "name": "product name", "price": 1234 }
Use 0 for products you cannot estimate. Return ONLY the JSON array.`;

      try {
        const priceResponse = await callAI(SYSTEM, prompt);
        let priceData: any[] = [];
        try {
          const jsonMatch = priceResponse.match(/\[[\s\S]*\]/);
          if (jsonMatch) priceData = JSON.parse(jsonMatch[0]);
        } catch {}

        for (const product of products || []) {
          const found = priceData.find(
            (p) => p.name && (product.name as string).toLowerCase().includes(p.name.toLowerCase().slice(0, 20)),
          );
          const newPrice = found?.price ? parseInt(String(found.price).replace(/[^\d]/g, "")) : 0;

          if (newPrice > 50 && newPrice < 500000) {
            const pctDiff = (Math.abs(product.price - newPrice) / product.price) * 100;
            if (pctDiff > 10 && pctDiff < 200) {
              await supabase
                .from("products")
                .update({
                  original_price: product.price,
                  price: newPrice,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", product.id);
              results.push({ name: product.name, status: "updated", oldPrice: product.price, newPrice });
            } else {
              results.push({ name: product.name, status: "price_unchanged", currentPrice: product.price });
            }
          } else {
            results.push({ name: product.name, status: "no_price_found" });
          }
        }
      } catch (err) {
        for (const product of products || []) {
          results.push({ name: product.name, status: "error", error: String(err) });
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "full-sync") {
      const allResults: any[] = [];
      for (const cat of CATEGORIES) {
        try {
          const prompt = `Find 4-5 smart home products in Egypt in the "${cat}" category.
Focus on popular brands: ${BRANDS.join(", ")}.
Return a JSON array. Each object must have:
  - name (string): full product name with model number
  - brand (string): manufacturer brand
  - price (integer): realistic EGP price from Amazon.eg, Noon, or Jumia
  - category (string): "${cat}"
  - protocol (string): WiFi, Zigbee, Z-Wave, Bluetooth, or Matter
  - description (string): 2-3 sentence product description in English
  - image_url (string|null): direct image URL from brand website or Amazon.eg CDN, or null

Return ONLY the JSON array.`;
          const aiResp = await callAI(SYSTEM, prompt);
          const products = parseProductsFromResponse(aiResp);

          for (const product of products) {
            const slug = product.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")
              .slice(0, 80);
            const { data: existing } = await supabase
              .from("products")
              .select("id, price")
              .or(`slug.eq.${slug},name.ilike.%${product.name.slice(0, 25)}%`)
              .limit(1);

            if (existing && existing.length > 0) {
              const pctDiff =
                product.price > 0 ? (Math.abs(existing[0].price - product.price) / existing[0].price) * 100 : 0;
              if (pctDiff > 10 && pctDiff < 200) {
                await supabase
                  .from("products")
                  .update({
                    original_price: existing[0].price,
                    price: product.price,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", existing[0].id);
                allResults.push({ name: product.name, status: "price_updated", category: cat });
              } else {
                allResults.push({ name: product.name, status: "exists", category: cat });
              }
            } else {
              const categoryId = findCategoryId(cat, catMap);
              const ins = await insertProduct(supabase, {
                name: product.name,
                slug,
                brand: product.brand,
                price: product.price,
                category_id: categoryId,
                protocol: product.protocol,
                description: product.description,
                image_url: product.image_url,
              });
              allResults.push({
                name: product.name,
                status: ins.success ? "added" : "failed",
                category: cat,
                price: product.price,
                image_added: !!sanitizeImageUrl(product.image_url),
              });
            }
          }
          await new Promise((r) => setTimeout(r, 800));
        } catch (err) {
          allResults.push({ category: cat, status: "error", error: String(err) });
        }
      }
      return new Response(JSON.stringify({ success: true, results: allResults }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Market sync error:", error);
    const msg = String(error);
    return new Response(
      JSON.stringify({
        success: false,
        fallback: true,
        error: msg.includes("RATE_LIMITED")
          ? "RATE_LIMITED"
          : msg.includes("PAYMENT_REQUIRED")
          ? "PAYMENT_REQUIRED"
          : msg.includes("all AI providers failed")
          ? "AI_UNAVAILABLE"
          : "SERVICE_UNAVAILABLE",
        message: msg.slice(0, 300),
        results: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
