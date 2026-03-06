import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY') ?? '';

const callPerplexity = async (prompt: string): Promise<string> => {
  if (!PERPLEXITY_API_KEY) throw new Error('PERPLEXITY_API_KEY not configured');

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [
        {
          role: 'system',
          content: 'You are a product research assistant for the Egyptian smart home market. Always return valid JSON arrays. Prices must be in Egyptian Pounds (EGP) and reflect real current market prices from Amazon.eg, Noon.com, or Jumia.com.eg. Do NOT make up prices - only include products you can find real pricing for.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.1,
    }),
  });

  const raw = await res.text();
  if (!res.ok) throw new Error(`Perplexity error (${res.status}): ${raw.slice(0, 300)}`);

  const parsed = JSON.parse(raw);
  return (parsed?.choices?.[0]?.message?.content ?? '').trim();
};

const parseProductsFromResponse = (text: string): Array<{
  name: string;
  brand: string;
  price: number;
  category: string;
  protocol: string;
  description: string;
  source_url?: string;
}> => {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.filter(p => p.name && p.price && p.price > 50);
      }
    }
  } catch {}

  // Fallback line parsing
  const products: any[] = [];
  const lines = text.split('\n').filter(l => l.trim());
  for (const line of lines) {
    const nameMatch = line.match(/(?:name|product)[:\s]*["']?([^"'\n,]+)/i);
    const priceMatch = line.match(/(?:price|egp)[:\s]*[\d,]+/i);
    const brandMatch = line.match(/(?:brand)[:\s]*["']?([^"'\n,]+)/i);
    if (nameMatch && priceMatch) {
      const priceNum = parseInt(priceMatch[0].replace(/[^\d]/g, ''));
      if (priceNum > 50 && priceNum < 500000) {
        products.push({
          name: nameMatch[1].trim(),
          brand: brandMatch?.[1]?.trim() || 'Unknown',
          price: priceNum,
          category: '', protocol: '', description: '',
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

const BRANDS = [
  'SONOFF', 'MOES', 'TP-Link', 'Tuya', 'Xiaomi', 'Aqara', 'Philips Hue',
  'Ring', 'FIBARO', 'Shelly', 'SwitchBot', 'Lezn', 'Akubela', 'HELTUN',
  'MCOHome', 'Heiman', 'Danalock',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action = 'discover-products', category, batchSize = 8 } = await req.json().catch(() => ({}));

    if (action === 'discover-products') {
      const targetCategory = category || CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

      const prompt = `Search Amazon.eg, Noon.com, and Jumia.com.eg for smart home products in the category "${targetCategory}" available in Egypt RIGHT NOW.

Find ${batchSize} real products with their ACTUAL current prices in Egyptian Pounds (EGP).

Focus on brands: ${BRANDS.join(', ')}.

Return ONLY a JSON array with objects containing:
- name: exact product name as listed on the store
- brand: manufacturer brand
- price: actual price in EGP (integer, no decimals)
- category: "${targetCategory}"
- protocol: connectivity (WiFi, Zigbee, Z-Wave, Bluetooth, etc.)
- description: 1-2 sentence feature description
- source_url: URL where the product is listed (if available)

IMPORTANT: Only include products with VERIFIED real prices from Egyptian stores. Do NOT estimate or guess prices.
Return ONLY the JSON array, nothing else.`;

      const aiResponse = await callPerplexity(prompt);
      console.log('Perplexity discover response:', aiResponse.slice(0, 500));

      const discoveredProducts = parseProductsFromResponse(aiResponse);
      const results: any[] = [];

      for (const product of discoveredProducts) {
        try {
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
            const current = existing[0];
            if (product.price > 0 && Math.abs(current.price - product.price) > 50) {
              const pctDiff = (Math.abs(current.price - product.price) / current.price) * 100;
              // Only update if price changed by more than 10% to avoid AI noise
              if (pctDiff > 10 && pctDiff < 200) {
                await supabase.from('products').update({
                  original_price: current.price,
                  price: product.price,
                  updated_at: new Date().toISOString(),
                }).eq('id', current.id);

                results.push({
                  name: current.name, status: 'price_updated',
                  oldPrice: current.price, newPrice: product.price,
                });
              } else {
                results.push({ name: current.name, status: 'already_exists', price: current.price });
              }
            } else {
              results.push({ name: current.name, status: 'already_exists', price: current.price });
            }
          } else {
            let categoryId = null;
            if (product.category) {
              const catSlug = product.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
              const { data: catData } = await supabase
                .from('categories').select('id').eq('slug', catSlug).limit(1);
              if (catData?.[0]) categoryId = catData[0].id;
            }

            const { error: insertError } = await supabase.from('products').insert({
              name: product.name, slug,
              brand: product.brand || null,
              price: product.price,
              category_id: categoryId,
              protocol: product.protocol || null,
              description: product.description || null,
              stock: 10, featured: false,
            });

            results.push({
              name: product.name,
              status: insertError ? 'insert_failed' : 'new_product_added',
              price: product.price, brand: product.brand,
              ...(insertError ? { error: insertError.message } : {}),
            });
          }

          await new Promise(r => setTimeout(r, 200));
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
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, brand, price')
        .not('brand', 'is', null)
        .order('updated_at', { ascending: true })
        .limit(batchSize);

      if (error) throw error;
      const results: any[] = [];

      // Batch products into one Perplexity query for efficiency
      const productNames = (products || []).map(p => `"${p.name}" by ${p.brand}`).join('\n');

      if (!productNames) {
        return new Response(
          JSON.stringify({ success: true, results: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const prompt = `Search Amazon.eg, Noon.com, and Jumia.com.eg for the current prices in Egyptian Pounds (EGP) of these smart home products:

${productNames}

Return a JSON array with objects: { "name": "product name", "price": 1234 }
Only include products where you found a VERIFIED real price. Use 0 for products you cannot find.
Return ONLY the JSON array.`;

      try {
        const priceResponse = await callPerplexity(prompt);
        console.log('Perplexity price response:', priceResponse.slice(0, 500));

        let priceData: any[] = [];
        try {
          const jsonMatch = priceResponse.match(/\[[\s\S]*\]/);
          if (jsonMatch) priceData = JSON.parse(jsonMatch[0]);
        } catch {}

        for (const product of products || []) {
          const found = priceData.find(p =>
            p.name && product.name.toLowerCase().includes(p.name.toLowerCase().slice(0, 20))
          );

          const newPrice = found?.price ? parseInt(String(found.price).replace(/[^\d]/g, '')) : 0;

          if (newPrice > 50 && newPrice < 500000) {
            const pctDiff = (Math.abs(product.price - newPrice) / product.price) * 100;

            // Only update if price changed 10-200% (avoid hallucinated outliers)
            if (pctDiff > 10 && pctDiff < 200) {
              await supabase.from('products').update({
                original_price: product.price,
                price: newPrice,
                updated_at: new Date().toISOString(),
              }).eq('id', product.id);

              results.push({
                name: product.name, status: 'updated',
                oldPrice: product.price, newPrice,
              });
            } else {
              results.push({
                name: product.name, status: 'price_unchanged',
                currentPrice: product.price,
              });
            }
          } else {
            results.push({ name: product.name, status: 'no_price_found' });
          }
        }
      } catch (err) {
        for (const product of products || []) {
          results.push({ name: product.name, status: 'error', error: String(err) });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'full-sync') {
      const allResults: any[] = [];

      for (const cat of CATEGORIES) {
        try {
          const prompt = `Search Amazon.eg, Noon.com, and Jumia.com.eg for 3-4 smart home products currently sold in Egypt in the "${cat}" category.

Return a JSON array with: name, brand, price (in EGP, integer), category ("${cat}"), protocol, description.
Only REAL products with VERIFIED Egyptian prices. JSON array only.`;

          const aiResp = await callPerplexity(prompt);
          const products = parseProductsFromResponse(aiResp);

          for (const product of products) {
            const slug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

            const { data: existing } = await supabase
              .from('products').select('id, price')
              .or(`slug.eq.${slug},name.ilike.%${product.name.slice(0, 25)}%`)
              .limit(1);

            if (existing && existing.length > 0) {
              const pctDiff = product.price > 0 ? (Math.abs(existing[0].price - product.price) / existing[0].price) * 100 : 0;
              if (pctDiff > 10 && pctDiff < 200) {
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
                name: product.name, status: ie ? 'failed' : 'added',
                category: cat, price: product.price,
              });
            }
          }

          // Rate limit between categories
          await new Promise(r => setTimeout(r, 1500));
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
