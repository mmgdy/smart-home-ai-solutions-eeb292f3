-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  brand TEXT,
  protocol TEXT,
  specifications JSONB DEFAULT '{}',
  stock INTEGER NOT NULL DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL,
  shipping_address JSONB,
  stripe_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Categories: Public read access
CREATE POLICY "Categories are viewable by everyone" 
ON public.categories FOR SELECT 
USING (true);

-- Products: Public read access
CREATE POLICY "Products are viewable by everyone" 
ON public.products FOR SELECT 
USING (true);

-- Orders: Users can view their own orders
CREATE POLICY "Users can view their own orders" 
ON public.orders FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Order items: Users can view items from their orders
CREATE POLICY "Users can view their order items" 
ON public.order_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
  )
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample categories
INSERT INTO public.categories (name, slug, description) VALUES
  ('Lighting', 'lighting', 'Smart bulbs, switches, and lighting controls'),
  ('Security', 'security', 'Cameras, sensors, and smart locks'),
  ('Climate', 'climate', 'Thermostats and climate control devices'),
  ('Entertainment', 'entertainment', 'Smart speakers, TVs, and audio systems'),
  ('Hubs & Controllers', 'hubs-controllers', 'Central control units and smart home hubs');

-- Insert sample products
INSERT INTO public.products (name, slug, description, price, original_price, category_id, brand, protocol, stock, featured, image_url) VALUES
  ('Smart LED Bulb Pro', 'smart-led-bulb-pro', 'RGBW smart bulb with 16 million colors and voice control', 29.99, 39.99, (SELECT id FROM categories WHERE slug = 'lighting'), 'Philips Hue', 'Zigbee', 50, true, 'https://images.unsplash.com/photo-1558171813-4c088753af8f?w=400'),
  ('Motion Sensor Elite', 'motion-sensor-elite', 'Advanced PIR motion sensor with temperature and humidity', 34.99, NULL, (SELECT id FROM categories WHERE slug = 'security'), 'Aqara', 'Zigbee', 30, false, 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400'),
  ('Smart Thermostat X', 'smart-thermostat-x', 'Learning thermostat that saves energy automatically', 199.99, 249.99, (SELECT id FROM categories WHERE slug = 'climate'), 'Nest', 'WiFi', 20, true, 'https://images.unsplash.com/photo-1567201080580-bfcc97dae346?w=400'),
  ('Indoor Security Camera', 'indoor-security-camera', '1080p HD camera with night vision and two-way audio', 79.99, NULL, (SELECT id FROM categories WHERE slug = 'security'), 'Ring', 'WiFi', 40, true, 'https://images.unsplash.com/photo-1617802690658-1173a812650d?w=400'),
  ('Smart Home Hub', 'smart-home-hub', 'Central hub supporting Zigbee, Z-Wave, and WiFi devices', 149.99, 179.99, (SELECT id FROM categories WHERE slug = 'hubs-controllers'), 'Samsung SmartThings', 'Multi-protocol', 25, true, 'https://images.unsplash.com/photo-1556438064-2d7646166914?w=400'),
  ('Smart Door Lock', 'smart-door-lock', 'Keyless entry with fingerprint, code, and app control', 249.99, NULL, (SELECT id FROM categories WHERE slug = 'security'), 'August', 'WiFi', 15, false, 'https://images.unsplash.com/photo-1558002038-bb0237f4b920?w=400'),
  ('Voice Assistant Speaker', 'voice-assistant-speaker', 'Premium smart speaker with room-filling sound', 129.99, 149.99, (SELECT id FROM categories WHERE slug = 'entertainment'), 'Amazon Echo', 'WiFi', 35, false, 'https://images.unsplash.com/photo-1543512214-318c7553f230?w=400'),
  ('Smart Light Switch', 'smart-light-switch', 'In-wall dimmer switch with scheduling and scenes', 44.99, NULL, (SELECT id FROM categories WHERE slug = 'lighting'), 'Lutron', 'WiFi', 60, false, 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400');