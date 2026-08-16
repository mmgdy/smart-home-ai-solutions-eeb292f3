import placeholder from '@/assets/product-placeholder.jpg';
import type { Product } from '@/types/store';

const PRODUCT_IMAGES_BUCKET_FRAGMENT = '/storage/v1/object/public/product-images/';

type ImageSource = Pick<Product, 'image_url'> & { images?: string[] | null };

/**
 * Returns a safe image URL for a product. Falls back to images[0] when
 * image_url is missing/empty, then to a local placeholder so the grid never
 * shows broken thumbnails.
 */
export function getProductImage(product: ImageSource): string {
  const primary = product.image_url?.trim();
  const fallback = Array.isArray(product.images) ? product.images.find((u) => !!u && u.trim()) : null;
  const url = primary || fallback?.trim() || null;
  if (!url) return placeholder;
  // Trust internal storage URLs and relative/data/blob URLs.
  if (url.includes(PRODUCT_IMAGES_BUCKET_FRAGMENT)) return url;
  if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  // External URLs are unreliable — fall back to placeholder.
  // Components can override with onError if they want to attempt loading.
  return url;
}

export const productPlaceholder = placeholder;
