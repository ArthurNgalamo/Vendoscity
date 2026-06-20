-- RLS policies for public.product_images
-- Use this if you created the product_images table and want sellers to manage their own rows.
--
-- IMPORTANT:
-- 1) Enable RLS first
-- 2) Choose the block matching your main products table: public.products OR public.produits

alter table public.product_images enable row level security;

-- Public read (so product pages can show multiple images)
drop policy if exists "public read product_images" on public.product_images;
create policy "public read product_images"
on public.product_images
for select
to public
using (true);

-- ============================================================
-- OPTION A: Your main table is public.products
-- ============================================================
drop policy if exists "seller insert product_images (products)" on public.product_images;
create policy "seller insert product_images (products)"
on public.product_images
for insert
to authenticated
with check (
  exists (
    select 1 from public.products p
    where p.id = product_id
      and p.seller_id = auth.uid()
  )
);

drop policy if exists "seller update product_images (products)" on public.product_images;
create policy "seller update product_images (products)"
on public.product_images
for update
to authenticated
using (
  exists (
    select 1 from public.products p
    where p.id = product_id
      and p.seller_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.products p
    where p.id = product_id
      and p.seller_id = auth.uid()
  )
);

drop policy if exists "seller delete product_images (products)" on public.product_images;
create policy "seller delete product_images (products)"
on public.product_images
for delete
to authenticated
using (
  exists (
    select 1 from public.products p
    where p.id = product_id
      and p.seller_id = auth.uid()
  )
);

-- ============================================================
-- OPTION B: Your main table is public.produits
-- Uncomment this block and comment OPTION A policies if needed.
-- ============================================================
-- drop policy if exists "seller insert product_images (produits)" on public.product_images;
-- create policy "seller insert product_images (produits)"
-- on public.product_images
-- for insert
-- to authenticated
-- with check (
--   exists (
--     select 1 from public.produits p
--     where p.id = product_id
--       and p.seller_id = auth.uid()
--   )
-- );
--
-- drop policy if exists "seller update product_images (produits)" on public.product_images;
-- create policy "seller update product_images (produits)"
-- on public.product_images
-- for update
-- to authenticated
-- using (
--   exists (
--     select 1 from public.produits p
--     where p.id = product_id
--       and p.seller_id = auth.uid()
--   )
-- )
-- with check (
--   exists (
--     select 1 from public.produits p
--     where p.id = product_id
--       and p.seller_id = auth.uid()
--   )
-- );
--
-- drop policy if exists "seller delete product_images (produits)" on public.product_images;
-- create policy "seller delete product_images (produits)"
-- on public.product_images
-- for delete
-- to authenticated
-- using (
--   exists (
--     select 1 from public.produits p
--     where p.id = product_id
--       and p.seller_id = auth.uid()
--   )
-- );

