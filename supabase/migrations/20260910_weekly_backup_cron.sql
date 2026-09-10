-- Enable pg_cron and pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to trigger weekly database backup to Google Drive
CREATE OR REPLACE FUNCTION public.trigger_weekly_backup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url text;
  v_anon_key text;
  v_cron_secret text;
BEGIN
  -- We invoke the backup-manager edge function
  -- In Supabase, edge functions can be reached at /functions/v1/backup-manager
  PERFORM net.http_post(
    url := 'https://djsibxhkfvwtjzvnjmhp.supabase.co/functions/v1/backup-manager',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'action', 'cron-weekly-backup'
    ),
    timeout_milliseconds := 60000
  );
END;
$$;

-- Schedule the job to run every Sunday at 03:00 AM UTC
-- Unschedule first if it exists to avoid duplicates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-backup-job') THEN
    PERFORM cron.unschedule('weekly-backup-job');
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'weekly-backup-job',
    '0 3 * * 0', -- Every Sunday at 03:00 AM
    'SELECT public.trigger_weekly_backup();'
  );
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
