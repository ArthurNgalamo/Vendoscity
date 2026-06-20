-- Multi-images for products (Supabase / Postgres)
-- Run this in Supabase SQL editor (Production) to enable multiple images per product.

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_id_idx on public.product_images (product_id);
create index if not exists product_images_product_id_sort_idx on public.product_images (product_id, sort);

-- Optional RLS (adjust to your auth model)
-- alter table public.product_images enable row level security;
-- create policy "public read product_images"
-- on public.product_images for select
-- using (true);

