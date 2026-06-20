-- Vendoscity: Storage RLS policies for bucket "product-images"
-- Goal:
-- - Public read (optional, if your bucket is public)
-- - Authenticated users can upload into their own folder: `${auth.uid()}/filename.ext`
-- - Authenticated users can update/delete their own uploads
--
-- IMPORTANT:
-- - Ensure the bucket exists: product-images
-- - The app uploads to path: `${user_id}/${uuid}.ext`

-- NOTE:
-- Supabase projects may run on Postgres versions that do NOT support:
--   CREATE POLICY IF NOT EXISTS ...
-- So we guard each policy creation with a DO block.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'public read product-images'
  ) THEN
    EXECUTE $SQL$
      CREATE POLICY "public read product-images"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'product-images');
    $SQL$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'authenticated upload product-images'
  ) THEN
    EXECUTE $SQL$
      CREATE POLICY "authenticated upload product-images"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'product-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
    $SQL$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'authenticated update own product-images'
  ) THEN
    EXECUTE $SQL$
      CREATE POLICY "authenticated update own product-images"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'product-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
    $SQL$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'authenticated delete own product-images'
  ) THEN
    EXECUTE $SQL$
      CREATE POLICY "authenticated delete own product-images"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'product-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
    $SQL$;
  END IF;
END $$;
