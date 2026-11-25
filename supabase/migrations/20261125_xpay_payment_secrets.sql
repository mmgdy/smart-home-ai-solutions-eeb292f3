-- Migration: XPay server-only secrets & webhook idempotency store, plus PaySky cleanup
-- Security model:
--   * payment_secrets stores sk_test_*, sk_live_*, whsec_* strictly server-side.
--   * RLS is enabled with ZERO policies for anon/authenticated, and table privileges
--     are revoked from anon and authenticated so no browser client can ever read them.
--   * payment_webhook_events enforces atomic idempotency by event_id.
--   * Legacy paysky_* rows in site_info are removed while preserving instapay_* and cod_*.

CREATE TABLE IF NOT EXISTS public.payment_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_secrets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.payment_secrets FROM PUBLIC;
REVOKE ALL ON TABLE public.payment_secrets FROM anon;
REVOKE ALL ON TABLE public.payment_secrets FROM authenticated;
GRANT ALL ON TABLE public.payment_secrets TO service_role;

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  event_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'xpay',
  event_type TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  session_id TEXT,
  livemode BOOLEAN NOT NULL DEFAULT false,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.payment_webhook_events FROM PUBLIC;
REVOKE ALL ON TABLE public.payment_webhook_events FROM anon;
REVOKE ALL ON TABLE public.payment_webhook_events FROM authenticated;
GRANT ALL ON TABLE public.payment_webhook_events TO service_role;

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_order_id
  ON public.payment_webhook_events(order_id);

-- Remove legacy PaySky settings from site_info without touching InstaPay or COD
DELETE FROM public.site_info
WHERE section = 'payment' AND key LIKE 'paysky_%';

NOTIFY pgrst, 'reload schema';
