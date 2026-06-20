-- Add "quartier" (neighborhood) to products/prodduits for Yaounde-local trust
-- Run in Supabase SQL editor.

alter table if exists public.products
  add column if not exists quartier text not null default '';

alter table if exists public.produits
  add column if not exists quartier text not null default '';

