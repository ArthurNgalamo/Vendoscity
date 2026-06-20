-- Vendoscity: add product specifications field (JSONB) on products
-- Run in Supabase SQL editor.

alter table public.products
add column if not exists specs jsonb not null default '[]'::jsonb;

