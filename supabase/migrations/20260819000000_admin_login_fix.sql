-- Admin login fix: force the admin panel credential to admin / Bayt@2026
-- with a proper PBKDF2 hash (the original seed stored plaintext "admin123").
--
-- Hash format: pbkdf2$<iterations>$<saltB64>$<hashB64> — SHA-256, 100k
-- iterations, verified by the rewritten admin-auth edge function.
-- This is a bootstrap credential: rotate it from the admin panel after
-- first login.

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No public access to admin_users" ON public.admin_users;
CREATE POLICY "No public access to admin_users"
ON public.admin_users
FOR SELECT
USING (false);

INSERT INTO public.admin_users (username, password_hash)
VALUES (
  'admin',
  'pbkdf2$100000$qR8Q58PSS4+ealwtHws6SA==$p7NFkbO3E8uEgc+J7xpt+kzyf85zg/MqCHWALUdb5cI='
)
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    updated_at = now();
