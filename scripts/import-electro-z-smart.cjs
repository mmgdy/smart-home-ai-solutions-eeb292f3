const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SUPABASE_URL = 'https://djsibxhkfvwtjzvnjmhp.supabase.co';
const KEY = 'sb_publishable_tfQAgq9bXUVRQnvZ1WjgWg_e7dF_T6W';
const TOKEN_FILE = path.join(__dirname, '../.admin_token_temp');
const PRODUCTS_FILE = path.join(__dirname, '../backups/electro_z_smart_products.json');

const CATEGORY_MAP = {
  'smart-locks': '61869110-4165-4bfe-80f1-af06217abd61', // Smart Locks
  'smart-switches': '934d2c8e-8e1f-459e-8dd4-d93520719215', // Smart Switches
  'smart-sensors': '0dc4982c-ac41-4201-aa69-3a7494ed0a7b', // Smart Sensors
  'smart-controllers': 'f6461e11-a1df-490f-b81f-34009d5e48e6', // Smart Panels
  'smart-hubs': '161fef6c-d985-427e-a31f-f5735b0fa4c3', // Smart Hubs
  'smart-plugs': '1b122176-06c8-440f-8a46-4e0855cbedea', // Smart Plugs
  'security-cameras': '0dc4982c-ac41-4201-aa69-3a7494ed0a7b', // Smart Sensors
  'smart-lighting': '934d2c8e-8e1f-459e-8dd4-d93520719215', // Smart Switches
  'smart-curtains': '934d2c8e-8e1f-459e-8dd4-d93520719215', // Smart Switches
  'smart-bundles': 'c73bb3ed-3b43-4f83-8759-a283ec7bdcf9', // Accessories
  'smart-accessories': 'c73bb3ed-3b43-4f83-8759-a283ec7bdcf9', // Accessories
};

function generateSlug(name, id) {
  let s = (name || '')
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  if (!s || s.length < 3) s = `product-${id}`;
  return `${s}-${id}`.slice(0, 90);
}

async function importProducts() {
  console.log('=== Starting Electro Z Smart Safe Import ===');

  if (!fs.existsSync(TOKEN_FILE)) {
    throw new Error('Admin token file not found at: ' + TOKEN_FILE);
  }
  const token = fs.readFileSync(TOKEN_FILE, 'utf8').trim();

  if (!fs.existsSync(PRODUCTS_FILE)) {
    throw new Error('Products JSON file not found at: ' + PRODUCTS_FILE);
  }
  const rawProducts = JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
  console.log(`Loaded ${rawProducts.length} extracted products.`);

  // Fetch all existing products from DB (handling pagination to get all rows)
  let allExisting = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name,slug,price&limit=${pageSize}&offset=${from}`, {
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`
      }
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to fetch existing products (${res.status}): ${errText}`);
    }
    const chunk = await res.json();
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    allExisting.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }
  console.log(`Found ${allExisting.length} existing products in Supabase.`);

  const usedSlugs = new Set(allExisting.map(p => (p.slug || '').toLowerCase().trim()));
  const usedIds = new Set(allExisting.map(p => p.id));
  const existingNameMap = new Map();
  for (const p of allExisting) {
    if (p.name) existingNameMap.set(p.name.toLowerCase().trim(), p);
  }

  const assignedInBatchIds = new Set();
  const toUpsert = [];
  let newCount = 0;
  let updateCount = 0;

  for (const p of rawProducts) {
    const normName = (p.name || '').toLowerCase().trim();
    const existing = existingNameMap.get(normName);

    const categoryId = CATEGORY_MAP[p.category] || CATEGORY_MAP['smart-accessories'];

    let id;
    let slug;

    if (existing && !assignedInBatchIds.has(existing.id)) {
      // Re-use existing id
      id = existing.id;
      slug = existing.slug;
      updateCount++;
    } else {
      // Create new unique ID & Slug
      id = crypto.randomUUID();
      let baseSlug = generateSlug(p.slug || p.name, p.source_id);
      slug = baseSlug;
      let counter = 1;
      while (usedSlugs.has(slug.toLowerCase())) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      usedSlugs.add(slug.toLowerCase());
      newCount++;
    }

    assignedInBatchIds.add(id);

    toUpsert.push({
      id: id,
      name: p.name,
      slug: slug,
      description: (p.description ? p.description.slice(0, 2000) : p.name).replace(/Electro Z Smart Store/gi, 'AzkaSmart Store'),
      price: Math.max(1, Math.round(p.price || 0)),
      original_price: p.original_price ? Math.max(1, Math.round(p.original_price)) : null,
      category_id: categoryId,
      image_url: p.image_url || null,
      images: Array.isArray(p.gallery_images) && p.gallery_images.length > 0 ? p.gallery_images : (p.image_url ? [p.image_url] : []),
      brand: p.brand || 'Smart Home',
      protocol: 'WiFi / Zigbee',
      stock: p.in_stock ? 15 : 0,
      featured: false,
      is_published: true,
      sku: p.sku || `SKU-${p.source_id}`,
      specifications: {
        StockStatus: p.stock_status,
        Categories: p.source_categories || [],
      },
      updated_at: new Date().toISOString(),
    });
  }

  console.log(`Prepared ${toUpsert.length} products total: ${newCount} NEW, ${updateCount} to UPDATE.`);

  // Upload in smaller batches of 25 to guarantee clean individual error isolation
  const BATCH_SIZE = 25;
  let totalSaved = 0;
  let errorCount = 0;

  for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
    const chunk = toUpsert.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toUpsert.length / BATCH_SIZE);

    process.stdout.write(`Uploading batch ${batchNum}/${totalBatches} (${chunk.length} items)... `);

    const upRes = await fetch(`${SUPABASE_URL}/functions/v1/backup-manager`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'restore-backup',
        token: token,
        selectedTables: ['products'],
        mode: 'merge',
        backupData: {
          tables: {
            products: chunk
          }
        }
      })
    });

    const data = await upRes.json();
    if (data.success && data.report?.products?.insertedOrUpdated) {
      totalSaved += data.report.products.insertedOrUpdated;
      console.log(`✓ (Total: ${totalSaved}/${toUpsert.length})`);
    } else {
      console.log(`✗ Error:`, data.report?.products?.errors || data.error);
      errorCount++;
    }
  }

  console.log('\n=== Import Complete ===');
  console.log(`Successfully upserted: ${totalSaved} products.`);
  console.log(`Failed batches: ${errorCount}`);

  // Check final count in DB
  const countRes = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Prefer: 'count=exact', Range: '0-0' }
  });
  console.log('Final total products count in Supabase:', countRes.headers.get('content-range'));

  return { totalSaved, errorCount };
}

importProducts().catch((err) => {
  console.error('Import failed with exception:', err);
  process.exit(1);
});
