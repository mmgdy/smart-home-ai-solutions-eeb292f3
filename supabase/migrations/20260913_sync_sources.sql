-- Sync Sources: user-managed URLs to regularly scrape products from
CREATE TABLE IF NOT EXISTS public.sync_sources (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  url         text        NOT NULL,
  name        text        NOT NULL DEFAULT '',
  source_type text        NOT NULL DEFAULT 'auto',   -- 'amazon','noon','jumia','url','auto'
  is_active   boolean     NOT NULL DEFAULT true,
  sync_interval_hours integer NOT NULL DEFAULT 24,
  last_synced_at  timestamptz,
  sync_status     text    NOT NULL DEFAULT 'pending', -- 'pending','syncing','success','error'
  sync_message    text,
  products_found  integer NOT NULL DEFAULT 0,
  products_added  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sync_sources ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write (admin-write edge function uses service role)
CREATE POLICY "Service role full access on sync_sources"
  ON public.sync_sources
  USING (true)
  WITH CHECK (true);
