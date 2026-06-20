-- Multi-images stored directly on products row (recommended fallback)
-- Run this in Supabase SQL editor.
-- This makes multi-images work even if product_images table is missing or has FK mismatch with "produits".

-- If your table is "products"
alter table if exists public.products
  add column if not exists images jsonb not null default '[]'::jsonb;

-- If your table is "produits"
alter table if exists public.produits
  add column if not exists images jsonb not null default '[]'::jsonb;

-- Optional: allow public read (adjust RLS to your needs)
-- alter table public.products enable row level security;
-- create policy "public read products (images column)"
-- on public.products for select
-- using (true);

