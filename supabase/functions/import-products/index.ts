import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Egyptian market price mapping based on Amazon.eg and Noon.com research
// Prices in EGP for common SONOFF products
const EGYPT_PRICE_MAP: Record<string, number> = {
  // SONOFF WiFi Switches
  'basic': 420,
  'basicr2': 420,
  'basicr3': 450,
  'minir2': 546,
  'minir4': 808,
  'minir4m': 1000,
  'mini-d': 890,
  's26': 560,
  'th origin': 650,
  'th elite': 750,
  'pow origin': 850,
  'powr2': 750,
  'powr3': 950,
  '4ch': 1500,
  '4chr3': 1800,
  '4chpror3': 2018,
  'dualr3': 900,
  // Touch Switches
  'tx': 850,
  't0': 750,
  't1': 850,
  't2': 950,
  't3': 1100,
  't5': 1484,
  'm5': 1334,
  'm5 1c': 850,
  'm5 2c': 1100,
  'm5 3c': 1334,
  // Sensors
  'dw2': 799,
  'snzb-01': 350,
  'snzb-02': 450,
  'snzb-02d': 600,
  'snzb-02p': 500,
  'snzb-03': 400,
  'snzb-03p': 450,
  'snzb-04': 350,
  'snzb-05': 550,
  'snzb-06': 650,
  'snzb-06p': 750,
  // Hubs & Bridges
  'zbbridge': 800,
  'zb bridge': 800,
  'zbbridge-p': 950,
  'zbbridge-u': 1500,
  'zbdongle': 750,
  'zbdongle-e': 950,
  'zbdongle-p': 850,
  'ihost': 2500,
  'nspanel': 2200,
  'nspanel pro': 4500,
  // Accessories
  'nfc': 200,
  'ths01': 300,
  'r5': 500,
  's-mate': 450,
  's-mate2': 550,
  'rf bridge': 600,
};

// USD to EGP conversion rate for products not in the map
const USD_TO_EGP = 50;

// Price threshold - products below this are likely in USD and need conversion
const USD_PRICE_THRESHOLD = 100;

// Brand keywords that typically have EGP prices already
const EGP_BRANDS = ['moes', 'lezn', 'akubela', 'aruba', 'tp-link', 'archer', 'tapo'];

interface ParsedProduct {
  name: string;
  sku: string;
  description: string;
  short_description: string;
  price: number;
  sale_price: number | null;
  images: string[];
  category: string;
  brand: string;
  type: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

function determineBrand(name: string): string {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('sonoff')) return 'SONOFF';
  if (nameLower.includes('moes')) return 'MOES';
  if (nameLower.includes('lezn')) return 'Lezn';
  if (nameLower.includes('akubela') || nameLower.includes('hypanel')) return 'Akubela';
  if (nameLower.includes('aruba')) return 'Aruba';
  if (nameLower.includes('tp-link') || nameLower.includes('archer') || nameLower.includes('tapo')) return 'TP-Link';
  return '';
}

function determineProtocol(name: string, description: string): string {
  const text = (name + ' ' + description).toLowerCase();
  if (text.includes('zigbee')) return 'Zigbee';
  if (text.includes('z-wave')) return 'Z-Wave';
  if (text.includes('matter')) return 'Matter';
  if (text.includes('thread')) return 'Thread';
  if (text.includes('wifi') || text.includes('wi-fi')) return 'WiFi';
  if (text.includes('bluetooth')) return 'Bluetooth';
  if (text.includes('rf ') || text.includes('433')) return 'RF 433MHz';
  return 'WiFi';
}

function determineCategory(name: string, description: string): string {
  const text = (name + ' ' + description).toLowerCase();
  
  // Smart Locks
  if (text.includes('lock') || text.includes('door lock')) return 'smart-locks';
  
  // Smart Panels
  if (text.includes('panel') || text.includes('hypanel') || text.includes('nspanel')) return 'smart-panels';
  
  // Smart Hubs
  if (text.includes('hub') || text.includes('gateway') || text.includes('bridge') || 
      text.includes('ihost') || text.includes('dongle')) return 'smart-hubs';
  
  // Smart Sensors
  if (text.includes('sensor') || text.includes('snzb') || text.includes('motion') || 
      text.includes('temperature') || text.includes('humidity') || text.includes('leak') ||
      text.includes('door/window') || text.includes('pir')) return 'smart-sensors';
  
  // Smart Plugs
  if (text.includes('plug') || text.includes('socket') || text.includes('s26') ||
      text.includes('s40') || text.includes('s31')) return 'smart-plugs';
  
  // Networking
  if (text.includes('router') || text.includes('switch') && text.includes('port') ||
      text.includes('access point') || text.includes('aruba') || text.includes('archer')) return 'networking';
  
  // Smart Switches
  if (text.includes('switch') || text.includes('mini') || text.includes('basic') ||
      text.includes('relay') || text.includes('dimmer')) return 'smart-switches';
  
  return 'accessories';
}

function convertToEgyptPrice(price: number, name: string): number {
  const nameLower = name.toLowerCase();
  const brand = determineBrand(name).toLowerCase();
  
  // If it's a brand that typically has EGP prices, return as-is
  if (EGP_BRANDS.some(b => nameLower.includes(b))) {
    return price;
  }
  
  // Check for exact matches in our price map
  for (const [keyword, egpPrice] of Object.entries(EGYPT_PRICE_MAP)) {
    if (nameLower.includes(keyword.toLowerCase())) {
      return egpPrice;
    }
  }
  
  // If price is below threshold, it's likely USD - convert
  if (price < USD_PRICE_THRESHOLD) {
    return Math.round(price * USD_TO_EGP);
  }
  
  // Otherwise return as-is (likely already EGP)
  return price;
}

function cleanDescription(html: string): string {
  // Remove HTML tags and clean up
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
    .slice(0, 500);
}

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 100);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get CSV content from request body
    const { csvContent } = await req.json();
    
    if (!csvContent) {
      return new Response(
        JSON.stringify({ error: 'No CSV content provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, slug');
    
    if (catError) throw catError;

    const categoryMap = new Map(categories.map(c => [c.slug, c.id]));

    // Parse CSV
    const lines = csvContent.split('\n');
    const headers = parseCSVLine(lines[0]);
    
    // Find column indices
    const nameIdx = headers.findIndex(h => h.toLowerCase() === 'name');
    const typeIdx = headers.findIndex(h => h.toLowerCase() === 'type');
    const skuIdx = headers.findIndex(h => h.toLowerCase() === 'sku');
    const descIdx = headers.findIndex(h => h.toLowerCase() === 'description');
    const shortDescIdx = headers.findIndex(h => h.toLowerCase() === 'short description');
    const priceIdx = headers.findIndex(h => h.toLowerCase() === 'regular price');
    const salePriceIdx = headers.findIndex(h => h.toLowerCase() === 'sale price');
    const imagesIdx = headers.findIndex(h => h.toLowerCase() === 'images');
    const categoryIdx = headers.findIndex(h => h.toLowerCase() === 'categories');
    const publishedIdx = headers.findIndex(h => h.toLowerCase() === 'published');

    const products: any[] = [];
    const slugCount = new Map<string, number>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      
      const type = values[typeIdx]?.toLowerCase() || '';
      // Skip variable products (parent items) and variations that have parent
      if (type === 'variable' || type === 'variation') continue;
      
      const published = values[publishedIdx];
      if (published !== '1') continue;

      const name = values[nameIdx]?.trim();
      if (!name || name.length < 3) continue;

      // Skip furniture and non-smart-home products
      const nameLower = name.toLowerCase();
      if (nameLower.includes('chair') || nameLower.includes('table') || 
          nameLower.includes('furniture') || nameLower.includes('drawer') ||
          nameLower.includes('vitra') || nameLower.includes('magisso')) continue;

      const rawPrice = values[priceIdx]?.replace(',', '.').replace(/[^0-9.]/g, '') || '0';
      const price = parseFloat(rawPrice) || 0;
      if (price <= 0) continue;

      const rawSalePrice = values[salePriceIdx]?.replace(',', '.').replace(/[^0-9.]/g, '') || '';
      const salePrice = parseFloat(rawSalePrice) || null;

      const description = cleanDescription(values[descIdx] || values[shortDescIdx] || '');
      const images = (values[imagesIdx] || '').split(',').map(s => s.trim()).filter(Boolean);
      const brand = determineBrand(name);
      const protocol = determineProtocol(name, description);
      const categorySlug = determineCategory(name, description);
      const categoryId = categoryMap.get(categorySlug) || categoryMap.get('accessories');

      // Convert price to Egyptian market price
      const egpPrice = convertToEgyptPrice(price, name);
      const egpSalePrice = salePrice ? convertToEgyptPrice(salePrice, name) : null;

      // Create unique slug
      let baseSlug = createSlug(name);
      const count = slugCount.get(baseSlug) || 0;
      slugCount.set(baseSlug, count + 1);
      const slug = count > 0 ? `${baseSlug}-${count}` : baseSlug;

      products.push({
        name,
        slug,
        description: description || null,
        price: egpPrice,
        original_price: egpSalePrice && egpSalePrice < egpPrice ? egpPrice : null,
        category_id: categoryId,
        image_url: images[0] || null,
        images: images.slice(1),
        brand: brand || null,
        protocol: protocol || null,
        specifications: {},
        stock: 100,
        featured: false,
      });
    }

    // Insert products in batches
    const batchSize = 50;
    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const { error } = await supabase.from('products').insert(batch);
      
      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize)}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_parsed: products.length,
        inserted,
        errors: errors.length > 0 ? errors : undefined,
        sample: products.slice(0, 5).map(p => ({ name: p.name, price: p.price, category: p.category_id }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
