export const MAX_GALLERY_IMAGES = 10;

export interface VideoEmbedInfo {
  kind: 'youtube' | 'vimeo' | 'direct' | 'iframe';
  url: string;
  embedUrl?: string;
  posterUrl?: string | null;
}

export function isGifUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return /\.gif(\?|#|$)/i.test(url.trim());
}

export function isSafeMediaUrl(raw?: string | null): boolean {
  const trimmed = (raw || '').trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/')) return !trimmed.startsWith('//');
  return /^https?:\/\/.+/i.test(trimmed);
}

export function inferImageMimeType(file: { type?: string; name?: string }): string {
  const mime = (file.type || '').trim().toLowerCase();
  const ext = (file.name || '').split('.').pop()?.toLowerCase() || '';
  if (ext === 'gif' || mime === 'image/gif') return 'image/gif';
  if (mime.startsWith('image/')) return mime;
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'avif':
      return 'image/avif';
    case 'svg':
      return 'image/svg+xml';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}

/**
 * Builds an ordered, deduplicated gallery array from a product's primary
 * `image_url` and `images[]` without truncating pre-existing galleries > 10.
 */
export function normalizeProductGallery(
  imageUrl?: string | null,
  images?: Array<string | null | undefined> | null
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const pushUnique = (val?: string | null) => {
    if (typeof val !== 'string') return;
    const trimmed = val.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    result.push(trimmed);
  };

  pushUnique(imageUrl);
  if (Array.isArray(images)) {
    for (const img of images) {
      pushUnique(img);
    }
  }

  return result;
}

/**
 * Keeps the first gallery image in sync with edits to the single "Image" field
 * while preserving the remainder of the ordered gallery.
 */
export function replacePrimaryImageInGallery(
  currentGallery: string[],
  nextPrimaryRaw: string
): string[] {
  const trimmed = nextPrimaryRaw.trim();
  if (!trimmed) {
    return currentGallery.filter((u) => Boolean(u && u.trim()));
  }
  const tail = currentGallery
    .slice(1)
    .map((u) => u.trim())
    .filter((u) => Boolean(u) && u !== trimmed);
  return [trimmed, ...tail];
}

export function reorderGalleryImage(
  gallery: string[],
  fromIndex: number,
  toIndex: number
): string[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= gallery.length ||
    toIndex >= gallery.length ||
    fromIndex === toIndex
  ) {
    return gallery;
  }
  const next = [...gallery];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function removeGalleryImage(gallery: string[], index: number): string[] {
  if (index < 0 || index >= gallery.length) return gallery;
  return gallery.filter((_, idx) => idx !== index);
}

export function appendGalleryImages(
  gallery: string[],
  candidateUrls: string[],
  maxCap: number = MAX_GALLERY_IMAGES
): {
  next: string[];
  addedCount: number;
  skippedCapCount: number;
  skippedDuplicateCount: number;
} {
  const next = [...gallery];
  const seen = new Set(next.map((u) => u.trim()));
  let addedCount = 0;
  let skippedCapCount = 0;
  let skippedDuplicateCount = 0;

  for (const raw of candidateUrls) {
    const trimmed = (raw || '').trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) {
      skippedDuplicateCount++;
      continue;
    }
    if (next.length >= maxCap) {
      skippedCapCount++;
      continue;
    }
    seen.add(trimmed);
    next.push(trimmed);
    addedCount++;
  }

  return { next, addedCount, skippedCapCount, skippedDuplicateCount };
}

export function getVideoEmbedInfo(rawUrl?: string | null): VideoEmbedInfo | null {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed || !isSafeMediaUrl(trimmed)) return null;

  // YouTube (watch, youtu.be, embed, shorts)
  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch && ytMatch[1]) {
    const id = ytMatch[1];
    return {
      kind: 'youtube',
      url: trimmed,
      embedUrl: `https://www.youtube.com/embed/${id}?rel=0`,
      posterUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }

  // Vimeo (vimeo.com/123456, vimeo.com/channels/.../123456, player.vimeo.com/video/123456)
  const vimeoMatch = trimmed.match(
    /(?:player\.vimeo\.com\/video\/|vimeo\.com\/(?:channels\/[^/]+\/|groups\/[^/]+\/videos\/|video\/)?)(\d{6,12})/i
  );
  if (vimeoMatch && vimeoMatch[1]) {
    const id = vimeoMatch[1];
    return {
      kind: 'vimeo',
      url: trimmed,
      embedUrl: `https://player.vimeo.com/video/${id}`,
      posterUrl: null,
    };
  }

  // Direct video file or Supabase product-videos upload
  if (
    /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(trimmed) ||
    trimmed.includes('/product-videos/')
  ) {
    return {
      kind: 'direct',
      url: trimmed,
      posterUrl: null,
    };
  }

  return {
    kind: 'iframe',
    url: trimmed,
    embedUrl: trimmed,
    posterUrl: null,
  };
}
