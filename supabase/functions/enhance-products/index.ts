import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  brand: string | null;
  protocol: string | null;
}

const cleanProductName = (name: string): string => {
  return name
    .replace(/&amp;/g, '&')
    .replace(/–.*$/g, '')
    .replace(/\|.*$/g, '')
    .replace(/Egypt.*$/i, '')
    .replace(/Mastery IT.*$/i, '')
    .replace(/TechNex Store.*$/i, '')
    .trim();
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Lovable API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, productId, batchSize = 5 } = await req.json();

    if (action === 'find-missing-images') {
      // Get products without images OR with broken external URLs
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, brand, image_url')
        .or('image_url.is.null,image_url.eq.')
        .limit(batchSize);

      if (error) throw error;

      const results = [];

      for (const product of products || []) {
        try {
          const cleanName = cleanProductName(product.name);
          console.log(`Searching for image: ${cleanName}`);

          // Use Lovable AI (Gemini) to find product image URL
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
                  content: `You are a product image URL finder. Return ONLY a valid, direct image URL for the product from the manufacturer's website or major retailers (Amazon, AliExpress, brand official sites).

Rules:
- Return ONLY the URL, nothing else - no explanation, no markdown, no text
- The URL must be a direct link to an image file (ending in .jpg, .jpeg, .png, .webp) or from a CDN like images-na.ssl-images-amazon.com, m.media-amazon.com, ae01.alicdn.com, etc.
- Prefer high-resolution product images on white backgrounds
- If you cannot find a valid image URL, respond with exactly: NO_IMAGE
- Do not return placeholder images, broken links, or SVG icons`
                },
                {
                  role: 'user',
                  content: `Find the official product image URL for: "${cleanName}"${product.brand ? ` by ${product.brand}` : ''}`
                }
              ],
            }),
          });

          if (response.ok) {
            const data = await response.json();
            let imageUrl = data.choices?.[0]?.message?.content?.trim() || '';
            console.log(`Raw response: ${imageUrl}`);

            // Extract URL if embedded in text
            const urlMatch = imageUrl.match(/https?:\/\/[^\s"'<>\)]+\.(jpg|jpeg|png|webp|gif)/i);
            if (urlMatch) {
              imageUrl = urlMatch[0];
            }

            const isValidUrl = imageUrl &&
              !imageUrl.includes('NO_IMAGE') &&
              imageUrl.startsWith('http') &&
              (imageUrl.match(/\.(jpg|jpeg|png|webp|gif)/i) ||
                imageUrl.includes('/images/') ||
                imageUrl.includes('/img/') ||
                imageUrl.includes('cdn') ||
                imageUrl.includes('ssl-images-amazon') ||
                imageUrl.includes('m.media-amazon') ||
                imageUrl.includes('alicdn'));

            if (isValidUrl) {
              // Download and store internally
              try {
                const imgResp = await fetch(imageUrl, { redirect: 'follow' });
                if (imgResp.ok) {
                  const contentType = imgResp.headers.get('content-type');
                  if (contentType?.startsWith('image/')) {
                    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
                    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
                    const path = `products/${product.id}/${slug}.${ext}`;
                    const bytes = new Uint8Array(await imgResp.arrayBuffer());

                    const { error: uploadError } = await supabase.storage
                      .from('product-images')
                      .upload(path, bytes, { upsert: true, contentType, cacheControl: '31536000' });

                    if (!uploadError) {
                      const { data: publicUrlData } = supabase.storage
                        .from('product-images')
                        .getPublicUrl(path);

                      await supabase
                        .from('products')
                        .update({ image_url: publicUrlData.publicUrl })
                        .eq('id', product.id);

                      results.push({
                        id: product.id,
                        name: product.name,
                        status: 'updated_internal',
                        image_url: publicUrlData.publicUrl
                      });
                      console.log(`Stored internally: ${product.name}`);
                    } else {
                      // Fallback: save external URL
                      await supabase
                        .from('products')
                        .update({ image_url: imageUrl })
                        .eq('id', product.id);
                      results.push({ id: product.id, name: product.name, status: 'updated_external', image_url: imageUrl });
                    }
                  } else {
                    // Image URL returned non-image content, save URL anyway
                    await supabase
                      .from('products')
                      .update({ image_url: imageUrl })
                      .eq('id', product.id);
                    results.push({ id: product.id, name: product.name, status: 'updated_external', image_url: imageUrl });
                  }
                } else {
                  // Could not download, save URL anyway
                  await supabase
                    .from('products')
                    .update({ image_url: imageUrl })
                    .eq('id', product.id);
                  results.push({ id: product.id, name: product.name, status: 'updated_external', image_url: imageUrl });
                }
              } catch (dlError) {
                // Download failed, save URL
                await supabase
                  .from('products')
                  .update({ image_url: imageUrl })
                  .eq('id', product.id);
                results.push({ id: product.id, name: product.name, status: 'updated_external', image_url: imageUrl });
              }
            } else {
              results.push({
                id: product.id,
                name: product.name,
                status: 'no_image_found',
                response: imageUrl.substring(0, 200)
              });
            }
          } else {
            const errorText = await response.text();
            console.error(`AI error for ${product.name}:`, errorText);
            results.push({ id: product.id, name: product.name, status: 'search_failed', error: errorText.substring(0, 200) });
          }

          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (err) {
          console.error(`Error processing ${product.name}:`, err);
          results.push({ id: product.id, name: product.name, status: 'error', error: String(err) });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'fix-broken-images') {
      // Find products with broken external URLs (baytzaki.com wp-content) and clear them so find-missing-images can re-process
      const { data: brokenProducts, error } = await supabase
        .from('products')
        .select('id, name, image_url')
        .like('image_url', '%baytzaki.com/wp-content%')
        .limit(batchSize);

      if (error) throw error;

      let cleared = 0;
      for (const product of brokenProducts || []) {
        await supabase
          .from('products')
          .update({ image_url: null })
          .eq('id', product.id);
        cleared++;
      }

      return new Response(
        JSON.stringify({ success: true, cleared, total: brokenProducts?.length || 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'generate-descriptions') {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, brand, description, protocol')
        .limit(batchSize);

      if (error) throw error;

      const results = [];

      for (const product of products || []) {
        try {
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
                  content: 'You are a smart home product copywriter for an Egyptian smart home store. Write compelling, professional product descriptions in English. Keep descriptions between 30-60 words. Focus on key benefits, smart home integration capabilities, and practical use cases.'
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
              await supabase.from('products').update({ description: newDescription }).eq('id', product.id);
              results.push({ id: product.id, name: product.name, status: 'updated', description: newDescription });
            } else {
              results.push({ id: product.id, name: product.name, status: 'generation_failed' });
            }
          } else {
            results.push({ id: product.id, name: product.name, status: 'api_error' });
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          results.push({ id: product.id, name: product.name, status: 'error', error: String(err) });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action. Use: find-missing-images, fix-broken-images, generate-descriptions' }),
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
