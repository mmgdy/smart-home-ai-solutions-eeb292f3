
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  fcm_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'web',
  locale TEXT DEFAULT 'en',
  user_agent TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT INSERT ON public.push_subscriptions TO anon;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push tokens"
  ON public.push_subscriptions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Anyone can register a guest push token"
  ON public.push_subscriptions FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_push_subscriptions_enabled ON public.push_subscriptions(enabled) WHERE enabled = TRUE;
