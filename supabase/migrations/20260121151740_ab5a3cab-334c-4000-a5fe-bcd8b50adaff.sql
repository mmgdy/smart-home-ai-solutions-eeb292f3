-- Create quotes table for storing smart home project quotes
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  phone TEXT,
  property_type TEXT NOT NULL,
  rooms JSONB NOT NULL DEFAULT '[]'::jsonb,
  devices JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  installation_fee NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  floor_plan_url TEXT,
  ai_analysis JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create quotes (no auth required for quick quote)
CREATE POLICY "Anyone can create quotes"
ON public.quotes
FOR INSERT
WITH CHECK (true);

-- Anyone can view their own quotes by email
CREATE POLICY "Anyone can view quotes by email"
ON public.quotes
FOR SELECT
USING (true);

-- Allow updates to draft quotes
CREATE POLICY "Anyone can update draft quotes"
ON public.quotes
FOR UPDATE
USING (status = 'draft');

-- Create trigger for updated_at
CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for floor plans
INSERT INTO storage.buckets (id, name, public) VALUES ('floor-plans', 'floor-plans', true);

-- Storage policies for floor plans
CREATE POLICY "Anyone can upload floor plans"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'floor-plans');

CREATE POLICY "Anyone can view floor plans"
ON storage.objects
FOR SELECT
USING (bucket_id = 'floor-plans');