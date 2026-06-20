-- Vendoscity: RLS policies for products/produts + product_images
-- This enables:
-- - Public read of products and product_images (marketplace listing)
-- - Authenticated sellers can insert/update/delete their own products (seller_id = auth.uid())
-- - Authenticated sellers can insert/update/delete their product images via product ownership
--
-- NOTE: We avoid "CREATE POLICY IF NOT EXISTS" for compatibility.

DO $$
DECLARE
  tname text;
  polname text;
BEGIN
  -- Some projects may name the table "products" or "produits".
  FOREACH tname IN ARRAY ARRAY['products','produits']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name=tname
    ) THEN
      -- Ensure RLS is enabled (does not break if already enabled)
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tname);

      -- Public SELECT
      polname := 'public read ' || tname;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename=tname AND policyname = 'public read ' || tname
      ) THEN
        EXECUTE format($SQL$
          CREATE POLICY %I
          ON public.%I FOR SELECT
          TO public
          USING (true);
        $SQL$, polname, tname);
      END IF;

      -- INSERT own rows
      polname := 'seller insert own ' || tname;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename=tname AND policyname = 'seller insert own ' || tname
      ) THEN
        EXECUTE format($SQL$
          CREATE POLICY %I
          ON public.%I FOR INSERT
          TO authenticated
          WITH CHECK (seller_id = auth.uid());
        $SQL$, polname, tname);
      END IF;

      -- UPDATE own rows
      polname := 'seller update own ' || tname;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename=tname AND policyname = 'seller update own ' || tname
      ) THEN
        EXECUTE format($SQL$
          CREATE POLICY %I
          ON public.%I FOR UPDATE
          TO authenticated
          USING (seller_id = auth.uid());
        $SQL$, polname, tname);
      END IF;

      -- DELETE own rows
      polname := 'seller delete own ' || tname;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename=tname AND policyname = 'seller delete own ' || tname
      ) THEN
        EXECUTE format($SQL$
          CREATE POLICY %I
          ON public.%I FOR DELETE
          TO authenticated
          USING (seller_id = auth.uid());
        $SQL$, polname, tname);
      END IF;
    END IF;
  END LOOP;
END $$;

-- product_images policies (multi images)
DO $$
DECLARE
  has_products boolean;
  has_produits boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='products'
  ) INTO has_products;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='produits'
  ) INTO has_produits;

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

    -- INSERT/UPDATE/DELETE if product belongs to auth user (choose the table that exists)
    IF has_products THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='product_images' AND policyname='seller insert own product_images'
      ) THEN
        EXECUTE $SQL$
          CREATE POLICY "seller insert own product_images"
          ON public.product_images FOR INSERT
          TO authenticated
          WITH CHECK (
            EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid())
          );
        $SQL$;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='product_images' AND policyname='seller update own product_images'
      ) THEN
        EXECUTE $SQL$
          CREATE POLICY "seller update own product_images"
          ON public.product_images FOR UPDATE
          TO authenticated
          USING (
            EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid())
          );
        $SQL$;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='product_images' AND policyname='seller delete own product_images'
      ) THEN
        EXECUTE $SQL$
          CREATE POLICY "seller delete own product_images"
          ON public.product_images FOR DELETE
          TO authenticated
          USING (
            EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = auth.uid())
          );
        $SQL$;
      END IF;
    ELSIF has_produits THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='product_images' AND policyname='seller insert own product_images'
      ) THEN
        EXECUTE $SQL$
          CREATE POLICY "seller insert own product_images"
          ON public.product_images FOR INSERT
          TO authenticated
          WITH CHECK (
            EXISTS (SELECT 1 FROM public.produits p WHERE p.id = product_id AND p.seller_id = auth.uid())
          );
        $SQL$;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='product_images' AND policyname='seller update own product_images'
      ) THEN
        EXECUTE $SQL$
          CREATE POLICY "seller update own product_images"
          ON public.product_images FOR UPDATE
          TO authenticated
          USING (
            EXISTS (SELECT 1 FROM public.produits p WHERE p.id = product_id AND p.seller_id = auth.uid())
          );
        $SQL$;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='product_images' AND policyname='seller delete own product_images'
      ) THEN
        EXECUTE $SQL$
          CREATE POLICY "seller delete own product_images"
          ON public.product_images FOR DELETE
          TO authenticated
          USING (
            EXISTS (SELECT 1 FROM public.produits p WHERE p.id = product_id AND p.seller_id = auth.uid())
          );
        $SQL$;
      END IF;
    END IF;
  END IF;
END $$;
