
-- Remove header spoofing vulnerability on loyalty_points and points_transactions
DROP POLICY IF EXISTS "Users can view their own loyalty points by email" ON public.loyalty_points;
CREATE POLICY "Users can view their own loyalty points"
  ON public.loyalty_points
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.points_transactions;
CREATE POLICY "Users can view their own transactions"
  ON public.points_transactions
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.loyalty_points lp
    WHERE lp.id = points_transactions.loyalty_id
      AND lp.user_id = auth.uid()
  ));

-- Explicit deny SELECT on welcome_emails_sent (defense-in-depth against accidental policy additions)
DROP POLICY IF EXISTS "Deny all reads on welcome_emails_sent" ON public.welcome_emails_sent;
CREATE POLICY "Deny all reads on welcome_emails_sent"
  ON public.welcome_emails_sent
  FOR SELECT
  TO public
  USING (false);
