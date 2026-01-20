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
      
      // Clean product name for better search
      const cleanProductName = (name: string): string => {
        return name
          .replace(/–.*$/g, '') // Remove text after em dash
          .replace(/\|.*$/g, '') // Remove text after pipe
          .replace(/Egypt.*$/i, '') // Remove Egypt mentions
          .replace(/Mastery IT.*$/i, '') // Remove store name
          .trim();
      };

      for (const product of products || []) {
        try {
          const cleanName = cleanProductName(product.name);
          console.log(`Searching for image: ${cleanName}`);
          
          // Use Perplexity to search for product and get image URL
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
                  content: `You are a product image URL finder. Search the web for the exact product and return ONLY a valid, direct image URL from the manufacturer's website or a major retailer like Amazon, AliExpress, or the brand's official site. 

Rules:
- Return ONLY the URL, nothing else - no explanation, no text
- The URL must be a direct link to an image file (containing .jpg, .jpeg, .png, .webp, or from a CDN)
- Prefer images from official brand websites or Amazon product listings
- If you cannot find a valid image URL, respond with exactly: NO_IMAGE
- Do not return placeholder images or broken links` 
                },
                { 
                  role: 'user', 
                  content: `Find the official product image URL for: "${cleanName}"${product.brand ? ` by ${product.brand}` : ''}` 
                }
              ],
            }),
          });

          console.log(`Perplexity response status: ${perplexityResponse.status}`);

          if (perplexityResponse.ok) {
            const data = await perplexityResponse.json();
            let imageUrl = data.choices?.[0]?.message?.content?.trim() || '';
            console.log(`Raw response: ${imageUrl}`);
            
            // Extract URL if embedded in text
            const urlMatch = imageUrl.match(/https?:\/\/[^\s"'<>\)]+\.(jpg|jpeg|png|webp|gif)/i);
            if (urlMatch) {
              imageUrl = urlMatch[0];
            }
            
            // Validate the URL
            const isValidUrl = imageUrl && 
              !imageUrl.includes('NO_IMAGE') &&
              imageUrl.startsWith('http') &&
              (imageUrl.match(/\.(jpg|jpeg|png|webp|gif)/i) ||
               imageUrl.includes('/images/') ||
               imageUrl.includes('/img/') ||
               imageUrl.includes('cdn'));
            
            if (isValidUrl) {
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
              console.log(`Updated ${product.name} with image: ${imageUrl}`);
            } else {
              results.push({ 
                id: product.id, 
                name: product.name, 
                status: 'no_image_found',
                response: imageUrl.substring(0, 200)
              });
              console.log(`No valid image found for ${product.name}`);
            }
          } else {
            const errorText = await perplexityResponse.text();
            console.error(`Perplexity error for ${product.name}:`, errorText);
            results.push({ 
              id: product.id, 
              name: product.name, 
              status: 'search_failed',
              error: errorText.substring(0, 200)
            });
          }
          
          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 1500));
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
