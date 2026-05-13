-- Security hardening migration
-- Fixes: quotes public read, orders/order_items guest exposure,
--        admin_settings token leak, open write policies, SECURITY DEFINER anon access

-- ─── 1. quotes: remove open SELECT (no client feature needs to read quotes) ───
DROP POLICY IF EXISTS "Anyone can view quotes by email" ON public.quotes;

-- ─── 2. orders: restrict SELECT to authenticated owner only ──────────────────
-- The old policy had OR user_id IS NULL which exposed all guest orders to anyone.
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ─── 3. order_items: remove the guest-order exposure branch ──────────────────
-- The old policy had OR orders.user_id IS NULL, letting any authenticated user
-- read items from any guest order.
DROP POLICY IF EXISTS "Users can view their order items" ON public.order_items;
CREATE POLICY "Users can view their order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

-- ─── 4. admin_settings: hide session tokens from public reads ────────────────
-- Active admin session tokens are stored as keys like "admin_token_<uuid>".
-- All other keys (logo_url, logo_size, favicon_url, etc.) remain publicly readable.
DROP POLICY IF EXISTS "Anyone can read settings" ON public.admin_settings;
CREATE POLICY "Public can read non-sensitive settings"
  ON public.admin_settings FOR SELECT
  USING (key NOT LIKE 'admin_token_%');

-- ─── 5. site-assets: remove open write policies ──────────────────────────────
-- All writes go through the admin-write edge function (service role).
-- These policies were named "Admins only" but had no auth check.
DROP POLICY IF EXISTS "Admins can upload site assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update site assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete site assets" ON storage.objects;

-- ─── 6. order_items: remove open DELETE policy ───────────────────────────────
-- Admin deletes go through admin-write (service role). No client needs this.
DROP POLICY IF EXISTS "Anyone can delete order items" ON public.order_items;

-- ─── 7. orders: remove open UPDATE and DELETE policies ───────────────────────
-- Admin mutations go through admin-write (service role).
DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can delete orders" ON public.orders;

-- ─── 8. product-images: remove open upload/update policies ───────────────────
-- Admin uploads are now routed through admin-write (service role).
DROP POLICY IF EXISTS "product-images: allow upload" ON storage.objects;
DROP POLICY IF EXISTS "product-images: allow update" ON storage.objects;

-- ─── 9. product-videos: same ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "product-videos: allow upload" ON storage.objects;
DROP POLICY IF EXISTS "product-videos: allow update" ON storage.objects;

-- ─── 10. Revoke SECURITY DEFINER function execute from anon ──────────────────
-- These functions bypass RLS and must not be callable by unauthenticated users.
-- Guest checkout handles failures gracefully (try/catch in Checkout.tsx).
REVOKE EXECUTE ON FUNCTION public.award_loyalty_points(TEXT, UUID, NUMERIC, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_loyalty_points(TEXT, INTEGER, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_coupon_usage(TEXT) FROM anon;
