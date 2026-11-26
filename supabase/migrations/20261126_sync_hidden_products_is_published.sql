-- Sync existing hidden product IDs from site_info ('products'/'hidden_ids') into products.is_published = FALSE
DO $$
DECLARE
  v_raw TEXT;
  v_hidden_uuids UUID[];
BEGIN
  SELECT value INTO v_raw
  FROM public.site_info
  WHERE section = 'products'
    AND key = 'hidden_ids'
  LIMIT 1;

  IF v_raw IS NULL OR btrim(v_raw) = '' THEN
    RETURN;
  END IF;

  BEGIN
    SELECT ARRAY(
      SELECT DISTINCT (elem)::UUID
      FROM jsonb_array_elements_text(v_raw::jsonb) AS elem
      WHERE elem ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ) INTO v_hidden_uuids;
  EXCEPTION WHEN OTHERS THEN
    v_hidden_uuids := NULL;
  END;

  IF v_hidden_uuids IS NOT NULL AND array_length(v_hidden_uuids, 1) > 0 THEN
    UPDATE public.products
    SET is_published = FALSE
    WHERE id = ANY(v_hidden_uuids)
      AND is_published IS DISTINCT FROM FALSE;
  END IF;
END $$;
