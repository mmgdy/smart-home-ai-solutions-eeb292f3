import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const HF_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';
const HF_URL = 'https://router.huggingface.co/v1/chat/completions';
const HF_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY') ?? '';

const callHF = async (prompt: string, maxTokens = 500): Promise<string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (HF_API_KEY) headers.Authorization = `Bearer ${HF_API_KEY}`;

  const res = await fetch(HF_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: HF_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.3,
      stream: false,
    }),
  });

  const raw = await res.text();
  if (!res.ok) throw new Error(`HF error (${res.status}): ${raw.slice(0, 300)}`);

  const parsed = JSON.parse(raw);
  return (parsed?.choices?.[0]?.message?.content ?? '').trim();
};

const parseProductsFromAI = (text: string): Array<{
  name: string;
  brand: string;
  price: number;
  category: string;
  protocol: string;
  description: string;
}> => {
  const products: any[] = [];

  // Try JSON parse first
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) return parsed.filter(p => p.name && p.price);
    }
  } catch {}

  // Fallback: line-by-line parsing
  const lines = text.split('\n').filter(l => l.trim());
  for (const line of lines) {
    const nameMatch = line.match(/(?:name|product)[:\s]*["']?([^"'\n,]+)/i);
    const priceMatch = line.match(/(?:price|egp)[:\s]*[\d,]+/i);
    const brandMatch = line.match(/(?:brand)[:\s]*["']?([^"'\n,]+)/i);

    if (nameMatch && priceMatch) {
      const priceNum = parseInt(priceMatch[0].replace(/[^\d]/g, ''));
      if (priceNum > 0) {
        products.push({
          name: nameMatch[1].trim(),
          brand: brandMatch?.[1]?.trim() || 'Unknown',
          price: priceNum,
          category: '',
          protocol: '',
          description: '',
        });
      }
    }
  }

  return products;
};

const CATEGORIES = [
  'Smart Lighting',
  'Smart Switches & Plugs',
  'Smart Sensors',
  'Smart Cameras & Security',
  'Smart Hubs & Controllers',
  'Smart Locks',
  'Smart Thermostats & Climate',
  'Smart Speakers & Audio',
  'Networking & WiFi',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action = 'discover-products', category, batchSize = 3 } = await req.json().catch(() => ({}));

    if (action === 'discover-products') {
      // Discover new smart home products available in Egypt
      const targetCategory = category || CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

      const prompt = `You are a smart home product database for the Egyptian market. List ${batchSize} smart home products currently sold in Egypt for the category "${targetCategory}".

For each product return a JSON array with objects containing:
- name: full product name
- brand: manufacturer brand
- price: price in Egyptian Pounds (EGP) - use realistic current Egypt market prices
- category: "${targetCategory}"
- protocol: connectivity protocol (WiFi, Zigbee, Z-Wave, Bluetooth, etc.)
- description: 1-2 sentence description of features

Focus on products from brands like: SONOFF, MOES, TP-Link, Tuya, Xiaomi, Aqara, Philips Hue, Ring, FIBARO, Shelly, SwitchBot.
Only include products actually available in Egypt through Amazon.eg, Noon, Jumia, or local retailers.
Return ONLY the JSON array, no other text.`;

      const aiResponse = await callHF(prompt, 800);
      console.log('AI discover response:', aiResponse.slice(0, 500));

      const discoveredProducts = parseProductsFromAI(aiResponse);
      const results: any[] = [];

      for (const product of discoveredProducts) {
        try {
          // Check if product already exists
          const slug = product.name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 80);

          const { data: existing } = await supabase
            .from('products')
            .select('id, price, name')
            .or(`slug.eq.${slug},name.ilike.%${product.name.slice(0, 30)}%`)
            .limit(1);

          if (existing && existing.length > 0) {
            // Update price if different
            const current = existing[0];
            if (product.price > 0 && Math.abs(current.price - product.price) > 10) {
              await supabase
                .from('products')
                .update({
                  original_price: current.price,
                  price: product.price,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', current.id);

              results.push({
                name: current.name,
                status: 'price_updated',
                oldPrice: current.price,
                newPrice: product.price,
              });
            } else {
              results.push({
                name: current.name,
                status: 'already_exists',
                price: current.price,
              });
            }
          } else {
            // Find or create category
            let categoryId = null;
            if (product.category) {
              const catSlug = product.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const { data: catData } = await supabase
                .from('categories')
                .select('id')
                .eq('slug', catSlug)
                .limit(1);

              if (catData && catData.length > 0) {
                categoryId = catData[0].id;
              }
            }

            // Insert new product
            const { error: insertError } = await supabase
              .from('products')
              .insert({
                name: product.name,
                slug,
                brand: product.brand || null,
                price: product.price,
                category_id: categoryId,
                protocol: product.protocol || null,
                description: product.description || null,
                stock: 10,
                featured: false,
              });

            if (insertError) {
              // Likely duplicate slug
              results.push({
                name: product.name,
                status: 'insert_failed',
                error: insertError.message,
              });
            } else {
              results.push({
                name: product.name,
                status: 'new_product_added',
                price: product.price,
                brand: product.brand,
              });
            }
          }

          await new Promise(r => setTimeout(r, 300));
        } catch (err) {
          results.push({ name: product.name, status: 'error', error: String(err) });
        }
      }

      return new Response(
        JSON.stringify({ success: true, category: targetCategory, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update-prices') {
      // Get existing products and check current market prices
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, brand, price')
        .not('brand', 'is', null)
        .order('updated_at', { ascending: true })
        .limit(batchSize);

      if (error) throw error;

      const results: any[] = [];

      for (const product of products || []) {
        try {
          const prompt = `What is the current price in Egyptian Pounds (EGP) for "${product.name}" by ${product.brand} on Egyptian online stores (Amazon.eg, Noon.com, Jumia.com.eg)?

Return ONLY a number representing the price in EGP. If unsure, return 0.
Example: 1500`;

          const priceText = await callHF(prompt, 50);
          const priceMatch = priceText.match(/[\d,]+/);
          const newPrice = priceMatch ? parseInt(priceMatch[0].replace(/,/g, '')) : 0;

          if (newPrice > 50 && newPrice < 500000) {
            const priceDiff = Math.abs(product.price - newPrice);
            const pctDiff = (priceDiff / product.price) * 100;

            // Only update if price changed by more than 5%
            if (pctDiff > 5) {
              await supabase
                .from('products')
                .update({
                  original_price: product.price,
                  price: newPrice,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', product.id);

              results.push({
                name: product.name,
                status: 'updated',
                oldPrice: product.price,
                newPrice,
              });
            } else {
              results.push({
                name: product.name,
                status: 'price_unchanged',
                currentPrice: product.price,
              });
            }
          } else {
            results.push({
              name: product.name,
              status: 'no_price_found',
              response: priceText.slice(0, 100),
            });
          }

          await new Promise(r => setTimeout(r, 800));
        } catch (err) {
          results.push({ name: product.name, status: 'error', error: String(err) });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'full-sync') {
      // Run both discover + update in sequence across all categories
      const allResults: any[] = [];

      for (const cat of CATEGORIES) {
        try {
          const prompt = `List 2 smart home products currently sold in Egypt for "${cat}". Return a JSON array with objects: name, brand, price (EGP), category, protocol, description. Only real products with real Egyptian prices. JSON array only.`;

          const aiResp = await callHF(prompt, 600);
          const products = parseProductsFromAI(aiResp);

          for (const product of products) {
            const slug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

            const { data: existing } = await supabase
              .from('products')
              .select('id, price')
              .or(`slug.eq.${slug},name.ilike.%${product.name.slice(0, 25)}%`)
              .limit(1);

            if (existing && existing.length > 0) {
              if (product.price > 0 && Math.abs(existing[0].price - product.price) > 10) {
                await supabase.from('products').update({
                  original_price: existing[0].price,
                  price: product.price,
                  updated_at: new Date().toISOString(),
                }).eq('id', existing[0].id);
                allResults.push({ name: product.name, status: 'price_updated', category: cat });
              } else {
                allResults.push({ name: product.name, status: 'exists', category: cat });
              }
            } else {
              let categoryId = null;
              const catSlug = cat.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const { data: catData } = await supabase.from('categories').select('id').eq('slug', catSlug).limit(1);
              if (catData?.[0]) categoryId = catData[0].id;

              const { error: ie } = await supabase.from('products').insert({
                name: product.name, slug, brand: product.brand || null,
                price: product.price, category_id: categoryId,
                protocol: product.protocol || null, description: product.description || null,
                stock: 10, featured: false,
              });

              allResults.push({
                name: product.name,
                status: ie ? 'failed' : 'added',
                category: cat,
              });
            }
          }

          await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
          allResults.push({ category: cat, status: 'error', error: String(err) });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results: allResults }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: discover-products, update-prices, full-sync' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Market sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
