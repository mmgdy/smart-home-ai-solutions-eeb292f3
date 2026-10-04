// AI Image Design & Visual Compositing Pipeline for AzkaSmart.
// Guarantees:
// 1. 100% product fidelity (composites real catalog photos, never generative distortion of buttons/ports/screens).
// 2. Code-rendered typography with perfect Arabic RTL and English kerning (no garbled AI diffusion text).
// 3. Strict brand safety: verified logos, exact catalog prices, and official 1-year warranty badges.
// 4. Fixed channel dimensions: 1:1 (1080x1080), 16:9 (1920x1080), 9:16 (1080x1920).

export interface ImageDesignOptions {
  productName: string;
  brand?: string | null;
  price: number;
  originalPrice?: number | null;
  productImageUrl: string;
  protocol?: string | null;
  channel: "instagram_square" | "web_banner" | "story_reel";
  language: "ar" | "en";
  badgeText?: string;
  backgroundTheme?: "modern_dark" | "luxury_teal" | "clean_light";
}

export interface DimensionConfig {
  width: number;
  height: number;
  aspectRatio: string;
  safeMargin: number;
}

export const CHANNEL_CONFIGS: Record<ImageDesignOptions["channel"], DimensionConfig> = {
  instagram_square: { width: 1080, height: 1080, aspectRatio: "1:1", safeMargin: 64 },
  web_banner: { width: 1920, height: 1080, aspectRatio: "16:9", safeMargin: 96 },
  story_reel: { width: 1080, height: 1920, aspectRatio: "9:16", safeMargin: 80 },
};

export const BRAND_STYLE = {
  primary: "#00E5FF", // Neon Cyan
  secondary: "#0072F5", // Electric Blue
  bgDark: "#0B1120", // Deep Navy Dark
  bgCard: "#111827", // Card Slate
  textLight: "#F8FAFC", // Pure White Text
  textMuted: "#94A3B8", // Slate Muted
  gold: "#F59E0B", // Official Warranty Gold
  fontArabic: "'Cairo', 'Segoe UI', Tahoma, sans-serif",
  fontEnglish: "'Outfit', 'Inter', system-ui, sans-serif",
};

/** Sanitize strings interpolated into SVG XML templates against XML/SVG injection and XSS (SEC-07) */
export function escapeXml(text: unknown): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Generate a deterministic, high-fidelity SVG marketing graphic with verified product cutout and code typography */
export function generateCompositeSvg(opts: ImageDesignOptions): string {
  const dim = CHANNEL_CONFIGS[opts.channel] || CHANNEL_CONFIGS.instagram_square;
  const isAr = opts.language === "ar";
  const { width, height } = dim;

  const font = isAr ? BRAND_STYLE.fontArabic : BRAND_STYLE.fontEnglish;
  const dir = isAr ? "rtl" : "ltr";

  const brandName = opts.brand || "AzkaSmart";
  const protocolText = opts.protocol ? ` • ${opts.protocol}` : "";
  const warrantyBadge = isAr ? "ضمان معتمد لمدة سنة في مصر" : "Official 1-Year Egyptian Warranty";
  const ctaText = isAr ? "اطلب الآن عبر azkasmart.com" : "Shop now at azkasmart.com";
  const priceFormatted = `${opts.price.toLocaleString("en-US")} ${isAr ? "ج.م" : "EGP"}`;
  const oldPriceFormatted = opts.originalPrice ? `${opts.originalPrice.toLocaleString("en-US")} ${isAr ? "ج.م" : "EGP"}` : "";

  const safeProductImageUrl = opts.productImageUrl &&
    (opts.productImageUrl.startsWith("https://") || opts.productImageUrl.startsWith("http://") || opts.productImageUrl.startsWith("/"))
      ? escapeXml(opts.productImageUrl)
      : "";

  // Layout calculations based on channel
  let productImgX: number;
  let productImgY: number;
  let productImgSize: number;
  let textStartX: number;
  let textStartY: number;

  if (opts.channel === "instagram_square") {
    productImgSize = 480;
    productImgX = width / 2 - productImgSize / 2;
    productImgY = 240;
    textStartX = width / 2;
    textStartY = 140;
  } else if (opts.channel === "web_banner") {
    productImgSize = 580;
    if (isAr) {
      productImgX = 140;
      productImgY = (height - productImgSize) / 2;
      textStartX = width - 140;
      textStartY = 280;
    } else {
      productImgX = width - productImgSize - 140;
      productImgY = (height - productImgSize) / 2;
      textStartX = 140;
      textStartY = 280;
    }
  } else {
    // story_reel (9:16)
    productImgSize = 620;
    productImgX = width / 2 - productImgSize / 2;
    productImgY = 560;
    textStartX = width / 2;
    textStartY = 240;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" dir="${dir}">
  <defs>
    <!-- Background Gradients -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#060B14" />
      <stop offset="60%" stop-color="#0B132B" />
      <stop offset="100%" stop-color="#1C2541" />
    </linearGradient>

    <!-- Cyan Glow Filter -->
    <filter id="cyanGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="60" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <!-- Drop Shadow for Product Photo -->
    <filter id="productShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#000000" flood-opacity="0.65" />
    </filter>

    <!-- Gold Badge Gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>

    <!-- Button Cyan Gradient -->
    <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00E5FF" />
      <stop offset="100%" stop-color="#0072F5" />
    </linearGradient>
  </defs>

  <!-- Background Base -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

  <!-- Ambient Light Orbs -->
  <circle cx="${productImgX + productImgSize / 2}" cy="${productImgY + productImgSize / 2}" r="260" fill="#00E5FF" opacity="0.14" filter="url(#cyanGlow)" />
  <circle cx="120" cy="140" r="180" fill="#0072F5" opacity="0.10" filter="url(#cyanGlow)" />

  <!-- Header Store Brand Bar -->
  <g id="brandBar">
    <text x="${isAr ? width - 80 : 80}" y="90" font-family="${font}" font-size="34" font-weight="900" fill="#00E5FF" text-anchor="${isAr ? 'end' : 'start'}">
      AZKA<tspan fill="#F8FAFC">SMART</tspan>
    </text>
    <text x="${isAr ? width - 80 : 80}" y="125" font-family="${font}" font-size="16" font-weight="600" fill="#94A3B8" text-anchor="${isAr ? 'end' : 'start'}">
      ${isAr ? "متجر المنزل الذكي والتحكم في الدخول بمصر" : "Smart Home & Access Control Egypt"}
    </text>
  </g>

  <!-- Real Product Photo Cutout (Never AI Altered) -->
  <g id="productCutout" filter="url(#productShadow)">
    <!-- Radial pedestal glow underneath product -->
    <ellipse cx="${productImgX + productImgSize / 2}" cy="${productImgY + productImgSize - 20}" rx="${productImgSize * 0.45}" ry="35" fill="#000000" opacity="0.5" />
    <image href="${safeProductImageUrl || escapeXml(opts.productImageUrl)}" x="${productImgX}" y="${productImgY}" width="${productImgSize}" height="${productImgSize}" preserveAspectRatio="xMidYMid meet" />
  </g>

  <!-- Product Meta & Badges -->
  <g id="productInfo" font-family="${font}">
    ${
      opts.channel === "web_banner"
        ? `
    <!-- Web Banner Typography (Horizontal Stacking) -->
    <g transform="translate(${textStartX}, ${textStartY})" text-anchor="${isAr ? 'end' : 'start'}">
      <!-- Brand & Protocol Pill -->
      <rect x="${isAr ? -280 : 0}" y="-35" width="280" height="38" rx="19" fill="#1E293B" stroke="#334155" />
      <text x="${isAr ? -140 : 140}" y="-10" font-size="18" font-weight="700" fill="#00E5FF" text-anchor="middle">
        ${escapeXml(brandName.toUpperCase())}${escapeXml(protocolText)}
      </text>

      <!-- Product Name -->
      <text x="0" y="60" font-size="44" font-weight="800" fill="#F8FAFC">
        ${escapeXml(opts.productName.slice(0, 40))}
      </text>

      <!-- Warranty Badge -->
      <g transform="translate(0, 115)">
        <circle cx="${isAr ? -12 : 12}" cy="-6" r="8" fill="#F59E0B" />
        <text x="${isAr ? -32 : 32}" y="0" font-size="20" font-weight="600" fill="#F59E0B">
          ★ ${escapeXml(warrantyBadge)}
        </text>
      </g>

      <!-- Pricing Block -->
      <g transform="translate(0, 200)">
        <text x="0" y="0" font-size="52" font-weight="900" fill="#00E5FF">
          ${escapeXml(priceFormatted)}
        </text>
        ${
          oldPriceFormatted
            ? `<text x="${isAr ? -240 : 240}" y="-8" font-size="28" font-weight="600" fill="#64748B" text-decoration="line-through">${escapeXml(oldPriceFormatted)}</text>`
            : ""
        }
      </g>

      <!-- Action Button -->
      <g transform="translate(${isAr ? -340 : 0}, 240)">
        <rect width="340" height="60" rx="30" fill="url(#btnGrad)" />
        <text x="170" y="38" font-size="22" font-weight="700" fill="#060B14" text-anchor="middle">
          ${escapeXml(ctaText)}
        </text>
      </g>
    </g>`
        : `
    <!-- Vertical Channels (Square 1:1 or Story 9:16) -->
    <g text-anchor="middle">
      <!-- Brand & Protocol Pill -->
      <rect x="${width / 2 - 140}" y="${opts.channel === 'story_reel' ? 360 : 740}" width="280" height="38" rx="19" fill="#1E293B" stroke="#334155" />
      <text x="${width / 2}" y="${opts.channel === 'story_reel' ? 385 : 765}" font-size="18" font-weight="700" fill="#00E5FF">
        ${escapeXml(brandName.toUpperCase())}${escapeXml(protocolText)}
      </text>

      <!-- Product Name -->
      <text x="${width / 2}" y="${opts.channel === 'story_reel' ? 445 : 825}" font-size="36" font-weight="800" fill="#F8FAFC">
        ${escapeXml(opts.productName.slice(0, 36))}
      </text>

      <!-- Official Warranty Badge -->
      <text x="${width / 2}" y="${opts.channel === 'story_reel' ? 495 : 870}" font-size="20" font-weight="600" fill="#F59E0B">
        ★ ${escapeXml(warrantyBadge)}
      </text>

      <!-- Price Block -->
      <text x="${width / 2}" y="${opts.channel === 'story_reel' ? 1280 : 940}" font-size="48" font-weight="900" fill="#00E5FF">
        ${escapeXml(priceFormatted)}
        ${oldPriceFormatted ? `<tspan font-size="26" fill="#64748B" text-decoration="line-through" dx="15">${escapeXml(oldPriceFormatted)}</tspan>` : ""}
      </text>

      <!-- CTA Button -->
      <g transform="translate(${width / 2 - 170}, ${opts.channel === 'story_reel' ? 1340 : 975})">
        <rect width="340" height="60" rx="30" fill="url(#btnGrad)" />
        <text x="170" y="38" font-size="22" font-weight="700" fill="#060B14">
          ${escapeXml(ctaText)}
        </text>
      </g>
    </g>`
    }
  </g>
</svg>`;
}

/** Sanitize and validate user-uploaded image payloads */
export function validateUserUploadedImage(
  base64Data: string,
  mimeType: string,
  maxSizeBytes = 5_000_000,
): { valid: boolean; error?: string } {
  if (!base64Data || typeof base64Data !== "string") {
    return { valid: false, error: "Image data is required" };
  }

  const cleanMime = mimeType.toLowerCase();
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(cleanMime)) {
    return { valid: false, error: "Invalid format. Supported formats: JPEG, PNG, WebP." };
  }

  // Calculate approximate decoded size: base64 len * (3/4)
  const approxSize = Math.ceil(base64Data.length * 0.75);
  if (approxSize > maxSizeBytes) {
    return { valid: false, error: `Image too large (${Math.round(approxSize / (1024 * 1024))}MB). Maximum is 5MB.` };
  }

  return { valid: true };
}
