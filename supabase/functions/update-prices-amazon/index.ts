const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PriceResult {
  productId: string;
  productName: string;
  currentPrice: number;
  amazonPrice: number | null;
  source: string | null;
  status: 'updated' | 'no_price_found' | 'error';
  message?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batchSize = 5, brands = [] } = await req.json();

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Perplexity API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch products to update
    let query = supabase
      .from('products')
      .select('id, name, brand, price, slug')
      .order('updated_at', { ascending: true })
      .limit(batchSize);

    // Filter by brands if specified
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
        // Clean product name for search
        const searchName = product.name
          .replace(/[-–|]/g, ' ')
          .replace(/Egypt|Mastery IT|TechNex Store|Baytzaki/gi, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 100);

        console.log(`Searching Amazon Egypt price for: ${searchName}`);

        // Use Perplexity to search for Amazon Egypt price
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${perplexityApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [
              {
                role: 'system',
                content: `You are a price research assistant. Search for product prices on Amazon Egypt (amazon.eg) or other Egyptian retailers. 
                
                Return ONLY a JSON object with this exact format:
                {
                  "price": <number in EGP or null if not found>,
                  "source": "<website URL where price was found or null>",
                  "confidence": "<high|medium|low>"
                }
                
                If you cannot find the exact product, return null for price.
                Do NOT include any other text, only the JSON.`
              },
              {
                role: 'user',
                content: `Find the current price in Egyptian Pounds (EGP) for this product on Amazon Egypt or Egyptian retailers:
                
                Product: ${searchName}
                Brand: ${product.brand || 'Unknown'}
                
                Search specifically on amazon.eg, noon.com/egypt, or jumia.com.eg`
              }
            ],
            search_domain_filter: ['amazon.eg', 'noon.com', 'jumia.com.eg', 'egypt.souq.com'],
            temperature: 0.1,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Perplexity API error:', response.status, errorText);
          results.push({
            productId: product.id,
            productName: product.name,
            currentPrice: product.price,
            amazonPrice: null,
            source: null,
            status: 'error',
            message: `API error: ${response.status}`,
          });
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        console.log('Perplexity response:', content);

        // Parse the JSON response
        let priceData: { price: number | null; source: string | null; confidence: string } | null = null;
        try {
          // Extract JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            priceData = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
        }

        if (priceData?.price && priceData.price > 0) {
          // Update the product price
          const { error: updateError } = await supabase
            .from('products')
            .update({ 
              price: priceData.price,
              updated_at: new Date().toISOString(),
            })
            .eq('id', product.id);

          if (updateError) {
            console.error('Update error:', updateError);
            results.push({
              productId: product.id,
              productName: product.name,
              currentPrice: product.price,
              amazonPrice: priceData.price,
              source: priceData.source,
              status: 'error',
              message: `Update failed: ${updateError.message}`,
            });
          } else {
            results.push({
              productId: product.id,
              productName: product.name,
              currentPrice: product.price,
              amazonPrice: priceData.price,
              source: priceData.source,
              status: 'updated',
            });
          }
        } else {
          // Mark as checked but no price found
          await supabase
            .from('products')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', product.id);

          results.push({
            productId: product.id,
            productName: product.name,
            currentPrice: product.price,
            amazonPrice: null,
            source: null,
            status: 'no_price_found',
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (productError) {
        console.error(`Error processing ${product.name}:`, productError);
        results.push({
          productId: product.id,
          productName: product.name,
          currentPrice: product.price,
          amazonPrice: null,
          source: null,
          status: 'error',
          message: String(productError),
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
