import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'h3', 'h4', 'img', 'a',
];

const ALLOWED_ATTR = ['src', 'alt', 'href', 'title'];

const TAG_ALLOWED_ATTRS: Record<string, Set<string>> = {
  img: new Set(['src', 'alt']),
  a: new Set(['href', 'title']),
};

// Strictly forbid javascript:, data:, vbscript:, file:, blob: URLs; allow http(s), mailto, tel, or relative paths
const SAFE_URI_REGEXP = /^(?:(?:https?|mailto|tel):|\/(?!\/)|#)/i;

let hooksRegistered = false;

function ensureHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;

  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    const tag = node.nodeName?.toLowerCase() || '';
    const allowedForTag = TAG_ALLOWED_ATTRS[tag];
    if (!allowedForTag || !allowedForTag.has(data.attrName.toLowerCase())) {
      data.keepAttr = false;
      return;
    }

    const attr = data.attrName.toLowerCase();
    if (attr === 'src' || attr === 'href') {
      const val = (data.attrValue || '').trim();
      const normalized = val.replace(/[\u0000-\u0020]+/g, '');
      if (
        /^(javascript|data|vbscript|file|blob):/i.test(normalized) ||
        !SAFE_URI_REGEXP.test(val)
      ) {
        data.keepAttr = false;
      }
    }
  });
}

/**
 * Sanitizes a product description into safe HTML allowing only:
 * p, br, ul, ol, li, strong, b, em, i, h3, h4, img (src, alt), a (href, title).
 * Strips all other tags, event handlers, inline styles, and javascript:/data: URLs.
 */
export function sanitizeProductDescription(raw: string | null | undefined): string {
  if (!raw) return '';
  ensureHooks();

  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    ALLOWED_URI_REGEXP: SAFE_URI_REGEXP,
    FORBID_ATTR: ['style', 'class', 'id', 'onerror', 'onload', 'onclick'],
  });
}

/**
 * Strips any HTML tags from a description for plain-text contexts (meta tags, JSON-LD, cards).
 */
export function stripDescriptionHtml(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
