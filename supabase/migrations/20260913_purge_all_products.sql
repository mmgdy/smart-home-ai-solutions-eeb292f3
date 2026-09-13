-- Migration: purge_all_products.sql
-- Created: 2026-09-13T00:11:33.668Z
-- Total products to purge: 699

BEGIN;

-- 1. Break any self-referencing parent foreign keys safely
UPDATE public.products SET parent_id = NULL WHERE parent_id IS NOT NULL;

-- 2. Clear any lingering references in cart / wishlists / audits
DELETE FROM public.product_variants;
DELETE FROM public.wishlists;

-- 3. Delete all products from public.products
DELETE FROM public.products;

-- 4. Reset hidden_ids blacklist in site_info
INSERT INTO public.site_info (section, key, value, updated_at)
VALUES ('products', 'hidden_ids', '[]', NOW())
ON CONFLICT (section, key) DO UPDATE SET value = '[]', updated_at = NOW();

COMMIT;
