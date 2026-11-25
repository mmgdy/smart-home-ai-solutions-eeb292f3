-- Dynamic Product Categories: sort_order, is_active, 17 seeded categories, retire empty Art Furniture

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

INSERT INTO public.categories (name, slug, sort_order, is_active) VALUES
  ('Smart Switches', 'smart-switches', 1, true),
  ('Smart Plugs', 'smart-plugs', 2, true),
  ('Smart Sensors', 'smart-sensors', 3, true),
  ('Smart Hubs', 'smart-hubs', 4, true),
  ('Smart Locks', 'smart-locks', 5, true),
  ('Smart Panels', 'smart-panels', 6, true),
  ('Cameras', 'cameras', 7, true),
  ('Video Intercom & Doorbells', 'video-intercom-doorbells', 8, true),
  ('Security & Access Control', 'security-access-control', 9, true),
  ('Networking', 'networking', 10, true),
  ('Smart Speakers & Displays', 'smart-speakers-displays', 11, true),
  ('Audio & Speakers', 'audio-speakers', 12, true),
  ('Lighting', 'lighting', 13, true),
  ('Curtains & Blinds', 'curtains-blinds', 14, true),
  ('Climate & Energy', 'climate-energy', 15, true),
  ('Health & Wellness', 'health-wellness', 16, true),
  ('Accessories', 'accessories', 17, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

UPDATE public.categories c
SET is_active = false, sort_order = 999
WHERE c.slug = 'art-furniture'
  AND NOT EXISTS (SELECT 1 FROM public.products p WHERE p.category_id = c.id);
