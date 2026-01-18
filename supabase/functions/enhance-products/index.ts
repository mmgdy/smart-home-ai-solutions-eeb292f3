import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  brand: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!perplexityApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Perplexity API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Lovable API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, productId, batchSize = 5 } = await req.json();

    if (action === 'find-missing-images') {
      // Get products without images
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, brand, image_url')
        .or('image_url.is.null,image_url.eq.')
        .limit(batchSize);

      if (error) throw error;

      const results = [];
      
      for (const product of products || []) {
        try {
          // Search for product image using Perplexity
          const searchQuery = `${product.name} ${product.brand || ''} product image official`;
          
          const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
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
                  content: 'You are a product image finder. When asked about a product, respond ONLY with a direct image URL from the official manufacturer or a reputable retailer. The URL must end with an image extension (.jpg, .png, .webp) or be from a known image CDN. If you cannot find a reliable image URL, respond with "NO_IMAGE_FOUND".' 
                },
                { 
                  role: 'user', 
                  content: `Find the official product image URL for: ${product.name}${product.brand ? ` by ${product.brand}` : ''}. Return only the direct image URL, nothing else.` 
                }
              ],
            }),
          });

          if (perplexityResponse.ok) {
            const data = await perplexityResponse.json();
            const imageUrl = data.choices?.[0]?.message?.content?.trim();
            
            if (imageUrl && imageUrl !== 'NO_IMAGE_FOUND' && (
              imageUrl.includes('.jpg') || 
              imageUrl.includes('.png') || 
              imageUrl.includes('.webp') ||
              imageUrl.includes('cdn') ||
              imageUrl.startsWith('http')
            )) {
              // Update product with found image
              await supabase
                .from('products')
                .update({ image_url: imageUrl })
                .eq('id', product.id);
              
              results.push({ 
                id: product.id, 
                name: product.name, 
                status: 'updated', 
                image_url: imageUrl 
              });
            } else {
              results.push({ 
                id: product.id, 
                name: product.name, 
                status: 'no_image_found' 
              });
            }
          } else {
            results.push({ 
              id: product.id, 
              name: product.name, 
              status: 'search_failed' 
            });
          }
          
          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          console.error(`Error processing ${product.name}:`, err);
          results.push({ 
            id: product.id, 
            name: product.name, 
            status: 'error',
            error: String(err)
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'generate-descriptions') {
      // Get products with poor descriptions
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, brand, description, protocol')
        .limit(batchSize);

      if (error) throw error;

      const results = [];
      
      for (const product of products || []) {
        try {
          // Generate better description using Lovable AI
          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { 
                  role: 'system', 
                  content: 'You are a smart home product copywriter for an Egyptian smart home store. Write compelling, professional product descriptions in English. Keep descriptions between 30-60 words. Focus on key benefits, smart home integration capabilities, and practical use cases. Do not use marketing fluff or excessive adjectives.' 
                },
                { 
                  role: 'user', 
                  content: `Write a product description for: ${product.name}${product.brand ? ` by ${product.brand}` : ''}${product.protocol ? `. Uses ${product.protocol} protocol` : ''}.` 
                }
              ],
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const newDescription = data.choices?.[0]?.message?.content?.trim();
            
            if (newDescription && newDescription.length > 20) {
              await supabase
                .from('products')
                .update({ description: newDescription })
                .eq('id', product.id);
              
              results.push({ 
                id: product.id, 
                name: product.name, 
                status: 'updated',
                description: newDescription
              });
            } else {
              results.push({ 
                id: product.id, 
                name: product.name, 
                status: 'generation_failed' 
              });
            }
          } else {
            const errorText = await response.text();
            console.error('AI generation error:', errorText);
            results.push({ 
              id: product.id, 
              name: product.name, 
              status: 'api_error' 
            });
          }
          
          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`Error processing ${product.name}:`, err);
          results.push({ 
            id: product.id, 
            name: product.name, 
            status: 'error',
            error: String(err)
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
