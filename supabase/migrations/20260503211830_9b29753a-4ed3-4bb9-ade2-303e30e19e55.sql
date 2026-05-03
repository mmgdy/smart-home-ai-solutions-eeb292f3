-- Restore write access to product-images and product-videos buckets
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='product-images public insert') THEN
    CREATE POLICY "product-images public insert" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'product-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='product-images public update') THEN
    CREATE POLICY "product-images public update" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'product-images') WITH CHECK (bucket_id = 'product-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='product-images public delete') THEN
    CREATE POLICY "product-images public delete" ON storage.objects FOR DELETE TO public USING (bucket_id = 'product-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='product-videos public insert') THEN
    CREATE POLICY "product-videos public insert" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'product-videos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='product-videos public update') THEN
    CREATE POLICY "product-videos public update" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'product-videos') WITH CHECK (bucket_id = 'product-videos');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='product-videos public delete') THEN
    CREATE POLICY "product-videos public delete" ON storage.objects FOR DELETE TO public USING (bucket_id = 'product-videos');
  END IF;
END $$;