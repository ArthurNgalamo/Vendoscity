const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const localConnectionString = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/vendoscity';
const projectId = 'rzzxicbmpzieyaiutcbo';
const hosts = [
    `aws-0-eu-central-1.pooler.supabase.com`,
    `aws-0-us-east-1.pooler.supabase.com`
];
const ports = [5432, 6543];
const passwords = ['VmnXbhZY3OIQo', 'VmnXbhZY3OIQ0'];

const sql = `
-- Création de la table pour enregistrer les visites et clics de la boutique
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_analytics_seller_date ON public.analytics_events(seller_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_product ON public.analytics_events(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_type ON public.analytics_events(event_type);

-- Activation de la sécurité de niveau ligne
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Allow anonymous and authenticated inserts" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow sellers to select their own shop metrics" ON public.analytics_events;

-- Créer les politiques
CREATE POLICY "Allow anonymous and authenticated inserts" ON public.analytics_events
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow sellers to select their own shop metrics" ON public.analytics_events
    FOR SELECT
    USING (auth.uid() = seller_id);
`;

async function migrateLocal() {
    console.log('--- MIGRATING LOCAL DATABASE ---');
    try {
        const u = new URL(localConnectionString);
        const user = decodeURIComponent(u.username || '');
        const passFromUrl = decodeURIComponent(u.password || '');
        const host = u.hostname || 'localhost';
        const port = u.port ? parseInt(u.port, 10) : 5432;
        const database = String(u.pathname || '').replace(/^\//, '') || 'vendoscity';
        const envPw = process.env.DATABASE_PASSWORD || process.env.PGPASSWORD || '';
        const password = (passFromUrl || envPw || (user ? ' ' : ''));

        const client = new Client({ host, port, database, user: user || undefined, password });
        await client.connect();
        console.log('Connected to local PostgreSQL database.');
        await client.query(sql);
        console.log('Local migration completed successfully!');
        await client.end();
    } catch (err) {
        console.error('Local migration failed:', err.message);
    }
}

async function migrateRemote() {
    console.log('\n--- MIGRATING REMOTE SUPABASE DATABASE ---');
    let connectedClient = null;
    const username = `postgres.${projectId}`;

    for (const host of hosts) {
        for (const port of ports) {
            for (const pw of passwords) {
                console.log(`Connecting to remote ${host}:${port} with password ending in... ${pw.slice(-3)}`);
                const client = new Client({
                    host,
                    port,
                    database: 'postgres',
                    user: username,
                    password: pw,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 5000
                });
                
                try {
                    await client.connect();
                    console.log(`🎉 Connection successful to ${host}:${port}!`);
                    connectedClient = client;
                    break;
                } catch (err) {
                    console.log(`Connection failed: ${err.message}`);
                }
            }
            if (connectedClient) break;
        }
        if (connectedClient) break;
    }

    if (!connectedClient) {
        console.error('❌ Could not connect to remote Supabase database.');
        return;
    }

    try {
        console.log('Running migration on Supabase...');
        await connectedClient.query(sql);
        console.log('Remote migration completed successfully!');
        await connectedClient.end();
    } catch (err) {
        console.error('Remote migration failed:', err.message);
        if (connectedClient) await connectedClient.end();
    }
}

async function main() {
    await migrateLocal();
    await migrateRemote();
    console.log('\nAll migration attempts finished.');
}

main();
