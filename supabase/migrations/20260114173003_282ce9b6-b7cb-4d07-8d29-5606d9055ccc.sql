-- Function to redeem loyalty points
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  p_email TEXT,
  p_points INTEGER,
  p_order_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_loyalty_id UUID;
  v_current_balance INTEGER;
BEGIN
  -- Get loyalty record
  SELECT id, points_balance INTO v_loyalty_id, v_current_balance
  FROM public.loyalty_points
  WHERE email = p_email;
  
  -- Check if loyalty account exists and has enough points
  IF v_loyalty_id IS NULL THEN
    RAISE EXCEPTION 'No loyalty account found for this email';
  END IF;
  
  IF v_current_balance < p_points THEN
    RAISE EXCEPTION 'Insufficient points balance';
  END IF;
  
  -- Deduct points
  UPDATE public.loyalty_points
  SET points_balance = points_balance - p_points
  WHERE id = v_loyalty_id;
  
  -- Record transaction
  INSERT INTO public.points_transactions (loyalty_id, order_id, points, transaction_type, description)
  VALUES (v_loyalty_id, p_order_id, -p_points, 'redeem', 'Points redeemed for discount');
  
  RETURN TRUE;
END;
$$;