-- Drop overly permissive policies
DROP POLICY IF EXISTS "Allow insert for authenticated or by email match" ON public.loyalty_points;
DROP POLICY IF EXISTS "Allow insert transactions" ON public.points_transactions;

-- Create more restrictive policies - inserts happen through the security definer function
-- No direct inserts allowed from client
CREATE POLICY "No direct insert - use award_loyalty_points function"
ON public.loyalty_points
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct insert - transactions created by function"
ON public.points_transactions
FOR INSERT
WITH CHECK (false);