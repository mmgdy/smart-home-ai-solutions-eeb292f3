import React, { useMemo } from 'react';
import { Wifi, Radio, Cpu, Waves, Bluetooth, SatelliteDish, Sparkles, Check, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { COMMON_PROTOCOLS } from '@/lib/protocolIcon';
import { useToast } from '@/hooks/use-toast';

interface ProtocolSelectorProps {
  value: string;
  onChange: (value: string) => void;
  productName?: string;
  className?: string;
}

export function detectProtocolFromName(name: string): string {
  if (!name) return 'WiFi';
  const lower = name.toLowerCase();
  
  const hasZigbee = /\bzigbee\b/i.test(lower);
  const hasWifi = /\b(wi-?fi|wlan)\b/i.test(lower);
  const hasMatter = /\bmatter\b/i.test(lower);
  const hasThread = /\bthread\b/i.test(lower);
  const hasBle = /\b(bluetooth|ble)\b/i.test(lower);
  const hasRf = /\b(433|433mhz|rf)\b/i.test(lower);
  const hasZwave = /\bz-?wave\b/i.test(lower);

  // If both Wi-Fi and Zigbee are explicitly mentioned
  if (hasWifi && hasZigbee) return 'WiFi / Zigbee';
  if (hasZigbee) return 'Zigbee';
  if (hasMatter) return 'Matter';
  if (hasThread) return 'Thread';
  if (hasBle) return 'Bluetooth';
  if (hasRf) return 'RF 433 MHz';
  if (hasZwave) return 'Z-Wave';
  
  // Default for smart devices in the store
  return 'WiFi';
}

export function ProtocolSelector({ value, onChange, productName = '', className = '' }: ProtocolSelectorProps) {
  const { toast } = useToast();

  // Active protocols parsing
  const activeTokens = useMemo(() => {
    if (!value) return new Set<string>();
    const active = new Set<string>();
    const str = value.toLowerCase();
    if (/\bwi-?fi\b/.test(str)) active.add('WiFi');
    if (/\bzigbee\b/.test(str)) active.add('Zigbee');
    if (/\bmatter\b/.test(str)) active.add('Matter');
    if (/\bthread\b/.test(str)) active.add('Thread');
    if (/\b(bluetooth|ble)\b/.test(str)) active.add('Bluetooth');
    if (/\b(433|rf)\b/.test(str)) active.add('RF 433 MHz');
    if (/\bz-?wave\b/.test(str)) active.add('Z-Wave');
    return active;
  }, [value]);

  const toggleProtocol = (protoName: string) => {
    const next = new Set(activeTokens);
    if (next.has(protoName)) {
      next.delete(protoName);
    } else {
      next.add(protoName);
    }

    if (next.size === 0) {
      onChange('');
      return;
    }

    // Preserve canonical ordering
    const ordered = COMMON_PROTOCOLS.filter((p) => next.has(p.name)).map((p) => p.name);
    onChange(ordered.join(' / '));
  };

  const handleAutoDetect = () => {
    const detected = detectProtocolFromName(productName);
    onChange(detected);
    toast({
      title: 'Protocol auto-detected',
      description: `Set protocol to "${detected}" based on product name.`,
    });
  };

  const hasWifiAndZigbee = activeTokens.has('WiFi') && activeTokens.has('Zigbee');
  const titleHasZigbee = /\bzigbee\b/i.test(productName);
  const showZigbeeWarning = hasWifiAndZigbee && !titleHasZigbee;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-sm font-semibold">Supported Wireless Protocols</Label>
        {productName && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoDetect}
            className="h-7 text-xs gap-1 border-primary/30 hover:bg-primary/10 text-primary"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Auto-detect from Name
          </Button>
        )}
      </div>

      {/* Protocol Toggle Chips */}
      <div className="flex flex-wrap gap-2">
        {COMMON_PROTOCOLS.map((proto) => {
          const Icon = proto.icon;
          const isActive = activeTokens.has(proto.name);
          return (
            <button
              key={proto.name}
              type="button"
              onClick={() => toggleProtocol(proto.name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isActive
                  ? `${proto.activeClass} ring-2 ring-primary/20 scale-[1.02]`
                  : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{proto.label}</span>
              {isActive && <Check className="w-3 h-3 ml-0.5" />}
            </button>
          );
        })}
      </div>

      {/* Quick Presets */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        <span className="text-[11px] text-muted-foreground mr-1">Presets:</span>
        <button
          type="button"
          onClick={() => onChange('WiFi')}
          className="text-[11px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
        >
          Wi-Fi Only
        </button>
        <button
          type="button"
          onClick={() => onChange('Zigbee')}
          className="text-[11px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
        >
          Zigbee Only
        </button>
        <button
          type="button"
          onClick={() => onChange('WiFi / Zigbee')}
          className="text-[11px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
        >
          WiFi + Zigbee
        </button>
        <button
          type="button"
          onClick={() => onChange('Matter')}
          className="text-[11px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
        >
          Matter
        </button>
        <button
          type="button"
          onClick={() => onChange('Thread')}
          className="text-[11px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
        >
          Thread
        </button>
        <button
          type="button"
          onClick={() => onChange('Bluetooth')}
          className="text-[11px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
        >
          Bluetooth
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[11px] px-2 py-0.5 rounded text-red-500 hover:bg-red-500/10 transition-colors ml-auto flex items-center gap-0.5"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Contextual Warning about WiFi / Zigbee rule */}
      {showZigbeeWarning && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <strong>Smart rule notice:</strong> This product is set to &ldquo;WiFi / Zigbee&rdquo;, but its title does not mention &ldquo;Zigbee&rdquo;. The storefront will only display the <strong>Wi-Fi</strong> badge to avoid misleading customers, per catalog rule.
          </div>
        </div>
      )}

      {/* Exact Database Value Input */}
      <div className="pt-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. WiFi, Zigbee, Matter, RS485…"
          className="h-8 text-xs font-mono"
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Exact database string saved to products table. Multi-select chips update this automatically.
        </p>
      </div>
    </div>
  );
}
