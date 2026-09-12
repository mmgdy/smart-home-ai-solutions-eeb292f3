-- Migration: 20260911_product_audit_and_suppliers.sql
-- Description: Create suppliers, product_sources, and product_audits tables with strict RLS

-- 1. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  city TEXT DEFAULT 'Cairo',
  area TEXT,
  supplier_type TEXT,
  is_verified BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Product Sources Table (Egypt/Cairo Sources)
CREATE TABLE IF NOT EXISTS public.product_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  supplier_url TEXT,
  product_url TEXT NOT NULL,
  price_egp NUMERIC,
  availability TEXT DEFAULT 'In Stock',
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  city TEXT DEFAULT 'Cairo',
  area TEXT,
  match_confidence INTEGER DEFAULT 95 CHECK (match_confidence >= 0 AND match_confidence <= 100),
  notes TEXT,
  last_checked TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Product Audits Table
CREATE TABLE IF NOT EXISTS public.product_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID,
  product_name TEXT NOT NULL,
  image_status TEXT NOT NULL DEFAULT 'VALID',
  price_status TEXT NOT NULL DEFAULT 'VALID',
  description_status TEXT NOT NULL DEFAULT 'VALID',
  cairo_source_status TEXT NOT NULL DEFAULT 'NOT_FOUND_IN_CAIRO',
  action_taken TEXT NOT NULL DEFAULT 'NO_CHANGE',
  reason TEXT,
  previous_data JSONB,
  updated_data JSONB,
  audit_date TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_sources_product_id ON public.product_sources(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sources_supplier_id ON public.product_sources(supplier_id);
CREATE INDEX IF NOT EXISTS idx_product_audits_product_id ON public.product_audits(product_id);
CREATE INDEX IF NOT EXISTS idx_product_audits_audit_date ON public.product_audits(audit_date DESC);

-- Enable Row Level Security (RLS) on all new tables
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_audits ENABLE ROW LEVEL SECURITY;

-- Deny public anon access by default; allow authenticated admins or service role
-- (No anon SELECT policy means anonymous public visitors CANNOT read supplier data)
DROP POLICY IF EXISTS "Public deny all suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Public deny all product_sources" ON public.product_sources;
DROP POLICY IF EXISTS "Public deny all product_audits" ON public.product_audits;

-- Service role bypasses RLS automatically; edge functions use service role.
