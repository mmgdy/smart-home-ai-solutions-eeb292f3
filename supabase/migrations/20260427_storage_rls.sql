-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- It fixes the "New row violates row-level security policy" error when
-- uploading product images/videos from the Admin panel.

-- ─── 1. Create product-videos bucket (idempotent) ───────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-videos', 'product-videos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Make product-images bucket public too (in case it isn't already)
UPDATE storage.buckets SET public = true WHERE id = 'product-images';

-- ─── 2. product-images policies ─────────────────────────────────────────────
-- Allow anyone to read
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'product-images: public read'
  ) THEN
    CREATE POLICY "product-images: public read"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'product-images');
  END IF;
END $$;

-- Allow INSERT (upload) — admin panel uses the anon key, so we open this to anon
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'product-images: allow upload'
  ) THEN
    CREATE POLICY "product-images: allow upload"
      ON storage.objects FOR INSERT TO public
      WITH CHECK (bucket_id = 'product-images');
  END IF;
END $$;

-- Allow UPDATE (upsert)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'product-images: allow update'
  ) THEN
    CREATE POLICY "product-images: allow update"
      ON storage.objects FOR UPDATE TO public
      USING (bucket_id = 'product-images');
  END IF;
END $$;

-- ─── 3. product-videos policies ─────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'product-videos: public read'
  ) THEN
    CREATE POLICY "product-videos: public read"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'product-videos');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'product-videos: allow upload'
  ) THEN
    CREATE POLICY "product-videos: allow upload"
      ON storage.objects FOR INSERT TO public
      WITH CHECK (bucket_id = 'product-videos');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'product-videos: allow update'
  ) THEN
    CREATE POLICY "product-videos: allow update"
      ON storage.objects FOR UPDATE TO public
      USING (bucket_id = 'product-videos');
  END IF;
END $$;
