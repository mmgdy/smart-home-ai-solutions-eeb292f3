import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  images?: string[] | null;
  brand: string | null;
  protocol: string | null;
}

const HUGGING_FACE_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';
const HUGGING_FACE_URL = 'https://router.huggingface.co/v1/chat/completions';
const HUGGING_FACE_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY') ?? '';
const PRODUCT_IMAGES_BUCKET = 'product-images';
const INTERNAL_IMAGE_MARKER = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;
const SEARCH_USER_AGENT = 'Mozilla/5.0 (compatible; BaytzakiImageBot/1.0; +https://baytzaki.com)';
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

const toAbsoluteUrl = (value: string, baseUrl: string): string | null => {
  if (!value || value.startsWith('data:') || value.startsWith('blob:')) return null;

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
};

const cleanImages = (...values: Array<string | string[] | null | undefined>) => {
  return Array.from(
    new Set(
      values
        .flatMap((value) => Array.isArray(value) ? value : value ? [value] : [])
        .filter((value) => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => /^https?:\/\//i.test(value))
        .filter((value) => !/logo|icon|avatar|favicon|sprite/i.test(value))
    )
  );
};

const getExtensionFromContentType = (contentType: string | null) => {
  if (!contentType) return 'jpg';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('svg')) return 'svg';
  return 'jpg';
};

const getExtensionFromUrl = (url: string) => {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  if (!match) return null;
  const ext = match[1].toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext) ? ext : null;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 64) || 'product';

const decodeDuckDuckGoUrl = (rawUrl: string) => {
  try {
    const parsed = new URL(rawUrl, 'https://duckduckgo.com');
    const uddg = parsed.searchParams.get('uddg');
    return uddg ? decodeURIComponent(uddg) : parsed.toString();
  } catch {
    const match = rawUrl.match(/uddg=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : rawUrl;
  }
};

const fetchText = async (url: string) => {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': BROWSER_UA,
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Fetch failed (${response.status})`);
  }

  return response.text();
};

const extractJsonImages = (value: any, bucket: string[] = []) => {
  if (!value) return bucket;

  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) bucket.push(value);
    return bucket;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => extractJsonImages(entry, bucket));
    return bucket;
  }

  if (typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (['image', 'contentUrl', 'thumbnailUrl', 'url'].includes(key)) {
        extractJsonImages(entry, bucket);
      } else if (typeof entry === 'object') {
        extractJsonImages(entry, bucket);
      }
    }
  }

  return bucket;
};

const extractImagesFromHtml = (html: string, baseUrl: string) => {
  const metaImages = [
    ...Array.from(html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|og:image:url)["'][^>]+content=["']([^"']+)["']/gi)).map((m) => m[1]),
    ...Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)).map((m) => m[1]),
    ...Array.from(html.matchAll(/<img[^>]+srcset=["']([^"']+)["']/gi)).flatMap((m) => m[1].split(',').map((part) => part.trim().split(/\s+/)[0])),
  ]
    .map((value) => toAbsoluteUrl(value, baseUrl))
    .filter((value): value is string => Boolean(value));

  const jsonLdImages = Array.from(
    html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  ).flatMap((match) => {
    try {
      return extractJsonImages(JSON.parse(match[1]));
    } catch {
      return [];
    }
  });

  return cleanImages(metaImages, jsonLdImages);
};

const searchDuckDuckGo = async (query: string): Promise<string[]> => {
  try {
    const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
    return Array.from(html.matchAll(/<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["']/gi))
      .map((match) => decodeDuckDuckGoUrl(match[1]))
      .filter((url) => /^https?:\/\//i.test(url));
  } catch (e) {
    console.warn('DuckDuckGo search failed:', e);
    return [];
  }
};

const searchBing = async (query: string): Promise<string[]> => {
  try {
    const html = await fetchText(`https://www.bing.com/search?q=${encodeURIComponent(query)}&count=15`);
    return Array.from(html.matchAll(/<a\s+href=["'](https?:\/\/[^"']+)["'][^>]*>/gi))
      .map((m) => m[1])
      .filter((url) => !/bing\.com|microsoft\.com|live\.com/i.test(url));
  } catch (e) {
    console.warn('Bing search failed:', e);
    return [];
  }
};

const searchBingImages = async (query: string): Promise<string[]> => {
  try {
    const html = await fetchText(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`);
    const direct: string[] = [];
    for (const match of html.matchAll(/murl&quot;:&quot;(https?:\/\/[^&"']+?)&quot;/gi)) {
      direct.push(match[1].replace(/&amp;/g, '&'));
    }
    for (const match of html.matchAll(/"murl":"(https?:\/\/[^"]+?)"/gi)) {
      direct.push(match[1]);
    }
    return direct;
  } catch (e) {
    console.warn('Bing images search failed:', e);
    return [];
  }
};

const searchProductPages = async (product: Product) => {
  const cleanName = cleanProductName(product.name);
  const query = `${product.brand ? `${product.brand} ` : ''}${cleanName} product`;

  const [ddg, bing] = await Promise.all([
    searchDuckDuckGo(query),
    searchBing(query),
  ]);

  const all = [...ddg, ...bing].filter((url) => /^https?:\/\//i.test(url));
  return Array.from(new Set(all)).slice(0, 6);
};

const scoreImageUrl = (url: string, product: Product) => {
  const normalizedUrl = url.toLowerCase();
  const terms = cleanProductName(product.name)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2)
    .slice(0, 8);

  let score = 0;

  if (/\.(jpg|jpeg|png|webp)(?:\?|#|$)/i.test(url)) score += 6;
  if (/cdn|media|product|products|catalog|uploads|images/i.test(normalizedUrl)) score += 4;
  if (/logo|icon|avatar|favicon|sprite|banner/i.test(normalizedUrl)) score -= 12;
  if (product.brand && normalizedUrl.includes(product.brand.toLowerCase())) score += 4;

  for (const term of terms) {
    if (normalizedUrl.includes(term)) score += 2;
  }

  return score;
};

const findImageCandidate = async (product: Product) => {
  const pages = await searchProductPages(product);
  const candidates: string[] = [];

  for (const pageUrl of pages) {
    try {
      const pageHtml = await fetchText(pageUrl);
      candidates.push(...extractImagesFromHtml(pageHtml, pageUrl));
      await delay(120);
    } catch (error) {
      console.warn(`Failed to inspect page ${pageUrl}:`, error);
    }
  }

  let best = Array.from(new Set(candidates))
    .map((url) => ({ url, score: scoreImageUrl(url, product) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.url ?? null;

  if (best) return best;

  // Fallback: Bing Images direct image URLs
  const cleanName = cleanProductName(product.name);
  const imgQuery = `${product.brand ? `${product.brand} ` : ''}${cleanName}`;
  const directImages = await searchBingImages(imgQuery);
  best = directImages
    .map((url) => ({ url, score: scoreImageUrl(url, product) + 3 }))
    .filter((entry) => /\.(jpg|jpeg|png|webp)/i.test(entry.url))
    .sort((a, b) => b.score - a.score)[0]?.url ?? directImages[0] ?? null;

  return best;
};

const touchProduct = async (supabase: ReturnType<typeof createClient>, productId: string, patch: Record<string, unknown> = {}) => {
  const { error } = await supabase
    .from('products')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', productId);

  if (error) throw error;
};

const storeProductImage = async (supabase: ReturnType<typeof createClient>, product: Product, imageUrl: string) => {
  const imageResponse = await fetch(imageUrl, {
    redirect: 'follow',
    headers: { 'User-Agent': SEARCH_USER_AGENT },
  });

  if (!imageResponse.ok) {
    throw new Error(`Image fetch failed (${imageResponse.status})`);
  }

  const contentType = imageResponse.headers.get('content-type');
  if (!contentType?.startsWith('image/')) {
    throw new Error(`Invalid content-type: ${contentType ?? 'unknown'}`);
  }

  const ext = getExtensionFromUrl(imageUrl) || getExtensionFromContentType(contentType);
  const path = `products/${product.id}/${slugify(cleanProductName(product.name))}.${ext}`;
  const bytes = new Uint8Array(await imageResponse.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, bytes, {
      upsert: true,
      contentType,
      cacheControl: '31536000',
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(path);

  const mergedImages = cleanImages(publicUrlData.publicUrl, product.images, product.image_url);
  await touchProduct(supabase, product.id, {
    image_url: publicUrlData.publicUrl,
    images: mergedImages.length ? mergedImages.slice(0, 8) : [publicUrlData.publicUrl],
  });

  return publicUrlData.publicUrl;
};

const getProductsForImageRefresh = async (supabase: ReturnType<typeof createClient>, batchSize: number, includeExternal: boolean) => {
  const { data: missingProducts, error: missingError } = await supabase
    .from('products')
    .select('id, name, brand, image_url, images, description, protocol')
    .or('image_url.is.null,image_url.eq.,image_url.like.%baytzaki.com/wp-content%')
    .order('updated_at', { ascending: true })
    .limit(batchSize);

  if (missingError) throw missingError;

  if ((missingProducts?.length ?? 0) >= batchSize || !includeExternal) {
    return missingProducts ?? [];
  }

  const remaining = batchSize - (missingProducts?.length ?? 0);
  const existingIds = new Set((missingProducts ?? []).map((product) => product.id));

  const { data: externalProducts, error: externalError } = await supabase
    .from('products')
    .select('id, name, brand, image_url, images, description, protocol')
    .not('image_url', 'is', null)
    .like('image_url', 'http%')
    .not('image_url', 'like', `%${INTERNAL_IMAGE_MARKER}%`)
    .order('updated_at', { ascending: true })
    .limit(remaining * 2);

  if (externalError) throw externalError;

  const filteredExternal = (externalProducts ?? []).filter((product) => !existingIds.has(product.id)).slice(0, remaining);
  return [...(missingProducts ?? []), ...filteredExternal];
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, batchSize = 5, includeExternal = false, token } = await req.json();

    if (!(await verifyAdminToken(supabase, token))) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'find-missing-images' || action === 'refresh-product-images') {
      const products = await getProductsForImageRefresh(supabase, Math.min(Math.max(Number(batchSize || 5), 1), 12), includeExternal || action === 'refresh-product-images');
      const results = [];

      const deadline = Date.now() + 120_000; // stop accepting new items after 120s
      for (const product of products as Product[]) {
        if (Date.now() > deadline) {
          results.push({
            id: product.id,
            name: product.name,
            success: false,
            status: 'skipped_time_budget',
            error: 'Stopped early to avoid request timeout — re-run to continue',
          });
          continue;
        }
        try {
          const currentImage = product.image_url?.trim() || null;
          const shouldMirrorCurrent = Boolean(
            currentImage &&
            currentImage.startsWith('http') &&
            !currentImage.includes(INTERNAL_IMAGE_MARKER) &&
            !currentImage.includes('baytzaki.com/wp-content')
          );

          const perItem = new Promise<string | null>(async (resolve) => {
            try {
              const url = shouldMirrorCurrent ? currentImage! : await findImageCandidate(product);
              resolve(url);
            } catch {
              resolve(null);
            }
          });
          const timeoutP = new Promise<null>((resolve) => setTimeout(() => resolve(null), 18_000));
          const sourceUrl = await Promise.race([perItem, timeoutP]);
          if (!sourceUrl) {
            await touchProduct(supabase, product.id);
            results.push({
              id: product.id,
              name: product.name,
              success: false,
              status: 'no_image_found',
              error: 'No matching product image found on the web',
            });
            continue;
          }

          const publicUrl = await storeProductImage(supabase, product, sourceUrl);
          results.push({
            id: product.id,
            name: product.name,
            success: true,
            status: shouldMirrorCurrent ? 'mirrored_existing' : 'updated',
            image_updated: true,
            image_url: publicUrl,
            source_url: sourceUrl,
          });
          await delay(180);
        } catch (err) {
          console.error(`Error processing ${product.name}:`, err);
          await touchProduct(supabase, product.id);
          results.push({
            id: product.id,
            name: product.name,
            success: false,
            status: 'error',
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'fix-broken-images') {
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
          .update({ image_url: null, updated_at: new Date().toISOString() })
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
          await delay(700);
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
      JSON.stringify({ success: false, error: 'Invalid action. Use: find-missing-images, refresh-product-images, fix-broken-images, generate-descriptions' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
