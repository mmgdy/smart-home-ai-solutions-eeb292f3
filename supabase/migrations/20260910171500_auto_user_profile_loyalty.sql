-- Auto User Profile & Loyalty Points Initialization
-- Automatically creates a loyalty points profile upon signup in auth.users
-- and links existing order history by email.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Initialize loyalty points profile if not already present
  IF NEW.email IS NOT NULL THEN
    INSERT INTO public.loyalty_points (user_id, email, points_balance, lifetime_points, tier)
    VALUES (NEW.id, NEW.email, 0, 0, 'bronze')
    ON CONFLICT (email) DO UPDATE
    SET user_id = EXCLUDED.user_id;

    -- 2. Link any past orders placed with this email to the new user_id
    UPDATE public.orders
    SET user_id = NEW.id
    WHERE LOWER(email) = LOWER(NEW.email) AND user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill all existing auth.users into loyalty_points
INSERT INTO public.loyalty_points (user_id, email, points_balance, lifetime_points, tier)
SELECT id, email, 0, 0, 'bronze'
FROM auth.users
WHERE email IS NOT NULL
ON CONFLICT (email) DO UPDATE
SET user_id = EXCLUDED.user_id;

-- Backfill link between existing orders and auth.users
UPDATE public.orders o
SET user_id = u.id
FROM auth.users u
WHERE LOWER(o.email) = LOWER(u.email) AND o.user_id IS NULL;
