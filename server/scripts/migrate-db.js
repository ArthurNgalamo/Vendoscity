const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/vendoscity';

console.log('🔄 Starting database schema migration...');
console.log(`Connecting to: ${connectionString.split('@')[1] || 'Localhost'}`);

function poolConfigFromConnectionString(s) {
    const str = String(s || '').trim();
    if (!str) return { connectionString: str };
    try {
        const u = new URL(str);
        const user = decodeURIComponent(u.username || '');
        const passFromUrl = decodeURIComponent(u.password || '');
        const host = u.hostname || 'localhost';
        const port = u.port ? parseInt(u.port, 10) : 5432;
        const database = String(u.pathname || '').replace(/^\//, '') || 'vendoscity';

        const envPwRaw = process.env.DATABASE_PASSWORD || process.env.PGPASSWORD || '';
        const envPw = (typeof envPwRaw === 'string') ? envPwRaw : String(envPwRaw || '');
        const password = (passFromUrl || envPw || (user ? ' ' : ''));

        return { host, port, database, user: user || undefined, password };
    } catch (_) {
        return { connectionString: str };
    }
}

// Configure client connection pool with SSL for remote databases (like Supabase)
const isRemote = connectionString.includes('supabase.com') || connectionString.includes('supabase.co') || connectionString.includes('pooler.supabase.com');

const pool = new Pool({
    ...poolConfigFromConnectionString(connectionString),
    ssl: isRemote ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000
});

async function runMigrations() {
    try {
        // Test connection
        await pool.query('SELECT NOW()');
        console.log('🔌 Connected to the database successfully!');

        // 1. Ensure uuid-ossp extension is enabled
        console.log('⚙️ Enabling UUID extension...');
        await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

        // 2. Migrate: Products - add quartier column if missing
        console.log('📦 Updating "products" table columns (quartier, specs)...');
        await pool.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products') THEN
                    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS quartier TEXT NOT NULL DEFAULT '';
                    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS specs JSONB NOT NULL DEFAULT '[]'::jsonb;
                    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;
                    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
                    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS old_price NUMERIC DEFAULT 0;
                END IF;
                
                -- Support legacy "produits" table if it exists
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='produits') THEN
                    ALTER TABLE public.produits ADD COLUMN IF NOT EXISTS quartier TEXT NOT NULL DEFAULT '';
                    ALTER TABLE public.produits ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb;
                END IF;
            END $$;
        `);

        // 3. Migrate: Profiles - ensure updated_at column
        console.log('👤 Updating "profiles" table...');
        await pool.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
                    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
                END IF;
            END $$;
        `);

        // 4. Migrate: Product Images table (multi-images fallback)
        console.log('🖼️ Checking "product_images" table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.product_images (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
                url TEXT NOT NULL,
                sort INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
            );
        `);

        // 5. Migrate: Cart Items
        console.log('🛒 Checking "cart_items" table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.cart_items (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
                product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
                quantity INTEGER DEFAULT 1,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                UNIQUE(user_id, product_id)
            );
        `);

        // 6. Migrate: Messages table (for direct chat)
        console.log('💬 Checking "messages" table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.messages (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
                receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
                subject TEXT,
                content TEXT NOT NULL,
                read_status BOOLEAN DEFAULT false NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
        `);

        // Enable Row Level Security on messages table
        console.log('🔒 Configuring Row Level Security (RLS) on messages table...');
        await pool.query('ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;');
        
        // Remove old policies to prevent conflicts
        await pool.query('DROP POLICY IF EXISTS "Users can read their own messages" ON public.messages;');
        await pool.query('DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;');

        // Create new policies
        await pool.query(`
            CREATE POLICY "Users can read their own messages" 
            ON public.messages FOR SELECT 
            USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
        `);
        await pool.query(`
            CREATE POLICY "Users can insert their own messages" 
            ON public.messages FOR INSERT 
            WITH CHECK (auth.uid() = sender_id);
        `);

        // Create indexes for fast message lookup
        console.log('⚡ Creating performance indexes on messages...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);');

        console.log('🎉 Database migration completed successfully!');
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message || err);
        await pool.end();
        process.exit(1);
    }
}

runMigrations();
