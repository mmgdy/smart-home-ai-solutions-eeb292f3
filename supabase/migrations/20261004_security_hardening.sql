-- Migration: 20261004_security_hardening.sql
-- Milestone 2: Security Review and Hardening
-- Remediates:
--   SEC-01: Public database secret leak via insecure site_info RLS policy
--   SEC-03: Accidental full public RLS permissions on sync_sources table
--   SEC-13: Admin email and identity disclosure via admin_settings public read policy
--   SEC-12: Missing authorization check on draft quote updates
--   SEC-14: Active coupons database table open to public enumeration

-- ─── 1. site_info: Restrict SELECT so sensitive sections are never exposed to anon ───
-- Blocks public queries for 'ai' (API keys), 'payment' (merchant keys), 'admin', 'secrets'
DROP POLICY IF EXISTS "Site info is viewable by everyone" ON public.site_info;
DROP POLICY IF EXISTS "Public can view public site info only" ON public.site_info;
DROP POLICY IF EXISTS "Public can view non-sensitive site info only" ON public.site_info;

CREATE POLICY "Public can view non-sensitive site info only"
  ON public.site_info FOR SELECT
  USING (section NOT IN ('ai', 'payment', 'admin', 'secrets'));

DROP POLICY IF EXISTS "Authenticated users can view site info" ON public.site_info;
CREATE POLICY "Authenticated users can view site info"
  ON public.site_info FOR SELECT TO authenticated
  USING (true);

-- ─── 2. sync_sources: Lock down RLS strictly TO service_role ─────────────────────────
-- Previous policy lacked 'TO' clause and defaulted to TO PUBLIC, granting anon full RW
DROP POLICY IF EXISTS "Service role full access on sync_sources" ON public.sync_sources;

CREATE POLICY "Service role full access on sync_sources"
  ON public.sync_sources
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ─── 3. admin_settings: Restrict public read policy to whitelisted UI keys only ───────
-- Prevents harvesting administrator emails, session tokens, or internal settings
DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Anyone can read settings" ON public.admin_settings;
DROP POLICY IF EXISTS "Public can read whitelisted settings only" ON public.admin_settings;
DROP POLICY IF EXISTS "Authenticated users can read admin settings" ON public.admin_settings;

CREATE POLICY "Public can read whitelisted settings only"
  ON public.admin_settings FOR SELECT
  USING (key IN (
    'logo_url',
    'logo_light_url',
    'logo_dark_url',
    'logo_size',
    'favicon_url',
    'app_icon_url',
    'site_title',
    'theme_config'
  ));

CREATE POLICY "Authenticated users can read admin settings"
  ON public.admin_settings FOR SELECT TO authenticated
  USING (true);

-- ─── 4. Defense-in-depth: Remove open draft quote updates and coupons enumeration ────
DROP POLICY IF EXISTS "Anyone can update draft quotes" ON public.quotes;
DROP POLICY IF EXISTS "Public can read active coupons" ON public.coupons;
