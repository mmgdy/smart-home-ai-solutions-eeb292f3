import type { Product } from '@/types/store';

export type DependencyRelationType = 'required' | 'recommended' | 'accessory';

export interface ProductDependencyRecord {
  dependent_product_id: string;
  relation_type: DependencyRelationType;
  sort_order: number;
  default_checked: boolean;
}

export interface ResolvedDependencyItem {
  product: Product;
  relation_type: DependencyRelationType;
  sort_order: number;
  default_checked: boolean;
  source: 'manual' | 'auto';
  available: boolean;
}

export const DEPENDENCIES_SITE_INFO_SECTION = 'product_dependencies';

const MAX_AUTO_SUGGESTIONS = 6;

const VALID_RELATION_TYPES = new Set<DependencyRelationType>([
  'required',
  'recommended',
  'accessory',
]);

export function parseManualDependencies(rawValue: string | null | undefined): ProductDependencyRecord[] {
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const list: ProductDependencyRecord[] = [];
    parsed.forEach((entry: any, idx: number) => {
      const id = typeof entry?.dependent_product_id === 'string' ? entry.dependent_product_id.trim() : '';
      if (!id || seen.has(id)) return;
      seen.add(id);
      const rel: DependencyRelationType = VALID_RELATION_TYPES.has(entry?.relation_type)
        ? entry.relation_type
        : 'recommended';
      list.push({
        dependent_product_id: id,
        relation_type: rel,
        sort_order: Number.isFinite(Number(entry?.sort_order)) ? Number(entry.sort_order) : idx,
        default_checked: Boolean(entry?.default_checked),
      });
    });
    return list.sort((a, b) => a.sort_order - b.sort_order);
  } catch {
    return [];
  }
}

export function resolveManualDependencies(
  mainProductId: string,
  records: ProductDependencyRecord[],
  allProducts: Product[],
  hiddenIds: Set<string>,
): ResolvedDependencyItem[] {
  if (!records.length) return [];
  const byId = new Map(allProducts.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const resolved: ResolvedDependencyItem[] = [];

  for (const rec of [...records].sort((a, b) => a.sort_order - b.sort_order)) {
    const targetId = rec.dependent_product_id;
    if (!targetId || targetId === mainProductId || seen.has(targetId)) continue;
    const prod = byId.get(targetId);
    if (!prod || hiddenIds.has(prod.id)) continue;
    seen.add(targetId);

    const available = (prod.stock ?? 0) > 0;
    resolved.push({
      product: prod,
      relation_type: rec.relation_type,
      sort_order: rec.sort_order,
      default_checked: available ? Boolean(rec.default_checked) : false,
      source: 'manual',
      available,
    });
  }

  return resolved;
}

function getBrandKey(p: Pick<Product, 'brand' | 'name'>): string {
  const brand = (p.brand || '').trim().toLowerCase();
  const text = `${brand} ${p.name || ''}`.toLowerCase();
  if (/\baqara\b/.test(text)) return 'aqara';
  if (/\bsonoff\b|\bewelink\b/.test(text)) return 'sonoff';
  if (/\bezviz\b/.test(text)) return 'ezviz';
  if (/\bhikvision\b/.test(text)) return 'hikvision';
  if (/\bruijie\b|\breyee\b/.test(text)) return 'ruijie';
  if (/\btp-?link\b|\btapo\b|\bomada\b/.test(text)) return 'tp-link';
  if (/\bzosar\b|k\.?zosar|k zosar|\btuya\b/.test(text)) return 'zosar';
  if (/\bamazon\b|\becho\b/.test(text)) return 'amazon';
  if (/\bapple\b|\bipad\b/.test(text)) return 'apple';
  return brand;
}

function isZigbeeProto(p: Pick<Product, 'protocol' | 'name'>): boolean {
  return (
    /\bzigbee\b/i.test(p.protocol || '') ||
    /\b(zigbee|snzb|zbmini|zbm5|mini-zb|zbdim|zbrbs|trvzb|zbbridge|ihost)\b/i.test(p.name || '')
  );
}

function isWifiProto(p: Pick<Product, 'protocol' | 'name'>): boolean {
  return /\bwi-?fi\b/i.test(p.protocol || '') || /\b(wi-?fi|minir4|pow|dualr|tx ultimate|nspanel)\b/i.test(p.name || '');
}

function isThreadProto(p: Pick<Product, 'protocol' | 'name'>): boolean {
  return /\bthread\b/i.test(p.protocol || '') || /\bthread\b/i.test(p.name || '');
}

export function isPassiveAccessory(p: Pick<Product, 'name'>): boolean {
  const name = (p.name || '').toLowerCase();
  if (/\baccess point\b/i.test(name)) return false;
  if (/\bipad\b/i.test(name) && /\b(\d+\s*gb|a\d+|m\d+|wi-?fi)\b/i.test(name) && !/\bmount\b/i.test(name)) {
    return false;
  }
  if (/\becho\b/i.test(name) && /\b(smart display|smart speaker|smart alarm|with alexa|with fire tv|2nd gen|2025 release)\b/i.test(name)) {
    return false;
  }
  return /\b(wall mount|tablet wall mount|home hub mount|adjustable stand|desk enclosure|switch enclosure|wall switch cover|eu cylinder|lock cards|wristband|white card|keyfob|zl-bracket|u-bracket|extension cable)\b/i.test(name);
}

function isDedicatedZigbeeHub(p: Product): boolean {
  const name = p.name || '';
  if (isPassiveAccessory(p)) return false;
  if (!isZigbeeProto(p)) return false;
  return /\b(hub|bridge|gateway|dongle|ihost|nspanel pro)\b/i.test(name) && !/\bcamera hub\b/i.test(name);
}

function isAnyZigbeeHub(p: Product): boolean {
  if (isDedicatedZigbeeHub(p)) return true;
  if (isPassiveAccessory(p)) return false;
  return isZigbeeProto(p) && /\bcamera hub\b/i.test(p.name || '');
}

function isThreadBorderRouter(p: Product): boolean {
  if (isPassiveAccessory(p)) return false;
  return isThreadProto(p) && /\b(hub|border router|echo show 8|echo hub)\b/i.test(p.name || '');
}

function isZigbeeSensorOrSwitch(p: Product): boolean {
  if (isPassiveAccessory(p) || isAnyZigbeeHub(p)) return false;
  if (/\b(echo show|echo hub|echo dot)\b/i.test(p.name || '')) return false;
  return isZigbeeProto(p);
}

function isSensorProduct(p: Product): boolean {
  const cat = (p.category?.name || '').toLowerCase();
  const name = p.name || '';
  return (cat === 'smart sensors' && !/\bcamera\b/i.test(name)) || /\b(sensor|detector|valve|trv|scene button)\b/i.test(name);
}

export function generateAutoDependencies(
  product: Product,
  catalog: Product[],
  hiddenIds: Set<string>,
): ResolvedDependencyItem[] {
  if (isPassiveAccessory(product)) return [];

  const pool = catalog.filter(
    (p) => p.id !== product.id && !hiddenIds.has(p.id) && (p.stock ?? 0) > 0,
  );
  if (!pool.length) return [];

  const picked = new Set<string>();
  const pickedNames = new Set<string>();
  const results: ResolvedDependencyItem[] = [];
  const pushItem = (candidate: Product | undefined, relation: DependencyRelationType) => {
    if (!candidate || picked.has(candidate.id) || results.length >= MAX_AUTO_SUGGESTIONS) return;
    const normName = (candidate.name || '').trim().toLowerCase();
    if (normName && pickedNames.has(normName)) return;
    picked.add(candidate.id);
    if (normName) pickedNames.add(normName);
    results.push({
      product: candidate,
      relation_type: relation,
      sort_order: results.length,
      default_checked: false,
      source: 'auto',
      available: true,
    });
  };

  const name = (product.name || '').toLowerCase();
  const cat = (product.category?.name || '').toLowerCase();
  const brandKey = getBrandKey(product);

  // 1. Tablets & Smart Displays -> matching wall mounts / stands
  if (/\becho show 8\b/i.test(name)) {
    pool
      .filter((c) => /\becho show 8\b.*\bstand\b/i.test(c.name))
      .forEach((c) => pushItem(c, 'accessory'));
    return results;
  }

  if (/\bipad\b/i.test(name)) {
    const ipadFirst = pool
      .filter((c) => /\b(ipad.*mount|tablet.*wall mount|home hub mount)\b/i.test(c.name))
      .sort((a, b) => {
        const aIpad = /\bipad\b/i.test(a.name) ? 0 : 1;
        const bIpad = /\bipad\b/i.test(b.name) ? 0 : 1;
        return aIpad - bIpad || a.price - b.price;
      });
    ipadFirst.forEach((c) => pushItem(c, 'accessory'));
    return results;
  }

  if (/\bnspanel\b/i.test(name)) {
    const stands = pool.filter((c) => /\bnspanel\b.*\bstand\b|\bstand\b.*\bnspanel\b/i.test(c.name));
    stands.forEach((c) => pushItem(c, 'accessory'));
    if (/\bnspanel pro\b/i.test(name)) {
      pool
        .filter((c) => isZigbeeSensorOrSwitch(c) && getBrandKey(c) === 'sonoff')
        .slice(0, 4)
        .forEach((c) => pushItem(c, 'recommended'));
    }
    return results;
  }

  // 2. Access Points -> PoE switch / router of the same brand
  if (/\baccess point\b|\brg-rap\b|\beap\d/i.test(name)) {
    const sameBrandPool = brandKey ? pool.filter((c) => getBrandKey(c) === brandKey) : pool;
    const poeSwitches = sameBrandPool.filter((c) => /\bpoe\b.*\bswitch\b|\bswitch\b.*\bpoe\b/i.test(c.name));
    const routers = sameBrandPool.filter((c) => /\brouter\b/i.test(c.name));
    const otherSwitches = sameBrandPool.filter((c) => /\bswitch\b/i.test(c.name));
    [...poeSwitches, ...routers, ...otherSwitches].forEach((c) => pushItem(c, 'recommended'));
    return results;
  }

  // Wired unmanaged / PoE switches have no automatic dependencies unless set manually
  if (cat === 'networking' && /\b(unmanaged switch|poe.*switch|desktop switch)\b/i.test(name)) {
    return [];
  }

  // 3. Smart Locks -> compatible same-ecosystem hub (if Zigbee/Thread) + door/window sensor + camera/doorbell
  const isConsumerSmartLock =
    (/\bsmart\b.*\block\b|\blevana\b|\blezn\b|\bbosch\b.*\bface\b|\bezviz dl/i.test(name) ||
      (cat === 'smart locks' && !/\b(access control|magnetic|drop bolt|electric strike|keypad|reader|bracket)\b/i.test(name)));

  if (isConsumerSmartLock) {
    if (isZigbeeProto(product) && brandKey) {
      pool
        .filter((c) => isDedicatedZigbeeHub(c) && getBrandKey(c) === brandKey)
        .sort((a, b) => a.price - b.price)
        .slice(0, 2)
        .forEach((c) => pushItem(c, 'required'));
    } else if (isThreadProto(product) && brandKey) {
      pool
        .filter((c) => isThreadBorderRouter(c) && getBrandKey(c) === brandKey)
        .sort((a, b) => a.price - b.price)
        .slice(0, 2)
        .forEach((c) => pushItem(c, 'required'));
    }

    const doorSensors = pool
      .filter((c) => /\bdoor.*window sensor\b|\bdoor\/window sensor\b/i.test(c.name) && !isPassiveAccessory(c))
      .sort((a, b) => (getBrandKey(a) === brandKey ? 0 : 1) - (getBrandKey(b) === brandKey ? 0 : 1));
    doorSensors.slice(0, 2).forEach((c) => pushItem(c, 'recommended'));

    const sameBrandCamsAndDoorbells = pool.filter(
      (c) => getBrandKey(c) === brandKey && /\b(doorbell|camera hub|camera)\b/i.test(c.name) && !isPassiveAccessory(c),
    );
    const generalDoorbellsAndCams = sameBrandCamsAndDoorbells.length
      ? sameBrandCamsAndDoorbells
      : pool.filter((c) => /\b(video doorbell|indoor camera|pan.*tilt)\b/i.test(c.name) && !isPassiveAccessory(c));
    generalDoorbellsAndCams.slice(0, 3).forEach((c) => pushItem(c, 'recommended'));
    return results;
  }

  // 4. Zigbee Sensors / Switches -> Required Zigbee hub/bridge (same brand first) + same-brand Zigbee sensors/switches
  if (isZigbeeSensorOrSwitch(product)) {
    let hubs: Product[] = [];
    if (brandKey === 'aqara') {
      const dedicated = pool.filter((c) => isDedicatedZigbeeHub(c) && getBrandKey(c) === 'aqara');
      const camHubs = pool.filter((c) => isAnyZigbeeHub(c) && !isDedicatedZigbeeHub(c) && getBrandKey(c) === 'aqara');
      hubs = [...dedicated.sort((a, b) => a.price - b.price), ...camHubs];
    } else if (brandKey === 'sonoff') {
      const dedicated = pool
        .filter((c) => isDedicatedZigbeeHub(c) && getBrandKey(c) === 'sonoff')
        .sort((a, b) => {
          const score = (x: Product) => (/zbbridge/i.test(x.name) ? 0 : /ihost/i.test(x.name) ? 1 : /nspanel pro/i.test(x.name) ? 2 : 3);
          return score(a) - score(b) || a.price - b.price;
        });
      hubs = dedicated;
    } else {
      const sameBrandHubs = brandKey ? pool.filter((c) => isAnyZigbeeHub(c) && getBrandKey(c) === brandKey) : [];
      const universalHubs = pool.filter((c) => isDedicatedZigbeeHub(c) && getBrandKey(c) !== 'aqara');
      hubs = [...sameBrandHubs, ...universalHubs].sort((a, b) => a.price - b.price);
    }

    hubs.slice(0, 2).forEach((c) => pushItem(c, 'required'));

    const productIsSensor = isSensorProduct(product);
    const relatedSameBrand = pool
      .filter((c) => isZigbeeSensorOrSwitch(c) && (!brandKey || getBrandKey(c) === brandKey))
      .sort((a, b) => {
        const aWantSensor = isSensorProduct(a) ? 0 : 1;
        const bWantSensor = isSensorProduct(b) ? 0 : 1;
        // Prefer complementary types (sensors with sensors, switches with sensors too)
        if (productIsSensor && aWantSensor !== bWantSensor) return aWantSensor - bWantSensor;
        if (!productIsSensor && aWantSensor !== bWantSensor) return aWantSensor - bWantSensor;
        return a.price - b.price;
      });
    relatedSameBrand.forEach((c) => pushItem(c, 'recommended'));
    return results;
  }

  // 4b. Matter-over-Thread Sensors / Switches (non-Zigbee) -> same-brand Thread Border Router + related Thread devices
  if (isThreadProto(product) && !isZigbeeProto(product) && !isThreadBorderRouter(product)) {
    const threadHubs = pool
      .filter((c) => isThreadBorderRouter(c) && (!brandKey || getBrandKey(c) === brandKey))
      .sort((a, b) => a.price - b.price);
    threadHubs.slice(0, 2).forEach((c) => pushItem(c, 'required'));
    pool
      .filter((c) => isThreadProto(c) && !isThreadBorderRouter(c) && (!brandKey || getBrandKey(c) === brandKey))
      .forEach((c) => pushItem(c, 'recommended'));
    return results;
  }

  // 5. Cameras / Video Doorbells / Intercom Stations -> indoor monitor / doorbell / same-brand cameras
  if (/\b(camera|cam-|video doorbell|doorbell|door station|indoor station)\b/i.test(name)) {
    const sameBrand = brandKey ? pool.filter((c) => getBrandKey(c) === brandKey && !isPassiveAccessory(c)) : [];
    const monitors = sameBrand.filter((c) => /\b(indoor station|monitor|screen|intercom kit)\b/i.test(c.name));
    const doorbells = sameBrand.filter((c) => /\bdoorbell\b/i.test(c.name));
    const cameras = sameBrand.filter((c) => /\b(camera|cam-|cam )\b/i.test(c.name));

    if (/\bcamera hub\b/i.test(name)) {
      const hubSensors = sameBrand.filter((c) => isZigbeeSensorOrSwitch(c) && isSensorProduct(c));
      hubSensors.slice(0, 3).forEach((c) => pushItem(c, 'recommended'));
    }

    [...monitors, ...doorbells, ...cameras].forEach((c) => pushItem(c, 'recommended'));
    return results;
  }

  // 6. Wi-Fi Switches / Modules / Relays -> scene controller / IR remote / related same-brand switches
  const isWifiControlDevice =
    isWifiProto(product) &&
    !isZigbeeProto(product) &&
    (cat === 'smart switches' ||
      cat === 'smart plugs' ||
      /\b(switch|relay|dimmer|minir4|dualr|pow|basic|tx ultimate|m5|thr\d|plug|socket)\b/i.test(name));

  if (isWifiControlDevice) {
    if (/\btx ultimate\b/i.test(name)) {
      pool
        .filter((c) => /\btx ultimate\b.*\bcover\b/i.test(c.name))
        .slice(0, 2)
        .forEach((c) => pushItem(c, 'accessory'));
    }

    const sceneControllers = pool
      .filter((c) => /\b(scene controller|switchman r5|s-mate)\b/i.test(c.name))
      .sort((a, b) => (getBrandKey(a) === brandKey ? 0 : 1) - (getBrandKey(b) === brandKey ? 0 : 1));
    sceneControllers.slice(0, 2).forEach((c) => pushItem(c, 'recommended'));

    const irRemotes = pool.filter((c) => /\bir remote\b/i.test(c.name));
    irRemotes.slice(0, 1).forEach((c) => pushItem(c, 'recommended'));

    const relatedSwitches = pool
      .filter(
        (c) =>
          (!brandKey || getBrandKey(c) === brandKey) &&
          !isPassiveAccessory(c) &&
          isWifiProto(c) &&
          /\b(switch|relay|dimmer|minir4|dualr|pow|tx|m5|plug|scene)\b/i.test(c.name),
      )
      .sort((a, b) => a.price - b.price);
    relatedSwitches.forEach((c) => pushItem(c, 'recommended'));
    return results;
  }

  return results;
}
