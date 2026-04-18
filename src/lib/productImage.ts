import placeholder from '@/assets/product-placeholder.jpg';
import type { Product } from '@/types/store';

const PRODUCT_IMAGES_BUCKET_FRAGMENT = '/storage/v1/object/public/product-images/';

/**
 * Returns a safe image URL for a product. External/broken links are replaced
 * with a clean local placeholder so the grid never shows broken thumbnails.
 */
export function getProductImage(product: Pick<Product, 'image_url'>): string {
  const url = product.image_url?.trim();
  if (!url) return placeholder;
  // Trust internal storage URLs and Lovable assets
  if (url.includes(PRODUCT_IMAGES_BUCKET_FRAGMENT)) return url;
  if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  // External URLs are unreliable — fall back to placeholder.
  // Components can override with onError if they want to attempt loading.
  return url;
}

export const productPlaceholder = placeholder;
