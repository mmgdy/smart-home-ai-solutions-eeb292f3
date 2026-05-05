ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS variant_axis text,
  ADD COLUMN IF NOT EXISTS variant_label text;

CREATE INDEX IF NOT EXISTS products_parent_id_idx ON public.products(parent_id);
CREATE INDEX IF NOT EXISTS products_variant_axis_idx ON public.products(variant_axis) WHERE variant_axis IS NOT NULL;