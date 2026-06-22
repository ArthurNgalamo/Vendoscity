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
                    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
                    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS group_price NUMERIC DEFAULT 0;
                    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS group_min_participants INTEGER DEFAULT 3;
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
                is_group_buy BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
                UNIQUE(user_id, product_id, is_group_buy)
            );
        `);

        await pool.query(`
            DO $$
            BEGIN
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cart_items') THEN
                    ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS is_group_buy BOOLEAN DEFAULT false;
                    ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key;
                    ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_is_group_buy_key;
                    ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_user_id_product_id_is_group_buy_key UNIQUE (user_id, product_id, is_group_buy);
                END IF;
            END $$;
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

        // New Escrow & Wallet Migrations
        console.log('💳 Migrating wallet & escrow columns on "profiles" and "orders"...');
        await pool.query(`
            -- Ensure orders table exists
            CREATE TABLE IF NOT EXISTS public.orders (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                user_id UUID REFERENCES auth.users(id) NOT NULL,
                total_amount NUMERIC NOT NULL,
                status TEXT DEFAULT 'en cours',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );

            -- Ensure order_items table exists
            CREATE TABLE IF NOT EXISTS public.order_items (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
                product_id UUID REFERENCES public.products(id),
                quantity INTEGER NOT NULL,
                price NUMERIC NOT NULL
            );
        `);

        await pool.query(`
            DO $$
            BEGIN
                -- Update profiles table
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='profiles') THEN
                    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0.0;
                    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_passcode TEXT;
                    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_phone TEXT;
                    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seller_status VARCHAR(50) DEFAULT 'none';
                    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seller_application_data JSONB DEFAULT '{}'::jsonb;
                END IF;

                -- Update orders table
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders') THEN
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id);
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'direct_whatsapp';
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS escrow_status VARCHAR(50) DEFAULT 'none';
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0.0;
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_phone_payeur TEXT;
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS escrow_qr_code TEXT;
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_validated BOOLEAN DEFAULT false;
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_validated BOOLEAN DEFAULT false;
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_validated_at TIMESTAMP WITH TIME ZONE;
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_validated_at TIMESTAMP WITH TIME ZONE;
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMP WITH TIME ZONE;
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_group_buy BOOLEAN DEFAULT false;
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS group_buy_id VARCHAR(100);
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS group_buy_min_participants INTEGER DEFAULT 3;
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS group_buy_status VARCHAR(50) DEFAULT 'open';
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_distribution BOOLEAN DEFAULT false;
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS distribution_point_id VARCHAR(100);
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS distribution_point_name TEXT;
                    ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS distribution_status VARCHAR(50) DEFAULT 'none';
                END IF;
            END $$;
        `);

        // Create new wallet transactions and withdrawals tables
        console.log('🏦 Creating wallet tables...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.wallet_transactions (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
                order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
                type VARCHAR(50) NOT NULL,
                amount NUMERIC NOT NULL,
                status VARCHAR(50) DEFAULT 'completed',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS public.wallet_withdrawals (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
                amount NUMERIC NOT NULL,
                payment_method VARCHAR(50) NOT NULL,
                phone_number VARCHAR(50) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
                processed_at TIMESTAMP WITH TIME ZONE
            );
        `);

        // Enable RLS and setup policies
        console.log('🔒 Configuring Row Level Security on orders, transactions, and withdrawals...');
        await pool.query(`
            ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can see their own orders" ON public.orders;
            DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
            DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
            CREATE POLICY "Users can see their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR auth.uid() = seller_id);
            CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = seller_id);
            CREATE POLICY "Users can insert their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

            ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Users can see items of their orders" ON public.order_items;
            DROP POLICY IF EXISTS "Users can insert items for their own orders" ON public.order_items;
            CREATE POLICY "Users can see items of their orders" ON public.order_items FOR SELECT USING (
                exists (
                    select 1 from public.orders
                    where orders.id = order_items.order_id and (orders.user_id = auth.uid() OR orders.seller_id = auth.uid())
                )
            );
            CREATE POLICY "Users can insert items for their own orders" ON public.order_items FOR INSERT WITH CHECK (
                exists (
                    select 1 from public.orders
                    where orders.id = order_items.order_id and orders.user_id = auth.uid()
                )
            );

            ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs propres transactions" ON public.wallet_transactions;
            DROP POLICY IF EXISTS "Les utilisateurs peuvent inserer leurs propres transactions" ON public.wallet_transactions;
            CREATE POLICY "Les utilisateurs peuvent voir leurs propres transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = profile_id);
            CREATE POLICY "Les utilisateurs peuvent inserer leurs propres transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = profile_id);

            ALTER TABLE public.wallet_withdrawals ENABLE ROW LEVEL SECURITY;
            DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs propres retraits" ON public.wallet_withdrawals;
            DROP POLICY IF EXISTS "Les utilisateurs peuvent inserer leurs propres retraits" ON public.wallet_withdrawals;
            CREATE POLICY "Les utilisateurs peuvent voir leurs propres retraits" ON public.wallet_withdrawals FOR SELECT USING (auth.uid() = seller_id);
            CREATE POLICY "Les utilisateurs peuvent inserer leurs propres retraits" ON public.wallet_withdrawals FOR INSERT WITH CHECK (auth.uid() = seller_id);
        `);

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
