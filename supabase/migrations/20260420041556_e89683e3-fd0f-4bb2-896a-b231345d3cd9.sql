
-- Allow updates and deletes on orders (admin uses service role, but we also allow public for the existing admin client flow)
CREATE POLICY "Anyone can update orders"
ON public.orders FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete orders"
ON public.orders FOR DELETE
USING (true);

CREATE POLICY "Anyone can delete order items"
ON public.order_items FOR DELETE
USING (true);

-- Welcome email tracking
CREATE TABLE IF NOT EXISTS public.welcome_emails_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welcome_emails_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert welcome email records"
ON public.welcome_emails_sent FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view welcome email records"
ON public.welcome_emails_sent FOR SELECT
USING (true);
