import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { corsHeadersFor } from "../_shared/cors.ts";
import { chatCompleteRaw, chatComplete } from "../_shared/ai.ts";
import { autoEnrichProductSpecifications } from "../_shared/product-enricher.ts";

async function verifyAdminToken(supabase: any, token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const decoded = atob(token);
    const [adminId] = decoded.split(":");
    const { data } = await supabase.from("admin_settings").select("value")
      .eq("key", `admin_token_${adminId}`).single();
    return !!data && data.value === token;
  } catch { return false; }
}

function detectSourceType(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("amazon.eg") || host.includes("amazon.com")) return "amazon";
    if (host.includes("noon.com")) return "noon";
    if (host.includes("jumia.com")) return "jumia";
    if (host.includes("smartzoom.tech")) return "smartzoom";
    if (host.includes("btech.com")) return "btech";
    return "url";
  } catch { return "url"; }
}

function isListingPage(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    // Amazon search or category listing
    if (u.hostname.includes("amazon") && (path.startsWith("/s") || path.includes("/b?") || u.searchParams.has("k") || u.searchParams.has("rh"))) return true;
    if (u.hostname.includes("noon") && (path.includes("/search") || path.includes("/category") || path.includes("/c/"))) return true;
    if (u.hostname.includes("jumia") && (path.includes("/catalog") || path.includes("mlp-"))) return true;

    // SmartZoom, Shopify, WooCommerce & generic e-commerce catalog paths
    if (
      path === "/products" ||
      path === "/products/" ||
      path.startsWith("/products?") ||
      path === "/shop" ||
      path.startsWith("/shop/") ||
      path === "/catalog" ||
      path.startsWith("/catalog/") ||
      path.startsWith("/category/") ||
      path.startsWith("/collections/") ||
      path.includes("/category") ||
      u.searchParams.has("page") ||
      u.searchParams.has("q")
    ) return true;

    return false;
  } catch { return false; }
}

function isGoodProductImage(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    !lower.includes("sprite") &&
    !lower.includes("fls-eu") &&
    !lower.includes("pixel") &&
    !lower.includes("nav-sprite") &&
    !lower.includes("events/") &&
    !lower.includes("xcm_manual") &&
    !lower.includes("icon") &&
    !lower.includes("logo") &&
    !lower.includes("badge")
  );
}

// Clean and sanitize URLs (remove tracking tags, ref markers, language overrides)
function cleanSourceUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl.trim());
    if (u.hostname.includes("amazon")) {
      const dropParams = ["ref", "language", "pf_rd_r", "pf_rd_p", "pf_rd_m", "pf_rd_s", "pf_rd_t", "sprefix", "crid", "qid", "tag", "linkCode"];
      for (const p of dropParams) {
        u.searchParams.delete(p);
      }
    }
    return u.toString();
  } catch {
    return rawUrl.trim();
  }
}

// Keyless search via DuckDuckGo to bypass Amazon 503 anti-bot restrictions
async function searchDuckDuckGoForLinks(query: string, limit = 20): Promise<string[]> {
  try {
    const resp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return [];
    const text = await resp.text();
    const asins: string[] = [];
    const matches = text.matchAll(/uddg=([^&]+)/g);
    for (const m of matches) {
      try {
        const decoded = decodeURIComponent(m[1]);
        if (decoded.includes("amazon.eg") && (decoded.includes("/dp/") || decoded.includes("/gp/product/"))) {
          const match = decoded.match(/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
          if (match) {
            const asin = match[1].toUpperCase();
            if (!asins.includes(asin)) asins.push(asin);
          }
        }
      } catch {}
    }
    // Prioritize B0 hardware/smart home gadgets over ISBNs
    const sorted = asins.sort((a, b) => {
      if (a.startsWith("B0") && !b.startsWith("B0")) return -1;
      if (!a.startsWith("B0") && b.startsWith("B0")) return 1;
      return 0;
    });
    return sorted.slice(0, limit).map((a) => `https://www.amazon.eg/dp/${a}`);
  } catch {
    return [];
  }
}

// Extract product links from a listing/search page HTML
function extractProductLinks(html: string, baseUrl: string, sourceType: string): string[] {
  const links: Set<string> = new Set();
  const base = new URL(baseUrl);

  if (sourceType === "amazon") {
    // Matches both standard HTML hrefs (/dp/ASIN) and markdown URLs from Jina reader
    const asinPattern = /(?:href=["'])?(?:https?:\/\/[^/]+)?(?:\/dp\/|\/gp\/product\/)([A-Z0-9]{10})/gi;
    let m: RegExpExecArray | null;
    while ((m = asinPattern.exec(html)) !== null) {
      const asin = m[1].toUpperCase();
      links.add(`https://${base.hostname}/dp/${asin}`);
      if (links.size >= 25) break;
    }
  } else if (sourceType === "noon") {
    // Noon product links
    const noonPattern = /(?:href=["'])?(\/egypt-en\/[^"'\s\)]+\/p\/[^"'\s\)]+)/g;
    let m: RegExpExecArray | null;
    while ((m = noonPattern.exec(html)) !== null) {
      links.add(`https://www.noon.com${m[1]}`);
      if (links.size >= 25) break;
    }
  } else if (sourceType === "jumia") {
    const jumiaPattern = /(?:href=["'])?(\/[^"'\s\)]+\.html)/g;
    let m: RegExpExecArray | null;
    while ((m = jumiaPattern.exec(html)) !== null) {
      if (m[1].includes("-") && !m[1].includes("catalog")) {
        links.add(`https://www.jumia.com.eg${m[1]}`);
        if (links.size >= 25) break;
      }
    }
  } else {
    // Generic e-commerce (SmartZoom, Shopify, WooCommerce, Next.js, etc.)
    const genericPatterns = [
      /(?:href=["'])(\/products\/[a-zA-Z0-9_\-]+)["']/gi,
      /(?:href=["'])(\/product\/[a-zA-Z0-9_\-]+)["']/gi,
      /(?:href=["'])(\/item\/[a-zA-Z0-9_\-]+)["']/gi,
      /(?:href=["'])(\/p\/[a-zA-Z0-9_\-]+)["']/gi,
      /(?:href=["'])(https?:\/\/[^"'\s\)]+\/(?:products|product|p)\/[a-zA-Z0-9_\-]+)["']/gi,
    ];
    for (const pattern of genericPatterns) {
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(html)) !== null) {
        let rawLink = m[1];
        if (rawLink.startsWith("/")) {
          rawLink = `${base.protocol}//${base.host}${rawLink}`;
        }
        if (!rawLink.endsWith("/products") && !rawLink.endsWith("/product") && !rawLink.endsWith("/p")) {
          links.add(rawLink);
          if (links.size >= 30) break;
        }
      }
    }
  }

  return [...links].slice(0, 25);
}

// Discover product links for a listing page with anti-bot fallback
async function discoverListingProductLinks(rawUrl: string, sourceType: string): Promise<string[]> {
  const cleanUrl = cleanSourceUrl(rawUrl);

  // Strategy 0: If SmartZoom, fetch directly from high-speed official API
  if (sourceType === "smartzoom" || cleanUrl.includes("smartzoom.tech")) {
    try {
      const p1 = await fetch("https://api.smartzoom.tech/api/products?limit=100&page=1").then(r => r.json());
      const p2 = await fetch("https://api.smartzoom.tech/api/products?limit=100&page=2").then(r => r.json());
      const allItems = [...(p1.data || []), ...(p2.data || [])];
      if (allItems.length > 0) {
        return allItems.map((p: any) => `https://smartzoom.tech/products/${p.slug}`);
      }
    } catch (e) {
      console.warn("SmartZoom API discovery error:", e);
    }
  }

  // Strategy 1: If Amazon search page, use Jina reader first to extract ASINs without 503
  if (sourceType === "amazon" || cleanUrl.includes("amazon")) {
    try {
      const jinaResp = await fetch(`https://r.jina.ai/${cleanUrl}`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(12000),
      });
      if (jinaResp.ok) {
        const text = await jinaResp.text();
        const asins = [...text.matchAll(/(?:dp|gp\/product)\/([A-Z0-9]{10})/gi)].map(m => m[1].toUpperCase());
        const unique = [...new Set(asins)];
        if (unique.length > 0) {
          return unique.slice(0, 25).map(a => `https://www.amazon.eg/dp/${a}`);
        }
      }
    } catch (e) {
      console.warn("Jina Amazon listing reader error:", e);
    }

    // Strategy 1b: DuckDuckGo search fallback for Amazon query
    try {
      const u = new URL(cleanUrl);
      const queryParam = u.searchParams.get("k") || u.searchParams.get("field-keywords") || "";
      if (queryParam) {
        const ddgLinks = await searchDuckDuckGoForLinks(`site:amazon.eg/dp/ ${queryParam} smart home`);
        if (ddgLinks.length > 0) return ddgLinks;

        const broadLinks = await searchDuckDuckGoForLinks(`site:amazon.eg/dp/ ${queryParam}`);
        if (broadLinks.length > 0) return broadLinks;
      }
    } catch (e) {
      console.warn("DDG search fallback error:", e);
    }
  }

  // Strategy 2: Attempt normal fetch via browser headers
  try {
    const html = await fetchHtml(cleanUrl);
    const links = extractProductLinks(html, cleanUrl, sourceType);
    if (links.length > 0) return links;
  } catch (err) {
    console.warn(`Direct fetch failed for ${cleanUrl}:`, err);
  }

  return [];
}

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
  "Cache-Control": "no-cache",
};

async function fetchHtml(url: string): Promise<string> {
  const cleanUrl = cleanSourceUrl(url);
  const isAmazon = cleanUrl.includes("amazon.eg") || cleanUrl.includes("amazon.com");

  // Amazon blocks cloud datacenter IPs directly with HTTP 503; try Jina reader proxy first
  if (isAmazon) {
    try {
      const jinaResp = await fetch(`https://r.jina.ai/${cleanUrl}`, {
        headers: {
          "Accept": "text/html,text/plain,*/*",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "X-No-Cache": "true",
        },
        signal: AbortSignal.timeout(15000),
      });
      if (jinaResp.ok) {
        const text = await jinaResp.text();
        if (text && text.length > 500) return text;
      }
    } catch (err) {
      console.warn("Jina reader proxy timed out or failed for Amazon, falling back:", err);
    }
  }

  // Direct fetch with browser headers
  try {
    const resp = await fetch(cleanUrl, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });

    if (resp.ok) {
      return await resp.text();
    }

    // If direct fetch was intercepted with 403, 503, or 429
    if (resp.status === 403 || resp.status === 503 || resp.status === 429) {
      // Second attempt on Jina reader with clean URL
      try {
        const jinaResp = await fetch(`https://r.jina.ai/${cleanUrl}`, {
          headers: { "Accept": "text/html,text/plain,*/*" },
          signal: AbortSignal.timeout(15000),
        });
        if (jinaResp.ok) {
          const text = await jinaResp.text();
          if (text && text.length > 500) return text;
        }
      } catch {}

      // If it's an Amazon product page, fetch DuckDuckGo snippet as synthetic HTML
      if (isAmazon) {
        const asinMatch = cleanUrl.match(/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
        if (asinMatch) {
          try {
            const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(`site:amazon.eg "${asinMatch[1]}"`)}`, {
              headers: { "User-Agent": BROWSER_HEADERS["User-Agent"], "Accept-Language": "en-US,en;q=0.9" },
              signal: AbortSignal.timeout(8000),
            });
            if (ddgRes.ok) {
              const ddgText = await ddgRes.text();
              if (ddgText.length > 500) return ddgText;
            }
          } catch {}
        }
      }
    }

    throw new Error(`HTTP ${resp.status} for ${cleanUrl}`);
  } catch (err: any) {
    if (!isAmazon) {
      try {
        const jinaResp = await fetch(`https://r.jina.ai/${cleanUrl}`, { signal: AbortSignal.timeout(12000) });
        if (jinaResp.ok) {
          const text = await jinaResp.text();
          if (text && text.length > 500) return text;
        }
      } catch {}
    }
    throw err;
  }
}

function extractImagesFromHtml(html: string): string[] {
  const images: string[] = [];
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogMatch && isGoodProductImage(ogMatch[1])) images.push(ogMatch[1]);
  const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (twMatch && !images.includes(twMatch[1]) && isGoodProductImage(twMatch[1])) images.push(twMatch[1]);

  // Markdown image tags from Jina reader: ![alt](url)
  const mdImgMatches = html.matchAll(/!\[[^\]]*\]\((https:\/\/[^\s\)]+)\)/g);
  for (const m of mdImgMatches) {
    const imgUrl = m[1];
    if (!images.includes(imgUrl) && isGoodProductImage(imgUrl)) {
      images.push(imgUrl);
    }
  }

  // Amazon high-res product images
  const amzImgMatches = html.matchAll(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%_-]+\.(?:jpg|png|webp)/gi);
  for (const m of amzImgMatches) {
    const imgUrl = m[0];
    if (!images.includes(imgUrl) && isGoodProductImage(imgUrl)) {
      images.push(imgUrl);
    }
  }

  // JSON-LD
  const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    try {
      const ld = JSON.parse(m[1]);
      const items = Array.isArray(ld) ? ld : [ld];
      for (const it of items) {
        const img = it.image;
        if (typeof img === "string" && !images.includes(img) && isGoodProductImage(img)) images.push(img);
        else if (Array.isArray(img)) images.push(...img.filter((x: any) => typeof x === "string" && !images.includes(x) && isGoodProductImage(x)));
        else if (img?.url && !images.includes(img.url) && isGoodProductImage(img.url)) images.push(img.url);
      }
    } catch {}
  }
  return images.filter((u) => u && u.startsWith("http")).slice(0, 5);
}

function resolveSmartZoomStock(p: any): number {
  if (!p) return 0;
  if (p.inStock === false || p.isAvailable === false) return 0;
  if (typeof p.status === "string" && /out[_\s-]*of[_\s-]*stock/i.test(p.status)) return 0;

  for (const c of [p.stockAvailable, p.effectiveStock, p.stockTotal, p.stock]) {
    if (typeof c === "number" && !Number.isNaN(c)) {
      return Math.max(0, Math.floor(c));
    }
  }
  if (Array.isArray(p.variants) && p.variants.length > 0) {
    return p.variants.reduce((sum: number, v: any) => {
      const s = v?.stockAvailable ?? v?.stockTotal ?? v?.stock ?? 0;
      return sum + (typeof s === "number" && !Number.isNaN(s) ? Math.max(0, Math.floor(s)) : 0);
    }, 0);
  }
  return 0;
}

async function scrapeProductFromUrl(url: string): Promise<any | null> {
  try {
    // High-speed direct API extraction for SmartZoom Egypt
    if (url.includes("smartzoom.tech")) {
      try {
        const slugMatch = url.match(/\/products\/([a-zA-Z0-9_\-]+)/);
        if (slugMatch) {
          const slug = slugMatch[1];
          const res = await fetch(`https://api.smartzoom.tech/api/products?slug=${slug}`, {
            headers: { "Accept": "application/json", "User-Agent": BROWSER_HEADERS["User-Agent"] },
            signal: AbortSignal.timeout(8000),
          });
          if (res.ok) {
            const json = await res.json();
            const p = json.data?.[0];
            const rawPrice = p?.effectivePrice ?? p?.price ?? p?.basePrice;
            if (p && (p.name || p.title) && typeof rawPrice === "number") {
              return {
                name: p.name || p.title,
                description: (p.description || `${p.name || p.title} - Smart Home Solution`).slice(0, 400),
                price: Math.round(rawPrice || 0),
                original_price: p.originalPrice ? Math.round(p.originalPrice) : Math.round((rawPrice || 0) * 1.15),
                brand: p.company?.name || "SmartZoom",
                category: p.category?.name || "Smart Home",
                protocol: "WiFi / Zigbee",
                stock: resolveSmartZoomStock(p),
                specifications: {
                  Model: p.code || p.slug || "",
                  Warranty: p.warrantyMonths ? `${p.warrantyMonths} Months` : "12 Months",
                  smartzoom_slug: p.slug || slug,
                },
                image_url: p.images?.[0] || p.thumbnail || null,
                images: Array.isArray(p.images) ? p.images : [],
                source_url: url,
              };
            }
          }
        }
      } catch (err) {
        console.warn("SmartZoom direct API extraction error:", err);
      }
    }

    const html = await fetchHtml(url);
    const images = extractImagesFromHtml(html);

    // Universal deterministic extractor from JSON-LD, OpenGraph, Microdata & E-commerce HTML
    let detName: string | null = null;
    let detPrice: number | null = null;
    let detDesc: string | null = null;
    let detBrand: string | null = null;

    // 1. JSON-LD extraction
    const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
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

    if (detName && detPrice && detPrice > 0) {
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

      return {
        name: detName,
        description: (detDesc || `${detName} - Smart Home Product in Egypt`).slice(0, 400),
        price: Math.round(detPrice),
        original_price: Math.round(detPrice * 1.15),
        brand: detBrand || "Smart Home",
        category,
        protocol,
        specifications: {},
        image_url: images[0] || null,
        images: images,
        source_url: url,
      };
    }

    const truncated = html.substring(0, 28000);
    let productData: any = null;

    // Try tool-calling first
    try {
      const aiData = await chatCompleteRaw({
        messages: [
          {
            role: "system",
            content: `Extract product info from HTML. Return JSON with: name (string), description (string ≤400 chars), price (EGP number), brand (string|null), protocol (string|null, e.g. WiFi/Zigbee/Z-Wave), category (string), specifications (object). If currency is USD multiply price by 50. Return valid JSON only.`,
          },
          { role: "user", content: `URL: ${url}\n\nHTML:\n${truncated}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_product",
            description: "Extract product data",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                price: { type: "number" },
                brand: { type: "string" },
                protocol: { type: "string" },
                category: { type: "string" },
                specifications: { type: "object" },
              },
              required: ["name", "price"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_product" } },
      });
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) productData = JSON.parse(toolCall.function.arguments);
    } catch {
      // Fallback to plain text completion
      try {
        const text = await chatComplete([
          { role: "system", content: "Extract product info from HTML. Return ONLY a JSON object: {\"name\": \"...\", \"price\": 1234, \"description\": \"...\", \"brand\": \"...\", \"protocol\": \"...\", \"category\": \"...\"}. No markdown." },
          { role: "user", content: `URL: ${url}\n\nHTML:\n${truncated}` },
        ]);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) productData = JSON.parse(jsonMatch[0]);
      } catch {}
    }

    if (!productData?.name || !productData?.price) return null;

    return {
      ...productData,
      image_url: images[0] || null,
      images: images,
      source_url: url,
    };
  } catch (e) {
    console.error("Scrape error for", url, String(e).slice(0, 100));
    return null;
  }
}

async function upsertProduct(supabase: any, productData: any, catMap: Map<string, string>): Promise<"added" | "updated" | "skipped" | "error"> {
  try {
    const slug = (productData.name as string)
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

    const { data: existing } = await supabase.from("products").select("id, price, stock")
      .or(`slug.eq.${slug},name.ilike.%${(productData.name as string).slice(0, 30).replace(/%/g, "")}%`)
      .limit(1);

    const catId = findCategoryId(productData.category || "", catMap);
    const cleanImage = sanitizeUrl(productData.image_url);
    const cleanImages = (productData.images || []).map(sanitizeUrl).filter(Boolean);

    if (existing?.length > 0) {
      const curr = existing[0];
      const newPrice = Math.round(productData.price);
      const updates: Record<string, any> = {};

      if (newPrice > 0 && Math.abs(curr.price - newPrice) / curr.price > 0.05) {
        updates.price = newPrice;
        updates.original_price = Math.round(newPrice * 1.15);
      }
      if (typeof productData.stock === "number" && productData.stock !== curr.stock) {
        updates.stock = Math.max(0, Math.floor(productData.stock));
      }
      if (cleanImage) {
        updates.image_url = cleanImage;
        updates.images = cleanImages;
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        await supabase.from("products").update(updates).eq("id", curr.id);
        return "updated";
      }
      return "skipped";
    }

    const enriched = autoEnrichProductSpecifications({
      name: productData.name,
      slug,
      brand: productData.brand || null,
      price: Math.round(productData.price),
      original_price: Math.round(productData.price * 1.15),
      description: productData.description || null,
      category_id: catId,
      protocol: productData.protocol || null,
      specifications: productData.specifications || null,
      image_url: cleanImage,
      images: cleanImages,
      stock: typeof productData.stock === "number" ? Math.max(0, Math.floor(productData.stock)) : 15,
      featured: false,
      is_published: true,
    });

    const { error } = await supabase.from("products").insert(enriched);
    return error ? "error" : "added";
  } catch { return "error"; }
}

async function runSmartzoomStockAndCatalogBot(supabase: any, catMap: Map<string, string>, dryRun = false) {
  // 1. Fetch all products from SmartZoom API (paged)
  const allSmartzoom: any[] = [];
  let page = 1;
  const limit = 100;
  while (page <= 10) {
    try {
      const res = await fetch(`https://api.smartzoom.tech/api/products?page=${page}&limit=${limit}`, {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) break;
      const json = await res.json();
      const list = json?.data || [];
      if (!Array.isArray(list) || list.length === 0) break;
      allSmartzoom.push(...list);
      if (list.length < limit) break;
      page++;
    } catch (e) {
      console.warn(`SmartZoom page ${page} fetch error:`, e);
      break;
    }
  }

  // 2. Fetch all AzkaSmart products from Supabase
  const { data: dbProducts, error: dbErr } = await supabase
    .from("products")
    .select("id, name, slug, price, original_price, stock, category_id, image_url, specifications");
  if (dbErr) throw dbErr;

  // Build lookup maps
  const slugMap = new Map<string, any>();
  const nameNormMap = new Map<string, any>();
  const codeMap = new Map<string, any>();

  const normalize = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const p of dbProducts || []) {
    if (p.slug) slugMap.set(p.slug.toLowerCase(), p);
    if (p.name) nameNormMap.set(normalize(p.name), p);
    const code = p.specifications?.Model || p.specifications?.code || p.specifications?.smartzoom_code;
    if (code) codeMap.set(normalize(code), p);
    const szSlug = p.specifications?.smartzoom_slug;
    if (szSlug) slugMap.set(szSlug.toLowerCase(), p);
  }

  const fallbackCatId = catMap.values().next().value || null;

  const results = {
    totalSmartzoom: allSmartzoom.length,
    matchedCount: 0,
    outOfStockCount: 0,
    restockedCount: 0,
    stockChangedCount: 0,
    createdCount: 0,
    outOfStockNames: [] as string[],
    restockedNames: [] as string[],
    createdNames: [] as string[],
    errors: [] as string[],
  };

  const toUpdate: { id: string; stock: number; name: string; oldStock: number }[] = [];
  const toCreate: any[] = [];

  for (const sz of allSmartzoom) {
    const rawName = (sz.name || sz.title || "").trim();
    if (!rawName) continue;

    const szSlug = (sz.slug || "").toLowerCase();
    const szCode = normalize(sz.code || "");
    const szStock = resolveSmartZoomStock(sz);

    // Matching logic
    let matched = (szSlug && slugMap.get(szSlug)) ||
                  (szCode && codeMap.get(szCode)) ||
                  nameNormMap.get(normalize(rawName));

    if (!matched) {
      const normRaw = normalize(rawName);
      if (normRaw.length >= 10) {
        for (const p of dbProducts || []) {
          const normP = normalize(p.name);
          if (normP.includes(normRaw) || normRaw.includes(normP)) {
            matched = p;
            break;
          }
        }
      }
    }

    if (matched) {
      results.matchedCount++;
      const currentStock = typeof matched.stock === "number" ? matched.stock : 0;
      if (currentStock !== szStock) {
        if (szStock === 0) {
          results.outOfStockCount++;
          results.outOfStockNames.push(matched.name);
        } else if (currentStock === 0 && szStock > 0) {
          results.restockedCount++;
          results.restockedNames.push(matched.name);
        }
        results.stockChangedCount++;
        toUpdate.push({ id: matched.id, stock: szStock, name: matched.name, oldStock: currentStock });
      }
    } else {
      // Product in SmartZoom not found in Azka -> Create it
      const rawPrice = sz.effectivePrice ?? sz.price ?? sz.basePrice ?? 0;
      const price = Math.round(Number(rawPrice) || 0);
      const catName = sz.category?.name || "Smart Home";
      const catId = findCategoryId(catName, catMap) || fallbackCatId;

      const slugBase = (sz.slug || rawName)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);

      const cleanImg = sanitizeUrl(sz.images?.[0] || sz.thumbnail || null);
      const cleanImgs = Array.isArray(sz.images) ? sz.images.map(sanitizeUrl).filter(Boolean) : [];

      const newProd = autoEnrichProductSpecifications({
        name: rawName,
        slug: `${slugBase}-${Math.random().toString(36).slice(2, 6)}`,
        price: price > 0 ? price : 999,
        original_price: sz.originalPrice ? Math.round(sz.originalPrice) : Math.round((price > 0 ? price : 999) * 1.15),
        description: (sz.description || `${rawName} - Smart Home Solution`).slice(0, 500),
        brand: sz.company?.name || "SmartZoom",
        category_id: catId,
        protocol: "WiFi / Zigbee",
        stock: szStock,
        featured: false,
        is_published: true,
        image_url: cleanImg,
        images: cleanImgs,
        specifications: {
          Model: sz.code || sz.slug || "",
          Warranty: sz.warrantyMonths ? `${sz.warrantyMonths} Months` : "12 Months",
          smartzoom_slug: sz.slug || "",
          smartzoom_id: sz._id || sz.id || "",
          sync_source: "smartzoom_stock_bot"
        }
      });

      toCreate.push(newProd);
      results.createdCount++;
      results.createdNames.push(rawName);
    }
  }

  // Execute updates and creates if not dryRun
  if (!dryRun) {
    for (const item of toUpdate) {
      const { error: updErr } = await supabase
        .from("products")
        .update({ stock: item.stock, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      if (updErr) {
        results.errors.push(`Update error on ${item.name}: ${updErr.message}`);
      }
    }

    const CHUNK_SIZE = 25;
    for (let i = 0; i < toCreate.length; i += CHUNK_SIZE) {
      const chunk = toCreate.slice(i, i + CHUNK_SIZE);
      const { error: insErr } = await supabase.from("products").insert(chunk);
      if (insErr) {
        results.errors.push(`Insert chunk ${i / CHUNK_SIZE} error: ${insErr.message}`);
      }
    }
  }

  return results;
}

function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith("https://")) return null;
  if (url.length > 600 || url.includes("example.com")) return null;
  return url;
}

function findCategoryId(name: string, catMap: Map<string, string>): string | null {
  if (!name) return null;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return catMap.get(slug) || catMap.get(name.toLowerCase()) || null;
}

async function buildCategoryMap(supabase: any): Promise<Map<string, string>> {
  const { data } = await supabase.from("categories").select("id, name, slug");
  const map = new Map<string, string>();
  for (const c of data || []) {
    map.set(c.slug, c.id);
    map.set(c.name.toLowerCase(), c.id);
    map.set(c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), c.id);
  }
  return map;
}

// ─── Main Handler ────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const body = await req.json().catch(() => ({}));
    const { action, token, source_id, url, name } = body;

    // Verify admin
    if (!(await verifyAdminToken(supabase, token))) return json({ success: false, error: "Unauthorized" }, 401);

    const catMap = await buildCategoryMap(supabase);

    // ── List sources ────────────────────────────────────────────────────────
    if (action === "list-sources") {
      const { data, error } = await supabase.from("sync_sources")
        .select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return json({ success: true, sources: data });
    }

    // ── Add source ──────────────────────────────────────────────────────────
    if (action === "add-source") {
      if (!url) return json({ success: false, error: "URL is required" }, 400);
      const sourceType = detectSourceType(url);
      const sourceName = name || (new URL(url).hostname.replace("www.", ""));
      const { data, error } = await supabase.from("sync_sources").insert({
        url: url.trim(),
        name: sourceName,
        source_type: sourceType,
      }).select().single();
      if (error) return json({ success: false, error: error.message }, 400);
      return json({ success: true, source: data });
    }

    // ── Delete source ───────────────────────────────────────────────────────
    if (action === "delete-source") {
      if (!source_id) return json({ success: false, error: "source_id required" }, 400);
      const { error } = await supabase.from("sync_sources").delete().eq("id", source_id);
      if (error) throw error;
      return json({ success: true });
    }

    // ── Toggle source active/inactive ───────────────────────────────────────
    if (action === "toggle-source") {
      if (!source_id) return json({ success: false, error: "source_id required" }, 400);
      const { data: src } = await supabase.from("sync_sources").select("is_active").eq("id", source_id).single();
      const { error } = await supabase.from("sync_sources").update({ is_active: !src?.is_active }).eq("id", source_id);
      if (error) throw error;
      return json({ success: true, is_active: !src?.is_active });
    }

    // ── Sync a single source ────────────────────────────────────────────────
    if (action === "sync-source") {
      if (!source_id) return json({ success: false, error: "source_id required" }, 400);
      const { data: src } = await supabase.from("sync_sources").select("*").eq("id", source_id).single();
      if (!src) return json({ success: false, error: "Source not found" }, 404);

      // Mark as syncing
      await supabase.from("sync_sources").update({ sync_status: "syncing", updated_at: new Date().toISOString() }).eq("id", source_id);

      const results: any[] = [];
      let productsFound = 0;
      let productsAdded = 0;

      try {
        const cleanUrl = cleanSourceUrl(src.url);
        const sourceType = src.source_type !== "auto" ? src.source_type : detectSourceType(cleanUrl);

        if (isListingPage(cleanUrl)) {
          // Extract product links with resilient fallback for Amazon anti-bot
          const links = await discoverListingProductLinks(cleanUrl, sourceType);
          productsFound = links.length;

          for (const link of links) {
            const product = await scrapeProductFromUrl(link);
            if (product) {
              const status = await upsertProduct(supabase, product, catMap);
              results.push({ name: product.name, url: link, status });
              if (status === "added") productsAdded++;
            }
            await new Promise((r) => setTimeout(r, 500)); // Rate limit between requests
          }
        } else {
          // Single product page
          const product = await scrapeProductFromUrl(cleanUrl);
          productsFound = product ? 1 : 0;
          if (product) {
            const status = await upsertProduct(supabase, product, catMap);
            results.push({ name: product.name, url: cleanUrl, status });
            if (status === "added") productsAdded++;
          }
        }

        await supabase.from("sync_sources").update({
          sync_status: "success",
          sync_message: `Found ${productsFound} product(s), added/updated ${productsAdded}`,
          last_synced_at: new Date().toISOString(),
          products_found: productsFound,
          products_added: productsAdded,
          updated_at: new Date().toISOString(),
        }).eq("id", source_id);

      } catch (err: any) {
        const is503 = String(err).includes("503");
        const friendlyMsg = is503
          ? "Amazon Egypt anti-bot protection (503) intercepted direct request. Fallback activated."
          : String(err).slice(0, 200);

        await supabase.from("sync_sources").update({
          sync_status: "error",
          sync_message: friendlyMsg,
          updated_at: new Date().toISOString(),
        }).eq("id", source_id);
        return json({ success: false, error: friendlyMsg, results });
      }

      return json({ success: true, results, productsFound, productsAdded });
    }

    // ── Sync all active sources ─────────────────────────────────────────────
    if (action === "sync-all") {
      const { data: sources } = await supabase.from("sync_sources")
        .select("id").eq("is_active", true);
      const allResults: any[] = [];
      for (const src of sources || []) {
        // Re-invoke sync-source for each
        const r = await (async () => {
          const { data: s } = await supabase.from("sync_sources").select("*").eq("id", src.id).single();
          if (!s) return null;
          await supabase.from("sync_sources").update({ sync_status: "syncing" }).eq("id", src.id);
          try {
            const cleanUrl = cleanSourceUrl(s.url);
            const st = s.source_type !== "auto" ? s.source_type : detectSourceType(cleanUrl);
            let added = 0;
            if (isListingPage(cleanUrl)) {
              const links = await discoverListingProductLinks(cleanUrl, st);
              for (const link of links) {
                const p = await scrapeProductFromUrl(link);
                if (p) { const status = await upsertProduct(supabase, p, catMap); if (status === "added") added++; }
                await new Promise(r => setTimeout(r, 400));
              }
              await supabase.from("sync_sources").update({ sync_status: "success", last_synced_at: new Date().toISOString(), products_added: added }).eq("id", src.id);
              return { source: s.name, added, status: "success" };
            } else {
              const p = await scrapeProductFromUrl(cleanUrl);
              if (p) { const status = await upsertProduct(supabase, p, catMap); if (status === "added") added++; }
              await supabase.from("sync_sources").update({ sync_status: "success", last_synced_at: new Date().toISOString(), products_added: added }).eq("id", src.id);
              return { source: s.name, added, status: "success" };
            }
          } catch (e: any) {
            const is503 = String(e).includes("503");
            const friendlyMsg = is503
              ? "Amazon Egypt anti-bot protection (503) active. Fallback activated."
              : String(e).slice(0, 200);
            await supabase.from("sync_sources").update({ sync_status: "error", sync_message: friendlyMsg }).eq("id", src.id);
            return { source: s?.name, status: "error", error: friendlyMsg };
          }
        })();
        if (r) allResults.push(r);
        await new Promise(res => setTimeout(res, 1000));
      }
      return json({ success: true, results: allResults });
    }

    // ── SmartZoom Stock & Catalog Bot ──────────────────────────────────────
    if (action === "sync-smartzoom-bot") {
      const dryRun = Boolean(body.dryRun);
      const botResults = await runSmartzoomStockAndCatalogBot(supabase, catMap, dryRun);
      return json({
        success: true,
        dryRun,
        message: dryRun
          ? `[DRY-RUN] SmartZoom Bot analyzed ${botResults.totalSmartzoom} items. ${botResults.outOfStockCount} out-of-stock updates, ${botResults.restockedCount} restocked, ${botResults.createdCount} new products to create.`
          : `SmartZoom Bot sync complete: ${botResults.outOfStockCount} marked out-of-stock, ${botResults.restockedCount} restocked, ${botResults.createdCount} new products created.`,
        data: botResults,
      });
    }

    return json({ success: false, error: "Unknown action" }, 400);
  } catch (err) {
    console.error("sync-from-sources error:", err);
    return json({ success: false, error: String(err).slice(0, 200) }, 500);
  }
});
