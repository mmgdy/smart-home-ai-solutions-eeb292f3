import placeholder from '@/assets/product-placeholder.jpg';
import type { Product } from '@/types/store';

const PRODUCT_IMAGES_BUCKET_FRAGMENT = '/storage/v1/object/public/product-images/';

type ImageSource = {
  id?: string;
  image_url?: string | null;
  images?: string[] | null;
  name?: string;
  slug?: string;
};

// Verified high-resolution photos for products that had corrupted, stretched SVG or mismatched images
const VERIFIED_IMAGE_OVERRIDES: Record<string, string> = {
  // FIBARO Walli Switch FGWDSEU-221 (replaces wide SVG banner with verified high-res photo)
  '0289fa4e-dafc-4844-a3a8-85b87ee87aa3': 'https://smarterhome.sk/2121-superlarge_default/fibaro-walli-switch-fgwdseu-221.jpg',
  // FIBARO The Button FGPB-101-3 Red
  '5fd46faa-960a-4faa-9d84-0b28c4adce3e': 'https://m.media-amazon.com/images/I/51x1OhDJwwL._AC_SY300_SX300_QL70_FMwebp_.jpg',
};

function getLocalReplacedImage(id?: string): string | null {
  if (!id || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('azka_admin_replaced_images');
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[id] || null;
  } catch {
    return null;
  }
}

/**
 * Returns a safe, verified image URL for a product.
 * 1. Checks admin localStorage replacement if edited via Catalog Audit / Product Editor
 * 2. Checks verified static overrides for known mismatched crawler images
 * 3. Sanitizes wide banner SVGs by falling back to non-SVG product photos in images[]
 * 4. Falls back to images[0] or safe placeholder
 */
export function getProductImage(product: ImageSource): string {
  if (!product) return placeholder;

  // 1. Admin dynamic override
  if (product.id) {
    const localOverride = getLocalReplacedImage(product.id);
    if (localOverride) return localOverride;

    const staticOverride = VERIFIED_IMAGE_OVERRIDES[product.id];
    if (staticOverride) return staticOverride;
  }

  const primary = product.image_url?.trim();

  // If primary is an SVG banner, prefer a real photo from the product images array
  if (primary && primary.toLowerCase().endsWith('.svg') && Array.isArray(product.images)) {
    const nonSvgPhoto = product.images.find(
      (u) =>
        u &&
        !u.toLowerCase().endsWith('.svg') &&
        (u.includes('.jpg') || u.includes('.jpeg') || u.includes('.png') || u.includes('.webp'))
    );
    if (nonSvgPhoto) return nonSvgPhoto.trim();
  }

  const fallback = Array.isArray(product.images)
    ? product.images.find((u) => !!u && u.trim() && !u.toLowerCase().endsWith('.svg'))
    : null;

  const url = primary || fallback?.trim() || null;
  if (!url) return placeholder;

  return url;
}

export const productPlaceholder = placeholder;
