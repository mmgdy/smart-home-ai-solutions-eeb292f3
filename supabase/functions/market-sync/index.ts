import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY') ?? '';

const callAI = async (systemPrompt: string, userPrompt: string): Promise<string> => {
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    if (res.status === 429) throw new Error('RATE_LIMITED: Lovable AI rate limit reached');
    if (res.status === 402) throw new Error('PAYMENT_REQUIRED: Add credits in Settings → Workspace → Usage');
    throw new Error(`AI error (${res.status}): ${raw.slice(0, 300)}`);
  }

  const parsed = JSON.parse(raw);
  return (parsed?.choices?.[0]?.message?.content ?? '').trim();
};

const SYSTEM = 'You are a product research assistant for the Egyptian smart home market. Always return valid JSON arrays. Prices must be in Egyptian Pounds (EGP) and reflect realistic current market prices from Amazon.eg, Noon.com, or Jumia.com.eg. Use your knowledge of brand pricing tiers to estimate when exact prices are unknown, but never inflate beyond reasonable market range.';

const parseProductsFromResponse = (text: string): Array<{
  name: string; brand: string; price: number; category: string;
  protocol: string; description: string; source_url?: string;
}> => {
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) return parsed.filter(p => p.name && p.price && p.price > 50);
    }
  } catch {}
  return [];
};

const CATEGORIES = [
  'Smart Lighting', 'Smart Switches & Plugs', 'Smart Sensors',
  'Smart Cameras & Security', 'Smart Hubs & Controllers', 'Smart Locks',
  'Smart Thermostats & Climate', 'Smart Speakers & Audio', 'Networking & WiFi',
];

const BRANDS = [
  'SONOFF', 'MOES', 'TP-Link', 'Tuya', 'Xiaomi', 'Aqara', 'Philips Hue',
  'Ring', 'FIBARO', 'Shelly', 'SwitchBot', 'Lezn', 'Akubela', 'HELTUN',
  'MCOHome', 'Heiman', 'Danalock',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action = 'discover-products', category, batchSize = 8 } = await req.json().catch(() => ({}));

    if (action === 'discover-products') {
      const targetCategory = category || CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const prompt = `Find ${batchSize} smart home products in the category "${targetCategory}" sold in Egypt.
Focus on brands: ${BRANDS.join(', ')}.
Return ONLY a JSON array with: name, brand, price (EGP integer), category ("${targetCategory}"), protocol, description.
Return ONLY the JSON array.`;
      const aiResponse = await callAI(SYSTEM, prompt);
      const discoveredProducts = parseProductsFromResponse(aiResponse);
      const results: any[] = [];

      for (const product of discoveredProducts) {
        try {
          const slug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
          const { data: existing } = await supabase
            .from('products').select('id, price, name')
            .or(`slug.eq.${slug},name.ilike.%${product.name.slice(0, 30)}%`).limit(1);

          if (existing && existing.length > 0) {
            const current = existing[0];
            if (product.price > 0 && Math.abs(current.price - product.price) > 50) {
              const pctDiff = (Math.abs(current.price - product.price) / current.price) * 100;
              if (pctDiff > 10 && pctDiff < 200) {
                await supabase.from('products').update({
                  original_price: current.price, price: product.price,
                  updated_at: new Date().toISOString(),
                }).eq('id', current.id);
                results.push({ name: current.name, status: 'price_updated', oldPrice: current.price, newPrice: product.price });
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
              const { data: catData } = await supabase.from('categories').select('id').eq('slug', catSlug).limit(1);
              if (catData?.[0]) categoryId = catData[0].id;
            }
            const { error: insertError } = await supabase.from('products').insert({
              name: product.name, slug, brand: product.brand || null, price: product.price,
              category_id: categoryId, protocol: product.protocol || null,
              description: product.description || null, stock: 10, featured: false,
            });
            results.push({
              name: product.name, status: insertError ? 'insert_failed' : 'new_product_added',
              price: product.price, brand: product.brand,
              ...(insertError ? { error: insertError.message } : {}),
            });
          }
          await new Promise(r => setTimeout(r, 100));
        } catch (err) {
          results.push({ name: product.name, status: 'error', error: String(err) });
        }
      }

      return new Response(JSON.stringify({ success: true, category: targetCategory, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'update-prices') {
      const { data: products, error } = await supabase
        .from('products').select('id, name, brand, price')
        .not('brand', 'is', null).order('updated_at', { ascending: true }).limit(batchSize);
      if (error) throw error;
      const results: any[] = [];
      const productNames = (products || []).map(p => `"${p.name}" by ${p.brand}`).join('\n');

      if (!productNames) {
        return new Response(JSON.stringify({ success: true, results: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
          const found = priceData.find(p =>
            p.name && product.name.toLowerCase().includes(p.name.toLowerCase().slice(0, 20)));
          const newPrice = found?.price ? parseInt(String(found.price).replace(/[^\d]/g, '')) : 0;

          if (newPrice > 50 && newPrice < 500000) {
            const pctDiff = (Math.abs(product.price - newPrice) / product.price) * 100;
            if (pctDiff > 10 && pctDiff < 200) {
              await supabase.from('products').update({
                original_price: product.price, price: newPrice,
                updated_at: new Date().toISOString(),
              }).eq('id', product.id);
              results.push({ name: product.name, status: 'updated', oldPrice: product.price, newPrice });
            } else {
              results.push({ name: product.name, status: 'price_unchanged', currentPrice: product.price });
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

      return new Response(JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'full-sync') {
      const allResults: any[] = [];
      for (const cat of CATEGORIES) {
        try {
          const prompt = `Find 3-4 smart home products in Egypt in the "${cat}" category.
Return a JSON array with: name, brand, price (EGP integer), category ("${cat}"), protocol, description. JSON array only.`;
          const aiResp = await callAI(SYSTEM, prompt);
          const products = parseProductsFromResponse(aiResp);

          for (const product of products) {
            const slug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
            const { data: existing } = await supabase.from('products').select('id, price')
              .or(`slug.eq.${slug},name.ilike.%${product.name.slice(0, 25)}%`).limit(1);

            if (existing && existing.length > 0) {
              const pctDiff = product.price > 0 ? (Math.abs(existing[0].price - product.price) / existing[0].price) * 100 : 0;
              if (pctDiff > 10 && pctDiff < 200) {
                await supabase.from('products').update({
                  original_price: existing[0].price, price: product.price,
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
                name: product.name, slug, brand: product.brand || null, price: product.price,
                category_id: categoryId, protocol: product.protocol || null,
                description: product.description || null, stock: 10, featured: false,
              });
              allResults.push({ name: product.name, status: ie ? 'failed' : 'added', category: cat, price: product.price });
            }
          }
          await new Promise(r => setTimeout(r, 800));
        } catch (err) {
          allResults.push({ category: cat, status: 'error', error: String(err) });
        }
      }
      return new Response(JSON.stringify({ success: true, results: allResults }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Market sync error:', error);
    const msg = String(error);
    return new Response(JSON.stringify({
      success: false, fallback: true,
      error: msg.includes('RATE_LIMITED') ? 'RATE_LIMITED' :
             msg.includes('PAYMENT_REQUIRED') ? 'PAYMENT_REQUIRED' :
             msg.includes('LOVABLE_API_KEY not configured') ? 'API_KEY_MISSING' : 'SERVICE_UNAVAILABLE',
      message: msg.slice(0, 300), results: [],
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
