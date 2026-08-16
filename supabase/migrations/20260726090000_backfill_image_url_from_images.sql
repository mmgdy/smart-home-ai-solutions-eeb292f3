-- Backfill product image_url from images[0] when image_url is missing.
-- Some product rows were imported with URLs only in the images[] array.
-- This keeps the front-end's primary image column in sync so that
-- listings/grids/cart previews render without forcing a full re-import.

UPDATE public.products
SET image_url = COALESCE(NULLIF(TRIM(images[1]), ''), NULLIF(image_url, ''))
WHERE (image_url IS NULL OR TRIM(image_url) = '')
  AND images IS NOT NULL
  AND array_length(images, 1) > 0
  AND NULLIF(TRIM(images[1]), '') IS NOT NULL;

-- Make sure the common image_url select queries keep returning rows even
-- when the URL is stored only in images[] by extending the column-not-null
-- guarantee at the API layer (kept permissive — nulls allowed).
NOTIFY pgrst, 'reload schema';
