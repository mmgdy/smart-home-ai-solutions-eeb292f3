const ARABIC_CHAR_RE = /[\u0600-\u06FF]/g;
const LATIN_CHAR_RE = /[A-Za-z]/g;

/**
 * Determines visual text direction for a title/fragment so English product titles
 * and model codes stay properly left-to-right even inside Arabic RTL pages.
 */
export function getTextDirection(text?: string | null): 'ltr' | 'rtl' {
  if (!text) return 'rtl';
  const arabicCount = (text.match(ARABIC_CHAR_RE) || []).length;
  const latinCount = (text.match(LATIN_CHAR_RE) || []).length;
  if (latinCount > 0 && arabicCount === 0) return 'ltr';
  if (latinCount > 0 && latinCount >= arabicCount * 2) return 'ltr';
  return arabicCount > 0 ? 'rtl' : 'ltr';
}

const TECH_UNIT_RE =
  /\b\d+(?:[.,]\d+)?\s*(?:Mbps|Gbps|GHz|MHz|kHz|mm|cm|W|kW|V|mA|Hz|dBi|dB|MP|TB|GB|MB|KB|A|m)\b|\bIP\d{2}\b/gi;

/**
 * Wraps numeric+unit tokens (e.g., "1267 Mbps", "86 mm", "IP66") in Unicode
 * Left-to-Right Isolate markers (\u2066...\u2069) so units never flip order inside RTL text.
 */
export function isolateBidiUnits(text?: string | null): string {
  if (!text) return '';
  return text.replace(TECH_UNIT_RE, (match) => `\u2066${match}\u2069`);
}
