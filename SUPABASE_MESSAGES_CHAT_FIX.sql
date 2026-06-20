-- ============================================================
-- SQL SCRIPT FOR SUPABASE MESSAGES & USER PROFILES SYNC
-- Run this in your Supabase SQL Editor.
-- ============================================================

-- 1. RECREATE THE MESSAGES TABLE WITH THE CORRECT FK REFERENCES
DROP TABLE IF EXISTS public.messages CASCADE;

CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    read_status BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can read their own messages" 
ON public.messages FOR SELECT 
USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

CREATE POLICY "Users can insert their own messages" 
ON public.messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- Create performance indexes for message lookups
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

COMMENT ON TABLE public.messages IS 'Table stockant les messages de chat entre acheteurs et vendeurs.';

-- 2. RECREATE AND OPTIMIZE USER SYNC TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, shop_name, first_name, last_name, phone)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'shop_name', new.raw_user_meta_data->>'name', 'Boutique'),
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'shop_name', 'Utilisateur'),
    '',
    COALESCE(new.raw_user_meta_data->>'whatsapp', '')
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    shop_name = COALESCE(profiles.shop_name, EXCLUDED.shop_name),
    first_name = COALESCE(profiles.first_name, EXCLUDED.first_name),
    phone = COALESCE(profiles.phone, EXCLUDED.phone);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. RETROACTIVE SYNC (BACKFILL)
-- Ensures all users present in auth.users have a matching profile in public.profiles.
-- This prevents foreign key constraint violations when users send messages.
INSERT INTO public.profiles (id, shop_name, first_name, last_name, phone, created_at, updated_at)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'shop_name', raw_user_meta_data->>'name', 'Boutique'),
    COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'shop_name', 'Utilisateur'),
    '', 
    COALESCE(raw_user_meta_data->>'whatsapp', ''),
    created_at, 
    COALESCE(updated_at, created_at)
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET 
  shop_name = COALESCE(profiles.shop_name, EXCLUDED.shop_name),
  first_name = COALESCE(profiles.first_name, EXCLUDED.first_name),
  phone = COALESCE(profiles.phone, EXCLUDED.phone);
