-- SECURITY DEFINER functions for variant merge/unmerge.
-- Called via supabase.rpc() from the admin panel.
-- Token is verified inside each function using the same logic as the edge function.

CREATE OR REPLACE FUNCTION public.admin_merge_variants(
  p_token      text,
  p_master_id  uuid,
  p_variant_ids uuid[],
  p_axis       text,
  p_labels     jsonb DEFAULT '{}'::jsonb
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decoded     text;
  v_admin_id    text;
  v_stored_token text;
BEGIN
  BEGIN
    v_decoded  := convert_from(decode(p_token, 'base64'), 'UTF8');
    v_admin_id := split_part(v_decoded, ':', 1);
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Invalid token format');
  END;

  SELECT value INTO v_stored_token
  FROM admin_settings
  WHERE key = 'admin_token_' || v_admin_id;

  IF v_stored_token IS NULL OR v_stored_token <> p_token THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Set master: clear parent, set axis
  UPDATE products SET
    parent_id    = NULL,
    variant_axis  = p_axis,
    variant_label = p_labels ->> p_master_id::text
  WHERE id = p_master_id;

  -- Set children: point to master, set axis + label
  UPDATE products SET
    parent_id    = p_master_id,
    variant_axis  = p_axis,
    variant_label = p_labels ->> id::text
  WHERE id = ANY(p_variant_ids) AND id <> p_master_id;

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unmerge_variant(
  p_token text,
  p_id    uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decoded     text;
  v_admin_id    text;
  v_stored_token text;
BEGIN
  BEGIN
    v_decoded  := convert_from(decode(p_token, 'base64'), 'UTF8');
    v_admin_id := split_part(v_decoded, ':', 1);
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Invalid token format');
  END;

  SELECT value INTO v_stored_token
  FROM admin_settings
  WHERE key = 'admin_token_' || v_admin_id;

  IF v_stored_token IS NULL OR v_stored_token <> p_token THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  UPDATE products SET
    parent_id    = NULL,
    variant_axis  = NULL,
    variant_label = NULL
  WHERE id = p_id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_merge_variants   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unmerge_variant  TO anon, authenticated;
