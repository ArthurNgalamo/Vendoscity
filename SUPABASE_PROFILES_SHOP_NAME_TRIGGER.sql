-- Vendoscity: ensure profiles.shop_name is populated on sign-up from auth.users raw_user_meta_data.
-- Run this in Supabase SQL editor.

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS shop_name text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, shop_name, first_name, last_name, phone)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'shop_name',
    new.raw_user_meta_data->>'name',
    '',
    new.raw_user_meta_data->>'whatsapp'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

