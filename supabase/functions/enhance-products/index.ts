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

const HUGGING_FACE_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';
const HUGGING_FACE_URL = 'https://router.huggingface.co/v1/chat/completions';
const HUGGING_FACE_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY') ?? '';

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

const extractHuggingFaceText = (payload: any): string => {
  if (typeof payload?.choices?.[0]?.message?.content === 'string') {
    return payload.choices[0].message.content;
  }

  if (typeof payload?.error === 'string') {
    throw new Error(payload.error);
  }

  return '';
};

const generateWithHuggingFace = async (prompt: string, maxTokens = 220): Promise<string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (HUGGING_FACE_API_KEY) {
    headers.Authorization = `Bearer ${HUGGING_FACE_API_KEY}`;
  }

  const response = await fetch(HUGGING_FACE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: HUGGING_FACE_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.2,
      stream: false,
    }),
  });

  const rawText = await response.text();
  let parsed: any = null;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    if (!response.ok) {
      throw new Error(`Hugging Face error (${response.status}): ${rawText.slice(0, 300)}`);
    }
  }

  if (!response.ok) {
    const details = typeof parsed?.error === 'string' ? parsed.error : rawText;
    const tokenHint = response.status === 401 ? ' Add HUGGINGFACE_API_KEY secret to use Hugging Face router.' : '';
    throw new Error(`Hugging Face error (${response.status}): ${String(details).slice(0, 300)}.${tokenHint}`);
  }

  return extractHuggingFaceText(parsed).trim();
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

          const imagePrompt = `You are a product image URL finder. Return ONLY a direct image URL or exactly NO_IMAGE.

Rules:
- Return only one URL or NO_IMAGE
- URL must be direct image file (.jpg, .jpeg, .png, .webp, .gif)
- Prefer manufacturer or large retailer CDNs
- Never add markdown or explanations

Product: ${cleanName}${product.brand ? ` | Brand: ${product.brand}` : ''}`;

          let imageUrl = await generateWithHuggingFace(imagePrompt, 180);
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
          const descriptionPrompt = `Write a compelling smart-home ecommerce description in English (30-60 words).

Product: ${product.name}${product.brand ? ` | Brand: ${product.brand}` : ''}${product.protocol ? ` | Protocol: ${product.protocol}` : ''}

Focus on practical value, compatibility, and user benefit. Return plain text only.`;

          const newDescription = await generateWithHuggingFace(descriptionPrompt, 140);

          if (newDescription && newDescription.length > 20) {
            await supabase.from('products').update({ description: newDescription }).eq('id', product.id);
            results.push({ id: product.id, name: product.name, status: 'updated', description: newDescription });
          } else {
            results.push({ id: product.id, name: product.name, status: 'generation_failed' });
          }
          await new Promise(resolve => setTimeout(resolve, 700));
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
