
-- Quotes: restrict SELECT
DROP POLICY IF EXISTS "Anyone can view quotes by email" ON public.quotes;
CREATE POLICY "Users view own quotes by email"
  ON public.quotes FOR SELECT TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- Order items: remove permissive DELETE
DROP POLICY IF EXISTS "Anyone can delete order items" ON public.order_items;

-- Order items: tighten SELECT (remove guest order leak)
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;
CREATE POLICY "Users can view their order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
  ));

-- Site-assets storage: remove public-role write policies
DROP POLICY IF EXISTS "Admins can upload site assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update site assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete site assets" ON storage.objects;

-- Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.award_loyalty_points(text, uuid, numeric, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.redeem_loyalty_points(text, integer, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
