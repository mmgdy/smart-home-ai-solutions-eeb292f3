
-- Brands table
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands are viewable by everyone"
  ON public.brands FOR SELECT
  USING (true);

CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Site info (key/value, namespaced)
CREATE TABLE IF NOT EXISTS public.site_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(section, key)
);

ALTER TABLE public.site_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site info is viewable by everyone"
  ON public.site_info FOR SELECT
  USING (true);

CREATE TRIGGER update_site_info_updated_at
BEFORE UPDATE ON public.site_info
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.site_info (section, key, value) VALUES
  ('contact', 'phone', '+20 123 456 7890'),
  ('contact', 'whatsapp', '+201234567890'),
  ('contact', 'email', 'info@baytzaki.com'),
  ('contact', 'address_en', 'Cairo, Egypt'),
  ('contact', 'address_ar', 'القاهرة، مصر'),
  ('social', 'facebook', ''),
  ('social', 'instagram', ''),
  ('social', 'tiktok', ''),
  ('social', 'youtube', ''),
  ('hero', 'headline_en', 'Feel the magic of a Smarter Home'),
  ('hero', 'headline_ar', 'اشعر بسحر البيت الذكي'),
  ('hero', 'subheadline_en', 'Lighting, security, control — in one tap. Genuine products, expert installation, cash on delivery.'),
  ('hero', 'subheadline_ar', 'إضاءة، أمان، تحكم — بضغطة واحدة. منتجات أصلية، تركيب احترافي، ودفع عند الاستلام.'),
  ('hero', 'cta_en', 'Start Building Your Smart Home'),
  ('hero', 'cta_ar', 'ابدأ بناء بيتك الذكي'),
  ('about', 'mission_en', 'Making every Egyptian home smart & energy-efficient.'),
  ('about', 'mission_ar', 'نجعل كل بيت مصري ذكي وموفر للطاقة.'),
  ('about', 'story_en', 'Baytzaki is Egypt''s premier smart home brand — combining an AI advisor, a curated store, and professional installation under one trusted roof.'),
  ('about', 'story_ar', 'بيتزكي هي العلامة الرائدة في مصر للمنزل الذكي — تجمع بين المستشار الذكي، المتجر المختار بعناية، والتركيب الاحترافي تحت سقف واحد موثوق.')
ON CONFLICT (section, key) DO NOTHING;

-- Storage bucket for brand logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read brand logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-logos');
