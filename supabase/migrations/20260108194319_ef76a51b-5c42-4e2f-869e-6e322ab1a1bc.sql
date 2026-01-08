-- First, clear existing dummy data and add new categories for smart home products
DELETE FROM products WHERE category_id IS NOT NULL;
DELETE FROM categories;

-- Insert smart home categories
INSERT INTO categories (id, name, slug, description, image_url) VALUES
  (gen_random_uuid(), 'Smart Switches', 'smart-switches', 'WiFi and Zigbee smart switches for lighting control', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'),
  (gen_random_uuid(), 'Smart Sensors', 'smart-sensors', 'Temperature, humidity, motion, and door/window sensors', 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400'),
  (gen_random_uuid(), 'Smart Hubs', 'smart-hubs', 'Central control hubs and gateways for smart home ecosystems', 'https://images.unsplash.com/photo-1556438064-2d7646166914?w=400'),
  (gen_random_uuid(), 'Smart Panels', 'smart-panels', 'Touch screen control panels for centralized home automation', 'https://images.unsplash.com/photo-1567201080580-bfcc97dae346?w=400'),
  (gen_random_uuid(), 'Smart Locks', 'smart-locks', 'Fingerprint, face recognition, and keypad smart door locks', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'),
  (gen_random_uuid(), 'Smart Plugs', 'smart-plugs', 'WiFi and Zigbee smart plugs for appliance control', 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400'),
  (gen_random_uuid(), 'Networking', 'networking', 'Routers, access points, and network switches', 'https://images.unsplash.com/photo-1617802690658-1173a812650d?w=400'),
  (gen_random_uuid(), 'Accessories', 'accessories', 'Cables, adapters, NFC tags, and other smart home accessories', 'https://images.unsplash.com/photo-1556438064-2d7646166914?w=400');