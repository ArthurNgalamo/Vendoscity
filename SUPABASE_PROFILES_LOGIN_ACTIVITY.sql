-- Vendoscity: Track seller activity for "Recommandé" ranking.
-- Adds:
-- - profiles.last_login_at (timestamptz)
-- - profiles.login_streak (int) consecutive daily logins (Africa/Douala day boundary handled by backend)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='profiles'
  ) THEN
    -- Add columns if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='profiles' AND column_name='last_login_at'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN last_login_at timestamptz;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='profiles' AND column_name='login_streak'
    ) THEN
      ALTER TABLE public.profiles ADD COLUMN login_streak integer NOT NULL DEFAULT 0;
    END IF;
  END IF;
END $$;

