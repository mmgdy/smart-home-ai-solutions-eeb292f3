-- Orders: drop overly-permissive INSERT policy, keep scoped one
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Order items: drop overly-permissive INSERT policy, keep scoped one
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

-- Loyalty points: remove client UPDATE; mutations must go through SECURITY DEFINER funcs
DROP POLICY IF EXISTS "Users can update their own loyalty points" ON public.loyalty_points;

-- Quotes: tighten INSERT so authenticated users can't impersonate other emails
DROP POLICY IF EXISTS "Anyone can create quotes" ON public.quotes;
CREATE POLICY "Scoped quote insert"
ON public.quotes
FOR INSERT
TO public
WITH CHECK (
  auth.uid() IS NULL
  OR email IS NULL
  OR email = (auth.jwt() ->> 'email')
);