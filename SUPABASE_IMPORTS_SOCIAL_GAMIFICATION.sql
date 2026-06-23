-- ============================================================
-- VENDOSCITY — Migration: Imports, Social, Gamification
-- ============================================================

-- 1. Table cache des articles importés
CREATE TABLE IF NOT EXISTS public.imported_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL,
    original_id VARCHAR(100) NOT NULL,
    original_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    price_original NUMERIC(12,2) NOT NULL,
    price_fcfa NUMERIC(12,2) NOT NULL,
    price_final NUMERIC(12,2) NOT NULL,
    category VARCHAR(100),
    title_fr VARCHAR(500) NOT NULL,
    description_fr TEXT,
    image_urls TEXT[] DEFAULT '{}',
    video_url TEXT,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(source, original_id)
);

-- RLS
ALTER TABLE public.imported_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imported_pool_public_read" ON public.imported_pool FOR SELECT USING (true);
CREATE POLICY "imported_pool_service_write" ON public.imported_pool FOR ALL USING (true);

-- 2. Table catalogue vendeur
CREATE TABLE IF NOT EXISTS public.seller_imported_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pool_product_id UUID NOT NULL REFERENCES public.imported_pool(id) ON DELETE CASCADE,
    custom_title VARCHAR(500),
    custom_description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(seller_id, pool_product_id)
);

ALTER TABLE public.seller_imported_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sic_owner_all" ON public.seller_imported_catalog FOR ALL USING (auth.uid() = seller_id);
CREATE POLICY "sic_public_read" ON public.seller_imported_catalog FOR SELECT USING (true);

-- 3. Table credentials réseaux sociaux
CREATE TABLE IF NOT EXISTS public.seller_social_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    page_id VARCHAR(100),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(seller_id, platform)
);

ALTER TABLE public.seller_social_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ssc_owner_all" ON public.seller_social_credentials FOR ALL USING (auth.uid() = seller_id);

-- 4. Colonnes gamification sur profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seller_level VARCHAR(20) DEFAULT 'bronze';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_sales_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_revenue_fcfa NUMERIC(12,2) DEFAULT 0;

-- 5. Index de performance
CREATE INDEX IF NOT EXISTS idx_imported_pool_source ON public.imported_pool(source);
CREATE INDEX IF NOT EXISTS idx_imported_pool_category ON public.imported_pool(category);
CREATE INDEX IF NOT EXISTS idx_imported_pool_cached_at ON public.imported_pool(cached_at);
CREATE INDEX IF NOT EXISTS idx_sic_seller_id ON public.seller_imported_catalog(seller_id);
CREATE INDEX IF NOT EXISTS idx_imported_pool_has_video ON public.imported_pool(video_url) WHERE video_url IS NOT NULL;
