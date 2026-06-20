-- Vendoscity: add a dedicated shop_name to profiles and prevent duplicates (case-insensitive).
-- This avoids blocking normal users who may share the same first_name/last_name.

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS shop_name text;

-- Unique shop_name (case-insensitive, trimmed). Allows NULL/empty.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'profiles_shop_name_unique'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE $SQL$
      CREATE UNIQUE INDEX profiles_shop_name_unique
      ON public.profiles ((lower(btrim(shop_name))))
      WHERE shop_name IS NOT NULL AND btrim(shop_name) <> '';
    $SQL$;
  END IF;
END $$;

