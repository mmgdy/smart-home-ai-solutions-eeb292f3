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
 * Extracts protocol tokens from a free-text protocol string. Returns up to
 * `max` recognisable chips (duplicates omitted), preserving first-seen order.
 */
export function parseProtocols(protocol: string | null | undefined, max = 4): ProtocolToken[] {
  if (!protocol) return [];
  const seen = new Set<string>();
  const tokens: ProtocolToken[] = [];
  for (const { pattern, token } of MATCHERS) {
    if (pattern.test(protocol) && !seen.has(token.name)) {
      seen.add(token.name);
      tokens.push(token);
      if (tokens.length >= max) break;
    }
  }
  return tokens;
}

/**
 * Returns a short label such as "Wi-Fi + Matter" derived from the parsed
 * tokens. Falls back to the raw input if nothing matched.
 */
export function protocolLabel(protocol: string | null | undefined): string {
  const tokens = parseProtocols(protocol);
  if (tokens.length) return tokens.map((t) => t.name).join(' + ');
  return protocol?.trim() ?? '';
}
