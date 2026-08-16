// find-web-sources — public, rate-limited product web-source finder.
// Takes { brand?, name, protocol?, locale? } and returns ranked external
// pages (retailers, reviews, manuals) about the same product, scraped from
// DuckDuckGo + Bing HTML using the same keyless pattern as enhance-products.

import { corsHeadersFor } from "../_shared/cors.ts";
import { checkRate, getIp } from "../_shared/rate-limit.ts";
import { cleanString } from "../_shared/validate.ts";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const MAX_RESULTS = 8;
const SNIPPET_MAX = 220;

// Retailers the store compares against most (score boost).
const RETAILER_HOSTS = /(?:^|\.)(?:amazon\.[a-z.]+|noon\.com|jumia\.com\.eg|souq\.com|ikea\.com|mediaworld\.it|aliexpress\.com|almart\.com)$/i;
// Review / forum / manual sites (medium boost).
const REVIEW_HOSTS = /(?:^|\.)(?:reddit\.com|quora\.com|cnet\.com|theverge\.com|tomsguide\.com|wirecutter\.com|nytimes\.com|manuals\.plus|manualsonline\.com|youtube\.com|rtings\.com|techradar\.com)$/i;
// Never surface these.
const BLOCKED_HOSTS = /(?:^|\.)(?:baytzaki\.com|duckduckgo\.com|bing\.com|microsoft\.com|live\.com|msn\.com|google\.[a-z.]+|facebook\.com|instagram\.com|tiktok\.com|pinterest\.[a-z.]+|x\.com|twitter\.com)$/i;

interface Source {
  title: string;
  url: string;
  snippet: string;
  source: string;
  score: number;
}

const fetchText = async (url: string): Promise<string> => {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": BROWSER_UA,
      "Accept-Language": "en-US,en;q=0.9",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!response.ok) throw new Error(`Fetch failed (${response.status})`);
  return response.text();
};

const decodeDuckDuckGoUrl = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl, "https://duckduckgo.com");
    const uddg = parsed.searchParams.get("uddg");
    return uddg ? decodeURIComponent(uddg) : parsed.toString();
  } catch {
    const match = rawUrl.match(/uddg=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : rawUrl;
  }
};

const decodeEntities = (value: string): string => {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
};

const stripHtml = (value: string): string =>
  decodeEntities(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

interface RawHit {
  url: string;
  title: string;
  snippet: string;
}

const searchDuckDuckGo = async (query: string): Promise<RawHit[]> => {
  try {
    const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
    const hits: RawHit[] = [];
    const blocks = html.split(/class=["'][^"']*result__body/i).slice(1);
    for (const block of blocks) {
      const linkMatch = block.match(/<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      if (!linkMatch) continue;
      const url = decodeDuckDuckGoUrl(linkMatch[1]);
      if (!/^https?:\/\//i.test(url)) continue;
      const title = stripHtml(linkMatch[2]);
      const snippetMatch = block.match(/class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
      hits.push({ url, title, snippet: snippetMatch ? stripHtml(snippetMatch[1]) : "" });
      if (hits.length >= 15) break;
    }
    return hits;
  } catch (e) {
    console.warn("DuckDuckGo search failed:", e);
    return [];
  }
};

const searchBing = async (query: string): Promise<RawHit[]> => {
  try {
    const html = await fetchText(`https://www.bing.com/search?q=${encodeURIComponent(query)}&count=15`);
    const hits: RawHit[] = [];
    for (const match of html.matchAll(/<li[^>]+class=["'][^"']*b_algo[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi)) {
      const block = match[1];
      const linkMatch = block.match(/<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      if (!linkMatch) continue;
      const url = linkMatch[1];
      const title = stripHtml(linkMatch[2]);
      const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      hits.push({ url, title, snippet: snippetMatch ? stripHtml(snippetMatch[1]) : "" });
      if (hits.length >= 15) break;
    }
    return hits;
  } catch (e) {
    console.warn("Bing search failed:", e);
    return [];
  }
};

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
};

const scoreHost = (host: string): number => {
  if (BLOCKED_HOSTS.test(host)) return -100;
  if (RETAILER_HOSTS.test(host)) return 6;
  if (REVIEW_HOSTS.test(host)) return 4;
  return 2;
};

const rankSources = (hits: RawHit[]): Source[] => {
  const byUrl = new Map<string, Source>();
  hits.forEach((hit, index) => {
    if (!/^https?:\/\//i.test(hit.url)) return;
    const host = hostOf(hit.url);
    if (!host) return;
    const score = scoreHost(host);
    if (score < 0) return;
    const title = truncate(hit.title || host, 120);
    const snippet = truncate(hit.snippet || "", SNIPPET_MAX);
    const existing = byUrl.get(hit.url);
    if (existing) {
      existing.score += 1; // found by both engines — small boost
      if (!existing.snippet && snippet) existing.snippet = snippet;
      return;
    }
    byUrl.set(hit.url, {
      url: hit.url,
      title,
      snippet,
      source: host.replace(/^www\./, ""),
      // Earlier results rank slightly higher.
      score: score + Math.max(0, 3 - Math.floor(index / 3)),
    });
  });
  return Array.from(byUrl.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS);
};

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = getIp(req);
  const rate = checkRate(ip, { windowMs: 60_000, maxRequests: 5 });
  if (!rate.ok) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) },
    });
  }

  try {
    const { brand, name, locale } = await req.json().catch(() => ({} as Record<string, unknown>));
    const cleanName = cleanString(name, 120);
    const cleanBrand = cleanString(brand, 60);
    if (!cleanName) {
      return new Response(JSON.stringify({ error: "name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const base = [cleanBrand, cleanName].filter(Boolean).join(" ");
    const suffix = locale === "ar" ? "شراء مواصفات" : "buy specs review";
    const query = `${base} ${suffix}`.trim();

    const [ddgHits, bingHits] = await Promise.all([searchDuckDuckGo(query), searchBing(query)]);
    const sources = rankSources([...ddgHits, ...bingHits]);

    return new Response(JSON.stringify({ success: true, query, sources }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("find-web-sources error:", e);
    return new Response(JSON.stringify({ success: false, error: "Search unavailable. Please try again later." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
