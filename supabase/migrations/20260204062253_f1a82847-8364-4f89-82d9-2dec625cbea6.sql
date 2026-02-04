-- Create storage bucket for site assets like logo
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to site assets
CREATE POLICY "Public can read site assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

-- Allow authenticated admins to upload (we'll verify via edge function)
CREATE POLICY "Admins can upload site assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-assets');

-- Allow admins to update site assets
CREATE POLICY "Admins can update site assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'site-assets');

-- Allow admins to delete site assets  
CREATE POLICY "Admins can delete site assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'site-assets');