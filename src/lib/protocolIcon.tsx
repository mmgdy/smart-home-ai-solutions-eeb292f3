import {
  Wifi,
  Radio,
  Bluetooth,
  Cpu,
  Cable,
  Network,
  SatelliteDish,
  Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ProtocolToken {
  /** Canonical protocol name shown in the UI */
  name: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Tailwind-compatible background colour class */
  bg: string;
  /** Tailwind-compatible text colour class */
  fg: string;
  /** Tooltip caption */
  description: string;
}

const MATCHERS: Array<{ pattern: RegExp; token: ProtocolToken }> = [
  {
    pattern: /\bwi-?fi\b/i,
    token: {
      name: 'Wi-Fi',
      icon: Wifi,
      bg: 'bg-sky-500/90',
      fg: 'text-white',
      description: 'Connects over Wi-Fi',
    },
  },
  {
    pattern: /\bmatter\b/i,
    token: {
      name: 'Matter',
      icon: Cpu,
      bg: 'bg-emerald-500/90',
      fg: 'text-white',
      description: 'Matter-over-Thread/Wi-Fi ready',
    },
  },
  {
    pattern: /\bthread\b/i,
    token: {
      name: 'Thread',
      icon: Waves,
      bg: 'bg-indigo-500/90',
      fg: 'text-white',
      description: 'Thread mesh protocol',
    },
  },
  {
    pattern: /\bzigbee\b/i,
    token: {
      name: 'Zigbee',
      icon: Radio,
      bg: 'bg-amber-500/90',
      fg: 'text-white',
      description: 'Zigbee mesh radio',
    },
  },
  {
    pattern: /\bz-?wave\b/i,
    token: {
      name: 'Z-Wave',
      icon: Radio,
      bg: 'bg-purple-500/90',
      fg: 'text-white',
      description: 'Z-Wave mesh radio',
    },
  },
  {
    pattern: /\bbluetooth|ble\b/i,
    token: {
      name: 'Bluetooth',
      icon: Bluetooth,
      bg: 'bg-blue-500/90',
      fg: 'text-white',
      description: 'Bluetooth / BLE radio',
    },
  },
  {
    pattern: /\bmqtt\b/i,
    token: {
      name: 'MQTT',
      icon: Network,
      bg: 'bg-slate-700/90',
      fg: 'text-white',
      description: 'MQTT / IP based',
    },
  },
  {
    pattern: /\bknx\b/i,
    token: {
      name: 'KNX',
      icon: Cable,
      bg: 'bg-stone-700/90',
      fg: 'text-white',
      description: 'KNX bus',
    },
  },
  {
    pattern: /\b(433|rf|infrared|ir)\b/i,
    token: {
      name: 'RF',
      icon: SatelliteDish,
      bg: 'bg-orange-500/90',
      fg: 'text-white',
      description: 'RF/IR legacy radio',
    },
  },
];

/**
 * Canonical protocol definitions for admin selectors and UI badges
 */
export const COMMON_PROTOCOLS = [
  {
    name: 'WiFi',
    label: 'Wi-Fi',
    icon: Wifi,
    activeClass: 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/50 shadow-sm',
    badgeClass: 'bg-sky-500 text-white',
  },
  {
    name: 'Zigbee',
    label: 'Zigbee',
    icon: Radio,
    activeClass: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50 shadow-sm',
    badgeClass: 'bg-amber-500 text-white',
  },
  {
    name: 'Matter',
    label: 'Matter',
    icon: Cpu,
    activeClass: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 shadow-sm',
    badgeClass: 'bg-emerald-500 text-white',
  },
  {
    name: 'Thread',
    label: 'Thread',
    icon: Waves,
    activeClass: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/50 shadow-sm',
    badgeClass: 'bg-indigo-500 text-white',
  },
  {
    name: 'Bluetooth',
    label: 'Bluetooth',
    icon: Bluetooth,
    activeClass: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50 shadow-sm',
    badgeClass: 'bg-blue-500 text-white',
  },
  {
    name: 'RF 433 MHz',
    label: 'RF 433 MHz',
    icon: SatelliteDish,
    activeClass: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/50 shadow-sm',
    badgeClass: 'bg-orange-500 text-white',
  },
  {
    name: 'Z-Wave',
    label: 'Z-Wave',
    icon: Radio,
    activeClass: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/50 shadow-sm',
    badgeClass: 'bg-purple-500 text-white',
  },
];

/**
 * Extracts protocol tokens from a free-text protocol string. Returns up to
 * `max` recognisable chips (duplicates omitted), preserving first-seen order.
 * 
 * Enforces business rule: If a product supports Wi-Fi, remove the Zigbee badge
 * unless 'zigbee' is explicitly written in the product title.
 */
export function parseProtocols(
  protocol: string | null | undefined,
  productName?: string,
  max = 4
): ProtocolToken[] {
  if (!protocol) return [];
  const seen = new Set<string>();
  let tokens: ProtocolToken[] = [];
  for (const { pattern, token } of MATCHERS) {
    if (pattern.test(protocol) && !seen.has(token.name)) {
      seen.add(token.name);
      tokens.push(token);
      if (tokens.length >= max) break;
    }
  }

  // If both Wi-Fi and Zigbee are detected, only keep Zigbee if written in product title
  const hasWifi = tokens.some((t) => t.name === 'Wi-Fi');
  const hasZigbee = tokens.some((t) => t.name === 'Zigbee');
  if (hasWifi && hasZigbee) {
    const titleHasZigbee = productName ? /\bzigbee\b/i.test(productName) : false;
    if (!titleHasZigbee) {
      tokens = tokens.filter((t) => t.name !== 'Zigbee');
    }
  }

  return tokens;
}

/**
 * Returns a short label such as "Wi-Fi + Matter" derived from the parsed
 * tokens. Falls back to the raw input if nothing matched.
 */
export function protocolLabel(protocol: string | null | undefined, productName?: string): string {
  const tokens = parseProtocols(protocol, productName);
  if (tokens.length) return tokens.map((t) => t.name).join(' + ');
  return protocol?.trim() ?? '';
}
