import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { chatCompleteRaw } from "../_shared/ai.ts";

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

function isUrlAllowed(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) return false;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      const parts = host.split(".").map(Number);
      const [a, b] = parts;
      if (a === 10) return false;
      if (a === 127) return false;
      if (a === 169 && b === 254) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
    }
    return true;
  } catch {
    return false;
  }
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, adminToken } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!(await verifyAdminToken(supabase, adminToken))) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isUrlAllowed(url)) {
      return new Response(JSON.stringify({ error: "URL not allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean and sanitize URL
    const cleanUrl = (() => {
      try {
        const u = new URL(url.trim());
        if (u.hostname.includes("amazon")) {
          const dropParams = ["ref", "language", "pf_rd_r", "pf_rd_p", "pf_rd_m", "pf_rd_s", "pf_rd_t", "sprefix", "crid", "qid", "tag", "linkCode"];
          for (const p of dropParams) u.searchParams.delete(p);
        }
        return u.toString();
      } catch {
        return url.trim();
      }
    })();

    let effectiveUrl = cleanUrl;
    const isAmazon = effectiveUrl.includes("amazon.eg") || effectiveUrl.includes("amazon.com");

    // SmartZoom Egypt official API direct extraction
    if (cleanUrl.includes("smartzoom.tech")) {
      try {
        let slug = "";
        const slugMatch = cleanUrl.match(/\/products\/([a-zA-Z0-9_\-]+)/);
        if (slugMatch && !cleanUrl.endsWith("/products") && !cleanUrl.endsWith("/products/")) {
          slug = slugMatch[1];
        } else {
          // Catalog page: fetch first top product from the 120-item catalog
          const listRes = await fetch("https://api.smartzoom.tech/api/products?limit=1", { signal: AbortSignal.timeout(6000) });
          if (listRes.ok) {
            const listJson = await listRes.json();
            slug = listJson.data?.[0]?.slug || "";
          }
        }

        if (slug) {
          const apiRes = await fetch(`https://api.smartzoom.tech/api/products?slug=${slug}`, { signal: AbortSignal.timeout(8000) });
          if (apiRes.ok) {
            const json = await apiRes.json();
            const p = json.data?.[0];
            if (p && (p.name || p.title) && p.price) {
              return new Response(JSON.stringify({
                success: true,
                product: {
                  name: p.name || p.title,
                  description: (p.description || `${p.name || p.title} - Smart Home Product`).slice(0, 500),
                  price: Math.round(p.price || p.basePrice || 0),
                  original_price: p.originalPrice ? Math.round(p.originalPrice) : Math.round((p.price || 0) * 1.15),
                  brand: p.company?.name || "SmartZoom",
                  image_url: p.images?.[0] || p.thumbnail || null,
                  images: Array.isArray(p.images) ? p.images : [],
                  protocol: "WiFi / Zigbee",
                  category: p.category?.name || "Smart Home",
                  specifications: {
                    Model: p.code || p.slug || "",
                    Warranty: p.warrantyMonths ? `${p.warrantyMonths} Months` : "12 Months",
                  },
                  slug: p.slug || `smartzoom-${Date.now()}`,
                  source_url: `https://smartzoom.tech/products/${p.slug}`,
                }
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
        }
      } catch (err) {
        console.warn("SmartZoom scrape-product API error:", err);
      }
    }

    // If user provided an Amazon search page, automatically resolve to top product ASIN
    if (isAmazon && (effectiveUrl.includes("/s?") || effectiveUrl.includes("/s/"))) {
      try {
        const u = new URL(effectiveUrl);
        const query = u.searchParams.get("k") || u.searchParams.get("field-keywords") || "";
        if (query) {
          const ddgResp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:amazon.eg/dp/ ${query}`)}`, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept-Language": "en-US,en;q=0.9" },
            signal: AbortSignal.timeout(8000),
          });
          if (ddgResp.ok) {
            const ddgText = await ddgResp.text();
            const matches = ddgText.matchAll(/uddg=([^&]+)/g);
            for (const m of matches) {
              const decoded = decodeURIComponent(m[1]);
              const asinMatch = decoded.match(/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
              if (asinMatch) {
                effectiveUrl = `https://www.amazon.eg/dp/${asinMatch[1].toUpperCase()}`;
                break;
              }
            }
          }
        }
      } catch {}
    }

    // Fetch the page content with anti-bot resilience
    let html = "";

    if (isAmazon) {
      try {
        const jinaResp = await fetch(`https://r.jina.ai/${effectiveUrl}`, {
          headers: {
            "Accept": "text/html,text/plain,*/*",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "X-No-Cache": "true",
          },
          signal: AbortSignal.timeout(15000),
        });
        if (jinaResp.ok) {
          const text = await jinaResp.text();
          if (text && text.length > 500) html = text;
        }
      } catch {}
    }

    if (!html) {
      const pageResp = await fetch(effectiveUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!pageResp.ok) {
        // Try proxy fallback if direct fetch fails (403, 503, 429)
        try {
          const jinaResp = await fetch(`https://r.jina.ai/${effectiveUrl}`, { signal: AbortSignal.timeout(15000) });
          if (jinaResp.ok) {
            html = await jinaResp.text();
          }
        } catch {}

        // If still failing and Amazon, attempt DuckDuckGo snippet extraction
        if (!html && isAmazon) {
          const asinMatch = effectiveUrl.match(/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
          if (asinMatch) {
            try {
              const ddgResp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:amazon.eg "${asinMatch[1]}"`)}`, {
                headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "en-US,en;q=0.9" },
                signal: AbortSignal.timeout(8000),
              });
              if (ddgResp.ok) {
                const ddgText = await ddgResp.text();
                if (ddgText.length > 500) html = ddgText;
              }
            } catch {}
          }
        }

        if (!html) {
          const is503 = pageResp.status === 503;
          throw new Error(is503
            ? `Amazon Egypt anti-bot protection (HTTP 503) intercepted the automated scraper. Try using the ASIN or single product URL directly.`
            : `Failed to fetch URL: ${pageResp.status}`
          );
        }
      } else {
        html = await pageResp.text();
      }
    }

    // Pre-extract real images from HTML/markdown before AI (og:image, json-ld, markdown, amazon cdn)
    const realImages: string[] = [];
    const isGoodImage = (img: string) => {
      const l = img.toLowerCase();
      return !l.includes("sprite") && !l.includes("fls-eu") && !l.includes("pixel") && !l.includes("nav-sprite") && !l.includes("events/") && !l.includes("icon");
    };

    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch && isGoodImage(ogMatch[1])) realImages.push(ogMatch[1]);
    const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    if (twMatch && isGoodImage(twMatch[1])) realImages.push(twMatch[1]);

    // Markdown image tags from Jina reader: ![alt](url)
    const mdImgMatches = html.matchAll(/!\[[^\]]*\]\((https:\/\/[^\s\)]+)\)/g);
    for (const m of mdImgMatches) {
      if (isGoodImage(m[1]) && !realImages.includes(m[1])) realImages.push(m[1]);
    }

    // Amazon high-res product images
    const amzImgMatches = html.matchAll(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%_-]+\.(?:jpg|png|webp)/gi);
    for (const m of amzImgMatches) {
      if (isGoodImage(m[0]) && !realImages.includes(m[0])) realImages.push(m[0]);
    }

    // JSON-LD product images
    const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const m of jsonLdMatches) {
      try {
        const ld = JSON.parse(m[1]);
        const items = Array.isArray(ld) ? ld : [ld];
        for (const it of items) {
          const img = it.image;
          if (typeof img === "string" && isGoodImage(img)) realImages.push(img);
          else if (Array.isArray(img)) realImages.push(...img.filter((x: any) => typeof x === "string" && isGoodImage(x)));
          else if (img?.url && isGoodImage(img.url)) realImages.push(img.url);
        }
      } catch {}
    }
    const dedupedImages = [...new Set(realImages.filter((u) => u && u.startsWith("http")))];
    const primaryImage = dedupedImages[0] || null;

    // Truncate HTML to avoid token limits
    const truncatedHtml = html.substring(0, 30000);

    // Universal deterministic extractor from JSON-LD, OpenGraph, Microdata & E-commerce HTML
    let detName: string | null = null;
    let detPrice: number | null = null;
    let detDesc: string | null = null;
    let detBrand: string | null = null;

    // 1. JSON-LD extraction
    for (const m of jsonLdMatches) {
      try {
        const ld = JSON.parse(m[1]);
        const findProd = (obj: any): any => {
          if (!obj) return null;
          if (Array.isArray(obj)) return obj.map(findProd).find(Boolean);
          if (obj["@type"] === "Product") return obj;
          if (obj["@graph"]) return findProd(obj["@graph"]);
          return null;
        };
        const p = findProd(ld);
        if (p) {
          if (!detName && p.name) detName = p.name;
          if (!detDesc && p.description) detDesc = p.description;
          if (!detBrand && p.brand?.name) detBrand = p.brand.name;
          const offerPrice = p.offers?.price || p.offers?.[0]?.price || p.offers?.lowPrice;
          if (!detPrice && offerPrice) detPrice = parseFloat(String(offerPrice).replace(/[^0-9.]/g, ""));
        }
      } catch {}
    }

    // 2. OpenGraph metadata
    if (!detName) {
      const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1]
        || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i)?.[1];
      if (ogTitle) detName = ogTitle.trim();
    }

    if (!detDesc) {
      const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1]
        || html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1];
      if (ogDesc) detDesc = ogDesc.trim();
    }

    // 3. CSS price selectors for Egyptian stores
    if (!detPrice) {
      const prMatch = html.match(/id=["']sec_product_price[^\"]*["'][^>]*>([\s\S]*?)<\/span>/i)
        || html.match(/class=["']ty-price-num["'][^>]*>([\s\S]*?)<\/span>/i)
        || html.match(/class=["']price["'][^>]*>([\s\S]*?)<\//i)
        || html.match(/data-price=["']([0-9.,]+)["']/i);
      if (prMatch) {
        const cleanNum = prMatch[1].replace(/<[^>]*>/g, "").replace(/,/g, "").match(/[0-9]+(?:\.[0-9]+)?/);
        if (cleanNum) detPrice = parseFloat(cleanNum[0]);
      }
    }

    // 4. Currency label regex (EGP / L.E / جنيه)
    if (!detPrice) {
      const egpMatch = html.match(/([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?)\s*(?:EGP|L\.E|ج\.م|جنيه)/i)
        || html.match(/(?:EGP|L\.E|ج\.م|جنيه)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?)/i);
      if (egpMatch) {
        detPrice = parseFloat(egpMatch[1].replace(/,/g, ""));
      }
    }

    // If deterministic extractor retrieved name and price, return it directly
    if (detName && detPrice && detPrice > 0) {
      const slug = detName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 80);
      const descLower = (detName + " " + (detDesc || "")).toLowerCase();
      let protocol = "WiFi / Zigbee";
      if (descLower.includes("zigbee")) protocol = "Zigbee 3.0";
      else if (descLower.includes("matter")) protocol = "Matter";
      else if (descLower.includes("z-wave")) protocol = "Z-Wave Plus";
      else if (descLower.includes("rf") || descLower.includes("433")) protocol = "RF 433MHz";

      let category = "Smart Switches";
      if (descLower.includes("lock")) category = "Smart Locks";
      else if (descLower.includes("sensor")) category = "Smart Sensors";
      else if (descLower.includes("hub") || descLower.includes("bridge") || descLower.includes("gateway")) category = "Smart Hubs";
      else if (descLower.includes("panel")) category = "Smart Panels";
      else if (descLower.includes("plug") || descLower.includes("socket")) category = "Smart Plugs";

      return new Response(JSON.stringify({
        success: true,
        product: {
          name: detName,
          description: (detDesc || `${detName} - Smart Home Product in Egypt`).slice(0, 500),
          price: Math.round(detPrice),
          original_price: Math.round(detPrice * 1.15),
          brand: detBrand || "Smart Home",
          protocol,
          category,
          specifications: {},
          image_url: primaryImage,
          images: dedupedImages,
          slug,
          source_url: url,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Truncate HTML to avoid token limits for AI fallback
    const truncatedHtml = html.substring(0, 30000);
    let productData: any = null;

    try {
      const aiData = await chatCompleteRaw({
        messages: [
          {
            role: "system",
            content: `You are a product data extractor. Extract product information from HTML. Return ONLY a JSON object: {name, description, price (in EGP number), original_price, brand, specifications, protocol, category}. No markdown.`,
          },
          {
            role: "user",
            content: `Extract product data from this page (URL: ${url}):\n\n${truncatedHtml}`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_product",
            description: "Extract product data from webpage",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                price: { type: "number" },
                original_price: { type: "number" },
                brand: { type: "string" },
                specifications: { type: "object" },
                protocol: { type: "string" },
                category: { type: "string" },
              },
              required: ["name", "price"],
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_product" } },
      });

      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        productData = JSON.parse(toolCall.function.arguments);
      }
    } catch {
      // Tool call failed, fall back to plain chatComplete
    }

    if (!productData) {
      try {
        const text = await chatComplete([
          { role: "system", content: "Extract product info from HTML. Return ONLY valid JSON: {\"name\": \"...\", \"price\": 1234, \"description\": \"...\", \"brand\": \"...\", \"protocol\": \"...\", \"category\": \"...\"}" },
          { role: "user", content: `URL: ${url}\n\nHTML:\n${truncatedHtml}` }
        ]);
        const m = text.match(/\{[\s\S]*\}/);
        if (m) productData = JSON.parse(m[0]);
      } catch {}
    }

    if (!productData?.name) {
      // As a last fallback, use title or URL basename
      const pageTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
      if (pageTitle && !pageTitle.includes("404") && !pageTitle.includes("Blocked")) {
        productData = {
          name: pageTitle.slice(0, 100),
          price: detPrice || 1200,
          description: detDesc || pageTitle,
          brand: "Smart Home",
          category: "Smart Switches",
        };
      } else {
        throw new Error("Could not extract product information from this webpage");
      }
    }

    // Generate slug
    const slug = productData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 80);

    return new Response(JSON.stringify({
      success: true,
      product: {
        ...productData,
        image_url: primaryImage || productData.image_url,
        images: dedupedImages.length > 0 ? dedupedImages : (productData.images || []),
        slug,
        source_url: url,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Scrape error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Scrape failed" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});