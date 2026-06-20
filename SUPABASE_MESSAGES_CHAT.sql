-- SQL Script for creating and configuring the "messages" table in Supabase
-- Place this script in the Supabase SQL Editor and run it.

-- 1. Create the messages table if it does not exist
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    read_status BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist (to avoid duplicates or conflicts)
DROP POLICY IF EXISTS "Users can read their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;

-- 4. Create RLS Policies
-- Policy: Users can read messages where they are the sender OR the receiver
CREATE POLICY "Users can read their own messages" 
ON public.messages FOR SELECT 
USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- Policy: Users can insert messages only if they are the sender
CREATE POLICY "Users can insert their own messages" 
ON public.messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- 5. Performance Indexes (to speed up query lookups for sender/receiver conversations)
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- 6. Add comment (for documentation in Supabase schema view)
COMMENT ON TABLE public.messages IS 'Table storing direct messages and chat conversations between users/sellers.';
