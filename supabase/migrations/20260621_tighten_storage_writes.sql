-- Storage hardening: remove anonymous public-write policies on media buckets.
--
-- All product/site asset uploads are routed through the `admin-write` edge
-- function, which uses the service role key and therefore bypasses RLS. The
-- "allow upload"/"allow update" policies below were open to the `public` role,
-- meaning ANY anon visitor could upload arbitrary files into these buckets
-- (storage abuse, malicious content hosting, cost inflation).
--
-- Public READ stays open (product images/videos must be viewable by shoppers).

-- ─── product-images: keep public read, drop public write ────────────────────
DROP POLICY IF EXISTS "product-images: allow upload" ON storage.objects;
DROP POLICY IF EXISTS "product-images: allow update" ON storage.objects;
DROP POLICY IF EXISTS "product-images: allow delete" ON storage.objects;

-- ─── product-videos: same ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "product-videos: allow upload" ON storage.objects;
DROP POLICY IF EXISTS "product-videos: allow update" ON storage.objects;
DROP POLICY IF EXISTS "product-videos: allow delete" ON storage.objects;

-- ─── site-assets: same ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "site-assets: allow upload" ON storage.objects;
DROP POLICY IF EXISTS "site-assets: allow update" ON storage.objects;
DROP POLICY IF EXISTS "site-assets: allow delete" ON storage.objects;
