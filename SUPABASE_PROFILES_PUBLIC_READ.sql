-- Vendoscity: Allow public read access to seller display fields.
--
-- WARNING:
-- This policy makes rows in public.profiles selectable for "public" (anon).
-- If you store private data (ex: phone/whatsapp) in profiles, it becomes readable via Supabase REST.
-- Safer alternative: set SUPABASE_SERVICE_ROLE_KEY on the backend and keep profiles private.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='profiles'
  ) THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='profiles' AND policyname='public read profiles'
    ) THEN
      EXECUTE $SQL$
        CREATE POLICY "public read profiles"
        ON public.profiles FOR SELECT
        TO public
        USING (true);
      $SQL$;
    END IF;
  END IF;
END $$;

