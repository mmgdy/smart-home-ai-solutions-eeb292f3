// Pure, runtime-agnostic XPay helpers (compatible with both Deno Edge Functions and Node tests).
// Uses Web Crypto API only; never imports server credentials or logs secrets.

export const XPAY_API_BASE = "https://api.xpay.app";
export const XPAY_WEBHOOK_TOLERANCE_SECONDS = 300;
export type XPayMode = "test" | "live";

export interface ParsedXPaySignature {
  timestamp: number;
  signatureHex: string;
}

export interface XPayLineItemInput {
  name: string;
  quantity: number;
  priceEgp: number;
}

export interface XPaySessionLineItem {
  priceData: {
    currency: "EGP";
    unitAmount: number;
    productData: {
      name: string;
      description?: string;
    };
  };
  quantity: number;
}

const encoder = new TextEncoder();

export function normalizeXPayMode(value: unknown): XPayMode {
  return String(value ?? "").trim().toLowerCase() === "live" ? "live" : "test";
}

export function validateKeyForMode(
  kind: "publishable" | "secret" | "webhook",
  mode: XPayMode,
  rawValue: string
): { ok: true } | { ok: false; error: string } {
  const value = (rawValue || "").trim();
  if (!value) return { ok: false, error: "Key value cannot be empty." };
  if (/\s/.test(value)) {
    return { ok: false, error: "Key must not contain spaces or line breaks." };
  }

  if (kind === "publishable") {
    if (value.startsWith("sk_") || value.startsWith("whsec_")) {
      return { ok: false, error: "Never paste a Secret Key or Webhook Secret into the Publishable Key field." };
    }
    const expected = mode === "live" ? "pk_live_" : "pk_test_";
    if (!value.startsWith(expected)) {
      return { ok: false, error: `Publishable key for ${mode} mode must start with "${expected}".` };
    }
    return { ok: true };
  }

  if (kind === "secret") {
    if (value.startsWith("pk_") || value.startsWith("whsec_")) {
      return { ok: false, error: "Secret Key must not be a Publishable Key or Webhook Secret." };
    }
    const expected = mode === "live" ? "sk_live_" : "sk_test_";
    if (!value.startsWith(expected)) {
      return { ok: false, error: `Secret key for ${mode} mode must start with "${expected}".` };
    }
    return { ok: true };
  }

  if (!value.startsWith("whsec_")) {
    return { ok: false, error: 'Webhook signing secret must start with "whsec_".' };
  }
  return { ok: true };
}

export function maskSecretHint(value?: string | null): string {
  const trimmed = (value || "").trim();
  if (!trimmed) return "";
  const tail = trimmed.slice(-4);
  if (trimmed.startsWith("sk_test_")) return `sk_test_••••${tail}`;
  if (trimmed.startsWith("sk_live_")) return `sk_live_••••${tail}`;
  if (trimmed.startsWith("whsec_")) return `whsec_••••${tail}`;
  return `••••${tail}`;
}

export function parseXPaySignatureHeader(header: string | null | undefined): ParsedXPaySignature | null {
  if (!header || typeof header !== "string") return null;
  let timestampStr = "";
  let sigStr = "";

  for (const rawPart of header.split(",")) {
    const part = rawPart.trim();
    const eqIdx = part.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key === "t") timestampStr = val;
    else if (key === "v1") sigStr = val;
  }

  if (!/^\d+$/.test(timestampStr)) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(sigStr)) return null;

  const timestamp = Number.parseInt(timestampStr, 10);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;

  return {
    timestamp,
    signatureHex: sigStr.toLowerCase(),
  };
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left.length === 0 || left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

export async function computeXPaySignature(
  rawBody: string,
  timestamp: number,
  secret: string
): Promise<string> {
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signedPayload = `${timestamp}.${rawBody}`;
  const sigBuf = await globalThis.crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
  const bytes = new Uint8Array(sigBuf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

export type VerifyXPayResult =
  | { valid: true; event: Record<string, any>; timestamp: number }
  | { valid: false; reason: string };

export async function verifyXPayWebhookSignature(
  rawBody: string,
  header: string | null | undefined,
  secret: string,
  nowSeconds?: number
): Promise<VerifyXPayResult> {
  const cleanSecret = (secret || "").trim();
  if (!cleanSecret) {
    return { valid: false, reason: "webhook_secret_not_configured" };
  }

  const parsed = parseXPaySignatureHeader(header);
  if (!parsed) {
    return { valid: false, reason: "missing_or_malformed_signature_header" };
  }

  const now = nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.timestamp) > XPAY_WEBHOOK_TOLERANCE_SECONDS) {
    return { valid: false, reason: "signature_timestamp_expired" };
  }

  const computedHex = await computeXPaySignature(rawBody, parsed.timestamp, cleanSecret);
  if (!timingSafeEqualHex(computedHex, parsed.signatureHex)) {
    return { valid: false, reason: "signature_mismatch" };
  }

  let event: Record<string, any>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { valid: false, reason: "invalid_json_body" };
  }

  if (!event || typeof event !== "object" || typeof event.type !== "string") {
    return { valid: false, reason: "invalid_event_envelope" };
  }

  return { valid: true, event, timestamp: parsed.timestamp };
}

export function normalizeEgyptianPhone(raw?: string | null): string | undefined {
  const cleaned = String(raw ?? "").replace(/[^\d+]/g, "");
  if (!cleaned) return undefined;
  if (/^01[0125]\d{8}$/.test(cleaned)) return `+2${cleaned}`;
  if (/^201[0125]\d{8}$/.test(cleaned)) return `+${cleaned}`;
  if (/^00201[0125]\d{8}$/.test(cleaned)) return `+${cleaned.slice(2)}`;
  if (/^\+\d{8,15}$/.test(cleaned)) return cleaned;
  return undefined;
}

export function sanitizeRedirectOrigin(requestedOrigin: string | undefined, mode: XPayMode): string {
  const productionOrigin = "https://www.azkasmart.com";
  if (!requestedOrigin) return productionOrigin;

  let parsed: URL;
  try {
    parsed = new URL(requestedOrigin);
  } catch {
    return productionOrigin;
  }

  const host = parsed.hostname.toLowerCase();
  if (parsed.protocol === "https:" && (host === "azkasmart.com" || host === "www.azkasmart.com")) {
    return `${parsed.protocol}//${parsed.host}`;
  }

  // Live mode rejects non-production domains (e.g. localhost) per XPay API rules
  if (mode === "live") {
    return productionOrigin;
  }

  if (
    (parsed.protocol === "https:" && (host.endsWith(".vercel.app") || host.endsWith(".azkasmart.com"))) ||
    ((parsed.protocol === "http:" || parsed.protocol === "https:") && (host === "localhost" || host === "127.0.0.1"))
  ) {
    return `${parsed.protocol}//${parsed.host}`;
  }

  return productionOrigin;
}

export function buildXPayLineItems(params: {
  orderId: string;
  orderTotalEgp: number;
  items: XPayLineItemInput[];
  shippingCostEgp?: number;
  installationFeeEgp?: number;
  cardFeeEgp?: number;
}): { lineItems: XPaySessionLineItem[]; totalMinor: number } {
  const expectedTotalMinor = Math.round(Number(params.orderTotalEgp) * 100);
  if (!Number.isFinite(expectedTotalMinor) || expectedTotalMinor <= 0) {
    throw new Error("Order total must be greater than zero");
  }

  const lineItems: XPaySessionLineItem[] = [];
  for (const item of params.items || []) {
    const qty = Math.floor(Number(item.quantity) || 0);
    const unitAmount = Math.round(Number(item.priceEgp) * 100);
    const name = String(item.name || "Product").trim().slice(0, 120) || "Product";
    if (qty > 0 && unitAmount > 0) {
      lineItems.push({
        priceData: {
          currency: "EGP",
          unitAmount,
          productData: { name },
        },
        quantity: qty,
      });
    }
  }

  const shippingMinor = Math.round(Number(params.shippingCostEgp || 0) * 100);
  if (shippingMinor > 0) {
    lineItems.push({
      priceData: {
        currency: "EGP",
        unitAmount: shippingMinor,
        productData: { name: "Shipping" },
      },
      quantity: 1,
    });
  }

  const installMinor = Math.round(Number(params.installationFeeEgp || 0) * 100);
  if (installMinor > 0) {
    lineItems.push({
      priceData: {
        currency: "EGP",
        unitAmount: installMinor,
        productData: { name: "Certified Professional Installation" },
      },
      quantity: 1,
    });
  }

  const cardFeeMinor = Math.round(Number(params.cardFeeEgp || 0) * 100);
  if (cardFeeMinor > 0) {
    lineItems.push({
      priceData: {
        currency: "EGP",
        unitAmount: cardFeeMinor,
        productData: { name: "Card Processing Fee" },
      },
      quantity: 1,
    });
  }

  const itemizedTotalMinor = lineItems.reduce(
    (sum, li) => sum + li.priceData.unitAmount * li.quantity,
    0
  );

  // If itemized sum exactly matches the Azka order total, preserve itemized lines
  if (lineItems.length > 0 && itemizedTotalMinor === expectedTotalMinor) {
    return { lineItems, totalMinor: expectedTotalMinor };
  }

  // Otherwise (e.g. coupons / loyalty points discounts / missing itemized breakdown),
  // send a single consolidated line item guaranteed to equal the exact order total.
  const shortId = params.orderId.slice(0, 8).toUpperCase();
  const summaryParts = (params.items || [])
    .filter((i) => (i.quantity || 0) > 0 && i.name)
    .map((i) => `${String(i.name).trim()} x${i.quantity}`);
  const desc = summaryParts.join(", ").slice(0, 240);

  return {
    lineItems: [
      {
        priceData: {
          currency: "EGP",
          unitAmount: expectedTotalMinor,
          productData: {
            name: `AzkaSmart Order #${shortId}`,
            ...(desc ? { description: desc } : {}),
          },
        },
        quantity: 1,
      },
    ],
    totalMinor: expectedTotalMinor,
  };
}
