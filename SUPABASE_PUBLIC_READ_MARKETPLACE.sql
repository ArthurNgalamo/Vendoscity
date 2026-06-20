-- Vendoscity: minimal public-read policies needed for marketplace pages (no auth required)
-- This fixes "Produit non trouvé" caused by RLS blocking SELECT.
--
-- Tables:
-- - products OR produits: public SELECT
-- - reviews OR avis: public SELECT
-- - product_images: public SELECT (if exists)
--
-- NOTE: Avoids CREATE POLICY IF NOT EXISTS for compatibility.

DO $$
DECLARE
  tname text;
  polname text;
BEGIN
  FOREACH tname IN ARRAY ARRAY['products','produits']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name=tname
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tname);

      polname := 'public read ' || tname;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename=tname AND policyname = polname
      ) THEN
        EXECUTE format($SQL$
          CREATE POLICY %I
          ON public.%I FOR SELECT
          TO public
          USING (true);
        $SQL$, polname, tname);
      END IF;
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  tname text;
  polname text;
BEGIN
  FOREACH tname IN ARRAY ARRAY['reviews','avis']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name=tname
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tname);

      polname := 'public read ' || tname;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename=tname AND policyname = polname
      ) THEN
        EXECUTE format($SQL$
          CREATE POLICY %I
          ON public.%I FOR SELECT
          TO public
          USING (true);
        $SQL$, polname, tname);
      END IF;
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='product_images'
  ) THEN
    ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='product_images' AND policyname='public read product_images'
    ) THEN
      EXECUTE $SQL$
        CREATE POLICY "public read product_images"
        ON public.product_images FOR SELECT
        TO public
        USING (true);
      $SQL$;
    END IF;
  END IF;
END $$;

