-- Vendoscity: allow authenticated users to add reviews (and optionally edit/delete their own).
-- Needed when the backend does NOT use a service role key (RLS applies).
--
-- Applies to either "reviews" or "avis" table name (some deployments use French names).
-- Safe to run multiple times (checks pg_policies).

DO $$
DECLARE
  tname text;
  pol_insert text;
  pol_update text;
  pol_delete text;
BEGIN
  FOREACH tname IN ARRAY ARRAY['reviews','avis']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name=tname
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tname);

      pol_insert := 'authenticated insert ' || tname;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename=tname AND policyname = pol_insert
      ) THEN
        EXECUTE format($SQL$
          CREATE POLICY %I
          ON public.%I FOR INSERT
          TO authenticated
          WITH CHECK (auth.uid() = user_id);
        $SQL$, pol_insert, tname);
      END IF;

      pol_update := 'authenticated update own ' || tname;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename=tname AND policyname = pol_update
      ) THEN
        EXECUTE format($SQL$
          CREATE POLICY %I
          ON public.%I FOR UPDATE
          TO authenticated
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
        $SQL$, pol_update, tname);
      END IF;

      pol_delete := 'authenticated delete own ' || tname;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename=tname AND policyname = pol_delete
      ) THEN
        EXECUTE format($SQL$
          CREATE POLICY %I
          ON public.%I FOR DELETE
          TO authenticated
          USING (auth.uid() = user_id);
        $SQL$, pol_delete, tname);
      END IF;
    END IF;
  END LOOP;
END $$;

