-- Remove products that carry no usable image: image_url is empty/junk AND no
-- images[] entry starts with http(s)://, /, or data:.
--
-- Safety notes:
--   * order_items.product_id is FK ON DELETE SET NULL and stores product_name
--     denormalized, so deleting products never breaks order history.
--   * products.parent_id is FK ON DELETE SET NULL — variants of a deleted
--     master survive as standalone products rather than disappearing.
--   * Live 404/broken-URL detection is handled by the admin-gated
--     `purge-corrupt-products` edge function; this migration only removes
--     rows whose image data is deterministically unusable.

WITH candidates AS (
  SELECT id
  FROM public.products p
  WHERE NOT COALESCE(btrim(p.image_url) ~* '^(https?://|/|data:)', false)
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(COALESCE(p.images, '{}')) AS elem(url)
      WHERE btrim(elem.url) ~* '^(https?://|/|data:)'
    )
),
deleted AS (
  DELETE FROM public.products p
  USING candidates c
  WHERE p.id = c.id
  RETURNING p.id
)
SELECT count(*) AS removed_products FROM deleted;
