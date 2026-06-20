const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

// Never embed credentials in source. For local dev, set DATABASE_URL (or rely on passwordless local default).
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/vendoscity';

const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000
});

async function migrate() {
    console.log('🔧 Migration locale (non destructive) ...');

    // 1) Ensure JSONB specs exists on products
    await pool.query(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema='public' AND table_name='products'
            ) THEN
                ALTER TABLE public.products
                ADD COLUMN IF NOT EXISTS specs jsonb NOT NULL DEFAULT '[]'::jsonb;
            END IF;
        END $$;
    `);

    // 2) Ensure product_images table exists (multi-images)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS public.product_images (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
            url TEXT NOT NULL,
            sort INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
    `);

    // 3) Ensure profiles.updated_at exists (some older local schemas missed it)
    await pool.query(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema='public' AND table_name='profiles'
            ) THEN
                ALTER TABLE public.profiles
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
            END IF;
        END $$;
    `);

    // 4) Ensure cart_items table exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS public.cart_items (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
            product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
            quantity INTEGER DEFAULT 1,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            UNIQUE(user_id, product_id)
        );
    `);

    console.log('✅ Migration terminée.');
    process.exit(0);
}

migrate().catch((err) => {
    console.error('❌ Migration error:', err);
    process.exit(1);
});
