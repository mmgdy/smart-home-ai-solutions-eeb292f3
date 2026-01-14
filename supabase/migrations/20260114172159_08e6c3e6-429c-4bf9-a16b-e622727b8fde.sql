-- Create loyalty points table for user balances
CREATE TABLE public.loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  points_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'bronze',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email)
);

-- Create points transactions table for history
CREATE TABLE public.points_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loyalty_id UUID REFERENCES public.loyalty_points(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- 'earn', 'redeem', 'bonus', 'expire'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for loyalty_points
CREATE POLICY "Users can view their own loyalty points by email"
ON public.loyalty_points
FOR SELECT
USING (auth.uid() = user_id OR email = current_setting('request.headers', true)::json->>'x-user-email');

CREATE POLICY "Allow insert for authenticated or by email match"
ON public.loyalty_points
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own loyalty points"
ON public.loyalty_points
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for points_transactions
CREATE POLICY "Users can view their own transactions"
ON public.points_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.loyalty_points lp
    WHERE lp.id = points_transactions.loyalty_id
    AND (lp.user_id = auth.uid() OR lp.email = current_setting('request.headers', true)::json->>'x-user-email')
  )
);

CREATE POLICY "Allow insert transactions"
ON public.points_transactions
FOR INSERT
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_loyalty_points_updated_at
BEFORE UPDATE ON public.loyalty_points
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to award points on order completion
CREATE OR REPLACE FUNCTION public.award_loyalty_points(
  p_email TEXT,
  p_order_id UUID,
  p_order_total NUMERIC,
  p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loyalty_id UUID;
  v_points_earned INTEGER;
  v_new_balance INTEGER;
  v_lifetime_points INTEGER;
  v_new_tier TEXT;
BEGIN
  -- Calculate points: 1 point per 10 EGP spent
  v_points_earned := FLOOR(p_order_total / 10);
  
  -- Get or create loyalty record
  SELECT id, points_balance, lifetime_points INTO v_loyalty_id, v_new_balance, v_lifetime_points
  FROM public.loyalty_points
  WHERE email = p_email;
  
  IF v_loyalty_id IS NULL THEN
    INSERT INTO public.loyalty_points (email, user_id, points_balance, lifetime_points)
    VALUES (p_email, p_user_id, v_points_earned, v_points_earned)
    RETURNING id, points_balance, lifetime_points INTO v_loyalty_id, v_new_balance, v_lifetime_points;
  ELSE
    v_new_balance := v_new_balance + v_points_earned;
    v_lifetime_points := v_lifetime_points + v_points_earned;
    
    -- Calculate tier based on lifetime points
    v_new_tier := CASE
      WHEN v_lifetime_points >= 10000 THEN 'platinum'
      WHEN v_lifetime_points >= 5000 THEN 'gold'
      WHEN v_lifetime_points >= 1000 THEN 'silver'
      ELSE 'bronze'
    END;
    
    UPDATE public.loyalty_points
    SET points_balance = v_new_balance,
        lifetime_points = v_lifetime_points,
        tier = v_new_tier
    WHERE id = v_loyalty_id;
  END IF;
  
  -- Record transaction
  INSERT INTO public.points_transactions (loyalty_id, order_id, points, transaction_type, description)
  VALUES (v_loyalty_id, p_order_id, v_points_earned, 'earn', 'Points earned from order');
  
  RETURN v_points_earned;
END;
$$;