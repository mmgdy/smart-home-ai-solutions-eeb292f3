import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

interface PriceResult {
  productId: string;
  productName: string;
  currentPrice: number;
  amazonPrice: number | null;
  source: string | null;
  status: 'updated' | 'no_price_found' | 'error';
  message?: string;
}

// Keyless web search via DuckDuckGo HTML
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const decodeDuckDuckGoUrl = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl, "https://duckduckgo.com");
    const uddg = parsed.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : parsed.toString();
  } catch {
    const match = rawUrl.match(/uddg=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : rawUrl;
  }
};

const stripHtml = (value: string): string =>
  value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const searchDuckDuckGo = async (query: string): Promise<{ url: string; title: string; snippet: string }[]> => {
  try {
    const html = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": BROWSER_UA, "Accept-Language": "en-US,en;q=0.9" },
    });
    if (!html.ok) return [];
    const text = await html.text();
    const results: { url: string; title: string; snippet: string }[] = [];
    const blocks = text.split(/class=["'][^"']*result__body/i).slice(1);
    for (const block of blocks) {
      const linkMatch = block.match(/<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      if (!linkMatch) continue;
      const url = decodeDuckDuckGoUrl(linkMatch[1]);
      if (!/^https?:\/\//i.test(url)) continue;
      const title = stripHtml(linkMatch[2]);
      const snippetMatch = block.match(/class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
      results.push({ url, title, snippet: snippetMatch ? stripHtml(snippetMatch[1]) : "" });
      if (results.length >= 5) break;
    }
    return results;
  } catch {
    return [];
  }
};

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batchSize = 5, brands = [], token } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!(await verifyAdminToken(supabase, token))) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch products to update
    let query = supabase
      .from('products')
      .select('id, name, brand, price, slug')
      .order('updated_at', { ascending: true })
      .limit(batchSize);

    if (brands.length > 0) {
      query = query.in('brand', brands);
    }

    const { data: products, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch products: ${fetchError.message}`);
    }

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ success: true, results: [], message: 'No products to update' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${products.length} products for Amazon Egypt price check`);

    const results: PriceResult[] = [];

    for (const product of products) {
      try {
        const searchName = product.name
          .replace(/[-–|]/g, ' ')
          .replace(/Egypt|Mastery IT|TechNex Store|Baytzaki/gi, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 100);

        console.log(`Searching Amazon Egypt price for: ${searchName}`);

        // Step 1: Keyless DuckDuckGo search for product pages
        const searchQuery = `${searchName} ${product.brand || ''} amazon.eg price EGP`.trim();
        const searchResults = await searchDuckDuckGo(searchQuery);

        // Step 2: Fetch top result pages and extract content
        let bestPrice: number | null = null;
        let bestSource: string | null = null;

        for (const result of searchResults) {
          try {
            const pageResp = await fetch(result.url, {
              headers: {
                'User-Agent': BROWSER_UA,
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
              },
            });
            if (!pageResp.ok) continue;
            const pageHtml = await pageResp.text();

            // Use AI to extract price from the page content
            const truncatedHtml = pageHtml.substring(0, 15000);
            const priceResponse = await chatComplete([
              { role: 'system', content: `Extract the price in Egyptian Pounds (EGP) from this HTML page. Return ONLY a JSON object: {"price": <number in EGP or null>, "currency": "<currency code or null>"}. If no price found, use null. Do NOT include any other text.` },
              { role: 'user', content: `URL: ${result.url}\n\n${truncatedHtml}` },
            ], { maxTokens: 200 });

            let priceData: any = null;
            try { priceData = JSON.parse(priceResponse); } catch { /* skip */ }

            const price = priceData?.price;
            if (price && typeof price === 'number' && price > 0) {
              bestPrice = Math.round(price);
              bestSource = result.url;
              break; // Found a price, stop searching
            }
          } catch { /* try next result */ }
        }

        if (bestPrice) {
          const { error: updateError } = await supabase
            .from('products')
            .update({ price: bestPrice, updated_at: new Date().toISOString() })
            .eq('id', product.id);

          if (updateError) {
            results.push({
              productId: product.id, productName: product.name,
              currentPrice: product.price, amazonPrice: null, source: null,
              status: 'error', message: `Update failed: ${updateError.message}`,
            });
          } else {
            results.push({
              productId: product.id, productName: product.name,
              currentPrice: product.price, amazonPrice: bestPrice, source: bestSource,
              status: 'updated',
            });
          }
        } else {
          await supabase.from('products').update({ updated_at: new Date().toISOString() }).eq('id', product.id);
          results.push({
            productId: product.id, productName: product.name,
            currentPrice: product.price, amazonPrice: null, source: null,
            status: 'no_price_found',
          });
        }

        await new Promise(resolve => setTimeout(resolve, 600));
      } catch (productError) {
        console.error(`Error processing ${product.name}:`, productError);
        results.push({
          productId: product.id, productName: product.name,
          currentPrice: product.price, amazonPrice: null, source: null,
          status: 'error', message: String(productError),
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});